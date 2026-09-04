/**
 * CampusOS AI Tool Layer (M11)
 *
 * Defines all Gemini function-calling tool definitions and executor functions.
 * The LLM never accesses the database directly – every tool delegates to an
 * existing domain service in src/server/services/.
 */

import { SchemaType } from "@google/generative-ai";
import { ScheduleService } from "@/server/services/schedule.service";
import { RoomService } from "@/server/services/room.service";
import { BookingService } from "@/server/services/booking.service";
import { EventService } from "@/server/services/event.service";
import { RegistrationService } from "@/server/services/registration.service";
import { AnnouncementService } from "@/server/services/announcement.service";
import { AssignmentService } from "@/server/services/assignment.service";

// ---------------------------------------------------------------------------
// Shared result type
// ---------------------------------------------------------------------------

export type ToolResult =
  | { success: true; data: unknown }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Time helpers (all times expressed in UTC+6 / Bangladesh Standard Time)
// ---------------------------------------------------------------------------

/** Returns today's date string in YYYY-MM-DD, computed in UTC+6. */
function getTodayBDDate(): string {
  const now = new Date();
  const bd = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  return bd.toISOString().split("T")[0];
}

/** Returns the current HH:MM time string in UTC+6. */
function getCurrentBDTime(): string {
  const now = new Date();
  const bd = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const hh = String(bd.getUTCHours()).padStart(2, "0");
  const mm = String(bd.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Returns the day-of-week name (UTC+6) for the current moment. */
function getCurrentBDDayName(): string {
  const now = new Date();
  const bd = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const names = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return names[bd.getUTCDay()];
}

// Academic days in weekly order (Sun–Thu)
const ACADEMIC_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
] as const;

type AcademicDay = (typeof ACADEMIC_DAYS)[number];

// ---------------------------------------------------------------------------
// Individual tool executor functions
// ---------------------------------------------------------------------------

// --- READ: get_schedules ---------------------------------------------------

async function executeGetSchedules(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const schedules = await ScheduleService.list({
    day: args.day as string | undefined,
    course: args.course as string | undefined,
    room: args.room as string | undefined,
    instructor: args.instructor as string | undefined,
    section: args.section as string | undefined,
  });
  return { success: true, data: { schedules, count: schedules.length } };
}

// --- READ: get_next_class --------------------------------------------------

async function executeGetNextClass(
  _args: Record<string, unknown>
): Promise<ToolResult> {
  const todayName = getCurrentBDDayName();
  const currentTime = getCurrentBDTime();

  const todayIsAcademic = (ACADEMIC_DAYS as readonly string[]).includes(
    todayName
  );

  if (todayIsAcademic) {
    // Look for classes today that start after the current time
    const todaySchedules = await ScheduleService.list({ day: todayName });
    const remaining = todaySchedules.filter((s) => s.start_time > currentTime);

    if (remaining.length > 0) {
      remaining.sort((a, b) => a.start_time.localeCompare(b.start_time));
      const nextTime = remaining[0].start_time;
      const nextClasses = remaining.filter((s) => s.start_time === nextTime);
      return {
        success: true,
        data: {
          found: true,
          day: todayName,
          next_start_time: nextTime,
          classes: nextClasses,
          note: `Next class(es) today (${todayName}) starting at ${nextTime}`,
        },
      };
    }
  }

  // No more classes today (or today is a weekend) – find next academic day
  const todayAcademicIdx = (ACADEMIC_DAYS as readonly string[]).indexOf(
    todayName
  );

  // If today is not academic (Fri/Sat), start from Sunday (index 0)
  const startIdx =
    todayAcademicIdx === -1
      ? 0
      : (todayAcademicIdx + 1) % ACADEMIC_DAYS.length;

  for (let i = 0; i < ACADEMIC_DAYS.length; i++) {
    const candidateDay: AcademicDay =
      ACADEMIC_DAYS[(startIdx + i) % ACADEMIC_DAYS.length];
    const candidateSchedules = await ScheduleService.list({
      day: candidateDay,
    });

    if (candidateSchedules.length > 0) {
      candidateSchedules.sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );
      const nextTime = candidateSchedules[0].start_time;
      const nextClasses = candidateSchedules.filter(
        (s) => s.start_time === nextTime
      );
      return {
        success: true,
        data: {
          found: true,
          day: candidateDay,
          next_start_time: nextTime,
          classes: nextClasses,
          note: `Next class(es) on ${candidateDay} starting at ${nextTime}`,
        },
      };
    }
  }

  return {
    success: true,
    data: {
      found: false,
      note: "No upcoming classes found in the schedule for any academic day.",
    },
  };
}

// --- READ: get_assignments -------------------------------------------------

