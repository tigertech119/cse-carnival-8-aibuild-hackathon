import { NextRequest } from "next/server";
import { SeedService } from "@/server/services/seed.service";
import { successResponse, errorResponse } from "@/lib/api-handler";

export async function POST(_request: NextRequest) {
  try {
    const result = await SeedService.resetAndSeed();
    return successResponse({
      message: "Database successfully reset and re-seeded from seed JSON files",
      ...result,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
