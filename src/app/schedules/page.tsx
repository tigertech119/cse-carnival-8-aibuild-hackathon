"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { Schedule, DayOfWeek } from "@/types";
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Clock,
  MapPin,
  User,
  LayoutGrid,
  List,
} from "lucide-react";

const ACADEMIC_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

export default function SchedulesPage() {
  const { success, error } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"timetable" | "table">("timetable");

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedDay, setSelectedDay] = useState<string>("All");
  const [selectedSection, setSelectedSection] = useState<string>("All");

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    course: "",
    title: "",
    day: "Sunday" as DayOfWeek,
    start_time: "08:00",
    end_time: "09:30",
    room: "",
    instructor: "",
    section: "A",
  });

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await api.schedules.list();
      setSchedules(res.schedules);
    } catch (err: any) {
      error("Failed to load schedules", err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const resetForm = () => {
    setFormData({
      course: "",
      title: "",
      day: "Sunday" as DayOfWeek,
      start_time: "08:00",
      end_time: "09:30",
      room: "",
      instructor: "",
      section: "A",
    });
    setEditingSchedule(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (s: Schedule) => {
    setEditingSchedule(s);
    setFormData({
      course: s.course,
      title: s.title,
      day: s.day,
      start_time: s.start_time,
      end_time: s.end_time,
      room: s.room,
      instructor: s.instructor,
      section: s.section,
    });
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingSchedule) {
        await api.schedules.update(editingSchedule.id, formData);
        success("Schedule Updated", `${formData.course} (${formData.section}) updated.`);
      } else {
        await api.schedules.create(formData);
        success("Schedule Created", `${formData.course} (${formData.section}) created.`);
      }
      setIsCreateOpen(false);
      resetForm();
      await fetchSchedules();
    } catch (err: any) {
      error("Operation Failed", err?.message || "Could not save schedule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsSubmitting(true);
    try {
      await api.schedules.delete(deletingId);
      success("Schedule Deleted", "The class schedule session has been removed.");
      setDeletingId(null);
      await fetchSchedules();
    } catch (err: any) {
      error("Delete Failed", err?.message || "Could not delete schedule");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchesSearch =
        search === "" ||
        s.course.toLowerCase().includes(search.toLowerCase()) ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.instructor.toLowerCase().includes(search.toLowerCase()) ||
        s.room.toLowerCase().includes(search.toLowerCase());

      const matchesDay = selectedDay === "All" || s.day === selectedDay;
      const matchesSection = selectedSection === "All" || s.section === selectedSection;

      return matchesSearch && matchesDay && matchesSection;
    });
  }, [schedules, search, selectedDay, selectedSection]);

  const uniqueSections = useMemo(() => {
    const set = new Set(schedules.map((s) => s.section));
    return Array.from(set).sort();
  }, [schedules]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Schedules & Timetable"
        description="View and manage university lecture slots, sections, room assignments, and faculty allocations."
        action={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("timetable")}
                title="Timetable View"
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === "timetable"
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                title="Table View"
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === "table"
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreate}
            >
              Add Class Session
            </Button>
          </div>
        }
      />

      {/* Filter Controls Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <Input
            placeholder="Search course, title, instructor, room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />

          {/* Day Filter */}
          <Select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          >
            <option value="All">All Academic Days</option>
            {ACADEMIC_DAYS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </Select>

          {/* Section Filter */}
          <Select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            <option value="All">All Sections</option>
            {uniqueSections.map((sec) => (
              <option key={sec} value={sec}>
                Section {sec}
              </option>
            ))}
          </Select>

          {/* Clear Filters */}
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              setSearch("");
              setSelectedDay("All");
              setSelectedSection("All");
            }}
          >
            Reset Filters
          </Button>
        </div>
      </Card>

      {/* Content Rendering */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : filteredSchedules.length === 0 ? (
        <EmptyState
          title="No Class Schedules Found"
          description="No sessions match your search or filter criteria. Try resetting filters or schedule a new class."
          actionLabel="Add Class Session"
          onAction={handleOpenCreate}
        />
      ) : viewMode === "timetable" ? (
        /* Timetable Grouped by Day */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
          {ACADEMIC_DAYS.filter((d) => selectedDay === "All" || selectedDay === d).map((day) => {
            const daySessions = filteredSchedules.filter((s) => s.day === day);
            return (
              <Card key={day} className="flex flex-col bg-slate-50/50 dark:bg-slate-900/40">
                <CardHeader className="py-3 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between w-full">
                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{day}</span>
                    </CardTitle>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {daySessions.length} {daySessions.length === 1 ? "class" : "classes"}
                    </span>
                  </div>
                </CardHeader>

                <div className="p-3 space-y-3 flex-1">
                  {daySessions.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                      No classes scheduled
                    </div>
                  ) : (
                    daySessions.map((s) => (
                      <div
                        key={s.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs transition-all space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">
                            {s.course}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            Sec {s.section}
                          </span>
                        </div>

                        <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                          {s.title}
                        </h4>

                        <div className="pt-1 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span className="font-mono font-medium">
                              {s.start_time} – {s.end_time}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                              Room {s.room}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span className="truncate">{s.instructor}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            title="Edit schedule"
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(s.id)}
                            title="Delete schedule"
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Tabular Data View */
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Day & Time</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Instructor</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchedules.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                  {s.course}
                </TableCell>
                <TableCell className="font-medium text-slate-900 dark:text-slate-100">{s.title}</TableCell>
                <TableCell>
                  <div className="font-medium text-slate-800 dark:text-slate-200">{s.day}</div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {s.start_time} – {s.end_time}
                  </div>
                </TableCell>
                <TableCell className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {s.room}
                </TableCell>
                <TableCell className="font-mono text-slate-600 dark:text-slate-400">{s.section}</TableCell>
                <TableCell className="text-slate-700 dark:text-slate-300">{s.instructor}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(s.id)}
                      className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create / Edit Schedule Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingSchedule ? "Edit Class Session" : "Schedule New Class"}
        description="Ensure the room and timeslot do not conflict with existing bookings."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              {editingSchedule ? "Save Changes" : "Create Schedule"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Course Code"
              required
              placeholder="e.g. CSE 3101"
              value={formData.course}
              onChange={(e) => setFormData({ ...formData, course: e.target.value })}
            />
            <Input
              label="Section"
              required
              placeholder="e.g. A"
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
            />
          </div>

          <Input
            label="Course Title"
            required
            placeholder="e.g. Database Systems Laboratory"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Day of Week"
              required
              value={formData.day}
              onChange={(e) => setFormData({ ...formData, day: e.target.value as DayOfWeek })}
            >
              {ACADEMIC_DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </Select>

            <Input
              label="Start Time"
              type="time"
              required
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />

            <Input
              label="End Time"
              type="time"
              required
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Room Number"
              required
              placeholder="e.g. 7A01"
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
            />

            <Input
              label="Instructor Name"
              required
              placeholder="e.g. Dr. Jane Smith"
              value={formData.instructor}
              onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Schedule Session?"
        message="Are you sure you want to delete this scheduled class session? This action will permanently remove it from the university timetable."
        confirmText="Delete Session"
        isLoading={isSubmitting}
      />
    </div>
  );
}
