import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createAnnouncementSchema, updateAnnouncementSchema } from "@/validation";
import { Announcement } from "@/types";
import { z } from "zod";

function mapAnnouncementToDomain(a: any): Announcement {
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    date: a.date,
    priority: a.priority as any,
    posted_by: a.postedBy,
    expires: a.expires,
  };
}

export class AnnouncementService {
  static async list(filter?: {
    priority?: string;
    active_only?: boolean;
    as_of_date?: string;
  }): Promise<Announcement[]> {
    const where: any = {};
    if (filter?.priority) where.priority = filter.priority;

    if (filter?.active_only && filter?.as_of_date) {
      where.expires = { gte: filter.as_of_date };
    }

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: [{ date: "desc" }, { id: "desc" }],
    });

    return announcements.map(mapAnnouncementToDomain);
  }

  static async getById(id: string): Promise<Announcement> {
    const a = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!a) {
      throw new NotFoundError(`Announcement '${id}' not found`);
    }

    return mapAnnouncementToDomain(a);
  }

  static async create(rawInput: z.infer<typeof createAnnouncementSchema>): Promise<Announcement> {
    const parsed = createAnnouncementSchema.safeParse(rawInput);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || "Invalid announcement data";
      throw new ValidationError(`Invalid announcement data: ${msg}`, parsed.error.format());
    }
    const data = parsed.data;

    const id = data.id || `ann-${Date.now().toString().slice(-4)}`;

    const created = await prisma.announcement.create({
      data: {
        id,
        title: data.title,
        body: data.body,
        date: data.date,
        priority: data.priority,
        postedBy: data.posted_by,
        expires: data.expires,
      },
    });

    return mapAnnouncementToDomain(created);
  }

  static async update(
    id: string,
    rawInput: z.infer<typeof updateAnnouncementSchema>
  ): Promise<Announcement> {
    const existing = await this.getById(id);

    const parsed = updateAnnouncementSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError("Invalid announcement update data", parsed.error.format());
    }
    const data = parsed.data;

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.posted_by !== undefined) updateData.postedBy = data.posted_by;
    if (data.expires !== undefined) updateData.expires = data.expires;

    // Validate that expiry is not before date if either changed
    const effectiveDate = updateData.date || existing.date;
    const effectiveExpires = updateData.expires || existing.expires;
    if (effectiveExpires < effectiveDate) {
      throw new ValidationError("Expiration date cannot be earlier than posted date");
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: updateData,
    });

    return mapAnnouncementToDomain(updated);
  }

  static async delete(id: string): Promise<{ success: boolean; id: string }> {
    await this.getById(id);
    await prisma.announcement.delete({ where: { id } });
    return { success: true, id };
  }
}
