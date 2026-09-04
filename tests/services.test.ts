import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";
import { ScheduleService } from "../src/server/services/schedule.service";
import { RoomService } from "../src/server/services/room.service";
import { BookingService } from "../src/server/services/booking.service";
import { EventService } from "../src/server/services/event.service";
import { RegistrationService } from "../src/server/services/registration.service";
import { AnnouncementService } from "../src/server/services/announcement.service";
import { AssignmentService } from "../src/server/services/assignment.service";
import { isTimeOverlapping, getDayOfWeekFromDate } from "../src/validation";

describe("CampusOS Domain Services & Validation (Phase 1)", () => {
  beforeAll(async () => {
    // Ensure test room exists
    await prisma.room.upsert({
      where: { roomNumber: "TEST-101" },
      update: { status: "available", capacity: 30 },
      create: {
        id: "room-test-101",
        roomNumber: "TEST-101",
        type: "lab",
        capacity: 30,
        equipment: JSON.stringify(["projector", "AC", "computers"]),
        floor: 7,
        status: "available",
      },
    });

    // Ensure full test event exists
    await prisma.event.upsert({
      where: { id: "evt-test-full" },
      update: { capacity: 2, registered: 2, status: "full" },
      create: {
        id: "evt-test-full",
        name: "Full Test Event",
        description: "Test event that is already at capacity",
        date: "2026-09-20",
        startTime: "10:00",
        endTime: "12:00",
        endDate: "2026-09-20",
        venue: "TEST-101",
        organizer: "Test Org",
        capacity: 2,
        registered: 2,
        status: "full",
      },
    });

    // Add registration for student 20-00001
    await prisma.registration.upsert({
      where: {
        eventId_studentId: {
          eventId: "evt-test-full",
          studentId: "20-00001",
        },
      },
      update: {},
      create: {
        eventId: "evt-test-full",
        studentId: "20-00001",
        name: "Existing Student One",
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.registration.deleteMany({ where: { eventId: "evt-test-full" } });
    await prisma.event.deleteMany({ where: { id: "evt-test-full" } });
    await prisma.booking.deleteMany({ where: { roomNumber: "TEST-101" } });
    await prisma.schedule.deleteMany({ where: { room: "TEST-101" } });
    await prisma.room.deleteMany({ where: { roomNumber: "TEST-101" } });
    await prisma.$disconnect();
  });

  describe("Utility Functions", () => {
    it("should correctly detect overlapping time intervals", () => {
      expect(isTimeOverlapping("08:00", "10:00", "09:00", "11:00")).toBe(true);
      expect(isTimeOverlapping("08:00", "10:00", "10:00", "12:00")).toBe(false); // contiguous
      expect(isTimeOverlapping("14:00", "16:00", "13:00", "15:00")).toBe(true);
      expect(isTimeOverlapping("14:00", "16:00", "16:30", "18:00")).toBe(false);
    });

    it("should resolve academic day of week from ISO date", () => {
      // 2026-09-06 is Sunday
      expect(getDayOfWeekFromDate("2026-09-06")).toBe("Sunday");
      // 2026-09-07 is Monday
      expect(getDayOfWeekFromDate("2026-09-07")).toBe("Monday");
      // 2026-09-09 is Wednesday
      expect(getDayOfWeekFromDate("2026-09-09")).toBe("Wednesday");
    });
  });

  describe("ScheduleService", () => {
    it("should reject schedule creation with end_time <= start_time", async () => {
      await expect(
        ScheduleService.create({
          course: "CSE 9999",
          title: "Invalid Timing Course",
          day: "Sunday",
          start_time: "14:00",
          end_time: "13:00",
          room: "TEST-101",
          instructor: "Dr. Test",
          section: "A",
        })
      ).rejects.toThrow("end_time must be later than start_time");
    });

    it("should reject schedule creation with non-academic day", async () => {
      await expect(
        ScheduleService.create({
          course: "CSE 9999",
          title: "Friday Class",
          day: "Friday" as any,
          start_time: "10:00",
          end_time: "11:00",
          room: "TEST-101",
          instructor: "Dr. Test",
          section: "A",
        })
      ).rejects.toThrow();
    });
  });

  describe("RoomService & BookingService", () => {
    it("should create booking when room is free", async () => {
      const booking = await BookingService.create({
        booking_id: "bk-test-001",
        room_number: "TEST-101",
        booked_by: "Test User",
        date: "2026-09-21",
        start_time: "10:00",
        end_time: "12:00",
        purpose: "Research Meeting",
      });

      expect(booking.booking_id).toBe("bk-test-001");
      expect(booking.room_number).toBe("TEST-101");
    });

    it("should reject overlapping booking for the same room and date", async () => {
      await expect(
        BookingService.create({
          room_number: "TEST-101",
          booked_by: "Another User",
          date: "2026-09-21",
          start_time: "11:00",
          end_time: "13:00",
          purpose: "Conflicting Meeting",
        })
      ).rejects.toThrow(/already booked/);
    });

    it("should cancel an existing booking", async () => {
      const res = await BookingService.cancel("bk-test-001");
      expect(res.success).toBe(true);
      expect(res.booking_id).toBe("bk-test-001");
    });
  });

  describe("RegistrationService & Event Capacity Limits", () => {
    it("should reject registration when event is full", async () => {
      await expect(
        RegistrationService.register("evt-test-full", {
          student_id: "20-00002",
          name: "New Student",
        })
      ).rejects.toThrow(/already full/);
    });

    it("should reject duplicate registration for the same student", async () => {
      await expect(
        RegistrationService.register("evt-test-full", {
          student_id: "20-00001",
          name: "Existing Student One",
        })
      ).rejects.toThrow();
    });
  });

  describe("AnnouncementService", () => {
    it("should reject announcement where expiry date is earlier than posted date", async () => {
      await expect(
        AnnouncementService.create({
          title: "Past Notice",
          body: "This notice expired before it was posted",
          date: "2026-09-10",
          expires: "2026-09-05",
          priority: "high",
          posted_by: "Admin",
        })
      ).rejects.toThrow(/Expiration date cannot be earlier/);
    });
  });

  describe("AssignmentService", () => {
    it("should reject assignment with invalid status or negative marks", async () => {
      await expect(
        AssignmentService.create({
          course: "CSE 4113",
          course_title: "Machine Learning",
          title: "Invalid Assignment",
          description: "Testing negative marks",
          assigned_date: "2026-09-01",
          deadline: "2026-09-10",
          submission_platform: "Google Classroom",
          status: "unknown_status" as any,
          marks: -5,
        })
      ).rejects.toThrow();
    });
  });
});
