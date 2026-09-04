import { Schedule, Room, Booking, Event, Registration, Announcement, Assignment } from "@/types";

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const errorMsg =
      json?.error || json?.message || `Request failed with status ${res.status}`;
    throw new ApiError(errorMsg, res.status, json?.code, json?.details);
  }

  return json as T;
}

export const api = {
  schedules: {
    list: (params?: { day?: string; course?: string; room?: string; instructor?: string; section?: string }) => {
      const q = new URLSearchParams();
      if (params?.day) q.set("day", params.day);
      if (params?.course) q.set("course", params.course);
      if (params?.room) q.set("room", params.room);
      if (params?.instructor) q.set("instructor", params.instructor);
      if (params?.section) q.set("section", params.section);
      return request<{ schedules: Schedule[]; total: number }>(`/api/schedules?${q.toString()}`);
    },
    get: (id: string) => request<Schedule>(`/api/schedules/${id}`),
    create: (data: Partial<Schedule>) =>
      request<Schedule>("/api/schedules", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Schedule>) =>
      request<Schedule>(`/api/schedules/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean; id: string }>(`/api/schedules/${id}`, { method: "DELETE" }),
  },

  rooms: {
    list: (params?: { type?: string; min_capacity?: number; equipment?: string; floor?: number; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.type) q.set("type", params.type);
      if (params?.min_capacity) q.set("min_capacity", String(params.min_capacity));
      if (params?.equipment) q.set("equipment", params.equipment);
      if (params?.floor) q.set("floor", String(params.floor));
      if (params?.status) q.set("status", params.status);
      return request<{ rooms: Room[]; total: number }>(`/api/rooms?${q.toString()}`);
    },
    get: (id: string) => request<Room>(`/api/rooms/${id}`),
    create: (data: any) =>
      request<Room>("/api/rooms", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<Room>(`/api/rooms/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean; id: string }>(`/api/rooms/${id}`, { method: "DELETE" }),
    checkAvailability: (data: { date: string; start_time: string; end_time: string; capacity?: number; equipment?: string[] }) =>
      request<{ available: Room[]; unavailable: { room: Room; reason: string }[] }>("/api/rooms/availability", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  bookings: {
    list: (params?: { room_number?: string; date?: string; booked_by?: string }) => {
      const q = new URLSearchParams();
      if (params?.room_number) q.set("room_number", params.room_number);
      if (params?.date) q.set("date", params.date);
      if (params?.booked_by) q.set("booked_by", params.booked_by);
      return request<{ bookings: Booking[]; total: number }>(`/api/bookings?${q.toString()}`);
    },
    create: (data: Partial<Booking>) =>
      request<Booking>("/api/bookings", { method: "POST", body: JSON.stringify(data) }),
    cancel: (id: string) =>
      request<{ success: boolean; booking_id: string }>(`/api/bookings/${id}`, { method: "DELETE" }),
  },

  events: {
    list: (params?: { status?: string; date?: string; venue?: string; organizer?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      if (params?.date) q.set("date", params.date);
      if (params?.venue) q.set("venue", params.venue);
      if (params?.organizer) q.set("organizer", params.organizer);
      return request<{ events: Event[]; total: number }>(`/api/events?${q.toString()}`);
    },
    get: (id: string) => request<Event>(`/api/events/${id}`),
    create: (data: Partial<Event>) =>
      request<Event>("/api/events", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Event>) =>
      request<Event>(`/api/events/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean; id: string }>(`/api/events/${id}`, { method: "DELETE" }),
    listRegistrations: (eventId: string) =>
      request<{ registrations: Registration[]; total: number }>(`/api/events/${eventId}/registrations`),
    register: (eventId: string, data: { student_id: string; name: string }) =>
      request<{ message: string; event: Event }>(`/api/events/${eventId}/registrations`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    cancelRegistration: (eventId: string, studentId: string) =>
      request<{ message: string; event: Event }>(`/api/events/${eventId}/registrations?student_id=${studentId}`, {
        method: "DELETE",
      }),
  },

  announcements: {
    list: (params?: { priority?: string; active_only?: boolean; as_of_date?: string }) => {
      const q = new URLSearchParams();
      if (params?.priority) q.set("priority", params.priority);
      if (params?.active_only) q.set("active_only", "true");
      if (params?.as_of_date) q.set("as_of_date", params.as_of_date);
      return request<{ announcements: Announcement[]; total: number }>(`/api/announcements?${q.toString()}`);
    },
    get: (id: string) => request<Announcement>(`/api/announcements/${id}`),
    create: (data: Partial<Announcement>) =>
      request<Announcement>("/api/announcements", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Announcement>) =>
      request<Announcement>(`/api/announcements/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean; id: string }>(`/api/announcements/${id}`, { method: "DELETE" }),
  },

  assignments: {
    list: (params?: { course?: string; status?: string; due_before?: string; due_after?: string }) => {
      const q = new URLSearchParams();
      if (params?.course) q.set("course", params.course);
      if (params?.status) q.set("status", params.status);
      if (params?.due_before) q.set("due_before", params.due_before);
      if (params?.due_after) q.set("due_after", params.due_after);
      return request<{ assignments: Assignment[]; total: number }>(`/api/assignments?${q.toString()}`);
    },
    get: (id: string) => request<Assignment>(`/api/assignments/${id}`),
    create: (data: Partial<Assignment>) =>
      request<Assignment>("/api/assignments", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Assignment>) =>
      request<Assignment>(`/api/assignments/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean; id: string }>(`/api/assignments/${id}`, { method: "DELETE" }),
  },

  system: {
    health: () => request<any>("/api/health"),
    reset: () => request<{ success: boolean; message: string; counts: any }>("/api/reset", { method: "POST" }),
  },
};
