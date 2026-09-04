import { NextRequest } from "next/server";
import { AssignmentService } from "@/server/services/assignment.service";
import { successResponse, errorResponse, parseSearchParams } from "@/lib/api-handler";

export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request.url);
    const assignments = await AssignmentService.list({
      course: params.course,
      status: params.status,
      due_before: params.due_before,
      due_after: params.due_after,
    });
    return successResponse({ assignments, total: assignments.length });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const created = await AssignmentService.create(body);
    return successResponse(created, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
