import { NextRequest } from "next/server";
import { AnnouncementService } from "@/server/services/announcement.service";
import { successResponse, errorResponse } from "@/lib/api-handler";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const announcement = await AnnouncementService.getById(params.id);
    return successResponse(announcement);
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
    const updated = await AnnouncementService.update(params.id, body);
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
    const result = await AnnouncementService.delete(params.id);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
