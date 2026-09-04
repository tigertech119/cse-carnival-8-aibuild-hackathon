import { NextRequest } from "next/server";
import { BookingService } from "@/server/services/booking.service";
import { successResponse, errorResponse, parseSearchParams } from "@/lib/api-handler";

export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request.url);
    const bookings = await BookingService.list({
      room_number: params.room_number,
      date: params.date,
      booked_by: params.booked_by,
    });
    return successResponse({ bookings, total: bookings.length });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const created = await BookingService.create(body);
    return successResponse(created, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
