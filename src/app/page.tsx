import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getStats() {
  try {
    const [schedules, rooms, events, announcements, assignments] = await Promise.all([
      prisma.schedule.count(),
      prisma.room.count(),
      prisma.event.count(),
      prisma.announcement.count(),
      prisma.assignment.count(),
    ]);
    return { schedules, rooms, events, announcements, assignments, connected: true };
  } catch {
    return { schedules: 0, rooms: 0, events: 0, announcements: 0, assignments: 0, connected: false };
  }
}

export default async function HomePage() {
  const stats = await getStats();

  const domains = [
    { name: "Schedules", count: stats.schedules, desc: "Weekly class timetable and lecture slots", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { name: "Rooms & Bookings", count: stats.rooms, desc: "Building 7 classrooms, labs, and bookings", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { name: "Events", count: stats.events, desc: "Workshops, hackathons, and registrations", color: "bg-purple-50 text-purple-700 border-purple-200" },
    { name: "Announcements", count: stats.announcements, desc: "Urgent updates, syllabus, and circulars", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { name: "Assignments", count: stats.assignments, desc: "Deadlines, course tasks, and submissions", color: "bg-rose-50 text-rose-700 border-rose-200" },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-8 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">CampusOS</h1>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
              AUST Edition
            </span>
          </div>
          <p className="text-slate-600 mt-2 text-sm max-w-2xl">
            Intelligent university platform powered by an AI agent that understands and acts on real-time campus data.
          </p>
        </div>

        {/* System Health Badge */}
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-sm text-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${stats.connected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            <span className="font-medium text-slate-700">
              Database: {stats.connected ? "Connected (SQLite)" : "Disconnected"}
            </span>
          </div>
          <Link
            href="/api/health"
            target="_blank"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors"
          >
            /api/health ↗
          </Link>
        </div>
      </div>

      {/* Milestone Progress Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>Phase 1 Architecture Status</span>
          <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
            Active
          </span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <p className="font-semibold text-slate-900">M1: Application Foundation</p>
            <p className="text-xs text-slate-600 mt-1">Next.js 14 App Router, TypeScript, Tailwind, Error Handling & Health API.</p>
            <p className="text-xs font-bold text-emerald-600 mt-2">✓ Verified</p>
          </div>
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <p className="font-semibold text-slate-900">M2: Persistent Database</p>
            <p className="text-xs text-slate-600 mt-1">Prisma SQLite with all 5 data models, foreign keys, and idempotent seed loader.</p>
            <p className="text-xs font-bold text-emerald-600 mt-2">✓ Verified</p>
          </div>
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <p className="font-semibold text-slate-900">M3: Domain Services</p>
            <p className="text-xs text-slate-600 mt-1">7 typed service classes with Zod schemas, booking collisions & capacity rules.</p>
            <p className="text-xs font-bold text-emerald-600 mt-2">✓ Verified</p>
          </div>
        </div>
      </div>

      {/* Domain Entities Grid */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Live Campus Domains</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {domains.map((d) => (
            <div
              key={d.name}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900">{d.name}</h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${d.color}`}>
                  {d.count} records
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