async function executeGetAssignments(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const assignments = await AssignmentService.list({
    status: args.status as string | undefined,
    due_before: args.due_before as string | undefined,
    due_after: args.due_after as string | undefined,
    course: args.course as string | undefined,
  });
  return { success: true, data: { assignments, count: assignments.length } };
}

// --- READ: get_announcements -----------------------------------------------

async function executeGetAnnouncements(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const activeOnly = args.active_only === true || args.active_only === "true";
  const announcements = await AnnouncementService.list({
    priority: args.priority as string | undefined,
    active_only: activeOnly,
    as_of_date: activeOnly ? getTodayBDDate() : undefined,
  });
  return {
    success: true,
    data: { announcements, count: announcements.length },
  };
}

// --- READ: get_rooms -------------------------------------------------------

async function executeGetRooms(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const equipmentArray =
    typeof args.equipment === "string"
      ? args.equipment
          .split(",")
          .map((e: string) => e.trim())
          .filter(Boolean)
      : undefined;

  const rooms = await RoomService.list({
    type: args.type as string | undefined,
    min_capacity:
      args.min_capacity !== undefined ? Number(args.min_capacity) : undefined,
    equipment: equipmentArray,
    status: args.status as string | undefined,
  });
  return { success: true, data: { rooms, count: rooms.length } };
}

// --- READ: get_room_availability ------------------------------------------

async function executeGetRoomAvailability(
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (!args.date || !args.start_time || !args.end_time) {
    return {
      success: false,
      error: "date, start_time, and end_time are required",
    };
  }

  const equipmentArray =
    typeof args.equipment === "string"
      ? args.equipment
          .split(",")
          .map((e: string) => e.trim())
          .filter(Boolean)
      : undefined;

  const result = await RoomService.checkAvailability({
    date: args.date as string,
    start_time: args.start_time as string,
    end_time: args.end_time as string,
    capacity:
      args.min_capacity !== undefined ? Number(args.min_capacity) : undefined,
    equipment: equipmentArray,
  });

  return {
    success: true,
    data: {
      date: args.date,
      start_time: args.start_time,
      end_time: args.end_time,
      available: result.available,
      unavailable: result.unavailable,
      available_count: result.available.length,
      unavailable_count: result.unavailable.length,
    },
  };
}

// --- READ: get_events ------------------------------------------------------

async function executeGetEvents(
  args: Record<string, unknown>
): Promise<ToolResult> {
  // EventService.list() exact-matches date, so fetch by status only then post-filter
  const allEvents = await EventService.list({
    status: args.status as string | undefined,
  });

  let events = allEvents;

  // Filter by date_from (inclusive)
  if (typeof args.date_from === "string" && args.date_from.trim() !== "") {
    const dateFrom = args.date_from as string;
    events = events.filter((e) => e.date >= dateFrom);
  }

  // Filter by name substring (case-insensitive)
  if (typeof args.name === "string" && args.name.trim() !== "") {
    const needle = (args.name as string).toLowerCase();
    events = events.filter((e) => e.name.toLowerCase().includes(needle));
  }

  // Re-sort by date asc, then start_time asc after filtering
  events.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    return dateCmp !== 0 ? dateCmp : a.start_time.localeCompare(b.start_time);
  });

  return { success: true, data: { events, count: events.length } };
}

// --- READ: get_event -------------------------------------------------------

async function executeGetEvent(
  args: Record<string, unknown>
): Promise<ToolResult> {
  if (args.event_id) {
    const event = await EventService.getById(args.event_id as string);
    return { success: true, data: { events: [event] } };
  }

  if (typeof args.name === "string" && args.name.trim() !== "") {
    const allEvents = await EventService.list();
    const needle = (args.name as string).toLowerCase();
    const matches = allEvents.filter((e) =>
      e.name.toLowerCase().includes(needle)
    );
    if (matches.length === 0) {
      return {
        success: false,
        error: `No event found matching name: "${args.name}"`,
      };
    }
    return {
      success: true,
      data: { events: matches, count: matches.length },
    };
  }

  return {
    success: false,
    error: "Provide either event_id or name to look up an event.",
  };
}

// ---------------------------------------------------------------------------
// ACTION TOOLS
// ---------------------------------------------------------------------------

// --- ACTION: book_room -----------------------------------------------------

async function executeBookRoom(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const booking = await BookingService.create({
    room_number: args.room_number as string,
    date: args.date as string,
    start_time: args.start_time as string,
    end_time: args.end_time as string,
    booked_by: args.booked_by as string,
    purpose: args.purpose as string,
  });
  return { success: true, data: { booking } };
}

// --- ACTION: cancel_booking ------------------------------------------------

