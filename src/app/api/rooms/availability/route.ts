import { NextRequest } from "next/server";
import { RoomService } from "@/server/services/room.service";
import { successResponse, errorResponse, parseSearchParams } from "@/lib/api-handler";
import { ValidationError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request.url);
    if (!params.date || !params.start_time || !params.end_time) {
      throw new ValidationError(
        "Missing required query parameters: 'date', 'start_time', 'end_time'"
      );
    }

    const result = await RoomService.checkAvailability({
      date: params.date,
      start_time: params.start_time,
      end_time: params.end_time,
      capacity: params.capacity ? Number(params.capacity) : undefined,
      equipment: params.equipment ? params.equipment.split(",") : undefined,
    });

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.date || !body.start_time || !body.end_time) {
      throw new ValidationError(
        "Missing required fields: 'date', 'start_time', 'end_time'"
      );
    }

    const result = await RoomService.checkAvailability({
      date: body.date,
      start_time: body.start_time,
      end_time: body.end_time,
      capacity: body.capacity ? Number(body.capacity) : undefined,
      equipment: body.equipment,
    });

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
