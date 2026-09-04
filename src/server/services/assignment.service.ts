import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createAssignmentSchema, updateAssignmentSchema } from "@/validation";
import { Assignment } from "@/types";
import { z } from "zod";

function mapAssignmentToDomain(a: any): Assignment {
  return {
    id: a.id,
    course: a.course,
    course_title: a.courseTitle,
    title: a.title,
    description: a.description,
    assigned_date: a.assignedDate,
    deadline: a.deadline,
    submission_platform: a.submissionPlatform,
    status: a.status as any,
    marks: a.marks,
  };
}

export class AssignmentService {
  static async list(filter?: {
    course?: string;
    status?: string;
    due_before?: string;
    due_after?: string;
  }): Promise<Assignment[]> {
    const where: any = {};
    if (filter?.course) where.course = { contains: filter.course };
    if (filter?.status) where.status = filter.status;

    if (filter?.due_before || filter?.due_after) {
      where.deadline = {};
      if (filter.due_before) where.deadline.lte = filter.due_before;
      if (filter.due_after) where.deadline.gte = filter.due_after;
    }

    const assignments = await prisma.assignment.findMany({
      where,
      orderBy: [{ deadline: "asc" }, { id: "asc" }],
    });

    return assignments.map(mapAssignmentToDomain);
  }

  static async getById(id: string): Promise<Assignment> {
    const a = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!a) {
      throw new NotFoundError(`Assignment '${id}' not found`);
    }

    return mapAssignmentToDomain(a);
  }

  static async create(rawInput: z.infer<typeof createAssignmentSchema>): Promise<Assignment> {
    const parsed = createAssignmentSchema.safeParse(rawInput);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || "Invalid assignment data";
      throw new ValidationError(`Invalid assignment data: ${msg}`, parsed.error.format());
    }
    const data = parsed.data;

    const id = data.id || `asgn-${Date.now().toString().slice(-4)}`;

    const created = await prisma.assignment.create({
      data: {
        id,
        course: data.course,
        courseTitle: data.course_title,
        title: data.title,
        description: data.description,
        assignedDate: data.assigned_date,
        deadline: data.deadline,
        submissionPlatform: data.submission_platform,
        status: data.status,
        marks: data.marks,
      },
    });

    return mapAssignmentToDomain(created);
  }

  static async update(
    id: string,
    rawInput: z.infer<typeof updateAssignmentSchema>
  ): Promise<Assignment> {
    const existing = await this.getById(id);

    const parsed = updateAssignmentSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError("Invalid assignment update data", parsed.error.format());
    }
    const data = parsed.data;

    const updateData: any = {};
    if (data.course !== undefined) updateData.course = data.course;
    if (data.course_title !== undefined) updateData.courseTitle = data.course_title;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.assigned_date !== undefined) updateData.assignedDate = data.assigned_date;
    if (data.deadline !== undefined) updateData.deadline = data.deadline;
    if (data.submission_platform !== undefined) updateData.submissionPlatform = data.submission_platform;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.marks !== undefined) updateData.marks = data.marks;

    const effectiveAssigned = updateData.assignedDate || existing.assigned_date;
    const effectiveDeadline = updateData.deadline || existing.deadline;
    if (effectiveDeadline < effectiveAssigned) {
      throw new ValidationError("Deadline cannot be earlier than assigned date");
    }

    const updated = await prisma.assignment.update({
      where: { id },
      data: updateData,
    });

    return mapAssignmentToDomain(updated);
  }

  static async delete(id: string): Promise<{ success: boolean; id: string }> {
    await this.getById(id);
    await prisma.assignment.delete({ where: { id } });
    return { success: true, id };
  }
}