async function executeCancelBooking(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const result = await BookingService.cancel(args.booking_id as string);
  return { success: true, data: result };
}

// --- ACTION: register_for_event -------------------------------------------

async function executeRegisterForEvent(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const event = await RegistrationService.register(args.event_id as string, {
    student_id: args.student_id as string,
    name: args.student_name as string,
  });
  return {
    success: true,
    data: {
      message: `Successfully registered for event "${event.name}"`,
      event,
    },
  };
}

// --- ACTION: cancel_event_registration ------------------------------------

async function executeCancelEventRegistration(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const event = await RegistrationService.cancel(
    args.event_id as string,
    args.student_id as string
  );
  return {
    success: true,
    data: {
      message: `Registration cancelled for event "${event.name}"`,
      event,
    },
  };
}

// --- ACTION: create_schedule -----------------------------------------------

async function executeCreateSchedule(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const schedule = await ScheduleService.create({
    course: args.course as string,
    title: args.title as string,
    day: args.day as AcademicDay,
    start_time: args.start_time as string,
    end_time: args.end_time as string,
    room: args.room as string,
    instructor: args.instructor as string,
    section: args.section as string,
  });
  return { success: true, data: { schedule } };
}

// --- ACTION: update_schedule -----------------------------------------------

async function executeUpdateSchedule(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { id, ...rest } = args;
  const schedule = await ScheduleService.update(id as string, rest as Parameters<typeof ScheduleService.update>[1]);
  return { success: true, data: { schedule } };
}

// --- ACTION: delete_schedule -----------------------------------------------

async function executeDeleteSchedule(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const result = await ScheduleService.delete(args.id as string);
  return { success: true, data: result };
}

// --- ACTION: create_announcement -------------------------------------------

async function executeCreateAnnouncement(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const announcement = await AnnouncementService.create({
    title: args.title as string,
    body: args.body as string,
    priority: args.priority as "high" | "medium" | "low",
    posted_by: args.posted_by as string,
    date: args.date as string,
    expires: args.expires as string,
  });
  return { success: true, data: { announcement } };
}

// --- ACTION: update_announcement -------------------------------------------

async function executeUpdateAnnouncement(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { id, ...rest } = args;
  const announcement = await AnnouncementService.update(
    id as string,
    rest as Parameters<typeof AnnouncementService.update>[1]
  );
  return { success: true, data: { announcement } };
}

// --- ACTION: delete_announcement -------------------------------------------

async function executeDeleteAnnouncement(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const result = await AnnouncementService.delete(args.id as string);
  return { success: true, data: result };
}

// --- ACTION: create_assignment ---------------------------------------------

async function executeCreateAssignment(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const assignment = await AssignmentService.create({
    course: args.course as string,
    course_title: args.course_title as string,
    title: args.title as string,
    description: args.description as string,
    assigned_date: args.assigned_date as string,
    deadline: args.deadline as string,
    submission_platform: args.submission_platform as string,
    marks: Number(args.marks),
    status:
      (args.status as "pending" | "submitted" | "graded" | "late") ??
      "pending",
  });
  return { success: true, data: { assignment } };
}

// --- ACTION: update_assignment ---------------------------------------------

async function executeUpdateAssignment(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { id, ...rest } = args;
  if (rest.marks !== undefined) rest.marks = Number(rest.marks);
  const assignment = await AssignmentService.update(
    id as string,
    rest as Parameters<typeof AssignmentService.update>[1]
  );
  return { success: true, data: { assignment } };
}

// --- ACTION: delete_assignment ---------------------------------------------

async function executeDeleteAssignment(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const result = await AssignmentService.delete(args.id as string);
  return { success: true, data: result };
}

// --- ACTION: create_event --------------------------------------------------

async function executeCreateEvent(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const event = await EventService.create({
    name: args.name as string,
    description: args.description as string,
    date: args.date as string,
    start_time: args.start_time as string,
    end_time: args.end_time as string,
    end_date: args.end_date as string | undefined,
    venue: args.venue as string,
    organizer: args.organizer as string,
    capacity: Number(args.capacity),
    registered: args.registered !== undefined ? Number(args.registered) : 0,
    status:
      (args.status as
        | "upcoming"
        | "ongoing"
        | "completed"
        | "cancelled"
        | "full") ?? "upcoming",
  });
  return { success: true, data: { event } };
}

// --- ACTION: update_event --------------------------------------------------

async function executeUpdateEvent(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { id, ...rest } = args;
  if (rest.capacity !== undefined) rest.capacity = Number(rest.capacity);
  const event = await EventService.update(
    id as string,
    rest as Parameters<typeof EventService.update>[1]
  );
  return { success: true, data: { event } };
}

// --- ACTION: delete_event --------------------------------------------------

