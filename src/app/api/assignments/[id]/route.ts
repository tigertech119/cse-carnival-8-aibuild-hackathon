import { NextRequest } from "next/server";
import { AssignmentService } from "@/server/services/assignment.service";
import { successResponse, errorResponse } from "@/lib/api-handler";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assignment = await AssignmentService.getById(params.id);
    return successResponse(assignment);
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
    const updated = await AssignmentService.update(params.id, body);
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
    const result = await AssignmentService.delete(params.id);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
