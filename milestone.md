# CampusOS — Antigravity Implementation Milestones

> Purpose: This file is the execution plan for building the complete CampusOS hackathon submission from the starter repository.
>
> **How Antigravity should use this file:** When asked to implement a milestone, read this file plus the repository's `PROBLEM_STATEMENT.md`, `schema/schema.md`, `sample_queries/sample_queries.md`, and `SUBMISSION.md`. Implement the requested milestone end-to-end, including backend, frontend, tests, seed loading, validation, and documentation where relevant. Do not ask for architectural clarification unless a requirement is genuinely contradictory or impossible. Use the defaults in this document when a decision is not explicitly specified.

---

## 0. Project Goal

Build **CampusOS**, a full-stack university information and action platform with two tightly integrated parts:

1. **Campus Data Manager** — a polished dashboard that displays and manages five live campus data domains:
   - Schedules
   - Rooms + bookings
   - Events + registrations
   - Announcements
   - Assignments

2. **AI Agent** — a conversational agent that reads the **current backend state** through real tool/function calls and can answer questions, combine data from multiple domains, perform permitted actions, ask for missing information, and refuse unsafe/unsupported actions.

The judges will evaluate correctness, persistence, live-data behavior, agent tool use, action execution, ambiguity handling, and UI quality.

### Non-negotiable requirements from the challenge

- Seed JSON files are starter data only; they must be loaded into persistent backend storage.
- The dashboard and agent must read/write the backend rather than static JSON files.
- CRUD must persist across reloads.
- Dashboard changes must be reflected to the agent immediately because the agent must query live backend state.
- The agent must use real tool/function calling; do not fake tool calling with prompt text or hardcoded routing.
- Room booking must check availability before creating a booking.
- Event registration must respect event capacity and prevent invalid registrations.
- The agent must ask clarifying questions when required information is missing instead of inventing parameters.
- Unauthorized or unsupported actions must be refused safely.
- The app must be runnable by a judge from the submitted repository.
- Never commit API keys or secrets.

---

# 1. Default Technical Decisions

Use these defaults unless the repository already contains an established compatible stack. If code already exists, extend it rather than replacing it unnecessarily.

### Recommended greenfield stack

- **Frontend:** Next.js + TypeScript + Tailwind CSS
- **Backend/API:** Next.js Route Handlers or a clean Node/TypeScript API layer
- **Database:** SQLite for zero-friction local judging
- **ORM:** Prisma
- **Validation:** Zod
- **AI:** provider abstraction with the configured LLM provider from environment variables
- **State/data fetching:** TanStack Query or a clean server/client data-fetching layer
- **UI:** responsive dashboard + chat interface; use an accessible component system where practical
- **Testing:** Vitest/Jest for unit tests + Playwright for key end-to-end flows
- **Package manager:** keep the repository's existing lockfile/package manager if one exists

### Architecture principles

- Separate domain/data access, API, AI tools, and UI concerns.
- The database is the single source of truth.
- Tool functions call service/repository methods; they must not duplicate business logic.
- The AI agent must never directly manipulate database files.
- All state-changing operations go through validated service/API functions.
- Keep all domain logic deterministic and testable outside the LLM.
- The LLM decides **which tool to call**; deterministic application code decides whether the requested operation is valid.
- Use stable IDs from seed data where possible.
- Use ISO dates and `HH:MM` times as specified by the provided schema.
- Use the university week Sunday–Thursday.
- Store dates/times consistently; compare date/time values through normalized utilities rather than string tricks spread throughout the codebase.

---

# 2. Repository Source of Truth

Before implementing anything, inspect these files and treat them as authoritative for challenge requirements:

- `PROBLEM_STATEMENT.md`
- `schema/schema.md`
- `sample_queries/sample_queries.md`
- `SUBMISSION.md`
- all files under `data/`

Do not modify the meaning of the required schema just to make implementation easier.

The supplied schema defines these records:

### Schedule
`id`, `course`, `title`, `day`, `start_time`, `end_time`, `room`, `instructor`, `section`

### Room
`id`, `room_number`, `type`, `capacity`, `equipment`, `floor`, `status`, `bookings[]`

