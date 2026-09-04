import { NextRequest } from "next/server";
import { ScheduleService } from "@/server/services/schedule.service";
import { successResponse, errorResponse, parseSearchParams } from "@/lib/api-handler";

export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request.url);
    const schedules = await ScheduleService.list({
      day: params.day,
      course: params.course,
      room: params.room,
      instructor: params.instructor,
      section: params.section,
    });
    return successResponse({ schedules, total: schedules.length });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const created = await ScheduleService.create(body);
    return successResponse(created, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
