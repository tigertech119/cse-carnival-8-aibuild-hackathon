import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { AnnouncementService } from "../src/server/services/announcement.service";
import { BookingService } from "../src/server/services/booking.service";
import { executeTool } from "../src/ai/tools";

describe("Milestone M15 — Live-Data, Persistence & E2E Integration Verification", () => {
  afterAll(async () => {
    // Cleanup any test bookings or registrations created during testing
    await prisma.booking.deleteMany({
      where: { bookedBy: { contains: "M15-Test" } },
    });
    await prisma.registration.deleteMany({
      where: { studentId: { startsWith: "20-M15" } },
    });
    await prisma.announcement.deleteMany({
      where: { title: { contains: "M15 Test" } },
    });
  });

  // -------------------------------------------------------------------------
  // Scenario A: Dashboard edit -> Agent read
  // -------------------------------------------------------------------------
  describe("Scenario A — Dashboard edit -> Agent read", () => {
    it("reflects dashboard announcement updates immediately in the AI tool layer without stale memory", async () => {
      // 1. Create a test announcement (simulating dashboard creation)
      const created = await AnnouncementService.create({
        title: "M15 Test: Library Extended Hours",
        body: "Library open until midnight during final exam week.",
        priority: "high",
        posted_by: "University Library",
        date: "2026-09-04",
        expires: "2026-09-25",
      });
      expect(created.id).toBeDefined();

      // 2. Query via AI Tool Layer -> Verify it sees the newly created announcement
      const initialQuery = await executeTool("get_announcements", { priority: "high" });
      expect(initialQuery.success).toBe(true);
      if (initialQuery.success) {
        const anns = (initialQuery.data as any).announcements;
        const match = anns.find((a: any) => a.id === created.id);
        expect(match).toBeDefined();
        expect(match.title).toBe("M15 Test: Library Extended Hours");
      }

      // 3. Edit the announcement (simulating dashboard user editing the record)
      const updated = await AnnouncementService.update(created.id, {
        title: "M15 Test: Library 24-Hour Schedule",
        body: "Revised: Library open 24 hours daily with valid student ID card.",
      });
      expect(updated.title).toBe("M15 Test: Library 24-Hour Schedule");

      // 4. Query again via AI Tool Layer -> Must immediately see the edited value, NOT the old value
      const afterEditQuery = await executeTool("get_announcements", { priority: "high" });
      expect(afterEditQuery.success).toBe(true);
      if (afterEditQuery.success) {
        const anns = (afterEditQuery.data as any).announcements;
        const match = anns.find((a: any) => a.id === created.id);
        expect(match).toBeDefined();
        expect(match.title).toBe("M15 Test: Library 24-Hour Schedule");
        expect(match.body).toContain("24 hours daily");
      }

      // 5. Clean up
      await AnnouncementService.delete(created.id);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario B: Dashboard room booking -> Agent availability check
  // -------------------------------------------------------------------------
  describe("Scenario B — Dashboard room booking -> Agent availability check", () => {
    it("reports rooms booked through the dashboard as occupied when checked by the agent", async () => {
      const testRoom = "7A03";
      const testDate = "2026-09-23"; // Wednesday
      const startTime = "11:00";
      const endTime = "13:00";

      // 1. Check initially free via AI tool
      const beforeBooking = await executeTool("get_room_availability", {
        date: testDate,
        start_time: startTime,
        end_time: endTime,
      });
      expect(beforeBooking.success).toBe(true);
      const isInitiallyFree = ((beforeBooking as any).data)?.available.some(
        (r: any) => r.room_number === testRoom
      );
      expect(isInitiallyFree).toBe(true);

      // 2. Book through backend service (simulating dashboard reservation)
      const booking = await BookingService.create({
        room_number: testRoom,
        date: testDate,
        start_time: startTime,
        end_time: endTime,
        booked_by: "M15-Test Dashboard Admin",
        purpose: "Faculty Meeting",
      });
      expect(booking.booking_id).toBeDefined();

      // 3. Agent checks availability -> Room must now be marked unavailable
      const afterBooking = await executeTool("get_room_availability", {
        date: testDate,
        start_time: startTime,
        end_time: endTime,
      });
      expect(afterBooking.success).toBe(true);
      const isNowFree = ((afterBooking as any).data)?.available.some(
        (r: any) => r.room_number === testRoom
      );
      expect(isNowFree).toBe(false);

      const conflictInfo = ((afterBooking as any).data)?.unavailable.find(
        (u: any) => u.room.room_number === testRoom
      );
      expect(conflictInfo).toBeDefined();
      expect(conflictInfo.reason).toMatch(/booked|conflict/i);

      // 4. Cancel booking and confirm room becomes available again
      await BookingService.cancel(booking.booking_id);
      const afterCancel = await executeTool("get_room_availability", {
        date: testDate,
        start_time: startTime,
        end_time: endTime,
      });
      expect(afterCancel.success).toBe(true);
      const isFreeAgain = ((afterCancel as any).data)?.available.some(
        (r: any) => r.room_number === testRoom
      );
      expect(isFreeAgain).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario C: Agent room booking -> Dashboard read + Conflict rejection
  // -------------------------------------------------------------------------
  describe("Scenario C — Agent room booking -> Dashboard read + Conflict rejection", () => {
    it("commits agent bookings to the database, visible to dashboard and preventing conflicting bookings", async () => {
      const testRoom = "7A04";
      const testDate = "2026-09-24"; // Thursday
      const startTime = "14:00";
      const endTime = "16:00";

      // 1. Agent books the room via AI tool
      const agentBookingRes = await executeTool("book_room", {
        room_number: testRoom,
        date: testDate,
        start_time: startTime,
        end_time: endTime,
        booked_by: "M15-Test Agent Booking",
        purpose: "ACM ICPC Team Training",
      });
      expect(agentBookingRes.success).toBe(true);
      const bookingData = ((agentBookingRes as any).data)?.booking;
      expect(bookingData.booking_id).toBeDefined();

      // 2. Verify booking is directly queryable in DB / Dashboard service
      const inDb = await prisma.booking.findUnique({
        where: { bookingId: bookingData.booking_id },
      });
      expect(inDb).not.toBeNull();
      expect(inDb?.roomNumber).toBe(testRoom);
      expect(inDb?.bookedBy).toBe("M15-Test Agent Booking");

      // 3. Attempt a conflicting booking from dashboard service -> Must throw ConflictError
      await expect(
        BookingService.create({
          room_number: testRoom,
          date: testDate,
          start_time: "15:00", // Overlaps with 14:00-16:00
          end_time: "17:00",
          booked_by: "M15-Test Conflicting User",
          purpose: "Conflicting Session",
        })
      ).rejects.toThrow(/already booked|conflict/i);

      // 4. Clean up
      await BookingService.cancel(bookingData.booking_id);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario D: Event registration persistence & duplicate rejection
  // -------------------------------------------------------------------------
  describe("Scenario D — Event registration persistence & duplicate rejection", () => {
    it("persists agent registrations in database, updates seat counters, and rejects duplicates", async () => {
      const studentId = "20-M15-001";
      const studentName = "Samiul Alam";

      // 1. Look up an active event with available seats (evt-001: AI Summit)
      const eventBefore = await prisma.event.findUnique({
        where: { id: "evt-001" },
      });
      expect(eventBefore).not.toBeNull();
      const initialRegistered = eventBefore!.registered;

      // 2. Agent registers student
      const regRes = await executeTool("register_for_event", {
        event_id: "evt-001",
        student_id: studentId,
        student_name: studentName,
      });
      expect(regRes.success).toBe(true);

      // 3. Verify in database that registration exists and count incremented
      const eventAfter = await prisma.event.findUnique({
        where: { id: "evt-001" },
      });
      expect(eventAfter!.registered).toBe(initialRegistered + 1);

      const regRecord = await prisma.registration.findUnique({
        where: {
          eventId_studentId: {
            eventId: "evt-001",
            studentId: studentId,
          },
        },
      });
      expect(regRecord).not.toBeNull();
      expect(regRecord?.name).toBe(studentName);

      // 4. Attempt duplicate registration -> Must fail gracefully with error
      const duplicateRes = await executeTool("register_for_event", {
        event_id: "evt-001",
        student_id: studentId,
        student_name: studentName,
      });
      expect(duplicateRes.success).toBe(false);
      if (!duplicateRes.success) {
        expect(duplicateRes.error).toMatch(/already registered|conflict/i);
      }

      // 5. Cancel registration and verify count decrements back to initial
      const cancelRes = await executeTool("cancel_event_registration", {
        event_id: "evt-001",
        student_id: studentId,
      });
      expect(cancelRes.success).toBe(true);

      const eventFinal = await prisma.event.findUnique({
        where: { id: "evt-001" },
      });
      expect(eventFinal!.registered).toBe(initialRegistered);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario E: Cross-source reasoning (Schedule + Event + Room availability)
  // -------------------------------------------------------------------------
  describe("Scenario E — Cross-source multi-domain reasoning", () => {
    it("can execute schedule, event, and room lookups in a single multi-domain flow", async () => {
      // 1. Query next classes on Sunday
      const schedules = await executeTool("get_schedules", { day: "Sunday" });
      expect(schedules.success).toBe(true);
      expect(((schedules as any).data)?.count).toBeGreaterThan(0);

      // 2. Query upcoming campus events
      const events = await executeTool("get_events", { status: "upcoming" });
      expect(events.success).toBe(true);
      expect(((events as any).data)?.count).toBeGreaterThan(0);

      // 3. Query room availability for free slots
      const availability = await executeTool("get_room_availability", {
        date: "2026-09-06", // Sunday
        start_time: "14:00",
        end_time: "16:00",
      });
      expect(availability.success).toBe(true);
      expect(((availability as any).data)?.available.length).toBeGreaterThan(0);
    });
  });
});