### Booking
`booking_id`, `booked_by`, `date`, `start_time`, `end_time`, `purpose`

### Event
`id`, `name`, `description`, `date`, `start_time`, `end_time`, `end_date`, `venue`, `organizer`, `capacity`, `registered`, `registrations[]`, `status`

### Registration
`student_id`, `name`

### Announcement
`id`, `title`, `body`, `date`, `priority`, `posted_by`, `expires`

### Assignment
`id`, `course`, `course_title`, `title`, `description`, `assigned_date`, `deadline`, `submission_platform`, `status`, `marks`

---

# 3. Milestone Map

| Milestone | Goal | Depends on |
|---|---|---|
| M0 | Repository audit + implementation contract | None |
| M1 | Application foundation + local run | M0 |
| M2 | Database schema + seed import | M1 |
| M3 | Backend domain services + validation | M2 |
| M4 | Complete CRUD API | M3 |
| M5 | Dashboard shell + navigation | M4 |
| M6 | Schedule + Assignment management UI | M5 |
| M7 | Room management + booking UI | M5 |
| M8 | Event + registration UI | M5 |
| M9 | Announcement management UI | M5 |
| M10 | Dashboard polish + realtime refresh behavior | M6–M9 |
| M11 | AI tool layer | M3/M4 |
| M12 | AI agent orchestration + prompt + safety | M11 |
| M13 | Conversational UI + agent/action UX | M12 |
| M14 | Judge-query coverage + adversarial/edge cases | M10 + M13 |
| M15 | Persistence, integration, and live-data verification | M10 + M14 |
| M16 | Deployment/local judge package + documentation | M15 |
| M17 | Final hackathon polish + demo readiness | M16 |

Each milestone below is deliberately self-contained enough for an AI coding agent to execute without repeated clarification.

---

# M0 — Repository Audit and Implementation Contract

## Objective
Understand the starter repository and establish the exact implementation plan without modifying functional requirements.

## Tasks

1. Inspect the complete repository tree.
2. Read:
   - `README.md`
   - `PROBLEM_STATEMENT.md`
   - `schema/schema.md`
   - `sample_queries/sample_queries.md`
   - `SUBMISSION.md`
   - `.env.example`
3. Inspect every file under `data/` and validate that it matches the documented schema.
4. Record the available seed records and any data irregularities.
5. Detect whether any application code already exists.
6. Preserve useful existing code instead of replacing it.
7. Create an architecture note in `docs/architecture.md` summarizing:
   - frontend
   - backend/API
   - database
   - AI layer
   - data flow
   - environment variables
   - testing strategy
8. Create/update `.env.example` with placeholders only.
9. Confirm `milestone.md` is present at repository root.

## Acceptance criteria

- Repository structure is understood and documented.
- No challenge requirement is omitted.
- Existing implementation, if any, is identified and preserved.
- Architecture is explicit enough that later milestones can proceed without design questions.

## Do not do

- Do not build the AI agent yet.
- Do not bypass the supplied schema.
- Do not hardcode data into UI components.

---

# M1 — Application Foundation and Local Run

## Objective
Create a minimal but production-structured application that starts reliably on a judge machine.

## Tasks

1. Create/install the selected application framework and dependencies.
2. Establish a clean folder structure, for example:

```text
src/
  app/ or pages/
  components/
  features/
  lib/
  server/
  ai/
  types/
  validation/
  styles/
prisma/
public/
tests/
docs/
```

3. Configure TypeScript with strict checking.
4. Add environment configuration helpers.
5. Add a public `GET /api/health` endpoint returning a simple healthy status.
6. Add a basic home/dashboard route.
7. Add global error handling and a consistent API error shape.
8. Add linting/formatting scripts.
9. Add test runner configuration.
10. Ensure `npm install` + the documented start command works from a clean checkout.

## Acceptance criteria

- App starts locally from documented commands.
- Health endpoint works.
- Frontend route renders.
- Type checking passes.
- Linting passes.
- No secret is required for basic local app startup.

---

# M2 — Persistent Database and Seed Import

## Objective
Replace static JSON usage with a real persistent database.

## Tasks

