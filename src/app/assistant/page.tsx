"use client";

import React, { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Sparkles,
  Send,
  Calendar,
  Building2,
  Ticket,
  Megaphone,
  ClipboardList,
  Loader2,
  Wrench,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  User,
} from "lucide-react";

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
  isError?: boolean;
}

// Maps tool names to friendly display labels
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  get_schedules: "Fetching class schedules",
  get_next_class: "Finding next class",
  get_assignments: "Looking up assignments",
  get_announcements: "Checking announcements",
  get_rooms: "Browsing available rooms",
  get_room_availability: "Checking room availability",
  get_events: "Browsing campus events",
  get_event: "Looking up event details",
  book_room: "Booking room",
  cancel_booking: "Cancelling booking",
  register_for_event: "Registering for event",
  cancel_event_registration: "Cancelling registration",
  create_schedule: "Creating schedule",
  update_schedule: "Updating schedule",
  delete_schedule: "Deleting schedule",
  create_announcement: "Creating announcement",
  update_announcement: "Updating announcement",
  delete_announcement: "Deleting announcement",
  create_assignment: "Creating assignment",
  update_assignment: "Updating assignment",
  delete_assignment: "Deleting assignment",
  create_event: "Creating event",
  update_event: "Updating event",
  delete_event: "Deleting event",
  create_room: "Adding room",
  update_room: "Updating room",
  delete_room: "Removing room",
};

const STARTER_PROMPTS = [
  { icon: "🕐", text: "When is my next class?" },
  { icon: "📅", text: "What classes do I have on Wednesday?" },
  { icon: "📝", text: "What assignments do I have due this week?" },
  { icon: "📢", text: "Show me all high priority announcements." },
  { icon: "🆓", text: "I'm free until 2 PM — is there anything on campus I could drop into?" },
  { icon: "🔬", text: "Which labs have a projector and can fit at least 30 people?" },
  { icon: "📅", text: "Book Room 7A02 tomorrow from 3 PM to 5 PM." },
  { icon: "🎟️", text: "Register me for the Guest Lecture on Deep Learning." },
  { icon: "🔍", text: "I need a room for 5 people with a projector, tomorrow between 2 and 4." },
];

function formatToolName(name: string): string {
  return TOOL_DISPLAY_NAMES[name] || name.replace(/_/g, " ");
}

