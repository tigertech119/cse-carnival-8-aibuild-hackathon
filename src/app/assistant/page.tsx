"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, Send, Calendar, Building2, Ticket, Megaphone, ClipboardList } from "lucide-react";

export default function AssistantPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "assistant" | "user"; text: string }>>([
    {
      role: "assistant",
      text: "Hello! I am the CampusOS AI Assistant. I can assist you with timetable scheduling, room booking availability, event registrations, campus announcements, and academic assignments. How can I help you today?",
    },
  ]);

  const samplePrompts = [
    "Find an available seminar room with a projector for 40 people this Thursday afternoon.",
    "What classes are scheduled in Room 7A01 on Sunday morning?",
    "Show me all assignments due in the next 7 days.",
    "Are there any upcoming tech workshops with open seats?",
    "Summarize all high-priority campus announcements.",
  ];

  const handleSend = (textToSend?: string) => {
    const q = textToSend || query;
    if (!q.trim()) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: q },
      {
        role: "assistant",
        text: `I received your query: "${q}". The AI Assistant tool calling layer is scheduled for integration in Milestone M11. In the meantime, please explore the Schedules, Rooms, Events, Announcements, and Assignments management tabs from the sidebar!`,
      },
    ]);
    setQuery("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Autonomous university copilot powered by natural language domain services."
        badge={
          <Badge variant="info" size="sm">
            <Sparkles className="w-3 h-3 mr-1 inline" /> M11 Preview
          </Badge>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Chat Console */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="flex flex-col h-[520px]">
            <CardHeader className="py-3 px-4 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm">CampusOS Copilot</CardTitle>
                  <CardDescription className="text-[11px]">Direct integration with SQLite domain services</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-md p-3.5 rounded-xl text-xs sm:text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-xs"
                        : "bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/70"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </CardContent>

            <div className="p-3 border-t border-slate-100 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask about room availability, schedules, assignments, or events..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                />
                <Button type="submit" size="sm" variant="primary" leftIcon={<Send className="w-3.5 h-3.5" />}>
                  Send
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Right Col: Capabilities & Prompt Chips */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Suggested Queries</CardTitle>
              <CardDescription className="text-[11px]">Click any chip to test prompt interaction</CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {samplePrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p)}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-indigo-50/70 hover:border-indigo-200 text-xs text-slate-700 hover:text-indigo-900 transition-colors cursor-pointer"
                >
                  "{p}"
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Integrated Domain Tools</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>Class Timetable Queries & Conflict Checks</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-emerald-500" />
                <span>Real-Time Room Availability & Instant Booking</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Ticket className="w-4 h-4 text-amber-500" />
                <span>Campus Event Discovery & Seat Reservation</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Megaphone className="w-4 h-4 text-red-500" />
                <span>Priority Announcement Summaries</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-4 h-4 text-sky-500" />
                <span>Coursework Deadlines & Submission Tracking</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
