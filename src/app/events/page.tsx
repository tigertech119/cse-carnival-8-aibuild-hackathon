"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { Event, Registration } from "@/types";
import {
  Ticket,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  Users,
  Trash2,
  Edit2,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function EventsPage() {
  const { success, error } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Registration Modals
  const [registeringEvent, setRegisteringEvent] = useState<Event | null>(null);
  const [registerFormData, setRegisterFormData] = useState({ student_id: "", name: "" });
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Attendees Modal
  const [viewingAttendeesEvent, setViewingAttendeesEvent] = useState<Event | null>(null);
  const [attendees, setAttendees] = useState<Registration[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Event Form Data
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    date: "2026-09-15",
    start_time: "10:00",
    end_time: "13:00",
    end_date: "2026-09-15",
    venue: "Seminar Hall 7C01",
    organizer: "Computer Society",
    capacity: 100,
    status: "upcoming" as Event["status"],
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.events.list();
      setEvents(res.events);
    } catch (err: any) {
      error("Failed to load events", err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      date: "2026-09-15",
      start_time: "10:00",
      end_time: "13:00",
      end_date: "2026-09-15",
      venue: "Seminar Hall 7C01",
      organizer: "Computer Society",
      capacity: 100,
      status: "upcoming",
    });
    setEditingEvent(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (evt: Event) => {
    setEditingEvent(evt);
    setFormData({
      name: evt.name,
      description: evt.description,
      date: evt.date,
      start_time: evt.start_time,
      end_time: evt.end_time,
      end_date: evt.end_date || evt.date,
      venue: evt.venue,
      organizer: evt.organizer,
      capacity: evt.capacity,
      status: evt.status,
    });
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        capacity: Number(formData.capacity),
      };

      if (editingEvent) {
        await api.events.update(editingEvent.id, payload);
        success("Event Updated", `${payload.name} has been updated.`);
      } else {
        await api.events.create(payload);
        success("Event Created", `${payload.name} has been published.`);
      }
      setIsCreateOpen(false);
      resetForm();
      await fetchEvents();
    } catch (err: any) {
      error("Operation Failed", err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsSubmitting(true);
    try {
      await api.events.delete(deletingId);
      success("Event Deleted", "Event and all registered student records removed.");
      setDeletingId(null);
      await fetchEvents();
    } catch (err: any) {
      error("Delete Failed", err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Registration Modal
  const handleOpenRegister = (evt: Event) => {
    setRegisterError(null);
    setRegisterFormData({ student_id: "", name: "" });
    setRegisteringEvent(evt);
  };

  // Submit Student Registration
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeringEvent) return;
    setRegisterError(null);
    setIsSubmitting(true);
    try {
      const res = await api.events.register(registeringEvent.id, registerFormData);
      success(
        "Registration Confirmed",
        `${registerFormData.name} (${registerFormData.student_id}) registered for ${res.event.name}`
      );
      setRegisteringEvent(null);
      await fetchEvents();
    } catch (err: any) {
      setRegisterError(err?.message || "Failed to register student");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Attendees List
  const handleViewAttendees = async (evt: Event) => {
    setViewingAttendeesEvent(evt);
    setLoadingAttendees(true);
    try {
      const res = await api.events.listRegistrations(evt.id);
      setAttendees(res.registrations);
    } catch (err: any) {
      error("Failed to load attendees", err?.message);
    } finally {
      setLoadingAttendees(false);
    }
  };

  // Cancel Registration
  const handleCancelRegistration = async (studentId: string) => {
    if (!viewingAttendeesEvent) return;
    try {
      await api.events.cancelRegistration(viewingAttendeesEvent.id, studentId);
      success("Registration Cancelled", `Student ${studentId} removed from attendee roster.`);
      // Refresh attendees
      const res = await api.events.listRegistrations(viewingAttendeesEvent.id);
      setAttendees(res.registrations);
      await fetchEvents();
    } catch (err: any) {
      error("Cancellation Failed", err?.message);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        search === "" ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.venue.toLowerCase().includes(search.toLowerCase()) ||
        e.organizer.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = selectedStatus === "All" || e.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [events, search, selectedStatus]);

  const getStatusBadge = (status: Event["status"]) => {
    switch (status) {
      case "upcoming":
        return <Badge variant="success">Upcoming</Badge>;
      case "ongoing":
        return <Badge variant="info">Ongoing</Badge>;
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "full":
        return <Badge variant="danger">Full Capacity</Badge>;
      case "cancelled":
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events, Seminars & Workshops"
        description="Discover campus extracurriculars, manage seat capacities, and register student attendance."
        action={
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreate}
          >
            Create Event
          </Button>
        }
      />

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search event name, venue, organizer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="All">All Event Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="full">Full</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              setSearch("");
              setSelectedStatus("All");
            }}
          >
            Reset Filters
          </Button>
        </div>
      </Card>

      {/* Event Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title="No Events Found"
          description="No university events match your query. Create a new event or adjust your filters."
          actionLabel="Create Event"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((evt) => {
            const pct = Math.min(100, Math.round((evt.registered / evt.capacity) * 100));
            const isFullOrCancelled = evt.status === "full" || evt.status === "cancelled" || evt.registered >= evt.capacity;

            return (
              <Card key={evt.id} className="p-5 flex flex-col justify-between hover:border-indigo-300 transition-all">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                      {evt.name}
                    </h3>
                    {getStatusBadge(evt.status)}
                  </div>

                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {evt.description}
                  </p>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{evt.date} {evt.end_date && evt.end_date !== evt.date ? `– ${evt.end_date}` : ""}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{evt.start_time} – {evt.end_time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-700">{evt.venue}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Organized by <strong>{evt.organizer}</strong></span>
                    </div>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                      <span className="text-slate-500">Seats Reserved:</span>
                      <strong className="text-slate-800 font-bold">
                        {evt.registered} / {evt.capacity} ({pct}%)
                      </strong>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pct >= 100
                            ? "bg-red-500"
                            : pct >= 80
                            ? "bg-amber-500"
                            : "bg-indigo-600"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleViewAttendees(evt)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Attendees ({evt.registered})
                  </button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={isFullOrCancelled ? "secondary" : "primary"}
                      disabled={isFullOrCancelled}
                      onClick={() => handleOpenRegister(evt)}
                    >
                      {evt.status === "full" || evt.registered >= evt.capacity
                        ? "Full"
                        : evt.status === "cancelled"
                        ? "Cancelled"
                        : "Register"}
                    </Button>
                    <button
                      onClick={() => handleOpenEdit(evt)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(evt.id)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* REGISTER STUDENT MODAL WITH SERVER CONSTRAINT FEEDBACK */}
      <Modal
        isOpen={!!registeringEvent}
        onClose={() => setRegisteringEvent(null)}
        title={`Register for ${registeringEvent?.name}`}
        description="Enter student credentials to confirm ticket allocation."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRegisteringEvent(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitRegistration}
              isLoading={isSubmitting}
            >
              Confirm Registration
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitRegistration} className="space-y-4">
          {/* Server-side Error Presentation */}
          {registerError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800 leading-snug">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Registration Prohibited</strong>
                <span>{registerError}</span>
              </div>
            </div>
          )}

          <Input
            label="Student ID"
            required
            placeholder="e.g. 20-00045"
            value={registerFormData.student_id}
            onChange={(e) => setRegisterFormData({ ...registerFormData, student_id: e.target.value })}
          />

          <Input
            label="Full Name"
            required
            placeholder="e.g. Mohammad Rahat"
            value={registerFormData.name}
            onChange={(e) => setRegisterFormData({ ...registerFormData, name: e.target.value })}
          />
        </form>
      </Modal>

      {/* ATTENDEES ROSTER MODAL */}
      <Modal
        isOpen={!!viewingAttendeesEvent}
        onClose={() => setViewingAttendeesEvent(null)}
        title={`Registered Attendees — ${viewingAttendeesEvent?.name}`}
        description={`Current roster: ${attendees.length} student${attendees.length === 1 ? "" : "s"} registered.`}
        maxWidth="lg"
      >
        {loadingAttendees ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading attendees...</div>
        ) : attendees.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">
            No students registered yet for this event.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {attendees.map((att) => (
              <div
                key={att.student_id}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <strong className="text-slate-800 font-semibold block">{att.name}</strong>
                  <span className="font-mono text-slate-500 text-[11px]">{att.student_id}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200"
                  onClick={() => handleCancelRegistration(att.student_id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* CREATE / EDIT EVENT MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingEvent ? "Edit Event Details" : "Create University Event"}
        description="Publish extracurricular workshops, guest lectures, or hackathons."
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
              {editingEvent ? "Save Changes" : "Publish Event"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Event Name"
            required
            placeholder="e.g. AI Innovation Summit 2026"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">Description</label>
            <textarea
              rows={2}
              required
              placeholder="Summary of agenda, speakers, and schedule..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white text-slate-900 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              label="Venue"
              required
              placeholder="e.g. Seminar Hall 7C01"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            />
            <Input
              label="Organizer"
              required
              placeholder="e.g. ACM Student Chapter"
              value={formData.organizer}
              onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Capacity (Max Seats)"
              type="number"
              min={1}
              required
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="full">Full</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Event?"
        message="Are you sure you want to permanently delete this event? All student registrations will also be removed."
        confirmText="Delete Event"
        isLoading={isSubmitting}
      />
    </div>
  );
}
