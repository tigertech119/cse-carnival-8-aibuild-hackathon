"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Building2,
  Ticket,
  Megaphone,
  ClipboardList,
  Bot,
  Menu,
  X,
  RotateCcw,
  Activity,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { api } from "@/lib/api-client";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Schedules", href: "/schedules", icon: Calendar },
  { name: "Rooms & Bookings", href: "/rooms", icon: Building2 },
  { name: "Events & Tickets", href: "/events", icon: Ticket },
  { name: "Announcements", href: "/announcements", icon: Megaphone },
  { name: "Assignments", href: "/assignments", icon: ClipboardList },
  { name: "AI Assistant", href: "/assistant", icon: Bot, badge: "Copilot" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { success, error } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [healthStatus, setHealthStatus] = useState<"healthy" | "unhealthy" | "loading">("loading");

  useEffect(() => {
    // Close mobile menu on route change
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    // Check initial health status
    api.system
      .health()
      .then((res) => {
        if (res.status === "healthy") {
          setHealthStatus("healthy");
        } else {
          setHealthStatus("unhealthy");
        }
      })
      .catch(() => setHealthStatus("unhealthy"));
  }, []);

  const handleResetDatabase = async () => {
    setIsResetting(true);
    try {
      const res = await api.system.reset();
      success(
        "Database Reset Successfully",
        `Restored seed data (${res.counts.schedules} schedules, ${res.counts.rooms} rooms, ${res.counts.events} events)`
      );
      setIsResetOpen(false);
      // Reload current page to refresh all active data
      window.location.reload();
    } catch (err: any) {
      error("Reset Failed", err?.message || "Failed to reset database");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/90 shrink-0 select-none">
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs font-bold text-sm">
              C
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base block leading-none">
                CampusOS
              </span>
              <span className="text-[10px] text-indigo-600 font-medium tracking-wide uppercase">
                University Suite
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-tight transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-indigo-100/80 text-indigo-700 font-medium">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer: System Status & Reset */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {/* Health Status Indicator */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {healthStatus === "healthy" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    healthStatus === "healthy"
                      ? "bg-emerald-500"
                      : healthStatus === "unhealthy"
                      ? "bg-red-500"
                      : "bg-slate-300"
                  }`}
                />
              </span>
              <span className="font-medium text-slate-700">Database</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 capitalize">
              {healthStatus}
            </span>
          </div>

          {/* Reset Seed Button */}
          <button
            onClick={() => setIsResetOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200/80 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Seed Data</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/90 flex items-center justify-between px-4 sm:px-8 shrink-0">
          {/* Mobile menu toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 hidden sm:inline">
              University Management System
            </span>
          </div>

          {/* Header Quick Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 font-mono">
              <span>Academic Year: 2026/27</span>
              <span>•</span>
              <span>Fall Semester</span>
            </div>
            <button
              onClick={() => setIsResetOpen(true)}
              title="Restore clean seed JSON data"
              className="sm:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Main View */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* 3. Mobile Navigation Drawer (<768px) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
          />
          <div className="relative w-64 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
              <span className="font-bold text-slate-900 text-base">CampusOS</span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-tight transition-all ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  setIsResetOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 rounded-lg border border-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset Seed Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Database Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onConfirm={handleResetDatabase}
        title="Reset to Seed Data?"
        message="This will clear all current database mutations and restore the authoritative 67 seed records from data/*.json. Use this during testing and evaluation."
        confirmText="Reset Database"
        variant="warning"
        isLoading={isResetting}
      />
    </div>
  );
}