function ToolCallBadge({ calls }: { calls: ToolCall[] }) {
  if (!calls || calls.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {calls.map((tc, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 font-mono"
        >
          <Wrench className="w-2.5 h-2.5" />
          {formatToolName(tc.name)}
        </span>
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
          isUser ? "bg-indigo-600" : "bg-slate-700 dark:bg-slate-600"
        }`}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-indigo-600 text-white rounded-br-sm"
              : message.isError
              ? "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-900 rounded-bl-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700 rounded-bl-sm"
          }`}
        >
          {message.isError && (
            <div className="flex items-center gap-1.5 mb-1.5 font-semibold text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5" />
              Error
            </div>
          )}
          {message.content}
        </div>

        {/* Tool call badges */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallBadge calls={message.toolCalls} />
        )}

        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

function ThinkingIndicator({ toolName }: { toolName?: string }) {
  return (
    <div className="flex items-end gap-2">
      <div className="shrink-0 w-7 h-7 rounded-full bg-slate-700 dark:bg-slate-600 flex items-center justify-center">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
        {toolName ? (
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
            <span className="font-medium">{formatToolName(toolName)}...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce [animation-delay:0ms]" />
            <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce [animation-delay:300ms]" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am CampusOS AI, your campus assistant powered by Google Gemini.\n\nI can help you with:\n• Class schedules and timetables\n• Room availability and bookings\n• Campus events and registrations\n• Announcements and notices\n• Assignment deadlines\n\nI always read live data from the database, so any changes made in the dashboard are immediately reflected here.\n\nHow can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | undefined>();
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<boolean>(false);

  useEffect(() => {
    // Check if AI is configured
    fetch("/api/chat")
      .then((r) => r.json())
      .then((data) => setAiConfigured(data.ai_configured))
      .catch(() => setAiConfigured(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function getHistory() {
    return messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
  }

  async function handleSend(text?: string) {
    const messageText = (text || input).trim();
    if (!messageText || isLoading) return;

    setInput("");
    abortRef.current = false;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentTool(undefined);

    try {
      const history = getHistory();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          history,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (abortRef.current) return;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message || "I could not generate a response. Please try again.",
        toolCalls: data.toolCalls,
        timestamp: new Date(),
        isError: !data.success && !!data.error && !data.message,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      if (abortRef.current) return;

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Failed to reach the AI assistant. Please check your connection and try again.\n\nError: ${err.message}`,
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      if (!abortRef.current) {
        setIsLoading(false);
        setCurrentTool(undefined);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleReset() {
    abortRef.current = true;
    setIsLoading(false);
    setCurrentTool(undefined);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hello! I am CampusOS AI, your campus assistant powered by Google Gemini. How can I help you today?",
        timestamp: new Date(),
      },
    ]);
  }

  return (
    <div className="space-y-5 h-full">
      <PageHeader
        title="AI Assistant"
        description="Powered by Google Gemini — reads live campus data for every answer."
        badge={
          aiConfigured === null ? (
            <Badge variant="default" size="sm">
              <Loader2 className="w-3 h-3 mr-1 animate-spin inline" /> Checking...
            </Badge>
          ) : aiConfigured ? (
            <Badge variant="success" size="sm">
              <CheckCircle className="w-3 h-3 mr-1 inline" /> AI Ready
            </Badge>
          ) : (
            <Badge variant="danger" size="sm">
              <AlertCircle className="w-3 h-3 mr-1 inline" /> API Key Missing
            </Badge>
          )
        }
        action={
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={handleReset}
          >
            New Chat
          </Button>
        }
      />

      {/* API key warning */}
      {aiConfigured === false && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <strong>AI not configured.</strong> Set the <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">GOOGLE_API_KEY</code> environment variable to enable the AI assistant.
            Add it to your <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">.env</code> file and restart the server.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Chat Panel */}
        <div className="lg:col-span-2 flex flex-col">
          <Card className="flex flex-col" style={{ height: "600px" }}>
            {/* Chat Header */}
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-900/60">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm">CampusOS Copilot</CardTitle>
                  <CardDescription className="text-[11px]">
                    Live database · Gemini 2.0 Flash · Real tool calling
                  </CardDescription>
                </div>
                <div className="ml-auto">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {messages.filter((m) => m.role === "user").length} messages
                  </span>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {isLoading && <ThinkingIndicator toolName={currentTool} />}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input Area */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  placeholder="Ask about schedules, rooms, events, assignments... (Enter to send, Shift+Enter for newline)"
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:border-indigo-500 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ minHeight: "38px", maxHeight: "120px" }}
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={isLoading || !input.trim()}
                  leftIcon={
                    isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )
                  }
                >
                  {isLoading ? "..." : "Send"}
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Right: Suggestions + Capabilities */}
        <div className="space-y-4">
          {/* Starter Prompts */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Try These Queries</CardTitle>
              <CardDescription className="text-[11px]">
                Official judge scenarios + common questions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-1.5">
              {STARTER_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p.text)}
                  disabled={isLoading}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-indigo-50/70 hover:border-indigo-200 text-xs text-slate-700 hover:text-indigo-900 transition-colors cursor-pointer dark:bg-slate-800/60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-indigo-950/40 dark:hover:border-indigo-800 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-start gap-2"
                >
                  <span className="shrink-0">{p.icon}</span>
                  <span className="line-clamp-2">{p.text}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Capabilities */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">What I Can Do</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span>Query class schedules, find next class, check timetables</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Check room availability, book rooms, find labs with equipment</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Ticket className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Browse events, register for them, check capacity</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Megaphone className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>Read announcements, filter by priority, see active notices</span>
              </div>
              <div className="flex items-start gap-2.5">
                <ClipboardList className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <span>Check assignment deadlines, filter by course or date</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                <span>Multi-source reasoning: "Am I free? What can I attend?"</span>
              </div>
            </CardContent>
          </Card>

          {/* Live Data Trust Cue */}
          <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center px-2 leading-relaxed">
            <CheckCircle className="w-3 h-3 inline mr-1 text-emerald-500" />
            I always read live data. Changes made in the dashboard are immediately available here.
          </div>
        </div>
      </div>
    </div>
  );
}