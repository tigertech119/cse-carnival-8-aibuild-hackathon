import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError, ConflictError, BusinessRuleError } from "@/lib/errors";
import { createRegistrationSchema } from "@/validation";
import { Event, Registration } from "@/types";
import { EventService } from "./event.service";
import { z } from "zod";

export class RegistrationService {
  static async listForEvent(eventId: string): Promise<Registration[]> {
    await EventService.getById(eventId);

    const registrations = await prisma.registration.findMany({
      where: { eventId },
      orderBy: { registeredAt: "asc" },
    });

    return registrations.map((r) => ({
      student_id: r.studentId,
      name: r.name,
    }));
  }

  static async register(
    eventId: string,
    rawInput: z.infer<typeof createRegistrationSchema>
  ): Promise<Event> {
    const parsed = createRegistrationSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError("Invalid registration data", parsed.error.format());
    }
    const data = parsed.data;

    // 1. Fetch event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { registrations: true },
    });

    if (!event) {
      throw new NotFoundError(`Event '${eventId}' not found`);
    }

    // 2. Reject if cancelled
    if (event.status === "cancelled") {
      throw new BusinessRuleError(
        `Cannot register: Event '${event.name}' has been cancelled`
      );
    }

    // 3. Reject if event is full or registered >= capacity
    if (event.status === "full" || event.registered >= event.capacity) {
      throw new BusinessRuleError(
        `Cannot register: Event '${event.name}' is already full (${event.registered}/${event.capacity} seats filled)`
      );
    }

    // 4. Check duplicate student registration
    const alreadyRegistered = event.registrations.some(
      (r) => r.studentId === data.student_id
    );
    if (alreadyRegistered) {
      throw new ConflictError(
        `Student '${data.name}' (${data.student_id}) is already registered for '${event.name}'`
      );
    }

    // 5. Execute registration inside transaction
    await prisma.$transaction(async (tx) => {
      await tx.registration.create({
        data: {
          eventId,
          studentId: data.student_id,
          name: data.name,
        },
      });

      const newRegisteredCount = event.registered + 1;
      const newStatus =
        newRegisteredCount >= event.capacity ? "full" : event.status;

      await tx.event.update({
        where: { id: eventId },
        data: {
          registered: newRegisteredCount,
          status: newStatus,
        },
      });
    });

    return EventService.getById(eventId);
  }

  static async cancel(eventId: string, studentId: string): Promise<Event> {
    const registration = await prisma.registration.findUnique({
      where: {
        eventId_studentId: {
          eventId,
          studentId,
        },
      },
    });

    if (!registration) {
      throw new NotFoundError(
        `Student '${studentId}' is not registered for event '${eventId}'`
      );
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundError(`Event '${eventId}' not found`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.registration.delete({
        where: {
          eventId_studentId: {
            eventId,
            studentId,
          },
        },
      });

      const newRegisteredCount = Math.max(0, event.registered - 1);
      const newStatus =
        event.status === "full" && newRegisteredCount < event.capacity
          ? "upcoming"
          : event.status;

      await tx.event.update({
        where: { id: eventId },
        data: {
          registered: newRegisteredCount,
          status: newStatus,
        },
      });
    });

    return EventService.getById(eventId);
  }
}