1. Model all five systems using the exact logical fields from `schema/schema.md`.
2. Create normalized relational tables where that improves integrity, while preserving the externally visible domain shape.
3. Use stable IDs from the seed data.
4. Implement database initialization/migration.
5. Implement a deterministic seed/import process for:
   - schedules
   - rooms
   - room bookings
   - events
   - event registrations
   - announcements
   - assignments
6. Make seeding idempotent so it can safely be run again without duplicate records.
7. Add unique constraints where appropriate.
8. Add foreign keys/relationships between schedules and rooms, bookings and rooms, registrations and events, where appropriate.
9. Add indexes for common queries:
   - schedule by day/course
   - room by room number
   - bookings by room/date/time
   - events by date/status/name
   - announcements by priority/date/expiry
   - assignments by deadline/status/course
10. Add a startup path or command that initializes the database only when needed.

## Acceptance criteria

- Seed data loads into persistent storage.
- A server restart does not erase data.
- A page reload shows the same data.
- Re-running seed does not create duplicates.
- The application does not read seed JSON directly during normal operation.

---

# M3 — Domain Services, Validation, and Business Rules

## Objective
Implement deterministic backend domain logic that both the dashboard API and AI tools can reuse.

## Tasks

Create services for:

- ScheduleService
- RoomService
- BookingService
- EventService
- RegistrationService
- AnnouncementService
- AssignmentService

Implement request/response validation using Zod or equivalent.

### Required business rules

#### Schedule
- Required fields must be present.
- Day must be one of Sunday–Thursday.
- Times must be valid `HH:MM`.
- End time must be later than start time.
- Room references should resolve to a known room when creating/updating schedules.

#### Room
- Room number must be unique.
- Capacity must be positive.
- Equipment must remain an array of strings.
- Status must be `available` or `unavailable`.

#### Booking
- Room must exist.
- Booking date must be valid.
- Start/end time must be valid.
- End time must be after start time.
- Reject overlapping bookings for the same room/date.
- Reject bookings against an unavailable room.
- Support cancellation.

#### Event
- Capacity must be positive.
- Registered count must match registrations or be maintained consistently.
- Registration cannot exceed capacity.
- Prevent duplicate student registration for the same event.
- Cancelled events cannot accept new registrations.

#### Announcement
- Priority must be `high`, `medium`, or `low`.
- Expiry must not be earlier than posted date unless the data is explicitly being corrected by an admin/edit operation.

#### Assignment
- Status must be one of `pending`, `submitted`, `graded`, `late`.
- Deadline and assigned date must be valid dates.
- Marks must be non-negative.

## Acceptance criteria

- Business rules are enforced in one shared service layer.
- API and AI tools do not duplicate these rules.
- Unit tests cover normal and invalid cases.

---

# M4 — Complete CRUD API

## Objective
Expose a complete backend API for all dashboard operations.

## Required API behavior

Implement REST-style endpoints or an equally clear typed API for:

### Schedules
- list
- get by ID
- create
- update
- delete

### Rooms
- list
- get by ID
- create
- update
- delete
- list/check bookings
- create booking
- cancel booking

### Events
- list
- get by ID
- create
- update
- delete
- register student
- cancel registration

### Announcements
- list
- get by ID
- create
- update
- delete

### Assignments
- list
- get by ID
- create
- update
- delete

### Query/filter endpoints or parameters
Support useful filtering for:

- schedule by day/course
- room by type/capacity/equipment/status
- events by date/status
- announcements by priority/expiry
- assignments by course/deadline/status

## API quality

- Validate all input.
- Return consistent HTTP status codes.
- Return clear errors.
- Never expose stack traces to normal clients.
- Use server-side filtering rather than loading every record when a query can be executed in the database.

## Acceptance criteria

Every five domain sections supports view + create + edit + delete, and room/event extra actions work.

---

# M5 — Dashboard Shell and Application Navigation

## Objective
Build the main dashboard structure before implementing each domain screen.

## Tasks

1. Create responsive app shell.
2. Add sidebar/top navigation for:
   - Overview
   - Schedule
   - Rooms
   - Events
   - Announcements
   - Assignments
   - AI Assistant