async function executeDeleteEvent(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const result = await EventService.delete(args.id as string);
  return { success: true, data: result };
}

// --- ACTION: create_room --------------------------------------------------

async function executeCreateRoom(
  args: Record<string, unknown>
): Promise<ToolResult> {
  // equipment may arrive as a JSON array or a comma-separated string
  let equipment: string[] = [];
  if (Array.isArray(args.equipment)) {
    equipment = args.equipment as string[];
  } else if (typeof args.equipment === "string") {
    equipment = (args.equipment as string)
      .split(",")
      .map((e: string) => e.trim())
      .filter(Boolean);
  }

  const room = await RoomService.create({
    room_number: args.room_number as string,
    type: args.type as "classroom" | "lab" | "seminar",
    capacity: Number(args.capacity),
    floor: args.floor !== undefined ? Number(args.floor) : 7,
    equipment,
    status: (args.status as "available" | "unavailable") ?? "available",
  });
  return { success: true, data: { room } };
}

// --- ACTION: update_room --------------------------------------------------

async function executeUpdateRoom(
  args: Record<string, unknown>
): Promise<ToolResult> {
  const { room_number, ...rest } = args;

  if (rest.capacity !== undefined) rest.capacity = Number(rest.capacity);
  if (rest.floor !== undefined) rest.floor = Number(rest.floor);

  // Normalise equipment field
  if (rest.equipment !== undefined) {
    if (!Array.isArray(rest.equipment) && typeof rest.equipment === "string") {
      rest.equipment = (rest.equipment as string)
        .split(",")
        .map((e: string) => e.trim())
        .filter(Boolean);
    }
  }

  const room = await RoomService.update(
    room_number as string,
    rest as Parameters<typeof RoomService.update>[1]
  );
  return { success: true, data: { room } };
}

// --- ACTION: delete_room --------------------------------------------------

