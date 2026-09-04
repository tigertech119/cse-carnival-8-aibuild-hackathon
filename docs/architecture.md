# CampusOS — Architecture & Phase 1 Foundation

## Overview
CampusOS is built as a single-process full-stack Next.js 14 application using TypeScript, Tailwind CSS, Prisma ORM, and SQLite.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 14 Frontend                    │
│      React 18 + Tailwind CSS + Lucide Icons + App Router    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST / Server Actions
┌──────────────────────────────▼──────────────────────────────┐
│                  Next.js App Router API Routes              │
│       /api/health, /api/schedules, /api/rooms, etc.         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Calls
┌──────────────────────────────▼──────────────────────────────┐
│                    Domain Services Layer                    │
│     ScheduleService, RoomService, BookingService,           │
│     EventService, RegistrationService, AnnouncementService,  │
│     AssignmentService (Validated via Zod)                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Queries / Mutations
┌──────────────────────────────▼──────────────────────────────┐
│                      Prisma ORM Client                      │
│            Auto-seeds from data/*.json on init              │
└──────────────────────────────┬──────────────────────────────┘
                               │ Single Source of Truth
┌──────────────────────────────▼──────────────────────────────┐
│                    SQLite Database (dev.db)                 │
│      Persistent relational storage, survives restarts        │
└─────────────────────────────────────────────────────────────┘
```

## Data Models & Relations
1. **Schedules**: `schedules` table with foreign reference to `rooms.room_number`.
2. **Rooms & Bookings**: `rooms` table with one-to-many relation to `bookings` (`room_number`).
3. **Events & Registrations**: `events` table with one-to-many relation to `registrations` (`event_id`). Unique constraint on `[event_id, student_id]`.
4. **Announcements**: `announcements` table with priority indexing.
5. **Assignments**: `assignments` table with deadline and status indexing.

## Business Rule Enforcements
- **Room Availability**: Verifies that time intervals do not overlap with either existing bookings or regular weekly scheduled classes.
- **Event Capacity**: Prevents registration when `registered >= capacity` or event status is `"full"`.
- **Duplicate Prevention**: Rejects duplicate student registration for the same event.
- **Valid Academic Week**: Restricts class schedules to Sunday–Thursday.
- **Time Validation**: Strict 24-hr `HH:MM` format and `end_time > start_time`.