3. Add a consistent page header with title and primary action.
4. Add loading, empty, and error states.
5. Add toast/notification mechanism for successful mutations and failures.
6. Add modal/drawer pattern for create/edit forms.
7. Add reusable table/card/filter/pagination components.
8. Make mobile layout usable.
9. Keep all pages visually coherent.

## Acceptance criteria

- All domain pages are reachable.
- Navigation works without broken routes.
- UI has loading/error/empty states.
- Design system components are reusable.

---

# M6 — Schedule and Assignment Management UI

## Objective
Implement complete dashboard UX for schedules and assignments.

## Schedule UI

- List/table of schedules.
- Filter by day/course/section.
- Display course code/title, time, room, instructor, section.
- Create schedule form.
- Edit schedule form.
- Delete with confirmation.
- Inline refresh after mutations.
- Useful day-oriented presentation such as grouped timetable.

## Assignment UI

- List/table/cards.
- Filter by course/status/deadline.
- Highlight upcoming deadlines.
- Create/edit/delete.
- Status selector.
- Display submission platform and marks.

## Acceptance criteria

- Create/edit/delete works without manual page refresh.
- Reload persists every change.
- Validation errors are understandable.

---

# M7 — Room Management and Booking UI

## Objective
Implement all room browsing and booking capabilities.

## Tasks

1. Room directory with:
   - room number
   - type
   - capacity
   - floor
   - equipment
   - availability status
2. Filters:
   - room type
   - minimum capacity
   - equipment
   - status
3. Room detail view with booking timeline/list.
4. Create/edit/delete room.
5. Booking form:
   - room
   - date
   - start time
   - end time
   - booked by
   - purpose
6. Booking conflict detection with clear UI errors.
7. Cancel booking action.
8. Search flow for “find a room” requirements.

## Acceptance criteria

- A room cannot be double-booked.
- Unavailable rooms cannot be booked.
- Booking cancellation updates the UI immediately.
- Reload retains booking changes.
- Users can find rooms by capacity/equipment/time requirements.

---

# M8 — Event and Registration UI

## Objective
Implement event lifecycle and student registration.

## Tasks

1. Event list with status, date/time, venue, organizer, capacity.
2. Event detail page.
3. Create/edit/delete event.
4. Register student action.
5. Prevent duplicate registration.
6. Prevent registration when full/cancelled.
7. Registration count updates immediately.
8. Cancel registration.
9. Optional visual status badges for upcoming/ongoing/completed/cancelled/full.

## Acceptance criteria

- Event CRUD works.
- Registration and cancellation work.
- Capacity constraints are enforced server-side.
- Registration count remains correct after reload.

---

# M9 — Announcement Management UI

## Objective
Implement complete announcement management.

## Tasks

- Announcement board/list.
- Priority badges.
- Date and expiry display.
- Filter by priority.
- Highlight active/not-expired announcements.
- Create/edit/delete.
- Confirmation before deletion.
- Useful sorting by newest/high priority.

## Acceptance criteria

- CRUD works and persists.
- High-priority announcements are easy to find.
- Expired notices are clearly distinguished or filtered.

---

# M10 — Dashboard Integration, UX Polish, and Live Refresh

## Objective
Make the entire dashboard feel like one cohesive application and guarantee immediate consistency after mutations.

## Tasks

1. Implement shared API client.
2. Implement cache invalidation/refetch or optimistic update logic carefully.
3. Ensure every add/edit/delete reflects immediately without full-page refresh.
4. Ensure the database remains the source of truth.
5. Add dashboard overview cards, such as:
   - today's classes
   - upcoming assignments
   - upcoming events
   - high-priority active announcements
   - available rooms
6. Add search across relevant sections where useful.
7. Improve responsive behavior.
8. Add accessible labels, keyboard navigation, focus handling, and semantic buttons/forms.
9. Add confirmation dialogs for destructive actions.
10. Add consistent skeleton/loading states.

## Acceptance criteria

- A dashboard edit is visible immediately.
- Reload retains the change.
- The same change is visible to API consumers.
- UI remains usable on desktop and mobile sizes.

---

# M11 — AI Tool Layer

## Objective
Expose safe, deterministic backend capabilities as actual callable tools for the LLM.

