import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { createRoomSchema, updateRoomSchema, isTimeOverlapping, getDayOfWeekFromDate } from "@/validation";
import { Room, Booking } from "@/types";
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

function mapRoomToDomain(r: any): Room {
  let equipment: string[] = [];
  try {
    equipment = JSON.parse(r.equipment);
  } catch {
    equipment = [];
  }

  return {
    id: r.id,
    room_number: r.roomNumber,
    type: r.type as any,
    capacity: r.capacity,
    equipment,
    floor: r.floor,
    status: r.status as any,
    bookings: (r.bookings || []).map(mapBookingToDomain),
  };
}

export class RoomService {
  static async list(filter?: {
    type?: string;
    min_capacity?: number;
    equipment?: string | string[];
    floor?: number;
    status?: string;
  }): Promise<Room[]> {
    const where: any = {};
    if (filter?.type) where.type = filter.type;
    if (filter?.min_capacity) where.capacity = { gte: Number(filter.min_capacity) };
    if (filter?.floor) where.floor = Number(filter.floor);
    if (filter?.status) where.status = filter.status;

    const rooms = await prisma.room.findMany({
      where,
      include: {
        bookings: {
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
        },
      },
      orderBy: { roomNumber: "asc" },
    });

    let result = rooms.map(mapRoomToDomain);

    // Filter by equipment array containment if requested
    if (filter?.equipment) {
      const requiredEquipment = Array.isArray(filter.equipment)
        ? filter.equipment.map((e) => e.toLowerCase())
        : [filter.equipment.toLowerCase()];

      result = result.filter((r) =>
        requiredEquipment.every((req) =>
          r.equipment.some((eq) => eq.toLowerCase().includes(req))
        )
      );
    }

    return result;
  }

  static async getById(idOrRoomNumber: string): Promise<Room> {
    const r = await prisma.room.findFirst({
      where: {
        OR: [{ id: idOrRoomNumber }, { roomNumber: idOrRoomNumber }],
      },
      include: {
        bookings: {
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
        },
      },
    });

    if (!r) {
      throw new NotFoundError(`Room '${idOrRoomNumber}' not found`);
    }

    return mapRoomToDomain(r);
  }

  static async create(rawInput: z.infer<typeof createRoomSchema>): Promise<Room> {
    const parsed = createRoomSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError("Invalid room data", parsed.error.format());
    }
    const data = parsed.data;

    // Check unique room_number
    const existing = await prisma.room.findUnique({
      where: { roomNumber: data.room_number },
    });
    if (existing) {
      throw new ConflictError(`Room number '${data.room_number}' already exists`);
    }

    const id = data.id || `room-${Date.now().toString().slice(-5)}`;

    const created = await prisma.room.create({
      data: {
        id,
        roomNumber: data.room_number,
        type: data.type,
        capacity: data.capacity,
        equipment: JSON.stringify(data.equipment || []),
        floor: data.floor,
        status: data.status,
      },
      include: { bookings: true },
    });

    return mapRoomToDomain(created);
  }

  static async update(idOrNumber: string, rawInput: z.infer<typeof updateRoomSchema>): Promise<Room> {
    const existing = await this.getById(idOrNumber);

    const parsed = updateRoomSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError("Invalid room update data", parsed.error.format());
    }
    const data = parsed.data;

    const updateData: any = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.equipment !== undefined) updateData.equipment = JSON.stringify(data.equipment);
    if (data.floor !== undefined) updateData.floor = data.floor;
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await prisma.room.update({
      where: { id: existing.id },
      data: updateData,
      include: { bookings: true },
    });

    return mapRoomToDomain(updated);
  }

  static async delete(idOrNumber: string): Promise<{ success: boolean; id: string }> {
    const existing = await this.getById(idOrNumber);
    await prisma.room.delete({ where: { id: existing.id } });
    return { success: true, id: existing.id };
  }

  /**
   * Checks availability of rooms for a specific date and time interval.
   * Cross-references against both existing room bookings and the class timetable.
   */
  static async checkAvailability(query: {
    date: string;
    start_time: string;
    end_time: string;
    capacity?: number;
    equipment?: string[];
  }): Promise<{ available: Room[]; unavailable: { room: Room; reason: string }[] }> {
    const dayOfWeek = getDayOfWeekFromDate(query.date);

    // Get all candidate rooms
    const allRooms = await this.list({
      status: "available",
      min_capacity: query.capacity,
      equipment: query.equipment,
    });

    // Fetch all bookings on that date
    const dateBookings = await prisma.booking.findMany({
      where: { date: query.date },
    });

    // Fetch all classes scheduled on that day of the week
    const daySchedules = await prisma.schedule.findMany({
      where: { day: dayOfWeek },
    });

    const available: Room[] = [];
    const unavailable: { room: Room; reason: string }[] = [];

    for (const room of allRooms) {
      // 1. Check existing bookings collision
      const conflictingBooking = dateBookings.find(
        (b) =>
          b.roomNumber === room.room_number &&
          isTimeOverlapping(query.start_time, query.end_time, b.startTime, b.endTime)
      );

      if (conflictingBooking) {
        unavailable.push({
          room,
          reason: `Booked by ${conflictingBooking.bookedBy} (${conflictingBooking.startTime}–${conflictingBooking.endTime}): ${conflictingBooking.purpose}`,
        });
        continue;
      }

      // 2. Check scheduled class collision
      const conflictingClass = daySchedules.find(
        (s) =>
          s.room === room.room_number &&
          isTimeOverlapping(query.start_time, query.end_time, s.startTime, s.endTime)
      );

      if (conflictingClass) {
        unavailable.push({
          room,
          reason: `Class in session: ${conflictingClass.course} - ${conflictingClass.title} (${conflictingClass.startTime}–${conflictingClass.endTime})`,
        });
        continue;
      }

      available.push(room);
    }

    return { available, unavailable };
  }
}
