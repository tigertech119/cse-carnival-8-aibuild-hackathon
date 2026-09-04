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
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Schedule, Room, Event, Announcement, Assignment } from "@/types";

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

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

  const sundayClasses = schedules.filter((s) => s.day === "Sunday");
  const availableRooms = rooms.filter((r) => r.status === "available");
  const highPriorityAnnouncements = announcements.filter((a) => a.priority === "high");
  const pendingAssignments = assignments.filter((a) => a.status === "pending");

  const statCards = [
    {
      title: "Class Schedules",
      value: schedules.length,
      subtitle: `${sundayClasses.length} sessions on Sunday`,
      icon: Calendar,
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-900",
      href: "/schedules",
    },
    {
      title: "Campus Rooms",
      value: rooms.length,
      subtitle: `${availableRooms.length} available for booking`,
      icon: Building2,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-900",
      href: "/rooms",
    },
    {
      title: "Events & Workshops",
      value: events.length,
      subtitle: `${events.reduce((sum, e) => sum + e.registered, 0)} total registrations`,
      icon: Ticket,
      color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-100 dark:border-amber-900",
      href: "/events",
    },
    {
      title: "Announcements",
      value: announcements.length,
      subtitle: `${highPriorityAnnouncements.length} high priority alerts`,
      icon: Megaphone,
      color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border-red-100 dark:border-red-900",
      href: "/announcements",
    },
    {
      title: "Assignments",
      value: assignments.length,
      subtitle: `${pendingAssignments.length} pending submissions`,
      icon: ClipboardList,
      color: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border-sky-100 dark:border-sky-900",
      href: "/assignments",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Campus Overview"
        description="Comprehensive university operational telemetry, schedules, room bookings, and notices."
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
      {highPriorityAnnouncements.length > 0 && (
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
              <CardTitle className="text-sm">Sunday Academic Timetable</CardTitle>
              <CardDescription className="text-xs">First day of university academic week</CardDescription>
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
            ) : sundayClasses.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">No classes scheduled for Sunday.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {sundayClasses.slice(0, 5).map((cls) => (
                  <div key={cls.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900">
                          {cls.course}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{cls.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                        <span>Sec {cls.section}</span>
                        <span>•</span>
                        <span>{cls.instructor}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>{cls.start_time}–{cls.end_time}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 justify-end mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>Room {cls.room}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Campus Events */}
        <Card>
          <CardHeader className="flex items-center justify-between py-3 px-5">
            <div>
              <CardTitle className="text-sm">Upcoming Events</CardTitle>
              <CardDescription className="text-xs">Seminars, workshops, and hackathons</CardDescription>
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
            ) : events.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">No events scheduled.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {events.slice(0, 5).map((evt) => (
                  <div key={evt.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{evt.name}</span>
                        <Badge
                          size="sm"
                          variant={evt.status === "full" ? "danger" : evt.status === "upcoming" ? "success" : "default"}
                        >
                          {evt.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span>{evt.date}</span>
                        <span>•</span>
                        <span>{evt.venue}</span>
                        <span>•</span>
                        <span>By {evt.organizer}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {evt.registered} / {evt.capacity}
                      </span>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">seats filled</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
