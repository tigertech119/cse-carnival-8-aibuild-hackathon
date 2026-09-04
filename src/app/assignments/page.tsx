"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { Assignment } from "@/types";
import {
  ClipboardList,
  Plus,
  Search,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  ExternalLink,
  Award,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function AssignmentsPage() {
  const { success, error } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedCourse, setSelectedCourse] = useState<string>("All");

  // Modals & Actions
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    course: "",
    course_title: "",
    title: "",
    description: "",
    assigned_date: "2026-09-04",
    deadline: "2026-09-18",
    submission_platform: "Moodle",
    status: "pending" as Assignment["status"],
    marks: 20,
  });

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await api.assignments.list();
      setAssignments(res.assignments);
    } catch (err: any) {
      error("Failed to load assignments", err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const resetForm = () => {
    setFormData({
      course: "",
      course_title: "",
      title: "",
      description: "",
      assigned_date: "2026-09-04",
      deadline: "2026-09-18",
      submission_platform: "Moodle",
      status: "pending",
      marks: 20,
    });
    setEditingAssignment(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (a: Assignment) => {
    setEditingAssignment(a);
    setFormData({
      course: a.course,
      course_title: a.course_title,
      title: a.title,
      description: a.description,
      assigned_date: a.assigned_date,
      deadline: a.deadline,
      submission_platform: a.submission_platform,
      status: a.status,
      marks: a.marks,
    });
    setIsCreateOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingAssignment) {
        await api.assignments.update(editingAssignment.id, formData);
        success("Assignment Updated", `${formData.title} has been updated.`);
      } else {
        await api.assignments.create(formData);
        success("Assignment Created", `${formData.title} has been created.`);
      }
      setIsCreateOpen(false);
      resetForm();
      await fetchAssignments();
    } catch (err: any) {
      error("Operation Failed", err?.message || "Could not save assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Assignment["status"]) => {
    try {
      await api.assignments.update(id, { status: newStatus });
      success("Status Updated", `Assignment status changed to ${newStatus}`);
      await fetchAssignments();
    } catch (err: any) {
      error("Update Failed", err?.message);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsSubmitting(true);
    try {
      await api.assignments.delete(deletingId);
      success("Assignment Deleted", "The assignment coursework has been removed.");
      setDeletingId(null);
      await fetchAssignments();
    } catch (err: any) {
      error("Delete Failed", err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const uniqueCourses = useMemo(() => {
    const set = new Set(assignments.map((a) => a.course));
    return Array.from(set).sort();
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchesSearch =
        search === "" ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.course.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = selectedStatus === "All" || a.status === selectedStatus;
      const matchesCourse = selectedCourse === "All" || a.course === selectedCourse;

      return matchesSearch && matchesStatus && matchesCourse;
    });
  }, [assignments, search, selectedStatus, selectedCourse]);

  const getStatusBadge = (status: Assignment["status"]) => {
    switch (status) {
      case "submitted":
        return <Badge variant="success">Submitted</Badge>;
      case "graded":
        return <Badge variant="info">Graded</Badge>;
      case "late":
        return <Badge variant="danger">Late</Badge>;
      case "pending":
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  const getUrgency = (deadlineStr: string, status: Assignment["status"]) => {
    if (status === "submitted" || status === "graded") return null;
    const now = new Date("2026-09-04T00:00:00Z"); // Academic reference date
    const dl = new Date(deadlineStr);
    const diffDays = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Overdue
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Due in {diffDays} {diffDays === 1 ? "day" : "days"}
        </span>
      );
    }
    return (
      <span className="text-[11px] text-slate-500 dark:text-slate-400">
        Due in {diffDays} days
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments & Coursework"
        description="Track academic deadlines, submission portals, marks distribution, and grading statuses."
        action={
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreate}
          >
            New Assignment
          </Button>
        }
      />

      {/* Filter Controls Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Search coursework title, code, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />

          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="graded">Graded</option>
            <option value="late">Late</option>
          </Select>

          <Select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="All">All Courses</option>
            {uniqueCourses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <Button
            variant="outline"
            size="md"
            onClick={() => {
              setSearch("");
              setSelectedStatus("All");
              setSelectedCourse("All");
            }}
          >
            Reset Filters
          </Button>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          title="No Assignments Found"
          description="No coursework matches your filters. Create a new assignment to track its deadline."
          actionLabel="New Assignment"
          onAction={handleOpenCreate}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Assignment Title</TableHead>
              <TableHead>Deadline & Urgency</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div className="font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded inline-block border border-indigo-100 dark:border-indigo-900/50">
                    {a.course}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[140px]">
                    {a.course_title}
                  </div>
                </TableCell>

                <TableCell className="max-w-xs">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{a.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {a.description}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span>{a.deadline}</span>
                  </div>
                  <div className="mt-0.5">{getUrgency(a.deadline, a.status)}</div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold font-mono text-xs">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>{a.marks} pts</span>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {a.submission_platform}
                  </span>
                </TableCell>

                <TableCell>
                  {/* Quick Status Dropdown */}
                  <select
                    value={a.status}
                    onChange={(e) => handleStatusChange(a.id, e.target.value as Assignment["status"])}
                    className="text-xs font-semibold rounded-md px-2 py-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                    <option value="graded">Graded</option>
                    <option value="late">Late</option>
                  </select>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleOpenEdit(a)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(a.id)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
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

      {/* Create / Edit Assignment Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingAssignment ? "Edit Assignment" : "New Course Assignment"}
        description="Fill in coursework details, deadline, points, and submission portal."
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
              {editingAssignment ? "Save Changes" : "Create Assignment"}
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
              label="Course Title"
              required
              placeholder="e.g. Database Systems"
              value={formData.course_title}
              onChange={(e) => setFormData({ ...formData, course_title: e.target.value })}
            />
          </div>

          <Input
            label="Assignment Title"
            required
            placeholder="e.g. Relational Calculus Problem Set"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed instructions or problem scope..."
              className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Assigned Date"
              type="date"
              required
              value={formData.assigned_date}
              onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
            />
            <Input
              label="Deadline Date"
              type="date"
              required
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Submission Platform"
              required
              placeholder="e.g. Moodle"
              value={formData.submission_platform}
              onChange={(e) => setFormData({ ...formData, submission_platform: e.target.value })}
            />
            <Input
              label="Marks (Points)"
              type="number"
              min={0}
              required
              value={formData.marks}
              onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
            />
            <Select
              label="Initial Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="graded">Graded</option>
              <option value="late">Late</option>
            </Select>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Assignment?"
        message="Are you sure you want to remove this assignment from the database? This action cannot be undone."
        confirmText="Delete Assignment"
        isLoading={isSubmitting}
      />
    </div>
  );
}
