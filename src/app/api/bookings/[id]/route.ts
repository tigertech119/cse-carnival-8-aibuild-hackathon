import { NextRequest } from "next/server";
import { BookingService } from "@/server/services/booking.service";
import { successResponse, errorResponse } from "@/lib/api-handler";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const booking = await BookingService.getById(params.id);
    return successResponse(booking);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await BookingService.cancel(params.id);
    return successResponse({
      message: "Booking cancelled successfully",
      ...result,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
