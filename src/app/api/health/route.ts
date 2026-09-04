import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Check database connection by counting schedules
    const [schedulesCount, roomsCount, eventsCount, announcementsCount, assignmentsCount] =
      await Promise.all([
        prisma.schedule.count(),
        prisma.room.count(),
        prisma.event.count(),
        prisma.announcement.count(),
        prisma.assignment.count(),
      ]);

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        status: "connected",
        provider: "sqlite",
        counts: {
          schedules: schedulesCount,
          rooms: roomsCount,
          events: eventsCount,
          announcements: announcementsCount,
          assignments: assignmentsCount,
        },
      },
      phase: "Phase 1: M1, M2, M3 Completed",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error?.message || "Database unreachable",
      },
      { status: 503 }
    );
  }
}
