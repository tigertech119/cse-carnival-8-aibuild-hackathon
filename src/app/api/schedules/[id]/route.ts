import { NextRequest } from "next/server";
import { ScheduleService } from "@/server/services/schedule.service";
import { successResponse, errorResponse } from "@/lib/api-handler";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const schedule = await ScheduleService.getById(params.id);
    return successResponse(schedule);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updated = await ScheduleService.update(params.id, body);
    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(request, { params });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await ScheduleService.delete(params.id);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
