import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createScheduleSchema, updateScheduleSchema } from "@/validation";
import { Schedule } from "@/types";
import { z } from "zod";

function mapScheduleToDomain(s: any): Schedule {
  return {
    id: s.id,
    course: s.course,
    title: s.title,
    day: s.day as any,
    start_time: s.startTime,
    end_time: s.endTime,
    room: s.room,
    instructor: s.instructor,
    section: s.section,
  };
}

export class ScheduleService {
  static async list(filter?: {
    day?: string;
    course?: string;
    room?: string;
    instructor?: string;
    section?: string;
  }): Promise<Schedule[]> {
    const where: any = {};
    if (filter?.day) where.day = filter.day;
    if (filter?.course) where.course = { contains: filter.course };
    if (filter?.room) where.room = filter.room;
    if (filter?.instructor) where.instructor = { contains: filter.instructor };
    if (filter?.section) where.section = filter.section;

    const schedules = await prisma.schedule.findMany({
      where,
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    });

    return schedules.map(mapScheduleToDomain);
  }

  static async getById(id: string): Promise<Schedule> {
    const s = await prisma.schedule.findUnique({ where: { id } });
    if (!s) {
      throw new NotFoundError(`Schedule with id '${id}' not found`);
    }
    return mapScheduleToDomain(s);
  }

  static async create(rawInput: z.infer<typeof createScheduleSchema>): Promise<Schedule> {
    const parsed = createScheduleSchema.safeParse(rawInput);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || "Invalid schedule data";
      throw new ValidationError(`Invalid schedule data: ${msg}`, parsed.error.format());
    }
    const data = parsed.data;

    const id = data.id || `sch-${Date.now().toString().slice(-5)}`;

    const created = await prisma.schedule.create({
      data: {
        id,
        course: data.course,
        title: data.title,
        day: data.day,
        startTime: data.start_time,
        endTime: data.end_time,
        room: data.room,
        instructor: data.instructor,
        section: data.section,
      },
    });

    return mapScheduleToDomain(created);
  }

  static async update(id: string, rawInput: z.infer<typeof updateScheduleSchema>): Promise<Schedule> {
    await this.getById(id);

    const parsed = updateScheduleSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError("Invalid schedule update data", parsed.error.format());
    }
    const data = parsed.data;

    const updateData: any = {};
    if (data.course !== undefined) updateData.course = data.course;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.day !== undefined) updateData.day = data.day;
    if (data.start_time !== undefined) updateData.startTime = data.start_time;
    if (data.end_time !== undefined) updateData.endTime = data.end_time;
    if (data.room !== undefined) updateData.room = data.room;
    if (data.instructor !== undefined) updateData.instructor = data.instructor;
    if (data.section !== undefined) updateData.section = data.section;

    const updated = await prisma.schedule.update({
      where: { id },
      data: updateData,
    });

    return mapScheduleToDomain(updated);
  }

  static async delete(id: string): Promise<{ success: boolean; id: string }> {
    await this.getById(id);
    await prisma.schedule.delete({ where: { id } });
    return { success: true, id };
  }
}
