import { z } from "zod";

export const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const timeSchema = z
  .string()
  .regex(timeRegex, "Time must be in 24-hour HH:MM format (e.g. 08:00, 13:30)");

export const dateSchema = z
  .string()
  .regex(dateRegex, "Date must be in YYYY-MM-DD ISO format (e.g. 2026-09-07)");

export const dayOfWeekSchema = z.enum(
  ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
  {
    errorMap: () => ({
      message: "Day must be an academic day: Sunday, Monday, Tuesday, Wednesday, or Thursday",
    }),
  }
);

export const roomTypeSchema = z.enum(["classroom", "lab", "seminar"]);
export const roomStatusSchema = z.enum(["available", "unavailable"]);

export const eventStatusSchema = z.enum([
  "upcoming",
  "ongoing",
  "completed",
  "cancelled",
  "full",
]);

export const prioritySchema = z.enum(["high", "medium", "low"]);

export const assignmentStatusSchema = z.enum([
  "pending",
  "submitted",
  "graded",
  "late",
]);

// 1. Schedule Validation
export const baseScheduleSchema = z.object({
  id: z.string().optional(),
  course: z.string().min(1, "Course code is required (e.g. CSE 4113)"),
  title: z.string().min(1, "Course title is required"),
  day: dayOfWeekSchema,
  start_time: timeSchema,
  end_time: timeSchema,
  room: z.string().min(1, "Room is required"),
  instructor: z.string().min(1, "Instructor is required"),
  section: z.string().min(1, "Section is required"),
});

export const createScheduleSchema = baseScheduleSchema.refine(
  (data) => data.start_time < data.end_time,
  {
    message: "end_time must be later than start_time",
    path: ["end_time"],
  }
);

export const updateScheduleSchema = baseScheduleSchema.partial().refine(
  (data) => {
    if (data.start_time && data.end_time) {
      return data.start_time < data.end_time;
    }
    return true;
  },
  {
    message: "end_time must be later than start_time",
    path: ["end_time"],
  }
);

// 2. Room Validation
export const baseRoomSchema = z.object({
  id: z.string().optional(),
  room_number: z.string().min(1, "Room number is required (e.g. 7A01)"),
  type: roomTypeSchema,
  capacity: z.number().int().positive("Capacity must be a positive integer"),
  equipment: z.array(z.string()).default([]),
  floor: z.number().int().default(7),
  status: roomStatusSchema.default("available"),
});

export const createRoomSchema = baseRoomSchema;
export const updateRoomSchema = baseRoomSchema.partial();

// 3. Booking Validation
export const baseBookingSchema = z.object({
  booking_id: z.string().optional(),
  room_number: z.string().min(1, "Room number is required"),
  booked_by: z.string().min(1, "Booked by name or entity is required"),
  date: dateSchema,
  start_time: timeSchema,
  end_time: timeSchema,
  purpose: z.string().min(1, "Purpose is required"),
});

export const createBookingSchema = baseBookingSchema.refine(
  (data) => data.start_time < data.end_time,
  {
    message: "end_time must be later than start_time",
    path: ["end_time"],
  }
);

// 4. Event Validation
export const baseEventSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Event name is required"),
  description: z.string().min(1, "Description is required"),
  date: dateSchema,
  start_time: timeSchema,
  end_time: timeSchema,
  end_date: dateSchema.optional(),
  venue: z.string().min(1, "Venue room is required"),
  organizer: z.string().min(1, "Organizer is required"),
  capacity: z.number().int().positive("Capacity must be positive"),
  registered: z.number().int().nonnegative().default(0),
  status: eventStatusSchema.default("upcoming"),
});

export const createEventSchema = baseEventSchema.refine(
  (data) => {
    const endDate = data.end_date || data.date;
    if (endDate === data.date) {
      return data.start_time < data.end_time;
    }
    return endDate >= data.date;
  },
  {
    message: "Event end date/time must be after start date/time",
    path: ["end_time"],
  }
);

export const updateEventSchema = baseEventSchema.partial().refine(
  (data) => {
    if (data.date && data.start_time && data.end_time) {
      const endDate = data.end_date || data.date;
      if (endDate === data.date) {
        return data.start_time < data.end_time;
      }
      return endDate >= data.date;
    }
    return true;
  },
  {
    message: "Event end date/time must be after start date/time",
    path: ["end_time"],
  }
);

// 5. Registration Validation
export const createRegistrationSchema = z.object({
  student_id: z.string().min(1, "Student ID is required (e.g. 20-40532)"),
  name: z.string().min(1, "Student name is required"),
});

// 6. Announcement Validation
export const baseAnnouncementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  date: dateSchema,
  priority: prioritySchema,
  posted_by: z.string().min(1, "Posted by is required"),
  expires: dateSchema,
});

export const createAnnouncementSchema = baseAnnouncementSchema.refine(
  (data) => data.expires >= data.date,
  {
    message: "Expiration date cannot be earlier than posted date",
    path: ["expires"],
  }
);

export const updateAnnouncementSchema = baseAnnouncementSchema.partial().refine(
  (data) => {
    if (data.date && data.expires) {
      return data.expires >= data.date;
    }
    return true;
  },
  {
    message: "Expiration date cannot be earlier than posted date",
    path: ["expires"],
  }
);

// 7. Assignment Validation
export const baseAssignmentSchema = z.object({
  id: z.string().optional(),
  course: z.string().min(1, "Course code is required (e.g. CSE 4113)"),
  course_title: z.string().min(1, "Course title is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  assigned_date: dateSchema,
  deadline: dateSchema,
  submission_platform: z.string().min(1, "Submission platform is required"),
  status: assignmentStatusSchema.default("pending"),
  marks: z.number().int().nonnegative("Marks must be non-negative"),
});

export const createAssignmentSchema = baseAssignmentSchema.refine(
  (data) => data.deadline >= data.assigned_date,
  {
    message: "Deadline cannot be earlier than assigned date",
    path: ["deadline"],
  }
);

export const updateAssignmentSchema = baseAssignmentSchema.partial().refine(
  (data) => {
    if (data.assigned_date && data.deadline) {
      return data.deadline >= data.assigned_date;
    }
    return true;
  },
  {
    message: "Deadline cannot be earlier than assigned date",
    path: ["deadline"],
  }
);

// Helper: Check if two time intervals overlap on the same day:
// Interval 1: [start1, end1), Interval 2: [start2, end2)
export function isTimeOverlapping(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return Math.max(start1.localeCompare(start2), 0) < 0
    ? start1 < end2 && end1 > start2
    : start2 < end1 && end2 > start1;
}

// Convert date string YYYY-MM-DD to DayOfWeek
export function getDayOfWeekFromDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getUTCDay()];
}