## Important rule

**The LLM must not directly mutate the database.** It must call typed application tools that validate input, enforce business rules, perform the operation, and return structured results.

## Tool families

### Read tools

Implement tools similar to:

- `get_schedule`
- `get_next_class`
- `get_assignments`
- `get_announcements`
- `get_rooms`
- `get_room_availability`
- `get_events`
- `get_event`

### Action tools

Implement tools similar to:

- `create_schedule`
- `update_schedule`
- `delete_schedule`
- `create_room`
- `update_room`
- `delete_room`
- `book_room`
- `cancel_room_booking`
- `create_event`
- `update_event`
- `delete_event`
- `register_for_event`
- `cancel_event_registration`
- `create_announcement`
- `update_announcement`
- `delete_announcement`
- `create_assignment`
- `update_assignment`
- `delete_assignment`

The exact names may differ, but every required capability must be represented.

## Tool design requirements

Every tool should define:

- name
- description
- input schema
- deterministic execution function
- structured success response
- structured error response

The tool description must tell the model when to use it and what it requires.

## Acceptance criteria

- Tool calls invoke real backend services.
- Tools return current database state.
- Invalid tool inputs fail safely.
- Action tools enforce domain rules even if the LLM asks for an invalid operation.

---

# M12 — AI Agent Orchestration, Prompt, and Safety

## Objective
Build the actual agent that turns natural-language requests into read/action tool calls and grounded responses.

## Agent responsibilities

The agent must be able to:

1. Interpret natural-language questions.
2. Select one or more tools.
3. Call multiple tools when the answer requires multiple data domains.
4. Re-check current data after state-changing operations when necessary.
5. Explain results in natural language.
6. Ask for missing information before destructive/state-changing operations.
7. Refuse requests that exceed available permissions/capabilities.
8. Never invent database facts.
9. Clearly say when data is unavailable rather than hallucinating.

## System prompt requirements

Include explicit rules:

- CampusOS data in the backend is authoritative.
- Always query the live backend for factual campus information.
- Never use remembered/hardcoded data when a tool can provide the answer.
- Use tools for all database-backed answers.
- Before booking a room, verify availability.
- Before registering for an event, verify event existence, status, capacity, and duplicate registration.
- Do not execute a state-changing tool when a required parameter is missing.
- Ask concise clarifying questions for vague requests.
- Never fabricate a successful action.
- After an action tool succeeds, summarize what changed.
- After an action tool fails, explain the actual failure.

## Ambiguity handling examples

### Vague
“Book me any room tomorrow afternoon.”

Required behavior:
- Do not book anything.
- Ask for a sufficiently specific time and, when needed, capacity/equipment/purpose.

### Specific
“Book Room 7A02 tomorrow from 3 PM to 5 PM.”

Required behavior:
- Resolve “tomorrow” using the application's current date/time context.
- Check room existence/status.
- Check overlapping bookings.
- Book only if valid.

### Search-and-select
“I need a room for 5 people with a projector tomorrow between 2 and 4.”

Required behavior:
- Query rooms with capacity >= 5 and projector equipment.
- Query availability for the requested time.
- Present suitable options.
- Do not choose an arbitrary room and book it unless the user has clearly authorized selection.

## State-changing confirmation policy

Use a practical policy:

- Explicitly specific commands can execute directly when all required parameters are present.
- Vague state-changing commands require clarification.
- Destructive operations should require confirmation unless the user clearly issued an explicit destructive command in the same turn.

## Acceptance criteria

- Agent uses real function/tool calls.
- Agent handles multi-source queries.
- Agent does not hallucinate when tools return empty data.
- Agent asks instead of guessing when required information is missing.

---

# M13 — AI Chat UI and Action UX

## Objective
Create a polished conversational experience integrated into the dashboard.

## Tasks

1. Chat page/panel.
2. Message history for the current session.
3. Streaming response if supported by the selected LLM stack; otherwise use a clear loading state.
4. Display tool/action progress when appropriate, e.g.:
   - Checking room availability…
   - Looking up assignments…
   - Registering for event…
