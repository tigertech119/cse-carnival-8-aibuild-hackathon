// Domain Types matching schema/schema.md exactly

export type DayOfWeek = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday";

export interface Schedule {
  id: string;
  course: string;
  title: string;
  day: DayOfWeek;
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  room: string;
  instructor: string;
  section: string;
}

export interface Booking {
  booking_id: string;
  room_number?: string;
  booked_by: string;
  date: string;       // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  purpose: string;
}

export type RoomType = "classroom" | "lab" | "seminar";
export type RoomStatus = "available" | "unavailable";

export interface Room {
  id: string;
  room_number: string;
  type: RoomType;
  capacity: number;
  equipment: string[];
  floor: number;
  status: RoomStatus;
  bookings: Booking[];
}

export interface Registration {
  student_id: string;
  name: string;
}

export type EventStatus = "upcoming" | "ongoing" | "completed" | "cancelled" | "full";

export interface Event {
  id: string;
  name: string;
  description: string;
  date: string;       // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  end_date: string;   // YYYY-MM-DD
  venue: string;
  organizer: string;
  capacity: number;
  registered: number;
  registrations: Registration[];
  status: EventStatus;
}

export type Priority = "high" | "medium" | "low";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;       // YYYY-MM-DD
  priority: Priority;
  posted_by: string;
  expires: string;    // YYYY-MM-DD
}

export type AssignmentStatus = "pending" | "submitted" | "graded" | "late";

export interface Assignment {
  id: string;
  course: string;
  course_title: string;
  title: string;
  description: string;
  assigned_date: string; // YYYY-MM-DD
  deadline: string;      // YYYY-MM-DD
  submission_platform: string;
  status: AssignmentStatus;
  marks: number;
}
