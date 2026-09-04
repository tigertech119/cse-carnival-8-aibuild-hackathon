import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";

// Import Route Handlers
import { GET as getSchedules, POST as postSchedule } from "../src/app/api/schedules/route";
import { GET as getScheduleById, PUT as putSchedule, DELETE as deleteSchedule } from "../src/app/api/schedules/[id]/route";

import { GET as getRooms, POST as postRoom } from "../src/app/api/rooms/route";
import { GET as getRoomById, PUT as putRoom, DELETE as deleteRoom } from "../src/app/api/rooms/[id]/route";
import { GET as getAvailability, POST as postAvailability } from "../src/app/api/rooms/availability/route";

import { GET as getBookings, POST as postBooking } from "../src/app/api/bookings/route";
import { DELETE as deleteBooking } from "../src/app/api/bookings/[id]/route";

import { GET as getEvents, POST as postEvent } from "../src/app/api/events/route";
import { GET as getEventById, DELETE as deleteEvent } from "../src/app/api/events/[id]/route";
import { GET as getRegistrations, POST as postRegistration, DELETE as deleteRegistration } from "../src/app/api/events/[id]/registrations/route";

import { GET as getAnnouncements, POST as postAnnouncement } from "../src/app/api/announcements/route";
import { DELETE as deleteAnnouncement } from "../src/app/api/announcements/[id]/route";

import { GET as getAssignments, POST as postAssignment } from "../src/app/api/assignments/route";
import { PUT as putAssignment, DELETE as deleteAssignment } from "../src/app/api/assignments/[id]/route";

import { POST as postReset } from "../src/app/api/reset/route";

