# CampusOS — Intelligent University Operating System
### AI Build Hackathon Submission · Ahsanullah University of Science and Technology (AUST)

[![Tests](https://img.shields.io/badge/Tests-38%2F38%20Passed-brightgreen)](tests/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2%20App%20Router-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6%20Strict-blue)](https://www.typescriptlang.org)
[![Database](https://img.shields.io/badge/Database-SQLite%20via%20Prisma-indigo)](https://www.prisma.io)
[![LLM](https://img.shields.io/badge/LLM-Gemini%202.0%20Flash%20Function%20Calling-orange)](https://deepmind.google/technologies/gemini/)

---

## 1. Project Overview

**CampusOS** is an intelligent, full-stack campus management platform built for Ahsanullah University of Science and Technology (AUST). It solves the fragmented campus information problem by uniting academic timetables, room directories, event registrations, notices, and coursework deadlines into a single reactive application.

CampusOS consists of two fully integrated halves:
1. **The Campus Data Manager**: A high-performance web dashboard providing complete, persistent CRUD operations across all 5 campus data domains, live timetable visualization, room availability search with conflict detection, and event seat reservations. Every change made in the dashboard persists to the SQLite database and is immediately reflected everywhere with zero full-page reload.
2. **The Grounded AI Agent**: An autonomous assistant powered by Google Gemini 2.0 Flash using **real function/tool calling**. The LLM never touches the database directly or hallucinates facts; it delegates every inquiry to typed, strictly validated domain services that enforce campus rules (timetable clash prevention, seat limits, duplicate registration rejection). Changes made in the dashboard become the agent's new truth instantly.

---

## 2. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                          User Interfaces                               │
│   ┌────────────────────────────────┐    ┌──────────────────────────┐   │
│   │   Operational Dashboard        │    │    AI Assistant Chat     │   │
│   │   (Schedules, Rooms, Events,   │    │    (Real-time Copilot,   │   │
│   │    Announcements, Assignments) │    │     Starter Prompts)     │   │
│   └───────────────┬────────────────┘    └────────────┬─────────────┘   │
└───────────────────┼──────────────────────────────────┼─────────────────┘
                    │ REST API                         │ POST /api/chat
                    ▼                                  ▼
┌───────────────────────────────────────┐  ┌─────────────────────────────┐
│          Next.js Route Handlers       │  │       Gemini 2.0 Flash      │
│   (/api/schedules, /api/rooms,        │  │     Orchestration Engine    │
│    /api/events, /api/bookings, etc.)  │  │   (Prompt Grounding, Loop)  │
└───────────────────┬───────────────────┘  └───────────┬─────────────────┘
                    │                                  │ Tool Declarations
                    │                                  ▼
                    │                   ┌─────────────────────────────┐
                    │                   │     Typed AI Tool Layer     │
                    │                   │   (src/ai/tools.ts — 26     │
                    │                   │    safe callable tools)     │
                    │                   └──────────────┬──────────────┘
                    ▼                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Validated Service Layer                          │
│     ScheduleService │ RoomService │ BookingService │ EventService      │
│         RegistrationService │ AnnouncementService │ AssignmentService  │
│         -------------------------------------------------------        │
│          Zod Schema Validation & Domain Invariant Checks:              │
│       • Overlapping booking prevention  • Timetable clash detection   │
│       • Duplicate student prevention   • Event capacity enforcement   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Prisma ORM Client
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   SQLite Database (prisma/dev.db)                      │
│      Schedules │ Rooms │ Bookings │ Events │ Registrations │ ...      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions & Route Handlers)
- **Language**: [TypeScript 5.6](https://www.typescriptlang.org/) (Strict mode, zero `any` leakage)
- **Database & ORM**: SQLite via [Prisma ORM 5.22](https://www.prisma.io/) (Idempotent upsert seeding, foreign key cascades, atomic transactions)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/), `next-themes` (Dark/Light mode support), [Lucide React](https://lucide.dev/) icons
- **Validation**: [Zod 3.23](https://zod.dev/) (Strict schemas for all 5 domains + ISO dates and 24h times)
- **AI / LLM Engine**: [Google Gemini 2.0 Flash](https://deepmind.google/technologies/gemini/) via `@google/generative-ai` with native Function Calling / Tool Use
- **Testing**: [Vitest 2.1](https://vitest.dev/) (38 unit, API integration, and tool layer tests)

---

## 4. Prerequisites

- **Node.js**: v18.18.0 or newer (v20+ recommended)
- **npm**: v9 or newer
- **Google Gemini API Key**: Free key from [Google AI Studio](https://aistudio.google.com/)

---

## 5. Setup Instructions (Run Locally)

Clone the repository and follow these exact steps:

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/cse-carnival-8-aibuild-hackathon.git
cd cse-carnival-8-aibuild-hackathon

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and set your GOOGLE_API_KEY (and DATABASE_URL="file:./dev.db")

# 4. Generate Prisma client & initialize database
npx prisma generate
npx prisma db push

# 5. Seed initial data (67 records across all 5 systems)
npm run seed

# 6. Run automated test suite (verifies all 38 tests pass)
npm run test

# 7. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Environment Variables

Create a `.env` file in the project root:

```env
# Database connection (SQLite local file)
DATABASE_URL="file:./dev.db"

# Application port and environment
PORT=3000
NODE_ENV=development

# Google Gemini API Key for AI Assistant (Free key from aistudio.google.com)
GOOGLE_API_KEY="your-google-gemini-api-key-here"

# (Optional fallback providers)
# OPENAI_API_KEY="your-openai-key"
# GROQ_API_KEY="your-groq-key"
# ANTHROPIC_API_KEY="your-anthropic-key"
```

> **Security Note**: Real API keys must never be committed to source control. `.env` is included in `.gitignore`.

---

## 7. Data Management & CRUD Capabilities

CampusOS provides dedicated, interactive management views for all five systems:

| System | Capabilities | URL Path |
|---|---|---|
| **Schedules** | Timetable matrix (Sunday–Thursday), list view, course code search, day filter, create, edit, delete | `/schedules` |
| **Rooms** | Room directory, multi-parameter Availability Finder (cross-references timetable + bookings), instant booking modal, booking cancellation | `/rooms` |
| **Events** | Event discovery, registration modal, capacity progress bars, seat availability badges, student cancellation | `/events` |
| **Announcements** | Priority tagging (`high`, `medium`, `low`), active vs. expired filtering, quick creation modal, full editing & deletion | `/announcements` |
| **Assignments** | Deadline urgency indicators (Overdue, Due Today, Due Soon), marks tracking, submission platform tags, status workflow (`pending`, `submitted`, `graded`, `late`) | `/assignments` |

### Key Business Invariants Enforced by Backend:
- **No Double-Booking**: Rooms cannot be booked during an existing booking or during a scheduled class.
- **No Overbooking**: Event registrations cannot exceed room/event capacity.
- **No Duplicate Registrations**: A student cannot register twice for the same event (returns HTTP 409 Conflict).
- **Date Consistency**: Announcement expiry date cannot precede post date; assignment deadline cannot precede assigned date.

---

## 8. AI Agent & Real Tool Calling Architecture

The AI assistant at `/assistant` does **not** hallucinate or rely on pre-baked context. It is wired to **26 typed tools** in `src/ai/tools.ts`:

### Read Tools:
- `get_schedules` — Retrieve timetable filtered by day, course, room, instructor, or section
- `get_next_class` — Look up upcoming classes based on current Bangladesh time and day
- `get_assignments` — Filter assignments by status, course, or deadline range
- `get_announcements` — List active or priority notices
- `get_rooms` — Filter rooms by type, min capacity, floor, status, and equipment
- `get_room_availability` — Cross-check timetable and bookings for date & time slot
- `get_events` — Find upcoming events by status, date, or name
- `get_event` — Fetch detailed event information with participant count

### Action Tools:
- `book_room` — Validates availability and creates persistent room booking
- `cancel_booking` — Cancels an existing room booking
- `register_for_event` — Enforces capacity and duplicate checks, registers student atomically
- `cancel_event_registration` — Removes student registration and frees event seat
- `create_schedule`, `update_schedule`, `delete_schedule` — Timetable modifications
- `create_announcement`, `update_announcement`, `delete_announcement` — Notice board management
- `create_assignment`, `update_assignment`, `delete_assignment` — Coursework tracking
- `create_event`, `update_event`, `delete_event` — Campus event management
- `create_room`, `update_room`, `delete_room` — Room directory management

---

## 9. Sample Queries to Test (Official Judge Scenarios)

Try these in the `/assistant` chat:

### Simple Lookups:
1. *"When is my next class?"* → Uses current time (BST, UTC+6) to find upcoming classes today or on the next academic day.
2. *"What classes do I have on Wednesday?"* → Returns all Wednesday classes in chronological order with room numbers and instructors.
3. *"What assignments do I have due this week?"* → Checks deadlines and reports pending tasks with mark values.
4. *"Show me all high priority announcements."* → Displays active high-priority university notices.

### Multi-Source Reasoning:
5. *"Which labs have a projector and can fit at least 30 people?"* → Filters labs by capacity >= 30 and equipment containing `projector`.
6. *"I'm free until 2 PM — is there anything on campus I could drop into?"* → Cross-references today's schedule with campus events.

### State-Changing Actions:
7. *"Book Room 7A02 tomorrow from 3 PM to 5 PM."* → Checks availability first, then commits the booking to the database.
8. *"Register me for the Guest Lecture on Deep Learning."* → Verifies event status and capacity, then registers student.
9. *"I need a room for 5 people with a projector, tomorrow between 2 and 4."* → Scans availability across rooms matching criteria.

### Ambiguity & Safety:
10. *"Book me any room tomorrow afternoon."* → Correctly refuses to guess; asks for specific room, time range, and purpose before taking action.
11. *"Register me for Workshop: Git & GitHub for Beginners."* → Rejects registration because the workshop is already full (30/30 seats).

---

## 10. Automated Testing & Verification

Run the complete test suite:

```bash
npm run test
```

### Test Suite Breakdown (38 tests):
- `tests/services.test.ts` (11 tests): Unit tests for service layer business rules (conflict rejection, capacity enforcement, duplicate prevention).
- `tests/api.test.ts` (7 tests): Integration tests for Next.js REST API endpoints and CRUD workflows.
- `tests/tools.test.ts` (20 tests): End-to-end tool execution tests covering all official judge queries, edge cases, negative paths, and live mutation persistence.

Type-check verification:
```bash
npx tsc --noEmit
```

Production build verification:
```bash
npm run build
```

---

## 11. Submission Checklist

- [x] Repository is public
- [x] All 5 data sections visible in dashboard (`/schedules`, `/rooms`, `/events`, `/announcements`, `/assignments`)
- [x] Add, edit, and delete work for all 5 systems and persist across reloads
- [x] Room booking and event registration fully operational
- [x] AI agent uses REAL tool/function calling (no hallucination or static data)
- [x] Edits made via dashboard are immediately visible to AI agent
- [x] README contains working local setup steps
- [x] `.env.example` has placeholders only; no real API keys committed
- [x] 38/38 automated tests passing
- [x] Clean TypeScript compilation (`npx tsc --noEmit`)
