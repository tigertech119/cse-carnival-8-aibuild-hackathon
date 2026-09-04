import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting idempotent seed import from data/*.json...");

  const dataDir = path.join(process.cwd(), "data");

  // 1. Seed Rooms and nested Bookings
  const roomsRaw = fs.readFileSync(path.join(dataDir, "rooms.json"), "utf-8");
  const roomsData = JSON.parse(roomsRaw);

  console.log(`Loading ${roomsData.length} rooms...`);
  for (const r of roomsData) {
    await prisma.room.upsert({
      where: { roomNumber: r.room_number },
      update: {
        type: r.type,
        capacity: r.capacity,
        equipment: JSON.stringify(r.equipment || []),
        floor: r.floor,
        status: r.status,
      },
      create: {
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
        await prisma.booking.upsert({
          where: { bookingId: b.booking_id },
          update: {
            roomNumber: r.room_number,
            bookedBy: b.booked_by,
            date: b.date,
            startTime: b.start_time,
            endTime: b.end_time,
            purpose: b.purpose,
          },
          create: {
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

  console.log(`Loading ${schedulesData.length} schedules...`);
  for (const s of schedulesData) {
    await prisma.schedule.upsert({
      where: { id: s.id },
      update: {
        course: s.course,
        title: s.title,
        day: s.day,
        startTime: s.start_time,
        endTime: s.end_time,
        room: s.room,
        instructor: s.instructor,
        section: s.section,
      },
      create: {
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

  // 3. Seed Events and nested Registrations
  const eventsRaw = fs.readFileSync(path.join(dataDir, "events.json"), "utf-8");
  const eventsData = JSON.parse(eventsRaw);

  console.log(`Loading ${eventsData.length} events...`);
  for (const e of eventsData) {
    await prisma.event.upsert({
      where: { id: e.id },
      update: {
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
      create: {
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
        await prisma.registration.upsert({
          where: {
            eventId_studentId: {
              eventId: e.id,
              studentId: reg.student_id,
            },
          },
          update: {
            name: reg.name,
          },
          create: {
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

  console.log(`Loading ${announcementsData.length} announcements...`);
  for (const a of announcementsData) {
    await prisma.announcement.upsert({
      where: { id: a.id },
      update: {
        title: a.title,
        body: a.body,
        date: a.date,
        priority: a.priority,
        postedBy: a.posted_by,
        expires: a.expires,
      },
      create: {
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

  console.log(`Loading ${assignmentsData.length} assignments...`);
  for (const asgn of assignmentsData) {
    await prisma.assignment.upsert({
      where: { id: asgn.id },
      update: {
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
      create: {
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

  console.log("✅ Seed import completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed import failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
