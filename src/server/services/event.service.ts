import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError, BusinessRuleError } from "@/lib/errors";
import { createEventSchema, updateEventSchema } from "@/validation";
import { Event, Registration } from "@/types";
import { z } from "zod";

function mapRegistrationToDomain(r: any): Registration {
  return {
    student_id: r.studentId,
    name: r.name,
  };
}

function mapEventToDomain(e: any): Event {
  return {
    id: e.id,
    name: e.name,
    description: e.description,
    date: e.date,
    start_time: e.startTime,
    end_time: e.endTime,
    end_date: e.endDate,
    venue: e.venue,
    organizer: e.organizer,
    capacity: e.capacity,
    registered: e.registered,
    registrations: (e.registrations || []).map(mapRegistrationToDomain),
    status: e.status as any,
  };
}

export class EventService {
  static async list(filter?: {
    status?: string;
    date?: string;
    venue?: string;
    organizer?: string;
  }): Promise<Event[]> {
    const where: any = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.date) where.date = filter.date;
    if (filter?.venue) where.venue = filter.venue;
    if (filter?.organizer) where.organizer = { contains: filter.organizer };

    const events = await prisma.event.findMany({
      where,
      include: {
        registrations: {
          orderBy: { registeredAt: "asc" },
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return events.map(mapEventToDomain);
  }

  static async getById(id: string): Promise<Event> {
    const e = await prisma.event.findUnique({
      where: { id },
      include: {
        registrations: {
          orderBy: { registeredAt: "asc" },
        },
      },
    });

    if (!e) {
      throw new NotFoundError(`Event '${id}' not found`);
    }

    return mapEventToDomain(e);
  }

  static async create(rawInput: z.infer<typeof createEventSchema>): Promise<Event> {
    const parsed = createEventSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError("Invalid event data", parsed.error.format());
    }
    const data = parsed.data;

    // Check venue room exists
    const room = await prisma.room.findUnique({
      where: { roomNumber: data.venue },
    });
    if (!room) {
      throw new ValidationError(`Venue room '${data.venue}' does not exist`);
    }

    const id = data.id || `evt-${Date.now().toString().slice(-4)}`;

    const created = await prisma.event.create({
      data: {
        id,
        name: data.name,
        description: data.description,
        date: data.date,
        startTime: data.start_time,
        endTime: data.end_time,
        endDate: data.end_date || data.date,
        venue: data.venue,
        organizer: data.organizer,
        capacity: data.capacity,
        registered: data.registered || 0,
        status: data.status || "upcoming",
      },
      include: { registrations: true },
    });

    return mapEventToDomain(created);
  }

  static async update(id: string, rawInput: z.infer<typeof updateEventSchema>): Promise<Event> {
    const existing = await this.getById(id);

    const parsed = updateEventSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError("Invalid event update data", parsed.error.format());
    }
    const data = parsed.data;

    if (data.venue) {
      const room = await prisma.room.findUnique({
        where: { roomNumber: data.venue },
      });
      if (!room) {
        throw new ValidationError(`Venue room '${data.venue}' does not exist`);
      }
    }

    if (data.capacity !== undefined && data.capacity < existing.registered) {
      throw new BusinessRuleError(
        `Cannot reduce capacity to ${data.capacity} because ${existing.registered} students are already registered`
      );
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.start_time !== undefined) updateData.startTime = data.start_time;
    if (data.end_time !== undefined) updateData.endTime = data.end_time;
    if (data.end_date !== undefined) updateData.endDate = data.end_date;
    if (data.venue !== undefined) updateData.venue = data.venue;
    if (data.organizer !== undefined) updateData.organizer = data.organizer;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await prisma.event.update({
      where: { id },
      data: updateData,
      include: { registrations: true },
    });

    return mapEventToDomain(updated);
  }

  static async delete(id: string): Promise<{ success: boolean; id: string }> {
    await this.getById(id);
    await prisma.event.delete({ where: { id } });
    return { success: true, id };
  }
}
