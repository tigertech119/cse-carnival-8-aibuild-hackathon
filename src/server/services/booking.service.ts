import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError, ConflictError, BusinessRuleError } from "@/lib/errors";
import { createBookingSchema, isTimeOverlapping, getDayOfWeekFromDate } from "@/validation";
import { Booking } from "@/types";
import { z } from "zod";

function mapBookingToDomain(b: any): Booking {
  return {
    booking_id: b.bookingId,
    room_number: b.roomNumber,
    booked_by: b.bookedBy,
    date: b.date,
    start_time: b.startTime,
    end_time: b.endTime,
    purpose: b.purpose,
  };
}

export class BookingService {
  static async list(filter?: {
    room_number?: string;
    date?: string;
    booked_by?: string;
  }): Promise<Booking[]> {
    const where: any = {};
    if (filter?.room_number) where.roomNumber = filter.room_number;
    if (filter?.date) where.date = filter.date;
    if (filter?.booked_by) where.bookedBy = { contains: filter.booked_by };

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return bookings.map(mapBookingToDomain);
  }

  static async getById(bookingId: string): Promise<Booking> {
    const b = await prisma.booking.findUnique({
      where: { bookingId },
    });
    if (!b) {
      throw new NotFoundError(`Booking '${bookingId}' not found`);
    }
    return mapBookingToDomain(b);
  }

  static async create(rawInput: z.infer<typeof createBookingSchema>): Promise<Booking> {
    const parsed = createBookingSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError("Invalid booking data", parsed.error.format());
    }
    const data = parsed.data;

    // 1. Verify room exists
    const room = await prisma.room.findUnique({
      where: { roomNumber: data.room_number },
    });
    if (!room) {
      throw new NotFoundError(`Room '${data.room_number}' does not exist`);
    }

    // 2. Verify room is available
    if (room.status !== "available") {
      throw new BusinessRuleError(
        `Room '${data.room_number}' is marked as unavailable and cannot be booked`
      );
    }

    // 3. Check collision with existing bookings for this room on this date
    const existingBookings = await prisma.booking.findMany({
      where: {
        roomNumber: data.room_number,
        date: data.date,
      },
    });

    for (const b of existingBookings) {
      if (isTimeOverlapping(data.start_time, data.end_time, b.startTime, b.endTime)) {
        throw new ConflictError(
          `Room '${data.room_number}' is already booked on ${data.date} from ${b.startTime} to ${b.endTime} by ${b.bookedBy} (${b.purpose})`
        );
      }
    }

    // 4. Check collision with scheduled classes for this room on this day of week
    const dayOfWeek = getDayOfWeekFromDate(data.date);
    const daySchedules = await prisma.schedule.findMany({
      where: {
        room: data.room_number,
        day: dayOfWeek,
      },
    });

    for (const s of daySchedules) {
      if (isTimeOverlapping(data.start_time, data.end_time, s.startTime, s.endTime)) {
        throw new ConflictError(
          `Cannot book Room '${data.room_number}' on ${data.date} (${dayOfWeek}): conflicting class scheduled '${s.course} - ${s.title}' from ${s.startTime} to ${s.endTime}`
        );
      }
    }

    const bookingId = data.booking_id || `bk-${Date.now().toString().slice(-4)}`;

    const created = await prisma.booking.create({
      data: {
        bookingId,
        roomNumber: data.room_number,
        bookedBy: data.booked_by,
        date: data.date,
        startTime: data.start_time,
        endTime: data.end_time,
        purpose: data.purpose,
      },
    });

    return mapBookingToDomain(created);
  }

  static async cancel(bookingId: string): Promise<{ success: boolean; booking_id: string }> {
    await this.getById(bookingId);
    await prisma.booking.delete({
      where: { bookingId },
    });
    return { success: true, booking_id: bookingId };
  }
}
