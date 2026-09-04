import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { executeTool, toolDefinitions } from "../src/ai/tools";

describe("CampusOS AI Tool Layer & Judge Scenarios (M11 & M14)", () => {
  afterAll(async () => {
    // Cleanup test bookings and registrations
    await prisma.booking.deleteMany({
      where: { bookedBy: { contains: "AI-Test" } },
    });
    await prisma.registration.deleteMany({
      where: { studentId: "20-99902" },
    });
  });

  // -------------------------------------------------------------------------
  // M11: Tool Definitions Integrity
  // -------------------------------------------------------------------------
  describe("Tool Definitions Integrity", () => {
    it("exports all required tool definitions", () => {
      expect(toolDefinitions.length).toBeGreaterThanOrEqual(18);
      const toolNames = toolDefinitions.map((t) => t.name);

      // Read tools
      expect(toolNames).toContain("get_schedules");
      expect(toolNames).toContain("get_next_class");
      expect(toolNames).toContain("get_assignments");
      expect(toolNames).toContain("get_announcements");
      expect(toolNames).toContain("get_rooms");
      expect(toolNames).toContain("get_room_availability");
      expect(toolNames).toContain("get_events");
      expect(toolNames).toContain("get_event");

      // Action tools
      expect(toolNames).toContain("book_room");
      expect(toolNames).toContain("cancel_booking");
      expect(toolNames).toContain("register_for_event");
      expect(toolNames).toContain("cancel_event_registration");
      expect(toolNames).toContain("create_schedule");
      expect(toolNames).toContain("update_schedule");
      expect(toolNames).toContain("delete_schedule");
      expect(toolNames).toContain("create_announcement");
      expect(toolNames).toContain("update_announcement");
      expect(toolNames).toContain("delete_announcement");
      expect(toolNames).toContain("create_assignment");
      expect(toolNames).toContain("update_assignment");
      expect(toolNames).toContain("delete_assignment");
      expect(toolNames).toContain("create_event");
      expect(toolNames).toContain("update_event");
      expect(toolNames).toContain("delete_event");
      expect(toolNames).toContain("create_room");
      expect(toolNames).toContain("update_room");
      expect(toolNames).toContain("delete_room");
    });

    it("every tool has a clear description and parameters object", () => {
      for (const tool of toolDefinitions) {
        expect(tool.name).toBeDefined();
        expect(typeof tool.description).toBe("string");
        expect(tool.description.length).toBeGreaterThan(15);
        expect(tool.parameters).toBeDefined();
        expect(tool.parameters.type).toBeDefined();
      }
    });
  });

  // -------------------------------------------------------------------------
  // M14: Official Judge Scenario Queries
  // -------------------------------------------------------------------------
  describe("Official Judge Scenario Queries", () => {
    it("Scenario 1: \"When is my next class?\" (get_next_class)", async () => {
      const result = await executeTool("get_next_class", {});
      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as any;
        expect(data).toBeDefined();
        expect(data.found).toBe(true);
        expect(data.day).toBeDefined();
        expect(Array.isArray(data.classes)).toBe(true);
      }
    });

    it("Scenario 2: \"What classes do I have on Wednesday?\" (get_schedules)", async () => {
      const result = await executeTool("get_schedules", { day: "Wednesday" });
      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as any;
        expect(Array.isArray(data.schedules)).toBe(true);
        expect(data.schedules.length).toBeGreaterThan(0);
        for (const s of data.schedules) {
          expect(s.day).toBe("Wednesday");
        }
      }
    });

    it("Scenario 3: \"What assignments do I have due this week?\" (get_assignments)", async () => {
      const result = await executeTool("get_assignments", {
        due_after: "2026-09-04",
        due_before: "2026-09-18",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as any;
        expect(Array.isArray(data.assignments)).toBe(true);
        for (const a of data.assignments) {
          expect(a.deadline >= "2026-09-04").toBe(true);
          expect(a.deadline <= "2026-09-18").toBe(true);
        }
      }
    });

    it("Scenario 4: \"Show me all high priority announcements.\" (get_announcements)", async () => {
      const result = await executeTool("get_announcements", { priority: "high" });
      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as any;
        expect(Array.isArray(data.announcements)).toBe(true);
        expect(data.announcements.length).toBeGreaterThan(0);
        for (const ann of data.announcements) {
          expect(ann.priority).toBe("high");
        }
      }
    });

    it("Scenario 5: Multi-source \"Which labs have a projector and can fit at least 30 people?\"", async () => {
      const result = await executeTool("get_rooms", {
        type: "lab",
        min_capacity: 30,
        equipment: "projector",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as any;
        expect(Array.isArray(data.rooms)).toBe(true);
        expect(data.rooms.length).toBeGreaterThan(0);
        for (const r of data.rooms) {
          expect(r.type).toBe("lab");
          expect(r.capacity).toBeGreaterThanOrEqual(30);
          expect(r.equipment.some((eq: string) => eq.toLowerCase().includes("projector"))).toBe(true);
        }
      }
    });

    it("Scenario 6: \"Book Room 7A02 tomorrow from 3 PM to 5 PM.\" (book_room + check availability)", async () => {
      // 1. Check availability
      const avail = await executeTool("get_room_availability", {
        date: "2026-09-15",
        start_time: "15:00",
        end_time: "17:00",
      });
      expect(avail.success).toBe(true);

      // 2. Book
      const booking = await executeTool("book_room", {
        room_number: "7A02",
        date: "2026-09-15",
        start_time: "15:00",
        end_time: "17:00",
        booked_by: "AI-Test Student",
        purpose: "Judge Test Study Group",
      });
      expect(booking.success).toBe(true);
      if (booking.success) {
        const data = booking.data as any;
        expect(data.booking).toBeDefined();
        expect(data.booking.room_number).toBe("7A02");
        expect(data.booking.start_time).toBe("15:00");
        expect(data.booking.end_time).toBe("17:00");

        // Clean up immediately
        await prisma.booking.delete({
          where: { bookingId: data.booking.booking_id },
        });
      }
    });

    it("Scenario 7: \"Register me for the Guest Lecture on Deep Learning.\" (get_event + register_for_event)", async () => {
      // 1. Find the event
      const eventLookup = await executeTool("get_event", {
        name: "Deep Learning",
      });
      expect(eventLookup.success).toBe(true);
      if (eventLookup.success) {
        const events = (eventLookup.data as any).events;
        expect(events).toBeDefined();
        expect(events.length).toBeGreaterThan(0);
        const event = events[0];
        expect(event.name).toContain("Deep Learning");

        // 2. Register with a fresh student ID
        const reg = await executeTool("register_for_event", {
          event_id: event.id,
          student_id: "20-99902",
          student_name: "AI Test Candidate",
        });
        expect(reg.success).toBe(true);
        if (reg.success) {
          const regData = reg.data as any;
          expect(regData.event).toBeDefined();
          expect(regData.event.registered).toBeGreaterThan(0);

          // 3. Cancel registration to leave state clean
          const cancelReg = await executeTool("cancel_event_registration", {
            event_id: event.id,
            student_id: "20-99902",
          });
          expect(cancelReg.success).toBe(true);
        }
      }
    });

    it("Scenario 8: \"I need a room for 5 people with a projector, tomorrow between 2 and 4.\"", async () => {
      const avail = await executeTool("get_room_availability", {
        date: "2026-09-15",
        start_time: "14:00",
        end_time: "16:00",
        min_capacity: 5,
        equipment: "projector",
      });
      expect(avail.success).toBe(true);
      if (avail.success) {
        const data = avail.data as any;
        expect(Array.isArray(data.available)).toBe(true);
        expect(data.available.length).toBeGreaterThan(0);
        for (const room of data.available) {
          expect(room.capacity).toBeGreaterThanOrEqual(5);
          expect(room.equipment.some((eq: string) => eq.toLowerCase().includes("projector"))).toBe(true);
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // M14: Edge Cases and Negative Paths
  // -------------------------------------------------------------------------
  describe("Edge Cases and Failure Handling", () => {
    it("handles unknown tool gracefully", async () => {
      const result = await executeTool("non_existent_tool", {});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Unknown tool");
      }
    });

    it("handles booking with missing parameters gracefully", async () => {
      const result = await executeTool("book_room", { room_number: "7A01" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/missing|invalid/i);
      }
    });

    it("rejects booking for non-existent room", async () => {
      const result = await executeTool("book_room", {
        room_number: "ROOM-DOES-NOT-EXIST",
        date: "2026-09-15",
        start_time: "10:00",
        end_time: "11:00",
        booked_by: "AI-Test",
        purpose: "Testing non-existent room",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/does not exist|not found/i);
      }
    });

    it("rejects conflicting room booking (double booking)", async () => {
      // Create first booking
      const b1 = await executeTool("book_room", {
        room_number: "7A02",
        date: "2026-09-22",
        start_time: "10:00",
        end_time: "12:00",
        booked_by: "AI-Test Person 1",
        purpose: "First Booking",
      });
      expect(b1.success).toBe(true);

      // Attempt second overlapping booking on same room and slot
      const b2 = await executeTool("book_room", {
        room_number: "7A02",
        date: "2026-09-22",
        start_time: "11:00",
        end_time: "13:00",
        booked_by: "AI-Test Person 2",
        purpose: "Overlapping Booking Attempt",
      });
      expect(b2.success).toBe(false);
      if (!b2.success) {
        expect(b2.error).toMatch(/already booked|conflict/i);
      }

      // Clean up first booking
      if (b1.success) {
        await prisma.booking.delete({
          where: { bookingId: (b1.data as any).booking.booking_id },
        });
      }
    });

    it("rejects booking during scheduled class timetable", async () => {
      // On Sunday (2026-09-06), 7A07 has CSE 4113 from 13:00 to 13:50
      const result = await executeTool("book_room", {
        room_number: "7A07",
        date: "2026-09-06",
        start_time: "13:00",
        end_time: "14:00",
        booked_by: "AI-Test Class Clash",
        purpose: "Clashing with CSE 4113",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/class scheduled|conflicting/i);
      }
    });

    it("rejects event registration for full event", async () => {
      // evt-006 (Workshop: Git & GitHub) is full (30/30) in seed data
      const result = await executeTool("register_for_event", {
        event_id: "evt-006",
        student_id: "20-99999",
        student_name: "Hopeful Student",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/full/i);
      }
    });

    it("rejects duplicate event registration", async () => {
      // student 20-40532 is already registered for evt-002 in seed data
      const result = await executeTool("register_for_event", {
        event_id: "evt-002",
        student_id: "20-40532",
        student_name: "Sakibul Hassan",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/already registered|conflict/i);
      }
    });

    it("rejects registration for non-existent event", async () => {
      const result = await executeTool("register_for_event", {
        event_id: "evt-non-existent",
        student_id: "20-99999",
        student_name: "Student",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/not found/i);
      }
    });

    it("handles event search with no matches safely", async () => {
      const result = await executeTool("get_event", {
        name: "Completely Non Existent Event Name 12345",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("No event found");
      }
    });
  });

  // -------------------------------------------------------------------------
  // M15: Live Persistence & Mutation Roundtrip
  // -------------------------------------------------------------------------
  describe("Live Persistence & CRUD via Tool Layer", () => {
    it("creates, updates, and deletes an announcement through tools", async () => {
      // 1. Create
      const createRes = await executeTool("create_announcement", {
        title: "AI Tool Test Notice",
        body: "Notice created by AI tool verification suite",
        priority: "high",
        posted_by: "AI Test Suite",
        date: "2026-09-04",
        expires: "2026-09-20",
      });
      expect(createRes.success).toBe(true);
      const annId = (createRes.data as any).announcement.id;

      // 2. Verify in DB
      const inDb = await prisma.announcement.findUnique({ where: { id: annId } });
      expect(inDb).not.toBeNull();
      expect(inDb?.title).toBe("AI Tool Test Notice");

      // 3. Update
      const updateRes = await executeTool("update_announcement", {
        id: annId,
        title: "Updated AI Tool Test Notice",
      });
      expect(updateRes.success).toBe(true);

      // Verify updated in DB
      const updatedInDb = await prisma.announcement.findUnique({ where: { id: annId } });
      expect(updatedInDb?.title).toBe("Updated AI Tool Test Notice");

      // 4. Delete
      const deleteRes = await executeTool("delete_announcement", { id: annId });
      expect(deleteRes.success).toBe(true);

      // Verify gone from DB
      const deletedInDb = await prisma.announcement.findUnique({ where: { id: annId } });
      expect(deletedInDb).toBeNull();
    });
  });
});