describe("CampusOS Complete CRUD API (Milestone M4)", () => {
  beforeAll(async () => {
    // Clean and seed fresh data
    const resetReq = new NextRequest("http://localhost:3000/api/reset", { method: "POST" });
    const resetRes = await postReset(resetReq);
    expect(resetRes.status).toBe(200);
  });

  // 1. Schedules API
  describe("Schedules API", () => {
    it("lists schedules with day filter", async () => {
      const req = new NextRequest("http://localhost:3000/api/schedules?day=Sunday");
      const res = await getSchedules(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.schedules).toBeDefined();
      expect(Array.isArray(json.schedules)).toBe(true);
      expect(json.schedules.every((s: any) => s.day === "Sunday")).toBe(true);
    });

    it("creates, updates, and deletes a schedule", async () => {
      const testId = "sch-api-test-01";
      const postReq = new NextRequest("http://localhost:3000/api/schedules", {
        method: "POST",
        body: JSON.stringify({
          id: testId,
          course: "CSE 9999",
          title: "API Testing Special",
          day: "Sunday",
          start_time: "07:30",
          end_time: "09:00",
          room: "7A01",
          instructor: "Prof. Unit Test",
          section: "A",
        }),
      });
      const postRes = await postSchedule(postReq);
      expect(postRes.status).toBe(201);
      const created = await postRes.json();
      expect(created.id).toBe(testId);

      // GET by id
      const getReq = new NextRequest(`http://localhost:3000/api/schedules/${testId}`);
      const getRes = await getScheduleById(getReq, { params: { id: testId } });
      expect(getRes.status).toBe(200);
      const fetched = await getRes.json();
      expect(fetched.title).toBe("API Testing Special");

      // PUT update
      const putReq = new NextRequest(`http://localhost:3000/api/schedules/${testId}`, {
        method: "PUT",
        body: JSON.stringify({ title: "API Testing Special Updated" }),
      });
      const putRes = await putSchedule(putReq, { params: { id: testId } });
      expect(putRes.status).toBe(200);
      const updated = await putRes.json();
      expect(updated.title).toBe("API Testing Special Updated");

      // DELETE
      const delReq = new NextRequest(`http://localhost:3000/api/schedules/${testId}`, { method: "DELETE" });
      const delRes = await deleteSchedule(delReq, { params: { id: testId } });
      expect(delRes.status).toBe(200);
    });
  });

  // 2. Rooms and Availability API
  describe("Rooms and Availability API", () => {
    it("lists rooms and checks availability against bookings & timetables", async () => {
      const req = new NextRequest("http://localhost:3000/api/rooms?type=classroom");
      const res = await getRooms(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.rooms.length).toBeGreaterThan(0);
      expect(json.rooms.every((r: any) => r.type === "classroom")).toBe(true);

      // Check availability on 2026-09-06 (Sunday)
      const availReq = new NextRequest(
        "http://localhost:3000/api/rooms/availability?date=2026-09-06&start_time=09:00&end_time=10:30"
      );
      const availRes = await getAvailability(availReq);
      expect(availRes.status).toBe(200);
      const availJson = await availRes.json();
      expect(availJson.available).toBeDefined();
      expect(availJson.unavailable).toBeDefined();
    });
  });

  // 3. Bookings API
  describe("Bookings API & Conflict Protection", () => {
    it("creates a booking and rejects overlapping collisions with 409", async () => {
      const bId = "bk-api-test-01";
      const req1 = new NextRequest("http://localhost:3000/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          booking_id: bId,
          room_number: "7C01",
          booked_by: "Test Researcher",
          date: "2026-09-25",
          start_time: "14:00",
          end_time: "16:00",
          purpose: "Seminar on AI",
        }),
      });
      const res1 = await postBooking(req1);
      expect(res1.status).toBe(201);

      // Conflicting booking
      const req2 = new NextRequest("http://localhost:3000/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          booking_id: "bk-conflict-01",
          room_number: "7C01",
          booked_by: "Another Person",
          date: "2026-09-25",
          start_time: "15:00",
          end_time: "17:00",
          purpose: "Conflicting Workshop",
        }),
      });
      const res2 = await postBooking(req2);
      expect(res2.status).toBe(409); // ConflictError
      const errJson = await res2.json();
      expect(errJson.code).toBe("ConflictError");

      // Cancel booking
      const delReq = new NextRequest(`http://localhost:3000/api/bookings/${bId}`, { method: "DELETE" });
      const delRes = await deleteBooking(delReq, { params: { id: bId } });
      expect(delRes.status).toBe(200);
    });
  });

  // 4. Events & Registration API
  describe("Events & Registration API", () => {
    it("registers student, prevents duplicates, enforces capacity, and cancels registration", async () => {
      // Create a test event with capacity 1
      const eventId = "evt-api-test-single";
      const createReq = new NextRequest("http://localhost:3000/api/events", {
        method: "POST",
        body: JSON.stringify({
          id: eventId,
          name: "Single Seat Masterclass",
          description: "Exclusive event",
          date: "2026-09-28",
          start_time: "10:00",
          end_time: "12:00",
          venue: "7C01",
          organizer: "ACM Chapter",
          capacity: 1,
          registered: 0,
          status: "upcoming",
        }),
      });
      const createRes = await postEvent(createReq);
      expect(createRes.status).toBe(201);

      // Register student 1
      const regReq1 = new NextRequest(`http://localhost:3000/api/events/${eventId}/registrations`, {
        method: "POST",
        body: JSON.stringify({ student_id: "STU-99001", name: "Alice Test" }),
      });
      const regRes1 = await postRegistration(regReq1, { params: { id: eventId } });
      expect(regRes1.status).toBe(201);
      const regJson1 = await regRes1.json();
      expect(regJson1.event.registered).toBe(1);
      expect(regJson1.event.status).toBe("full");

      // Attempt duplicate registration for student 1 -> 409 Conflict
      const dupReq = new NextRequest(`http://localhost:3000/api/events/${eventId}/registrations`, {
        method: "POST",
        body: JSON.stringify({ student_id: "STU-99001", name: "Alice Test" }),
      });
      const dupRes = await postRegistration(dupReq, { params: { id: eventId } });
      expect(dupRes.status).toBe(409);

      // Attempt registration for student 2 on full event -> 422 BusinessRuleError
      const fullReq = new NextRequest(`http://localhost:3000/api/events/${eventId}/registrations`, {
        method: "POST",
        body: JSON.stringify({ student_id: "STU-99002", name: "Bob Test" }),
      });
      const fullRes = await postRegistration(fullReq, { params: { id: eventId } });
      expect(fullRes.status).toBe(422);

      // Cancel registration for student 1
      const cancelReq = new NextRequest(
        `http://localhost:3000/api/events/${eventId}/registrations?student_id=STU-99001`,
        { method: "DELETE" }
      );
      const cancelRes = await deleteRegistration(cancelReq, { params: { id: eventId } });
      expect(cancelRes.status).toBe(200);
      const cancelJson = await cancelRes.json();
      expect(cancelJson.event.registered).toBe(0);

      // Clean up event
      const delEventReq = new NextRequest(`http://localhost:3000/api/events/${eventId}`, { method: "DELETE" });
      await deleteEvent(delEventReq, { params: { id: eventId } });
    });
  });

  // 5. Announcements API
  describe("Announcements API", () => {
    it("creates, filters, and deletes announcements", async () => {
      const annId = "ann-api-test-01";
      const createReq = new NextRequest("http://localhost:3000/api/announcements", {
        method: "POST",
        body: JSON.stringify({
          id: annId,
          title: "Urgent Campus Advisory",
          body: "Campus facilities will close early today for system maintenance.",
          priority: "high",
          posted_by: "Campus Admin",
          date: "2026-09-04",
          expires: "2026-09-10",
        }),
      });
      const createRes = await postAnnouncement(createReq);
      expect(createRes.status).toBe(201);

      // Filter by priority
      const filterReq = new NextRequest("http://localhost:3000/api/announcements?priority=high");
      const filterRes = await getAnnouncements(filterReq);
      expect(filterRes.status).toBe(200);
      const json = await filterRes.json();
      expect(json.announcements.some((a: any) => a.id === annId)).toBe(true);

      // Delete announcement
      const delReq = new NextRequest(`http://localhost:3000/api/announcements/${annId}`, { method: "DELETE" });
      const delRes = await deleteAnnouncement(delReq, { params: { id: annId } });
      expect(delRes.status).toBe(200);
    });
  });

  // 6. Assignments API
  describe("Assignments API", () => {
    it("creates, updates status, and deletes assignments", async () => {
      const asgnId = "asgn-api-test-01";
      const createReq = new NextRequest("http://localhost:3000/api/assignments", {
        method: "POST",
        body: JSON.stringify({
          id: asgnId,
          course: "CSE 3101",
          course_title: "Database Systems",
          title: "Relational Algebra Problem Set",
          description: "Complete exercises 1 through 10",
          assigned_date: "2026-09-04",
          deadline: "2026-09-18",
          submission_platform: "Moodle",
          status: "pending",
          marks: 25,
        }),
      });
      const createRes = await postAssignment(createReq);
      expect(createRes.status).toBe(201);

      // Update status to submitted
      const putReq = new NextRequest(`http://localhost:3000/api/assignments/${asgnId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "submitted" }),
      });
      const putRes = await putAssignment(putReq, { params: { id: asgnId } });
      expect(putRes.status).toBe(200);
      const updated = await putRes.json();
      expect(updated.status).toBe("submitted");

      // Delete
      const delReq = new NextRequest(`http://localhost:3000/api/assignments/${asgnId}`, { method: "DELETE" });
      const delRes = await deleteAssignment(delReq, { params: { id: asgnId } });
      expect(delRes.status).toBe(200);
    });
  });
});
