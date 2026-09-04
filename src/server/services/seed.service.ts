import { prisma } from "@/lib/prisma";
import * as fs from "fs";
import * as path from "path";

export class SeedService {
  static async resetAndSeed(): Promise<{
    success: boolean;
    counts: {
      rooms: number;
      schedules: number;
      events: number;
      announcements: number;
      assignments: number;
    };
  }> {
    const dataDir = path.join(process.cwd(), "data");

    // Clean all existing data in reverse foreign key order
    await prisma.$transaction([
      prisma.registration.deleteMany(),
      prisma.booking.deleteMany(),
      prisma.schedule.deleteMany(),
      prisma.event.deleteMany(),
      prisma.announcement.deleteMany(),
      prisma.assignment.deleteMany(),
      prisma.room.deleteMany(),
    ]);

    // 1. Seed Rooms and Bookings
    const roomsRaw = fs.readFileSync(path.join(dataDir, "rooms.json"), "utf-8");
    const roomsData = JSON.parse(roomsRaw);
    for (const r of roomsData) {
      await prisma.room.create({
        data: {
          id: r.id,
          roomNumber: r.room_number,
          type: r.type,
          capacity: r.capacity,
          equipment: JSON.stringify(r.equipment || []),
          floor: r.floor,
          status: r.status,
        },
      });

      if (r.bookings && Array.isArray(r.bookings)) {
        for (const b of r.bookings) {
          await prisma.booking.create({
            data: {
              bookingId: b.booking_id,
              roomNumber: r.room_number,
              bookedBy: b.booked_by,
              date: b.date,
              startTime: b.start_time,
              endTime: b.end_time,
              purpose: b.purpose,
            },
          });
        }
      }
    }

    // 2. Seed Schedules
    const schedulesRaw = fs.readFileSync(path.join(dataDir, "schedules.json"), "utf-8");
    const schedulesData = JSON.parse(schedulesRaw);
    for (const s of schedulesData) {
      await prisma.schedule.create({
        data: {
          id: s.id,
          course: s.course,
          title: s.title,
          day: s.day,
          startTime: s.start_time,
          endTime: s.end_time,
          room: s.room,
          instructor: s.instructor,
          section: s.section,
        },
      });
    }

    // 3. Seed Events and Registrations
    const eventsRaw = fs.readFileSync(path.join(dataDir, "events.json"), "utf-8");
    const eventsData = JSON.parse(eventsRaw);
    for (const e of eventsData) {
      await prisma.event.create({
        data: {
          id: e.id,
          name: e.name,
          description: e.description,
          date: e.date,
          startTime: e.start_time,
          endTime: e.end_time,
          endDate: e.end_date || e.date,
          venue: e.venue,
          organizer: e.organizer,
          capacity: e.capacity,
          registered: e.registered || 0,
          status: e.status || "upcoming",
        },
      });

      if (e.registrations && Array.isArray(e.registrations)) {
        for (const reg of e.registrations) {
          await prisma.registration.create({
            data: {
              eventId: e.id,
              studentId: reg.student_id,
              name: reg.name,
            },
          });
        }
      }
    }

    // 4. Seed Announcements
    const announcementsRaw = fs.readFileSync(path.join(dataDir, "announcements.json"), "utf-8");
    const announcementsData = JSON.parse(announcementsRaw);
    for (const a of announcementsData) {
      await prisma.announcement.create({
        data: {
          id: a.id,
          title: a.title,
          body: a.body,
          date: a.date,
          priority: a.priority,
          postedBy: a.posted_by,
          expires: a.expires,
        },
      });
    }

    // 5. Seed Assignments
    const assignmentsRaw = fs.readFileSync(path.join(dataDir, "assignments.json"), "utf-8");
    const assignmentsData = JSON.parse(assignmentsRaw);
    for (const asgn of assignmentsData) {
      await prisma.assignment.create({
        data: {
          id: asgn.id,
          course: asgn.course,
          courseTitle: asgn.course_title,
          title: asgn.title,
          description: asgn.description,
          assignedDate: asgn.assigned_date,
          deadline: asgn.deadline,
          submissionPlatform: asgn.submission_platform,
          status: asgn.status,
          marks: asgn.marks,
        },
      });
    }

    const [rooms, schedules, events, announcements, assignments] = await Promise.all([
      prisma.room.count(),
      prisma.schedule.count(),
      prisma.event.count(),
      prisma.announcement.count(),
      prisma.assignment.count(),
    ]);

    return {
      success: true,
      counts: {
        rooms,
        schedules,
        events,
        announcements,
        assignments,
      },
    };
  }
}
