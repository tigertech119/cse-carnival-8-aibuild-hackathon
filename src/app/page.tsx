"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/loading-skeleton";
import {
  Calendar,
  Building2,
  Ticket,
  Megaphone,
  ClipboardList,
  ArrowRight,
  Clock,
  MapPin,
  AlertCircle,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Schedule, Room, Event, Announcement, Assignment } from "@/types";

const ACADEMIC_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"] as const;

function getBangladeshDate(): { dateStr: string; dayName: string; timeStr: string } {
  const now = new Date();
  // UTC+6
  const bd = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = dayNames[bd.getUTCDay()];
  const yyyy = bd.getUTCFullYear();
  const mm = String(bd.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(bd.getUTCDate()).padStart(2, "0");
  const hh = String(bd.getUTCHours()).padStart(2, "0");
  const min = String(bd.getUTCMinutes()).padStart(2, "0");
  return { dateStr: `${yyyy}-${mm}-${dd}`, dayName, timeStr: `${hh}:${min}` };
}

function getWeekEndDate(startDate: string, days = 7): string {
  const d = new Date(startDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const { dateStr: today, dayName: todayName, timeStr: currentTime } = getBangladeshDate();
  const isAcademicDay = (ACADEMIC_DAYS as readonly string[]).includes(todayName);
  const weekEnd = getWeekEndDate(today, 7);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [schRes, rmRes, evtRes, annRes, asgnRes] = await Promise.all([
          api.schedules.list(),
          api.rooms.list(),
          api.events.list(),
          api.announcements.list(),
          api.assignments.list(),
        ]);
        setSchedules(schRes.schedules);
        setRooms(rmRes.rooms);
        setEvents(evtRes.events);
        setAnnouncements(annRes.announcements);
        setAssignments(asgnRes.assignments);
      } catch (err) {
        console.error("Failed to load dashboard overview:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Dynamic filters
  const todayClasses = isAcademicDay
    ? schedules.filter((s) => s.day === todayName)
    : [];
  const todayClassesUpcoming = todayClasses.filter((s) => s.start_time >= currentTime);
  const availableRooms = rooms.filter((r) => r.status === "available");
  const highPriorityAnnouncements = announcements.filter(
    (a) => a.priority === "high" && a.expires >= today
  );
  const upcomingEvents = events.filter(
    (e) => e.date >= today && e.status !== "cancelled" && e.status !== "completed"
  );
  const pendingAssignments = assignments.filter((a) => a.status === "pending");
  const dueSoonAssignments = assignments
    .filter((a) => a.deadline >= today && a.deadline <= weekEnd && a.status === "pending")
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const overdueAssignments = assignments.filter(
    (a) => a.deadline < today && (a.status === "pending" || a.status === "late")
  );

  const statCards = [
    {
      title: "Class Schedules",
      value: schedules.length,
      subtitle: isAcademicDay
        ? `${todayClasses.length} classes today (${todayName})`
        : "No classes — weekend",
      icon: Calendar,
      color:
        "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-900",
      href: "/schedules",
    },
    {
      title: "Campus Rooms",
      value: rooms.length,
      subtitle: `${availableRooms.length} available for booking`,
      icon: Building2,
      color:
        "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-900",
      href: "/rooms",
    },
    {
      title: "Events & Workshops",
      value: events.length,
      subtitle: `${upcomingEvents.length} upcoming events`,
      icon: Ticket,
      color:
        "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-100 dark:border-amber-900",
      href: "/events",
    },
    {
      title: "Announcements",
      value: announcements.length,
      subtitle: `${highPriorityAnnouncements.length} high priority active`,
      icon: Megaphone,
      color:
        "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border-red-100 dark:border-red-900",
      href: "/announcements",
    },
    {
      title: "Assignments",
      value: assignments.length,
      subtitle: `${pendingAssignments.length} pending · ${overdueAssignments.length} overdue`,
      icon: ClipboardList,
      color:
        "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border-sky-100 dark:border-sky-900",
      href: "/assignments",
    },
  ];

  function getDeadlineUrgency(deadline: string) {
    const daysUntil = Math.ceil(
      (new Date(deadline + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysUntil < 0) return { label: "Overdue", variant: "danger" as const, days: daysUntil };
    if (daysUntil === 0) return { label: "Due today", variant: "warning" as const, days: 0 };
    if (daysUntil <= 2) return { label: `Due in ${daysUntil}d`, variant: "warning" as const, days: daysUntil };
    return { label: `Due in ${daysUntil}d`, variant: "default" as const, days: daysUntil };
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Campus Overview"
        description={`Live campus data — ${todayName}, ${today}`}
        badge={
          <Badge variant="success" size="sm">
            Live Database
          </Badge>
        }
        action={
          <Link href="/assistant">
            <Button size="sm" variant="primary" leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
              Open AI Copilot
            </Button>
          </Link>
        }
      />

      {/* 1. Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href} className="group">
              <Card className="p-4 transition-all group-hover:border-indigo-300 dark:group-hover:border-indigo-500 group-hover:shadow-md cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {card.title}
                  </span>
                  <div className={`p-2 rounded-lg border ${card.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                {loading ? (
                  <Skeleton className="h-7 w-12 my-1" />
                ) : (
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    {card.value}
                  </div>
                )}
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                  <span>{card.subtitle}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 2. High Priority Announcements Banner */}
      {!loading && highPriorityAnnouncements.length > 0 && (
        <Card className="border-red-200/90 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/30 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-400 rounded-lg shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-900 dark:text-red-300 uppercase tracking-wider">
                  High Priority Campus Notice
                </span>
                <Link
                  href="/announcements"
                  className="text-xs font-semibold text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 underline"
                >
                  View All Notices
                </Link>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {highPriorityAnnouncements[0].title}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                {highPriorityAnnouncements[0].body}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">
                Posted by {highPriorityAnnouncements[0].posted_by} · Expires {highPriorityAnnouncements[0].expires}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 3. Operational Telemetry Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Classes */}
        <Card>
          <CardHeader className="flex items-center justify-between py-3 px-5">
            <div>
              <CardTitle className="text-sm">
                {isAcademicDay ? `Today's Classes — ${todayName}` : "Weekend — No Classes"}
              </CardTitle>
              <CardDescription className="text-xs">
                {isAcademicDay
                  ? `${todayClassesUpcoming.length} upcoming · ${todayClasses.length - todayClassesUpcoming.length} completed`
                  : "Academic week: Sunday through Thursday"}
              </CardDescription>
            </div>
            <Link href="/schedules">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Full Timetable
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !isAcademicDay ? (
              <div className="p-6 text-center">
                <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Today is {todayName}. Classes resume on Sunday.
                </p>
              </div>
            ) : todayClasses.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No classes scheduled for today.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {todayClasses.slice(0, 6).map((cls) => {
                  const isPast = cls.end_time < currentTime;
                  return (
                    <div
                      key={cls.id}
                      className={`p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${isPast ? "opacity-50" : ""}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                            {cls.course}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                            {cls.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                          <span>Sec {cls.section}</span>
                          <span>•</span>
                          <span className="truncate max-w-[100px]">{cls.instructor}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          <span>
                            {cls.start_time}–{cls.end_time}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 justify-end mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          <span>Room {cls.room}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Campus Events */}
        <Card>
          <CardHeader className="flex items-center justify-between py-3 px-5">
            <div>
              <CardTitle className="text-sm">Upcoming Events</CardTitle>
              <CardDescription className="text-xs">
                Seminars, workshops, and hackathons
              </CardDescription>
            </div>
            <Link href="/events">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                All Events
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No upcoming events scheduled.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {upcomingEvents.slice(0, 5).map((evt) => (
                  <div
                    key={evt.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                          {evt.name}
                        </span>
                        <Badge
                          size="sm"
                          variant={
                            evt.status === "full"
                              ? "danger"
                              : evt.status === "upcoming"
                              ? "success"
                              : "default"
                          }
                        >
                          {evt.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span>{evt.date}</span>
                        <span>•</span>
                        <span>{evt.start_time}–{evt.end_time}</span>
                        <span>•</span>
                        <span>Room {evt.venue}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {evt.registered}/{evt.capacity}
                      </span>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">seats</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Upcoming Assignments Due This Week */}
      {!loading && (dueSoonAssignments.length > 0 || overdueAssignments.length > 0) && (
        <Card>
          <CardHeader className="flex items-center justify-between py-3 px-5">
            <div>
              <CardTitle className="text-sm">Assignments Due This Week</CardTitle>
              <CardDescription className="text-xs">
                Deadlines from {today} to {weekEnd}
                {overdueAssignments.length > 0 && (
                  <span className="text-red-600 dark:text-red-400 font-semibold ml-2">
                    · {overdueAssignments.length} overdue
                  </span>
                )}
              </CardDescription>
            </div>
            <Link href="/assignments">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                All Assignments
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...overdueAssignments, ...dueSoonAssignments].slice(0, 5).map((asgn) => {
                const urgency = getDeadlineUrgency(asgn.deadline);
                return (
                  <div
                    key={asgn.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded border border-sky-100 dark:border-sky-900">
                          {asgn.course}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                          {asgn.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {asgn.course_title} · {asgn.submission_platform} · {asgn.marks} marks
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2 flex flex-col items-end gap-1">
                      <Badge size="sm" variant={urgency.variant}>
                        {urgency.label}
                      </Badge>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                        {asgn.deadline}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