5. Show action results clearly.
6. Show failures with useful recovery instructions.
7. Provide starter prompts covering judge scenarios.
8. Add “current data” trust cue, but do not imply false guarantees.
9. Support follow-up messages so clarification flows naturally.
10. Keep chat usable beside the dashboard.

## Acceptance criteria

- User can ask a question and receive a grounded answer.
- User can perform supported actions from chat.
- Tool failures are visible and understandable.
- Clarification questions preserve conversational context.

---

# M14 — Judge Query Coverage and Edge-Case Testing

## Objective
Make every provided sample query work reliably and add hidden-test-like variants.

## Required scenarios

### Simple lookups

1. “When is my next class?”
2. “What classes do I have on Wednesday?”
3. “What assignments do I have due this week?”
4. “Show me all high priority announcements.”

### Multi-source reasoning

5. “I’m free until 2 PM — is there anything on campus I could drop into?”
6. “Which labs have a projector and can fit at least 30 people?”

### Actions

7. “Book Room 7A02 tomorrow from 3 PM to 5 PM.”
8. “Register me for the Guest Lecture on Deep Learning.”
9. “I need a room for 5 people with a projector, tomorrow between 2 and 4.”

## Add edge-case tests

- Unknown room.
- Unknown course.
- Unknown event.
- Full event.
- Cancelled event.
- Duplicate registration.
- Unavailable room.
- Conflicting room booking.
- Invalid time range.
- Invalid date.
- Vague booking request.
- Missing time.
- Missing room when a unique selection is required.
- Multiple matching rooms.
- Multiple events with similar names.
- No assignments due in a date range.
- Expired announcements.
- Dashboard edits followed immediately by an agent question.

## Acceptance criteria

All provided sample queries have deterministic expected outcomes and pass integration tests.

---

# M15 — Live-Data, Persistence, and End-to-End Integration Verification

## Objective
Prove that the two halves of CampusOS are actually connected through the same persistent backend state.

## Critical end-to-end scenarios

### Scenario A — Dashboard edit -> agent read

1. Open dashboard.
2. Edit an announcement.
3. Verify UI changes immediately.
4. Reload dashboard.
5. Verify the change persists.
6. Ask the agent about the announcement.
7. Verify the agent returns the edited value, not the original seed value.

### Scenario B — Dashboard room booking -> agent read

1. Book a room through the dashboard.
2. Ask the agent whether the room is available during that slot.
3. Agent must report it as occupied.

### Scenario C — Agent room booking -> dashboard read

1. Ask agent to book a valid room.
2. Verify tool succeeds.
3. Open room dashboard.
4. Verify booking appears.
5. Attempt a conflicting booking.
6. Verify the conflict is rejected.

### Scenario D — Event registration

1. Register through agent.
2. Verify registration in dashboard.
3. Reload.
4. Verify persistence.
5. Try duplicate registration and verify rejection.

### Scenario E — Cross-source reasoning

Create/edit records so a query requires combining schedule + events + rooms, then verify the answer is based on current records.

## Acceptance criteria

There is one coherent source of truth for both dashboard and agent. No stale in-memory dataset can make judge-visible responses diverge from the dashboard.

---

# M16 — Judge-Ready Packaging, Deployment, and Documentation

## Objective
Make the submission straightforward for an external evaluator to run.

## Tasks

### README
Update `README.md` with:

1. Project overview.
2. Architecture summary.
3. Tech stack.
4. Prerequisites.
5. Exact installation commands.
6. Environment variables.
7. Database initialization/seed command.
8. Exact start command.
9. Optional production/deployment instructions.
10. Example agent questions.
11. Default URLs/ports.
12. Troubleshooting.

### Environment

- `.env.example` must contain placeholders only.
- Never commit real API keys.
- Make application startup fail with a clear message if a required production secret is missing, while still allowing non-AI dashboard development when practical.

### Containerization

Prefer adding Docker support if time permits:

- reproducible build
- single documented run command
- database initialization strategy
- no secrets baked into image

### Quality checks

Add scripts such as:

```text
lint
format:check
typecheck
test
test:e2e
build
start
seed
```

## Acceptance criteria

A new machine can clone the repo and follow the README without tribal knowledge.

---

# M17 — Final Hackathon Polish and Demo Readiness

