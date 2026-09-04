import { NextRequest } from "next/server";
import { RegistrationService } from "@/server/services/registration.service";
import { successResponse, errorResponse, parseSearchParams } from "@/lib/api-handler";
import { ValidationError } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const registrations = await RegistrationService.listForEvent(params.id);
    return successResponse({ registrations, total: registrations.length });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updatedEvent = await RegistrationService.register(params.id, body);
    return successResponse(
      {
        message: "Registration successful",
        event: updatedEvent,
      },
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = parseSearchParams(request.url);
    let studentId = searchParams.student_id;

    if (!studentId) {
      try {
        const body = await request.json();
        studentId = body.student_id;
      } catch {
        // body was empty or not json
      }
    }

    if (!studentId) {
      throw new ValidationError("Missing 'student_id' parameter to cancel registration");
    }

    const updatedEvent = await RegistrationService.cancel(params.id, studentId);
    return successResponse({
      message: "Registration cancelled successfully",
      event: updatedEvent,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
