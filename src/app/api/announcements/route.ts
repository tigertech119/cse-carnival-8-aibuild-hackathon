import { NextRequest } from "next/server";
import { AnnouncementService } from "@/server/services/announcement.service";
import { successResponse, errorResponse, parseSearchParams } from "@/lib/api-handler";

export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request.url);
    const announcements = await AnnouncementService.list({
      priority: params.priority,
      active_only: params.active_only === "true" || params.active === "true",
      as_of_date: params.as_of_date || params.date,
    });
    return successResponse({ announcements, total: announcements.length });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const created = await AnnouncementService.create(body);
    return successResponse(created, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
