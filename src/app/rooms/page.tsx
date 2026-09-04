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
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { Room, Booking } from "@/types";
import {
  Building2,
  Plus,
  Search,
  Calendar,
  Clock,
  User,
  Trash2,
  Edit2,
  Users,
  Layers,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  CalendarPlus,
} from "lucide-react";

export default function RoomsPage() {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<"directory" | "finder" | "bookings">("directory");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Directory Filters
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [minCapacity, setMinCapacity] = useState<string>("");

  // Room Finder State
  const [finderDate, setFinderDate] = useState("2026-09-06");
  const [finderStartTime, setFinderStartTime] = useState("10:00");
  const [finderEndTime, setFinderEndTime] = useState("12:00");
  const [finderCapacity, setFinderCapacity] = useState("30");
  const [finderResults, setFinderResults] = useState<{
    available: Room[];
    unavailable: { room: Room; reason: string }[];
  } | null>(null);
  const [isFinding, setIsFinding] = useState(false);

  // Modals
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [cancelingBookingId, setCancelingBookingId] = useState<string | null>(null);
  const [selectedRoomForDetails, setSelectedRoomForDetails] = useState<Room | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Room Form
  const [roomFormData, setRoomFormData] = useState({
    room_number: "",
    type: "classroom" as Room["type"],
    capacity: 40,
    floor: 7,
    equipmentText: "projector, AC, whiteboard",
    status: "available" as Room["status"],
  });

  // Booking Form
  const [bookingFormData, setBookingFormData] = useState({
    room_number: "",
    booked_by: "",
    date: "2026-09-06",
    start_time: "14:00",
    end_time: "16:00",
    purpose: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsRes, bookingsRes] = await Promise.all([
        api.rooms.list(),
        api.bookings.list(),
      ]);
      setRooms(roomsRes.rooms);
      setBookings(bookingsRes.bookings);
    } catch (err: any) {
      error("Failed to load room data", err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateRoom = () => {
    setEditingRoom(null);
    setRoomFormData({
      room_number: "",
      type: "classroom",
      capacity: 40,
      floor: 7,
      equipmentText: "projector, AC, whiteboard",
      status: "available",
    });
    setIsCreateRoomOpen(true);
  };

  const handleOpenEditRoom = (r: Room) => {
    setEditingRoom(r);
    setRoomFormData({
      room_number: r.room_number,
      type: r.type,
      capacity: r.capacity,
      floor: r.floor,
      equipmentText: r.equipment.join(", "),
      status: r.status,
    });
    setIsCreateRoomOpen(true);
  };

  const handleSubmitRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const equipment = roomFormData.equipmentText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        room_number: roomFormData.room_number,
        type: roomFormData.type,
        capacity: Number(roomFormData.capacity),
        floor: Number(roomFormData.floor),
        equipment,
        status: roomFormData.status,
      };

      if (editingRoom) {
        await api.rooms.update(editingRoom.id, payload);
        success("Room Updated", `Room ${payload.room_number} updated.`);
      } else {
        await api.rooms.create(payload);
        success("Room Created", `Room ${payload.room_number} created.`);
      }
      setIsCreateRoomOpen(false);
      await fetchData();
    } catch (err: any) {
      error("Room Save Failed", err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!deletingRoomId) return;
    setIsSubmitting(true);
    try {
      await api.rooms.delete(deletingRoomId);
      success("Room Deleted", "The room and associated bookings have been removed.");
      setDeletingRoomId(null);
      await fetchData();
    } catch (err: any) {
      error("Delete Failed", err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenBooking = (roomNumber?: string) => {
    setBookingError(null);
    setBookingFormData({
      room_number: roomNumber || (rooms[0]?.room_number || ""),
      booked_by: "",
      date: "2026-09-06",
      start_time: "14:00",
      end_time: "16:00",
      purpose: "",
    });
    setIsBookingOpen(true);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    setIsSubmitting(true);
    try {
      const res = await api.bookings.create(bookingFormData);
      success(
        "Booking Confirmed",
        `Room ${res.room_number} booked for ${res.date} (${res.start_time}–${res.end_time})`
      );
      setIsBookingOpen(false);
      await fetchData();
    } catch (err: any) {
      setBookingError(err?.message || "Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelingBookingId) return;
    setIsSubmitting(true);
    try {
      await api.bookings.cancel(cancelingBookingId);
      success("Booking Cancelled", "Room booking cancelled successfully.");
      setCancelingBookingId(null);
      await fetchData();
    } catch (err: any) {
      error("Cancellation Failed", err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFindRooms = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFinding(true);
    try {
      const res = await api.rooms.checkAvailability({
        date: finderDate,
        start_time: finderStartTime,
        end_time: finderEndTime,
        capacity: finderCapacity ? Number(finderCapacity) : undefined,
      });
      setFinderResults(res);
    } catch (err: any) {
      error("Availability Check Failed", err?.message);
    } finally {
      setIsFinding(false);
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchesSearch =
        search === "" ||
        r.room_number.toLowerCase().includes(search.toLowerCase()) ||
        r.equipment.some((eq) => eq.toLowerCase().includes(search.toLowerCase()));

      const matchesType = selectedType === "All" || r.type === selectedType;
      const matchesStatus = selectedStatus === "All" || r.status === selectedStatus;
      const matchesCapacity = !minCapacity || r.capacity >= Number(minCapacity);

      return matchesSearch && matchesType && matchesStatus && matchesCapacity;
    });
  }, [rooms, search, selectedType, selectedStatus, minCapacity]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campus Rooms & Space Bookings"
        description="Browse classrooms, computer labs, and seminar halls. Check live timetable availability and make reservations."
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<CalendarPlus className="w-4 h-4" />}
              onClick={() => handleOpenBooking()}
            >
              Book a Room
            </Button>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreateRoom}
            >
              Add Room
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
        tabs={[
          { id: "directory", label: "Room Directory", count: rooms.length, icon: <Building2 className="w-4 h-4" /> },
          { id: "finder", label: "Find Available Room", icon: <Search className="w-4 h-4" /> },
          { id: "bookings", label: "Active Reservations", count: bookings.length, icon: <Calendar className="w-4 h-4" /> },
        ]}
      />

      {/* TAB 1: ROOM DIRECTORY */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Input
                placeholder="Search room code, equipment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="All">All Room Types</option>
                <option value="classroom">Classroom</option>
                <option value="lab">Computer / Hardware Lab</option>
                <option value="seminar_hall">Seminar Hall</option>
              </Select>
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable (Maintenance)</option>
              </Select>
              <Input
                type="number"
                placeholder="Min Capacity (seats)..."
                value={minCapacity}
                onChange={(e) => setMinCapacity(e.target.value)}
                leftIcon={<Users className="w-4 h-4" />}
              />
            </div>
          </Card>

          {loading ? (
            <TableSkeleton rows={6} cols={6} />
          ) : filteredRooms.length === 0 ? (
            <EmptyState
              title="No Rooms Match Criteria"
              description="No campus rooms match your search or capacity criteria. Try adjusting your filters."
              actionLabel="Add Room"
              onAction={handleOpenCreateRoom}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRooms.map((r) => (
                <Card key={r.id} className="p-5 flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold font-mono text-slate-900 bg-slate-100 dark:text-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                          {r.room_number}
                        </span>
                        <Badge
                          variant={r.status === "available" ? "success" : "danger"}
                          size="sm"
                        >
                          {r.status}
                        </Badge>
                      </div>
                      <span className="text-xs font-semibold text-slate-500 capitalize bg-slate-50 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                        {r.type.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>Capacity: <strong className="text-slate-800 dark:text-slate-200">{r.capacity}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>Floor: <strong className="text-slate-800 dark:text-slate-200">{r.floor}</strong></span>
                      </div>
                    </div>

                    {/* Equipment Chips */}
                    <div className="mt-3">
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1.5">
                        Equipment
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {r.equipment.map((eq, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                          >
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedRoomForDetails(r)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
                    >
                      View Details & Bookings ({r.bookings?.length || 0})
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenBooking(r.room_number)}
                        title="Book Room"
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
                      >
                        <CalendarPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditRoom(r)}
                        title="Edit Room"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingRoomId(r.id)}
                        title="Delete Room"
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FIND A ROOM UX */}
      {activeTab === "finder" && (
        <div className="space-y-6">
          <Card className="p-5">
            <form onSubmit={handleFindRooms} className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Find Available Room by Date & Time Slot
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Cross-references against both existing space reservations and regular scheduled classes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input
                  label="Date"
                  type="date"
                  required
                  value={finderDate}
                  onChange={(e) => setFinderDate(e.target.value)}
                />
                <Input
                  label="Start Time"
                  type="time"
                  required
                  value={finderStartTime}
                  onChange={(e) => setFinderStartTime(e.target.value)}
                />
                <Input
                  label="End Time"
                  type="time"
                  required
                  value={finderEndTime}
                  onChange={(e) => setFinderEndTime(e.target.value)}
                />
                <Input
                  label="Min Capacity"
                  type="number"
                  placeholder="e.g. 30"
                  value={finderCapacity}
                  onChange={(e) => setFinderCapacity(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isFinding}
                leftIcon={<Search className="w-4 h-4" />}
              >
                Check Real-Time Availability
              </Button>
            </form>
          </Card>

          {/* Finder Results */}
          {finderResults && (
            <div className="space-y-6">
              {/* Available Rooms */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Available Rooms ({finderResults.available.length})
                  </h4>
                </div>
                {finderResults.available.length === 0 ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    No rooms are free during this exact interval. Check unavailable reasons below.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {finderResults.available.map((r) => (
                      <Card key={r.id} className="p-4 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                            {r.room_number}
                          </span>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setBookingFormData({
                                ...bookingFormData,
                                room_number: r.room_number,
                                date: finderDate,
                                start_time: finderStartTime,
                                end_time: finderEndTime,
                              });
                              setIsBookingOpen(true);
                            }}
                          >
                            Book This Room
                          </Button>
                        </div>
                        <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                          <span>{r.type}</span> • <span>Capacity: {r.capacity}</span> • <span>Floor {r.floor}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Unavailable Rooms with collision reasons */}
              {finderResults.unavailable.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Blocked / Conflicted Rooms ({finderResults.unavailable.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {finderResults.unavailable.map(({ room, reason }, i) => (
                      <div
                        key={i}
                        className="p-3 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 rounded-xl flex items-start gap-3 text-xs"
                      >
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 shrink-0">
                          {room.room_number}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 leading-snug">
                          {reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACTIVE BOOKINGS LIST */}
      {activeTab === "bookings" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Confirmed Room Bookings ({bookings.length})
            </span>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenBooking()}
            >
              New Booking
            </Button>
          </div>

          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : bookings.length === 0 ? (
            <EmptyState
              title="No Active Reservations"
              description="No room bookings are currently registered. Use the 'Book a Room' action to reserve space."
              actionLabel="Book a Room"
              onAction={() => handleOpenBooking()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Booked By</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow key={b.booking_id}>
                    <TableCell className="font-mono font-semibold text-slate-500 dark:text-slate-400">
                      {b.booking_id}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                      {b.room_number}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800 dark:text-slate-200">{b.date}</div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {b.start_time} – {b.end_time}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                      {b.booked_by}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {b.purpose}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:text-red-400 dark:hover:bg-red-950/40 dark:border-red-900/60"
                        onClick={() => setCancelingBookingId(b.booking_id)}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* BOOKING MODAL WITH REAL-TIME CONFLICT ERROR PRESENTATION */}
      <Modal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        title="Reserve Campus Room"
        description="Bookings are strictly checked for collisions with scheduled classes and existing bookings."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBookingOpen(false)}
              disabled={isSubmitting}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitBooking}
              isLoading={isSubmitting}
            >
              Confirm Reservation
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitBooking} className="space-y-4">
          {/* Backend Conflict Error Presentation Banner */}
          {bookingError && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl flex items-start gap-2.5 text-xs text-red-800 dark:text-red-300 leading-snug animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Booking Conflict Detected</strong>
                <span>{bookingError}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Room"
              required
              value={bookingFormData.room_number}
              onChange={(e) => setBookingFormData({ ...bookingFormData, room_number: e.target.value })}
            >
              {rooms.map((r) => (
                <option key={r.room_number} value={r.room_number}>
                  {r.room_number} ({r.type}, cap {r.capacity})
                </option>
              ))}
            </Select>

            <Input
              label="Reservation Date"
              type="date"
              required
              value={bookingFormData.date}
              onChange={(e) => setBookingFormData({ ...bookingFormData, date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time"
              type="time"
              required
              value={bookingFormData.start_time}
              onChange={(e) => setBookingFormData({ ...bookingFormData, start_time: e.target.value })}
            />
            <Input
              label="End Time"
              type="time"
              required
              value={bookingFormData.end_time}
              onChange={(e) => setBookingFormData({ ...bookingFormData, end_time: e.target.value })}
            />
          </div>

          <Input
            label="Booked By"
            required
            placeholder="e.g. Prof. Alan Turing / Debate Club"
            value={bookingFormData.booked_by}
            onChange={(e) => setBookingFormData({ ...bookingFormData, booked_by: e.target.value })}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Reservation Purpose</label>
            <textarea
              rows={2}
              required
              placeholder="e.g. ACM Programming Contest Practice Session"
              value={bookingFormData.purpose}
              onChange={(e) => setBookingFormData({ ...bookingFormData, purpose: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500"
            />
          </div>
        </form>
      </Modal>

      {/* CREATE / EDIT ROOM MODAL */}
      <Modal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        title={editingRoom ? `Edit Room ${editingRoom.room_number}` : "Add Campus Room"}
        description="Register or modify rooms in the university building inventory."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateRoomOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitRoom}
              isLoading={isSubmitting}
            >
              {editingRoom ? "Save Room" : "Create Room"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitRoom} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Room Number"
              required
              placeholder="e.g. 7A05"
              value={roomFormData.room_number}
              onChange={(e) => setRoomFormData({ ...roomFormData, room_number: e.target.value })}
              disabled={!!editingRoom}
            />
            <Select
              label="Room Type"
              value={roomFormData.type}
              onChange={(e) => setRoomFormData({ ...roomFormData, type: e.target.value as any })}
            >
              <option value="classroom">Classroom</option>
              <option value="lab">Lab</option>
              <option value="seminar_hall">Seminar Hall</option>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Capacity (Seats)"
              type="number"
              min={1}
              required
              value={roomFormData.capacity}
              onChange={(e) => setRoomFormData({ ...roomFormData, capacity: Number(e.target.value) })}
            />
            <Input
              label="Floor Number"
              type="number"
              required
              value={roomFormData.floor}
              onChange={(e) => setRoomFormData({ ...roomFormData, floor: Number(e.target.value) })}
            />
            <Select
              label="Status"
              value={roomFormData.status}
              onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value as any })}
            >
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </Select>
          </div>

          <Input
            label="Equipment (Comma Separated)"
            placeholder="e.g. projector, AC, whiteboard, computers"
            value={roomFormData.equipmentText}
            onChange={(e) => setRoomFormData({ ...roomFormData, equipmentText: e.target.value })}
          />
        </form>
      </Modal>

      {/* ROOM DETAILS DRAWER / MODAL */}
      <Modal
        isOpen={!!selectedRoomForDetails}
        onClose={() => setSelectedRoomForDetails(null)}
        title={`Room ${selectedRoomForDetails?.room_number} Details & Bookings`}
        maxWidth="lg"
      >
        {selectedRoomForDetails && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Type</span>
                <strong className="text-slate-800 dark:text-slate-200 capitalize">{selectedRoomForDetails.type}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Capacity</span>
                <strong className="text-slate-800 dark:text-slate-200">{selectedRoomForDetails.capacity} seats</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Floor</span>
                <strong className="text-slate-800 dark:text-slate-200">Level {selectedRoomForDetails.floor}</strong>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Equipment</span>
              <div className="flex flex-wrap gap-1">
                {selectedRoomForDetails.equipment.map((eq, i) => (
                  <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                    {eq}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Active Bookings ({selectedRoomForDetails.bookings?.length || 0})
              </span>
              {(!selectedRoomForDetails.bookings || selectedRoomForDetails.bookings.length === 0) ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">No bookings on record for this room.</p>
              ) : (
                <div className="space-y-2">
                  {selectedRoomForDetails.bookings.map((b) => (
                    <div
                      key={b.booking_id}
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {b.date} • {b.start_time}–{b.end_time}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                          {b.booked_by}: {b.purpose}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40"
                        onClick={() => {
                          setSelectedRoomForDetails(null);
                          setCancelingBookingId(b.booking_id);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* CANCEL BOOKING CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={!!cancelingBookingId}
        onClose={() => setCancelingBookingId(null)}
        onConfirm={handleCancelBooking}
        title="Cancel Room Booking?"
        message="Are you sure you want to cancel this booking? The space will immediately be made available for other reservations."
        confirmText="Cancel Booking"
        isLoading={isSubmitting}
      />

      {/* DELETE ROOM CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={!!deletingRoomId}
        onClose={() => setDeletingRoomId(null)}
        onConfirm={handleDeleteRoom}
        title="Delete Room?"
        message="Are you sure you want to delete this room? Any attached bookings will also be purged."
        confirmText="Delete Room"
        isLoading={isSubmitting}
      />
    </div>
  );
}
