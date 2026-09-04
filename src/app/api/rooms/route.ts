import { NextRequest } from "next/server";
import { RoomService } from "@/server/services/room.service";
import { successResponse, errorResponse, parseSearchParams } from "@/lib/api-handler";

export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request.url);
    const rooms = await RoomService.list({
      type: params.type,
      min_capacity: params.min_capacity ? Number(params.min_capacity) : undefined,
      equipment: params.equipment ? params.equipment.split(",") : undefined,
      floor: params.floor ? Number(params.floor) : undefined,
      status: params.status,
    });
    return successResponse({ rooms, total: rooms.length });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const created = await RoomService.create(body);
    return successResponse(created, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
