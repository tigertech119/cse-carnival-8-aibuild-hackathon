import { NextRequest } from "next/server";
import { EventService } from "@/server/services/event.service";
import { successResponse, errorResponse, parseSearchParams } from "@/lib/api-handler";

export async function GET(request: NextRequest) {
  try {
    const params = parseSearchParams(request.url);
    const events = await EventService.list({
      status: params.status,
      date: params.date,
      venue: params.venue,
      organizer: params.organizer,
    });
    return successResponse({ events, total: events.length });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const created = await EventService.create(body);
    return successResponse(created, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