async function executeDeleteRoom(
  args: Record<string, unknown>
): Promise<ToolResult> {
  // RoomService.delete accepts room_number or id interchangeably
  const result = await RoomService.delete(args.room_number as string);
  return { success: true, data: result };
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    switch (name) {
      // READ tools
      case "get_schedules":
        return await executeGetSchedules(args);
      case "get_next_class":
        return await executeGetNextClass(args);
      case "get_assignments":
        return await executeGetAssignments(args);
      case "get_announcements":
        return await executeGetAnnouncements(args);
      case "get_rooms":
        return await executeGetRooms(args);
      case "get_room_availability":
        return await executeGetRoomAvailability(args);
      case "get_events":
        return await executeGetEvents(args);
      case "get_event":
        return await executeGetEvent(args);

      // Booking actions
      case "book_room":
        return await executeBookRoom(args);
      case "cancel_booking":
        return await executeCancelBooking(args);

      // Registration actions
      case "register_for_event":
        return await executeRegisterForEvent(args);
      case "cancel_event_registration":
        return await executeCancelEventRegistration(args);

      // Schedule actions
      case "create_schedule":
        return await executeCreateSchedule(args);
      case "update_schedule":
        return await executeUpdateSchedule(args);
      case "delete_schedule":
        return await executeDeleteSchedule(args);

      // Announcement actions
      case "create_announcement":
        return await executeCreateAnnouncement(args);
      case "update_announcement":
        return await executeUpdateAnnouncement(args);
      case "delete_announcement":
        return await executeDeleteAnnouncement(args);

      // Assignment actions
      case "create_assignment":
        return await executeCreateAssignment(args);
      case "update_assignment":
        return await executeUpdateAssignment(args);
      case "delete_assignment":
        return await executeDeleteAssignment(args);

      // Event actions
      case "create_event":
        return await executeCreateEvent(args);
      case "update_event":
        return await executeUpdateEvent(args);
      case "delete_event":
        return await executeDeleteEvent(args);

      // Room actions
      case "create_room":
        return await executeCreateRoom(args);
      case "update_room":
        return await executeUpdateRoom(args);
      case "delete_room":
        return await executeDeleteRoom(args);

      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Tool execution failed";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Gemini FunctionDeclaration definitions
// ---------------------------------------------------------------------------

export const toolDefinitions = [
  // -------------------------------------------------------------------------
  // READ TOOLS
  // -------------------------------------------------------------------------
  {
    name: "get_schedules",
    description:
      "Retrieve the class timetable/schedule. Filter by day of week (academic days only: Sunday–Thursday), course code, room number, instructor name, or section. Returns all matching schedule entries sorted by day and start time.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        day: {
          type: SchemaType.STRING,
          description:
            "Academic day to filter by. One of: Sunday, Monday, Tuesday, Wednesday, Thursday.",
        },
        course: {
          type: SchemaType.STRING,
          description:
            "Course code substring to search (e.g. 'CSE 4113' or just '4113').",
        },
        room: {
          type: SchemaType.STRING,
          description: "Exact room number (e.g. '7A01').",
        },
        instructor: {
          type: SchemaType.STRING,
          description: "Instructor name substring to search.",
        },
        section: {
          type: SchemaType.STRING,
          description: "Section identifier (e.g. 'A' or '1').",
        },
      },
      required: [],
    },
  },

  {
    name: "get_next_class",
    description:
      "Get the next upcoming class(es) based on the current Bangladesh Standard Time (UTC+6). Looks for classes today that have not started yet; if none remain today, finds the first classes on the next academic day in the Sun–Mon–Tue–Wed–Thu cycle. No parameters required.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    },
  },

  {
    name: "get_assignments",
    description:
      "Retrieve assignments. Filter by status (pending/submitted/graded/late), deadline range (due_before and/or due_after as YYYY-MM-DD), or course code. Results are sorted by deadline ascending.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description:
            "Assignment status filter. One of: pending, submitted, graded, late.",
        },
        due_before: {
          type: SchemaType.STRING,
          description:
            "Return only assignments with deadline on or before this date (YYYY-MM-DD).",
        },
        due_after: {
          type: SchemaType.STRING,
          description:
            "Return only assignments with deadline on or after this date (YYYY-MM-DD).",
        },
        course: {
          type: SchemaType.STRING,
          description: "Course code substring to filter by.",
        },
      },
      required: [],
    },
  },

  {
    name: "get_announcements",
    description:
      "Retrieve campus announcements. Optionally filter by priority (high/medium/low) and whether to return only active (non-expired) announcements as of today's date in Bangladesh (UTC+6).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        priority: {
          type: SchemaType.STRING,
          description: "Priority filter. One of: high, medium, low.",
        },
        active_only: {
          type: SchemaType.BOOLEAN,
          description:
            "If true, only return announcements that have not yet expired as of today (UTC+6 date).",
        },
      },
      required: [],
    },
  },

  {
    name: "get_rooms",
    description:
      "List rooms with optional filters. Can filter by room type, minimum seating capacity, required equipment (comma-separated), and availability status.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        type: {
          type: SchemaType.STRING,
          description: "Room type filter. One of: classroom, lab, seminar.",
        },
        min_capacity: {
          type: SchemaType.NUMBER,
          description: "Minimum seating capacity required.",
        },
        equipment: {
          type: SchemaType.STRING,
          description:
            "Comma-separated list of equipment that rooms must have (e.g. 'projector,AC,whiteboard').",
        },
        status: {
          type: SchemaType.STRING,
          description: "Room status filter. One of: available, unavailable.",
        },
      },
      required: [],
    },
  },

  {
    name: "get_room_availability",
    description:
      "Check which rooms are available for a specific date and time slot. Cross-references both room bookings and the scheduled class timetable. Optionally filter candidates by minimum capacity and required equipment.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: {
          type: SchemaType.STRING,
          description: "Date to check availability for (YYYY-MM-DD). Required.",
        },
        start_time: {
          type: SchemaType.STRING,
          description:
            "Start of the desired slot in 24-hour HH:MM format. Required.",
        },
        end_time: {
          type: SchemaType.STRING,
          description:
            "End of the desired slot in 24-hour HH:MM format. Required.",
        },
        min_capacity: {
          type: SchemaType.NUMBER,
          description: "Minimum room capacity to consider.",
        },
        equipment: {
          type: SchemaType.STRING,
          description:
            "Comma-separated list of required equipment (e.g. 'projector,AC').",
        },
      },
      required: ["date", "start_time", "end_time"],
    },
  },

  {
    name: "get_events",
    description:
      "List campus events. Filter by status (upcoming/ongoing/completed/cancelled/full), events on or after a specific date (date_from), or search by event name substring. Results are sorted by date and start time.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description:
            "Event status filter. One of: upcoming, ongoing, completed, cancelled, full.",
        },
        date_from: {
          type: SchemaType.STRING,
          description: "Return events on or after this date (YYYY-MM-DD).",
        },
        name: {
          type: SchemaType.STRING,
          description:
            "Substring to match against event names (case-insensitive).",
        },
      },
      required: [],
    },
  },

  {
    name: "get_event",
    description:
      "Get detailed information about a specific event by its exact ID or by searching for its name (partial, case-insensitive). Returns all fields including current registrations. If multiple events match the name, all matches are returned.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        event_id: {
          type: SchemaType.STRING,
          description: "Exact event ID (e.g. 'evt-1001').",
        },
        name: {
          type: SchemaType.STRING,
          description:
            "Partial event name to search for (case-insensitive). Use when event_id is unknown.",
        },
      },
      required: [],
    },
  },

  // -------------------------------------------------------------------------
  // ACTION TOOLS
  // -------------------------------------------------------------------------

  {
    name: "book_room",
    description:
      "Create a room booking for a specific date and time slot. Validates that the room exists, is available (status = available), and has no conflicting bookings or scheduled classes for the requested slot.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        room_number: {
          type: SchemaType.STRING,
          description: "Room number to book (e.g. '7A01').",
        },
        date: {
          type: SchemaType.STRING,
          description: "Booking date in YYYY-MM-DD format.",
        },
        start_time: {
          type: SchemaType.STRING,
          description: "Booking start time in HH:MM (24-hour).",
        },
        end_time: {
          type: SchemaType.STRING,
          description: "Booking end time in HH:MM (24-hour).",
        },
        booked_by: {
          type: SchemaType.STRING,
          description: "Name or entity making the booking.",
        },
        purpose: {
          type: SchemaType.STRING,
          description: "Purpose/reason for the booking.",
        },
      },
      required: [
        "room_number",
        "date",
        "start_time",
        "end_time",
        "booked_by",
        "purpose",
      ],
    },
  },

  {
    name: "cancel_booking",
    description: "Cancel an existing room booking by its booking ID.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        booking_id: {
          type: SchemaType.STRING,
          description: "The booking ID to cancel (e.g. 'bk-1234').",
        },
      },
      required: ["booking_id"],
    },
  },

  {
    name: "register_for_event",
    description:
      "Register a student for a campus event. Validates that the event exists, is not cancelled, and has available seats. Automatically updates the event registered count and marks it 'full' if capacity is reached.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        event_id: {
          type: SchemaType.STRING,
          description: "The event ID to register for.",
        },
        student_id: {
          type: SchemaType.STRING,
          description: "Student ID (e.g. '20-40532').",
        },
        student_name: {
          type: SchemaType.STRING,
          description: "Full name of the student.",
        },
      },
      required: ["event_id", "student_id", "student_name"],
    },
  },

  {
    name: "cancel_event_registration",
    description:
      "Cancel a student's registration for an event. Updates the event registered count and restores status from 'full' to 'upcoming' if applicable.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        event_id: {
          type: SchemaType.STRING,
          description: "The event ID to cancel registration for.",
        },
        student_id: {
          type: SchemaType.STRING,
          description: "Student ID whose registration should be cancelled.",
        },
      },
      required: ["event_id", "student_id"],
    },
  },

  {
    name: "create_schedule",
    description:
      "Add a new class schedule entry to the timetable. All fields are required.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        course: {
          type: SchemaType.STRING,
          description: "Course code (e.g. 'CSE 4113').",
        },
        title: {
          type: SchemaType.STRING,
          description: "Full course title.",
        },
        day: {
          type: SchemaType.STRING,
          description:
            "Academic day. One of: Sunday, Monday, Tuesday, Wednesday, Thursday.",
        },
        start_time: {
          type: SchemaType.STRING,
          description: "Class start time in HH:MM (24-hour).",
        },
        end_time: {
          type: SchemaType.STRING,
          description: "Class end time in HH:MM (24-hour).",
        },
        room: {
          type: SchemaType.STRING,
          description: "Room number (e.g. '7A01').",
        },
        instructor: {
          type: SchemaType.STRING,
          description: "Instructor's full name.",
        },
        section: {
          type: SchemaType.STRING,
          description: "Section identifier (e.g. 'A', 'B', '1').",
        },
      },
      required: [
        "course",
        "title",
        "day",
        "start_time",
        "end_time",
        "room",
        "instructor",
        "section",
      ],
    },
  },

  {
    name: "update_schedule",
    description:
      "Update an existing schedule entry. Only id is required; provide any combination of the other fields to update.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Schedule entry ID to update.",
        },
        course: { type: SchemaType.STRING, description: "New course code." },
        title: { type: SchemaType.STRING, description: "New course title." },
        day: {
          type: SchemaType.STRING,
          description:
            "New academic day. One of: Sunday, Monday, Tuesday, Wednesday, Thursday.",
        },
        start_time: {
          type: SchemaType.STRING,
          description: "New start time (HH:MM).",
        },
        end_time: {
          type: SchemaType.STRING,
          description: "New end time (HH:MM).",
        },
        room: { type: SchemaType.STRING, description: "New room number." },
        instructor: {
          type: SchemaType.STRING,
          description: "New instructor name.",
        },
        section: { type: SchemaType.STRING, description: "New section." },
      },
      required: ["id"],
    },
  },

  {
    name: "delete_schedule",
    description: "Permanently delete a schedule entry by its ID.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Schedule entry ID to delete.",
        },
      },
      required: ["id"],
    },
  },

  {
    name: "create_announcement",
    description:
      "Post a new announcement. All fields are required. The expires date must be on or after the date field.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: "Announcement title.",
        },
        body: {
          type: SchemaType.STRING,
          description: "Full announcement text.",
        },
        priority: {
          type: SchemaType.STRING,
          description: "Priority level. One of: high, medium, low.",
        },
        posted_by: {
          type: SchemaType.STRING,
          description: "Name or department posting the announcement.",
        },
        date: {
          type: SchemaType.STRING,
          description: "Date posted (YYYY-MM-DD).",
        },
        expires: {
          type: SchemaType.STRING,
          description: "Expiration date (YYYY-MM-DD). Must be >= date.",
        },
      },
      required: ["title", "body", "priority", "posted_by", "date", "expires"],
    },
  },

  {
    name: "update_announcement",
    description:
      "Update an existing announcement. Only id is required; provide any fields to change.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Announcement ID to update.",
        },
        title: { type: SchemaType.STRING, description: "New title." },
        body: { type: SchemaType.STRING, description: "New body text." },
        priority: {
          type: SchemaType.STRING,
          description: "New priority: high, medium, or low.",
        },
        posted_by: {
          type: SchemaType.STRING,
          description: "New posted-by name.",
        },
        date: {
          type: SchemaType.STRING,
          description: "New posted date (YYYY-MM-DD).",
        },
        expires: {
          type: SchemaType.STRING,
          description: "New expiration date (YYYY-MM-DD).",
        },
      },
      required: ["id"],
    },
  },

  {
    name: "delete_announcement",
    description: "Permanently delete an announcement by its ID.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Announcement ID to delete.",
        },
      },
      required: ["id"],
    },
  },

  {
    name: "create_assignment",
    description:
      "Create a new assignment record. All fields except status are required (status defaults to 'pending'). deadline must be on or after assigned_date.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        course: {
          type: SchemaType.STRING,
          description: "Course code (e.g. 'CSE 4113').",
        },
        course_title: {
          type: SchemaType.STRING,
          description: "Full course title.",
        },
        title: {
          type: SchemaType.STRING,
          description: "Assignment title.",
        },
        description: {
          type: SchemaType.STRING,
          description: "Detailed assignment description.",
        },
        assigned_date: {
          type: SchemaType.STRING,
          description: "Date the assignment was given (YYYY-MM-DD).",
        },
        deadline: {
          type: SchemaType.STRING,
          description:
            "Submission deadline (YYYY-MM-DD). Must be >= assigned_date.",
        },
        submission_platform: {
          type: SchemaType.STRING,
          description:
            "Platform for submission (e.g. 'Google Classroom', 'GitHub').",
        },
        marks: {
          type: SchemaType.NUMBER,
          description: "Total marks for the assignment (non-negative integer).",
        },
        status: {
          type: SchemaType.STRING,
          description:
            "Initial status. One of: pending, submitted, graded, late. Defaults to pending.",
        },
      },
      required: [
        "course",
        "course_title",
        "title",
        "description",
        "assigned_date",
        "deadline",
        "submission_platform",
        "marks",
      ],
    },
  },

  {
    name: "update_assignment",
    description:
      "Update an existing assignment. Only id is required; include any fields to change.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Assignment ID to update.",
        },
        course: { type: SchemaType.STRING, description: "New course code." },
        course_title: {
          type: SchemaType.STRING,
          description: "New course title.",
        },
        title: { type: SchemaType.STRING, description: "New title." },
        description: {
          type: SchemaType.STRING,
          description: "New description.",
        },
        assigned_date: {
          type: SchemaType.STRING,
          description: "New assigned date (YYYY-MM-DD).",
        },
        deadline: {
          type: SchemaType.STRING,
          description: "New deadline (YYYY-MM-DD).",
        },
        submission_platform: {
          type: SchemaType.STRING,
          description: "New submission platform.",
        },
        marks: {
          type: SchemaType.NUMBER,
          description: "New marks value.",
        },
        status: {
          type: SchemaType.STRING,
          description: "New status: pending, submitted, graded, or late.",
        },
      },
      required: ["id"],
    },
  },

  {
    name: "delete_assignment",
    description: "Permanently delete an assignment by its ID.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Assignment ID to delete.",
        },
      },
      required: ["id"],
    },
  },

  {
    name: "create_event",
    description:
      "Create a new campus event. The venue must be an existing room number in the system. capacity is required. status defaults to 'upcoming'. If the event spans multiple days, provide end_date.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "Event name.",
        },
        description: {
          type: SchemaType.STRING,
          description: "Event description.",
        },
        date: {
          type: SchemaType.STRING,
          description: "Event start date (YYYY-MM-DD).",
        },
        start_time: {
          type: SchemaType.STRING,
          description: "Event start time (HH:MM).",
        },
        end_time: {
          type: SchemaType.STRING,
          description: "Event end time (HH:MM).",
        },
        end_date: {
          type: SchemaType.STRING,
          description:
            "Event end date if it spans multiple days (YYYY-MM-DD). Defaults to date.",
        },
        venue: {
          type: SchemaType.STRING,
          description:
            "Room number used as venue (must exist in the system, e.g. '7A01').",
        },
        organizer: {
          type: SchemaType.STRING,
          description: "Organizer name or department.",
        },
        capacity: {
          type: SchemaType.NUMBER,
          description: "Maximum attendee capacity.",
        },
        status: {
          type: SchemaType.STRING,
          description:
            "Initial status. One of: upcoming, ongoing, completed, cancelled, full. Defaults to upcoming.",
        },
      },
      required: [
        "name",
        "description",
        "date",
        "start_time",
        "end_time",
        "venue",
        "organizer",
        "capacity",
      ],
    },
  },

  {
    name: "update_event",
    description:
      "Update an existing event. Only id is required; provide any other fields to change. capacity cannot be reduced below the current registered count.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Event ID to update.",
        },
        name: { type: SchemaType.STRING, description: "New event name." },
        description: {
          type: SchemaType.STRING,
          description: "New description.",
        },
        date: {
          type: SchemaType.STRING,
          description: "New start date (YYYY-MM-DD).",
        },
        start_time: {
          type: SchemaType.STRING,
          description: "New start time (HH:MM).",
        },
        end_time: {
          type: SchemaType.STRING,
          description: "New end time (HH:MM).",
        },
        end_date: {
          type: SchemaType.STRING,
          description: "New end date (YYYY-MM-DD).",
        },
        venue: {
          type: SchemaType.STRING,
          description: "New venue room number.",
        },
        organizer: {
          type: SchemaType.STRING,
          description: "New organizer.",
        },
        capacity: {
          type: SchemaType.NUMBER,
          description:
            "New capacity (cannot be reduced below current registered count).",
        },
        status: {
          type: SchemaType.STRING,
          description:
            "New status: upcoming, ongoing, completed, cancelled, or full.",
        },
      },
      required: ["id"],
    },
  },

  {
    name: "delete_event",
    description:
      "Permanently delete an event and all its registrations by event ID.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: {
          type: SchemaType.STRING,
          description: "Event ID to delete.",
        },
      },
      required: ["id"],
    },
  },

  {
    name: "create_room",
    description:
      "Add a new room to the system. room_number must be unique. equipment is provided as a comma-separated string. floor defaults to 7, status defaults to 'available'.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        room_number: {
          type: SchemaType.STRING,
          description: "Unique room number/identifier (e.g. '7A01').",
        },
        type: {
          type: SchemaType.STRING,
          description: "Room type. One of: classroom, lab, seminar.",
        },
        capacity: {
          type: SchemaType.NUMBER,
          description: "Seating capacity (positive integer).",
        },
        floor: {
          type: SchemaType.NUMBER,
          description: "Floor number (integer, defaults to 7).",
        },
        equipment: {
          type: SchemaType.STRING,
          description:
            "Comma-separated list of equipment items (e.g. 'projector,AC,whiteboard').",
        },
        status: {
          type: SchemaType.STRING,
          description:
            "Room status. One of: available, unavailable. Defaults to available.",
        },
      },
      required: ["room_number", "type", "capacity"],
    },
  },

  {
    name: "update_room",
    description:
      "Update an existing room's details. room_number is the primary identifier; provide any other fields to change. Supplying equipment replaces the entire equipment list.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        room_number: {
          type: SchemaType.STRING,
          description: "Room number to update.",
        },
        type: {
          type: SchemaType.STRING,
          description: "New room type: classroom, lab, or seminar.",
        },
        capacity: {
          type: SchemaType.NUMBER,
          description: "New seating capacity.",
        },
        floor: {
          type: SchemaType.NUMBER,
          description: "New floor number.",
        },
        equipment: {
          type: SchemaType.STRING,
          description:
            "New comma-separated equipment list (replaces existing list entirely).",
        },
        status: {
          type: SchemaType.STRING,
          description: "New status: available or unavailable.",
        },
      },
      required: ["room_number"],
    },
  },

  {
    name: "delete_room",
    description:
      "Permanently delete a room from the system by its room number.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        room_number: {
          type: SchemaType.STRING,
          description: "Room number to delete (e.g. '7A01').",
        },
      },
      required: ["room_number"],
    },
  },
];
