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
import { Announcement } from "@/types";
import {
  Megaphone,
  Plus,
  Search,
  Calendar,
  Clock,
  User,
  Trash2,
  Edit2,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ArrowUpDown,
} from "lucide-react";

export default function AnnouncementsPage() {
  const { success, error } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "active" | "expired">("all");
  const [sortBy, setSortBy] = useState<"newest" | "priority">("newest");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    priority: "medium" as Announcement["priority"],
    posted_by: "University Administration",
    date: "2026-09-04",
    expires: "2026-09-18",
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.announcements.list();
      setAnnouncements(res.announcements);
    } catch (err: any) {
      error("Failed to load announcements", err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const resetForm = () => {
    setFormData({
      title: "",
      body: "",
      priority: "medium",
      posted_by: "University Administration",
      date: "2026-09-04",
      expires: "2026-09-18",
    });
    setEditingAnnouncement(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (a: Announcement) => {
    setEditingAnnouncement(a);
    setFormData({
      title: a.title,
      body: a.body,
      priority: a.priority,
      posted_by: a.posted_by,
      date: a.date,
      expires: a.expires,
    });
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingAnnouncement) {
        await api.announcements.update(editingAnnouncement.id, formData);
        success("Notice Updated", `${formData.title} has been updated.`);
      } else {
        await api.announcements.create(formData);
        success("Notice Published", `${formData.title} has been published to the campus bulletin.`);
      }
      setIsCreateOpen(false);
      resetForm();
      await fetchAnnouncements();
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
      await api.announcements.delete(deletingId);
      success("Notice Deleted", "The announcement has been permanently removed.");
      setDeletingId(null);
      await fetchAnnouncements();
    } catch (err: any) {
      error("Delete Failed", err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check expiration relative to anchor date 2026-09-04
  const isExpired = (expiresDateStr: string) => {
    const now = "2026-09-04";
    return expiresDateStr < now;
  };

  const filteredAnnouncements = useMemo(() => {
    let list = announcements.filter((a) => {
      const matchesSearch =
        search === "" ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.body.toLowerCase().includes(search.toLowerCase()) ||
        a.posted_by.toLowerCase().includes(search.toLowerCase());

      const matchesPriority =
        selectedPriority === "All" || a.priority === selectedPriority;

      const expired = isExpired(a.expires);
      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "active" && !expired) ||
        (selectedStatus === "expired" && expired);

      return matchesSearch && matchesPriority && matchesStatus;
    });

    // Sorting
    if (sortBy === "priority") {
      const priorityWeights = { high: 3, medium: 2, low: 1 };
      list = [...list].sort(
        (a, b) => priorityWeights[b.priority] - priorityWeights[a.priority]
      );
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }

    return list;
  }, [announcements, search, selectedPriority, selectedStatus, sortBy]);

  const getPriorityBadge = (priority: Announcement["priority"]) => {
    switch (priority) {
      case "high":
        return (
          <Badge variant="danger" className="gap-1 font-semibold">
            <AlertCircle className="w-3 h-3" /> High Priority
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="warning" className="gap-1 font-semibold">
            <AlertTriangle className="w-3 h-3" /> Medium
          </Badge>
        );
      case "low":
      default:
        return (
          <Badge variant="info" className="gap-1 font-semibold">
            <Info className="w-3 h-3" /> Low
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campus Announcements & Bulletin"
        description="Official university notices, emergency alerts, administrative memoranda, and event announcements."
        action={
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreate}
          >
            Post Notice
          </Button>
        }
      />

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Search notices, body text, or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />

          <Select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
          >
            <option value="All">All Priorities</option>
            <option value="high">High Priority Only</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </Select>

          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
          >
            <option value="all">All (Active & Expired)</option>
            <option value="active">Active Only</option>
            <option value="expired">Expired Only</option>
          </Select>

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="newest">Sort: Newest First</option>
            <option value="priority">Sort: Highest Priority</option>
          </Select>
        </div>
      </Card>

      {/* Announcement Board Grid */}
      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <EmptyState
          title="No Notices Found"
          description="No campus announcements match your current filter selection. Post a new announcement or clear filters."
          actionLabel="Post Notice"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((ann) => {
            const expired = isExpired(ann.expires);
            const isHigh = ann.priority === "high";

            return (
              <Card
                key={ann.id}
                className={`p-5 transition-all ${
                  expired
                    ? "bg-slate-50/60 border-slate-200/60 opacity-80 dark:bg-slate-900/40 dark:border-slate-800"
                    : isHigh
                    ? "border-red-200 bg-red-50/20 shadow-xs hover:border-red-300 dark:border-red-900/60 dark:bg-red-950/20 dark:hover:border-red-800"
                    : "hover:border-indigo-200 dark:hover:border-indigo-800"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getPriorityBadge(ann.priority)}
                      {expired && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-semibold">
                          Expired
                        </span>
                      )}
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        Posted: {ann.date}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        Expires: {ann.expires}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                      {ann.title}
                    </h3>

                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line pt-1">
                      {ann.body}
                    </p>

                    <div className="pt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>Issued by <strong className="text-slate-700 dark:text-slate-300">{ann.posted_by}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-start pt-2 sm:pt-0">
                    <button
                      onClick={() => handleOpenEdit(ann)}
                      title="Edit Notice"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(ann.id)}
                      title="Delete Notice"
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT ANNOUNCEMENT MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingAnnouncement ? "Edit Announcement" : "Post Campus Announcement"}
        description="Publish official university advisory, emergency bulletin, or event notice."
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
              {editingAnnouncement ? "Save Changes" : "Publish Notice"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Notice Title"
            required
            placeholder="e.g. Campus Wi-Fi Scheduled Maintenance Window"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Notice Body / Details *</label>
            <textarea
              rows={4}
              required
              placeholder="Write the full announcement text..."
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority Level"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
            >
              <option value="high">High Priority (Urgent Warning)</option>
              <option value="medium">Medium Priority (Standard Notice)</option>
              <option value="low">Low Priority (Informational)</option>
            </Select>

            <Input
              label="Posted By (Department / Office)"
              required
              placeholder="e.g. Office of the Registrar"
              value={formData.posted_by}
              onChange={(e) => setFormData({ ...formData, posted_by: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date Posted"
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
            <Input
              label="Expiry Date"
              type="date"
              required
              value={formData.expires}
              onChange={(e) => setFormData({ ...formData, expires: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Announcement?"
        message="Are you sure you want to permanently delete this campus notice? This cannot be undone."
        confirmText="Delete Notice"
        isLoading={isSubmitting}
      />
    </div>
  );
}