## Objective
Optimize for the actual judging experience and eliminate avoidable failure points.

## Tasks

1. Run the full test suite.
2. Run a production build.
3. Start from a clean environment.
4. Execute every official sample query manually.
5. Execute all critical dashboard CRUD flows.
6. Verify no console/runtime errors during normal usage.
7. Verify all five data sections are visible and usable.
8. Improve visual hierarchy and spacing where weak.
9. Remove placeholder text, dead links, debug logs, temporary components, and unused dependencies.
10. Confirm error states do not expose secrets or internal stack traces.
11. Confirm the app remains functional if the AI provider is temporarily unavailable; the dashboard must still work.
12. Verify README commands from scratch.
13. Check repository for accidental secrets.
14. Confirm required submission files are present.

## Final acceptance checklist

- [ ] Five data domains visible.
- [ ] CRUD works for all five.
- [ ] Room booking/cancellation works.
- [ ] Event registration/cancellation works.
- [ ] Changes persist after reload.
- [ ] Agent uses real tool/function calling.
- [ ] Agent answers current data.
- [ ] Agent combines data sources.
- [ ] Agent performs valid actions.
- [ ] Agent checks constraints before actions.
- [ ] Agent asks when required information is missing.
- [ ] Agent refuses unsupported/invalid requests.
- [ ] Official sample queries pass.
- [ ] Dashboard edit immediately affects agent answers.
- [ ] README is complete.
- [ ] `.env.example` is safe.
- [ ] No secrets committed.
- [ ] Clean build succeeds.
- [ ] Local judge setup is reproducible.

---

# 4. AI Agent Operating Rules for Antigravity

When the user says “implement Mx”, follow this execution protocol:

1. Read this milestone file.
2. Inspect the current repository state.
3. Read the relevant challenge source files when needed.
4. Identify what has already been completed; do not redo finished work unnecessarily.
5. Implement the milestone end-to-end.
6. Prefer modifying existing abstractions over creating parallel implementations.
7. Add or update tests for the milestone.
8. Run relevant tests, type checks, lint, and build.
9. Fix errors introduced by the milestone.
10. Update documentation when the milestone changes setup or behavior.
11. At the end, report:
    - files changed
    - functionality implemented
    - tests/checks run
    - any genuinely blocked issue

### Do not ask for clarification for decisions covered by this file

Use the defaults in this document for:

- framework choices
- folder structure
- validation approach
- database choice
- tool architecture
- UI organization
- testing approach
- error handling
- seed strategy

Only ask a question when there is a true conflict between repository state and the challenge specification that cannot be safely resolved from the documented requirements.

---

# 5. Suggested Execution Order

For a fast and reliable build, execute in exactly this order:

```text
M0
 ↓
M1
 ↓
M2
 ↓
M3
 ↓
M4
 ↓
M5
 ├── M6
 ├── M7
 ├── M8
 └── M9
      ↓
     M10
      ↓
     M11
      ↓
     M12
      ↓
     M13
      ↓
     M14
      ↓
     M15
      ↓
     M16
      ↓
     M17
```

M6–M9 can be implemented in parallel after M5 if multiple agents/worktrees are used.

---

# 6. Definition of Done for Every Milestone

A milestone is **not complete** merely because the code was written.

It is complete only when:

- implementation exists;
- relevant validation exists;
- relevant tests exist;
- error paths are handled;
- the feature works with the persistent database;
- existing functionality remains intact;
- the application builds/type-checks/lints where applicable;
- no required functionality is left mocked or hardcoded;
- documentation is updated when behavior/setup changes.

---

# 7. Priority If Time Becomes Limited

If implementation time becomes constrained, prioritize in this order because it maps directly to the challenge scoring and judge behavior:

1. Persistent backend + five data domains.
2. Complete CRUD for all five domains.
3. Room booking and event registration actions.
4. AI read tools and live-data grounding.
5. AI action tools.
6. Ambiguity/safety handling.
7. Official sample-query coverage.
8. Dashboard polish.
9. Deployment/bonus work.

Never sacrifice backend correctness/persistence for visual polish. The challenge explicitly values working CRUD and live, grounded agent behavior.
