# CampusOS Hackathon — Comprehensive Scouting Report

---

## 1. Project Overview

**CampusOS** is an intelligent university operating platform designed to eliminate fragmented campus communication at Ahsanullah University of Science and Technology (AUST) by centralizing academic schedules, room bookings, campus events, administrative announcements, and course assignments into a single unified system. The application consists of two tightly coupled components: a reactive **Campus Data Manager** dashboard that supports full CRUD operations with persistent backend storage and instantaneous UI updates, and an **AI Campus Assistant** that interacts via natural conversation. The AI agent utilizes native function/tool calling to read the live backend state in real time, execute multi-step actions (such as booking rooms and registering for events), synthesize multi-source queries, ask clarifying questions for ambiguous inputs, and strictly enforce campus business rules.

---

## 2. Data Models Analysis

The seed data consists of 5 core systems with defined schemas in `schema/schema.md` and seed records in `data/`. All timestamps use 24-hour `"HH:MM"` format, all calendar dates use ISO 8601 `"YYYY-MM-DD"`, and the academic week runs **Sunday through Thursday** (Friday & Saturday are weekend days).

### A. Schedule (`data/schedules.json` — 24 Seed Records)
*Represents weekly recurring class timetable entries.*

| Field | Type | Required | Constraints / Enums | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `string` | **Yes (PK)** | Unique pattern `sch-XXX` | Unique schedule identifier |
| `course` | `string` | **Yes** | E.g. `"CSE 4113"`, `"IPE 4111"` | Official course code |
| `title` | `string` | **Yes** | Text string | Full course title |
| `day` | `string` | **Yes** | `"Sunday"` \| `"Monday"` \| `"Tuesday"` \| `"Wednesday"` \| `"Thursday"` | Academic day of the week |
| `start_time` | `string` | **Yes** | 24-hr `"HH:MM"` format (e.g. `"08:00"`) | Class start time |
| `end_time` | `string` | **Yes** | 24-hr `"HH:MM"` format (e.g. `"08:50"`) | Class end time |
| `room` | `string` | **Yes (FK)** | References `Room.room_number` (e.g. `"7A07"`) | Allocated classroom or lab |
| `instructor` | `string` | **Yes** | Faculty name or `"TBA"` | Assigned lecturer / professor |
| `section` | `string` | **Yes** | E.g. `"B"`, `"B1/B2"`, `"CS"`, `"DWM"` | Student section/batch |

```json
// Sample Record:
{
  "id": "sch-001",
  "course": "CSE 4113",
  "title": "Pattern Recognition and Machine Learning",
  "day": "Sunday",
  "start_time": "13:00",
  "end_time": "13:50",
  "room": "7A07",
  "instructor": "Prof. Dr. Md. Shahriar Mahbub",
  "section": "B"
}
```

---

### B. Room (`data/rooms.json` — 20 Seed Records)
*Represents physical campus facilities across the 7th floor (Classrooms 7A01–7A07, Labs 7B01–7B08, Seminar Halls 7C01–7C05).*

| Field | Type | Required | Constraints / Enums | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `string` | **Yes (PK)** | Unique pattern `room-XXX` | Unique room record ID |
| `room_number` | `string` | **Yes (Alt Key)** | Unique room label (e.g. `"7A03"`, `"7B05"`) | Physical room designation |
| `type` | `string` | **Yes** | `"classroom"` \| `"lab"` \| `"seminar"` | Facility category |
| `capacity` | `number` | **Yes** | Integer (Classrooms: 40-50, Labs: 25-35, Seminars: 55-70) | Max seating capacity |
| `equipment` | `string[]` | **Yes** | E.g. `["projector", "AC", "whiteboard", "computers", "smart board"]` | Equipment list |
| `floor` | `number` | **Yes** | Integer (All seed records are `7`) | Floor number in Building 7 |
| `status` | `string` | **Yes** | `"available"` \| `"unavailable"` | Base operational status |
| `bookings` | `Booking[]` | **Yes** | Array of active booking objects | Scheduled temporary reservations |

#### Nested Structure: `Booking` Object
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `booking_id` | `string` | **Yes (PK)** | Unique booking identifier (e.g. `"bk-001"`) |
| `booked_by` | `string` | **Yes** | Name of faculty member, student, or student club |
| `date` | `string` | **Yes** | Target date `"YYYY-MM-DD"` |
| `start_time` | `string` | **Yes** | 24-hr `"HH:MM"` reservation start |
| `end_time` | `string` | **Yes** | 24-hr `"HH:MM"` reservation end |
| `purpose` | `string` | **Yes** | Purpose (e.g. `"CSE 4129 Extra Class"`) |

```json
// Sample Record:
{
  "id": "room-006",
  "room_number": "7A06",
  "type": "classroom",
  "capacity": 40,
  "equipment": ["whiteboard", "projector", "AC"],
  "floor": 7,
  "status": "available",
  "bookings": [
    {
      "booking_id": "bk-001",
      "booked_by": "Nusrat Jahan",
      "date": "2026-09-07",
      "start_time": "13:00",
      "end_time": "14:40",
      "purpose": "CSE 4129 Extra Class"
    }
  ]
}
```

---

### C. Event (`data/events.json` — 7 Seed Records)
*Represents workshops, guest lectures, hackathons, and student club activities.*

| Field | Type | Required | Constraints / Enums | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `string` | **Yes (PK)** | Unique pattern `evt-XXX` | Unique event ID |
| `name` | `string` | **Yes** | Text string | Official event title |
| `description` | `string` | **Yes** | Text string | Event agenda and details |
| `date` | `string` | **Yes** | ISO `"YYYY-MM-DD"` | Event start date |
| `start_time` | `string` | **Yes** | 24-hr `"HH:MM"` format | Start time |
| `end_time` | `string` | **Yes** | 24-hr `"HH:MM"` format | End time |
| `end_date` | `string` | **Yes** | ISO `"YYYY-MM-DD"` | Conclusion date |
| `venue` | `string` | **Yes (FK)** | References `Room.room_number` | Room where event occurs |
| `organizer` | `string` | **Yes** | E.g. `"AUSTPIC"`, `"CSE Department"` | Organizing entity |
| `capacity` | `number` | **Yes** | Integer maximum attendee limit | Total seat quota |
| `registered` | `number` | **Yes** | Integer counter `<= capacity` | Current registration tally |
| `registrations` | `Registration[]` | **Yes** | Array of attendee objects | List of enrolled students |
| `status` | `string` | **Yes** | `"upcoming"` \| `"ongoing"` \| `"completed"` \| `"cancelled"` \| `"full"` | Event state |

#### Nested Structure: `Registration` Object
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `student_id` | `string` | **Yes** | Student ID (e.g. `"20-40532"`, `"21-41205"`) |
| `name` | `string` | **Yes** | Student's full name (e.g. `"Sakibul Hassan"`) |

```json
// Sample Record (evt-002):
{
  "id": "evt-002",
  "name": "Guest Lecture: Deep Learning in Medical Imaging",
  "description": "Industry talk by Dr. Iftekhar Ahmed (BUET) on practical applications of CNNs in Bangladeshi healthcare.",
  "date": "2026-09-08",
  "start_time": "14:00",
  "end_time": "16:00",
  "end_date": "2026-09-08",
  "venue": "7C05",
  "organizer": "CSE Department",
  "capacity": 70,
  "registered": 62,
  "registrations": [
    { "student_id": "20-40532", "name": "Sakibul Hassan" },
    { "student_id": "21-41205", "name": "Rafi Hossain" }
  ],
  "status": "upcoming"
}
```

---

### D. Announcement (`data/announcements.json` — 8 Seed Records)
*Represents departmental circulars, rescheduled classes, syllabus updates, and emergency notices.*

| Field | Type | Required | Constraints / Enums | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `string` | **Yes (PK)** | Unique pattern `ann-XXX` | Unique notice ID |
| `title` | `string` | **Yes** | Text string | Headline / summary |
| `body` | `string` | **Yes** | Text string | Complete notice message |
| `date` | `string` | **Yes** | ISO `"YYYY-MM-DD"` | Publication date |
| `priority` | `string` | **Yes** | `"high"` \| `"medium"` \| `"low"` | Importance tier |
| `posted_by` | `string` | **Yes** | Author or authority name | Issuing faculty/department |
| `expires` | `string` | **Yes** | ISO `"YYYY-MM-DD"` | Expiration date |

```json
// Sample Record (ann-001):
{
  "id": "ann-001",
  "title": "CSE 4113 Class Rescheduled — Sunday 7 Sep",
  "body": "The CSE 4113 (Pattern Recognition) class scheduled for Sunday, 7th September at 1:00 PM in Room 7A07 has been moved to Room 7A04 at 3:30 PM on the same day. Students must attend the rescheduled slot. — Prof. Dr. Md. Shahriar Mahbub",
  "date": "2026-09-04",
  "priority": "high",
  "posted_by": "Prof. Dr. Md. Shahriar Mahbub",
  "expires": "2026-09-07"
}
```

---

### E. Assignment (`data/assignments.json` — 8 Seed Records)
*Represents academic coursework, homework, lab reports, and term papers.*

| Field | Type | Required | Constraints / Enums | Description |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `string` | **Yes (PK)** | Unique pattern `asgn-XXX` | Unique assignment identifier |
| `course` | `string` | **Yes** | Corresponds to `Schedule.course` | Course code (e.g. `"CSE 4113"`) |
| `course_title` | `string` | **Yes** | Text string | Full title of the course |
| `title` | `string` | **Yes** | Text string | Assignment title |
| `description` | `string` | **Yes** | Text string | Detailed instructions |
| `assigned_date` | `string` | **Yes** | ISO `"YYYY-MM-DD"` | Date given |
| `deadline` | `string` | **Yes** | ISO `"YYYY-MM-DD"` | Due date |
| `submission_platform` | `string` | **Yes** | E.g. `"Google Classroom"`, `"Physical submission"` | Delivery channel |
| `status` | `string` | **Yes** | `"pending"` \| `"submitted"` \| `"graded"` \| `"late"` | Student submission state |
| `marks` | `number` | **Yes** | Integer weight | Maximum assignable marks |

```json
// Sample Record (asgn-001):
{
  "id": "asgn-001",
  "course": "CSE 4113",
  "course_title": "Pattern Recognition and Machine Learning",
  "title": "Assignment 1: Bayes Classifier Implementation",
  "description": "Implement a Naive Bayes classifier from scratch in Python. Use the provided Iris dataset. Submit your .ipynb file and a 1-page PDF report. No sklearn for the classifier itself.",
  "assigned_date": "2026-08-28",
  "deadline": "2026-09-09",
  "submission_platform": "Google Classroom",
  "status": "pending",
  "marks": 10
}
```

---

## 3. Required API Endpoints

To satisfy the full CRUD requirements and provide the AI agent with real tool-calling endpoints, the backend must expose the following REST endpoints:

### 1. Class Schedules (`/api/schedules`)
| Method | Endpoint | Request Body | Response | Logic & Notes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/schedules` | None (Query params: `day`, `course`, `room`, `instructor`, `section`) | `Schedule[]` | Filter by query parameters. Default: returns all schedules. |
| `GET` | `/api/schedules/:id` | None | `Schedule` | Fetch single schedule record by ID. |
| `POST` | `/api/schedules` | `{ course, title, day, start_time, end_time, room, instructor, section }` | `Schedule` (201) | Validates time format (`HH:MM`) and day enum; generates ID (`sch-XXX`). |
| `PUT` | `/api/schedules/:id` | Partial or full schedule fields | `Schedule` (200) | Updates record and persists to backend storage. |
| `DELETE`| `/api/schedules/:id`| None | `{ success: true, id }` | Removes schedule record. |

### 2. Rooms & Reservations (`/api/rooms`)
| Method | Endpoint | Request Body | Response | Logic & Notes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/rooms` | None (Query params: `type`, `min_capacity`, `equipment`, `floor`, `status`) | `Room[]` | Multi-filter rooms by equipment array containment, minimum capacity, and type. |
| `GET` | `/api/rooms/:id` | None | `Room` | Fetch room details including active bookings. |
| `POST` | `/api/rooms` | `{ room_number, type, capacity, equipment, floor, status }` | `Room` (201) | Create new room record with empty `bookings: []`. |
| `PUT` | `/api/rooms/:id` | Room updates (e.g. `capacity`, `equipment`, `status`) | `Room` (200) | Update room attributes. |
| `DELETE`| `/api/rooms/:id`| None | `{ success: true }` | Delete room record. |
| `GET` | `/api/rooms/availability` | Query params: `date`, `start_time`, `end_time`, `capacity`, `equipment` | `Room[]` (available rooms) | **Special Logic**: Checks that the room has no booking overlapping `[start_time, end_time]` on `date` AND no recurring scheduled class in `schedules` for the day of that date! |
| `POST` | `/api/rooms/:room_number/book` | `{ booked_by, date, start_time, end_time, purpose }` | `{ success: true, booking: Booking, room: Room }` | **Special Logic**: Validates slot availability against existing bookings and class timetable. Appends booking to `room.bookings`. |
| `DELETE`| `/api/rooms/:room_number/bookings/:booking_id` | None | `{ success: true }` | Cancels an existing room booking. |

### 3. Campus Events (`/api/events`)
| Method | Endpoint | Request Body | Response | Logic & Notes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | None (Query params: `status`, `date`, `venue`) | `Event[]` | List all events, sorted by date/time. |
| `GET` | `/api/events/:id` | None | `Event` | Fetch single event. |
| `POST` | `/api/events` | `{ name, description, date, start_time, end_time, end_date, venue, organizer, capacity }` | `Event` (201) | Initializes `registered: 0`, `registrations: []`, `status: "upcoming"`. |
| `PUT` | `/api/events/:id` | Partial or full event fields | `Event` (200) | Updates event information. |
| `DELETE`| `/api/events/:id`| None | `{ success: true }` | Removes event. |
| `POST` | `/api/events/:id/register` | `{ student_id, name }` | `{ success: true, event: Event }` | **Special Logic**: Rejects if `registered >= capacity` or if `status === "full"`. Rejects duplicate `student_id`. Increments `registered`; sets `status = "full"` if capacity reached. |
| `POST` | `/api/events/:id/cancel` | `{ student_id }` | `{ success: true, event: Event }` | Removes student from registrations, decrements `registered`, flips status back to `"upcoming"` if previously `"full"`. |

### 4. Announcements (`/api/announcements`)
| Method | Endpoint | Request Body | Response | Logic & Notes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/announcements` | None (Query params: `priority`, `active_only`) | `Announcement[]` | Returns announcements sorted by publication date descending. |
| `GET` | `/api/announcements/:id` | None | `Announcement` | Fetch single announcement. |
| `POST` | `/api/announcements` | `{ title, body, date, priority, posted_by, expires }` | `Announcement` (201) | Creates new announcement. |
| `PUT` | `/api/announcements/:id`| Fields to update | `Announcement` (200) | Edits announcement. |
| `DELETE`| `/api/announcements/:id`| None | `{ success: true }` | Deletes announcement. |

### 5. Assignments (`/api/assignments`)
| Method | Endpoint | Request Body | Response | Logic & Notes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/assignments` | None (Query params: `course`, `status`, `due_before`) | `Assignment[]` | Filter assignments (e.g. `status=pending`). |
| `GET` | `/api/assignments/:id` | None | `Assignment` | Fetch single assignment. |
| `POST` | `/api/assignments` | `{ course, course_title, title, description, assigned_date, deadline, submission_platform, marks, status }` | `Assignment` (201) | Creates assignment. |
| `PUT` | `/api/assignments/:id` | Update fields (e.g. change status to `"submitted"`) | `Assignment` (200) | Modifies assignment. |
| `DELETE`| `/api/assignments/:id`| None | `{ success: true }` | Deletes assignment. |

### 6. System & Agent Endpoints
| Method | Endpoint | Request Body | Response | Logic & Notes |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/reset` | None | `{ success: true, message: "Database reset to initial seed data" }` | Re-seeds backend from original 5 JSON files. Crucial for judge reset. |
| `POST` | `/api/agent/chat` | `{ message: string, history?: Message[], student_id?: string }` | `{ reply: string, tools_used: any[] }` | Executes agent tool-calling loop against live database. |

---

## 4. AI Agent Requirements

Based directly on the 100-mark judging breakdown and test cases in `sample_queries/sample_queries.md`, the AI agent must handle four distinct operational categories:

### A. QUERY Types (Information Retrieval)
1. **"When is my next class?"**:
   - Agent inspects current day and time (or simulation anchor date `2026-09-04`).
   - Retrieves today's classes from `schedules`.
   - Checks `announcements` to verify if any class today was cancelled or rescheduled.
   - Computes the chronologically earliest upcoming class and replies with Course, Title, Time, Room, and Instructor.
2. **"What classes do I have on Wednesday?"**:
   - Queries `get_schedules(day="Wednesday")`.
   - Returns structured list sorted chronologically.
3. **"What assignments do I have due this week?"**:
   - Queries `get_assignments(status="pending")`.
   - Filters assignments where `deadline` falls within the current university week (Sunday–Thursday).
4. **"Show me all high priority announcements."**:
   - Queries `get_announcements(priority="high")`.
   - Summarizes headline, posting date, and body clearly.

### B. ACTION Types (Creating / Updating Data)
1. **"Book Room 7A02 tomorrow from 3 PM to 5 PM."**:
   - Translates "tomorrow" to target date (`YYYY-MM-DD`).
   - Formats time interval: `15:00` to `17:00`.
   - Calls `check_room_availability` or directly attempts `book_room`.
   - If clear, executes booking under student name/ID and returns booking confirmation with booking ID.
2. **"Register me for the Guest Lecture on Deep Learning."**:
   - Performs search for event matching "Guest Lecture on Deep Learning" (finds `evt-002`).
   - Checks available capacity (`registered: 62 < capacity: 70`).
   - Executes `register_for_event(event_id="evt-002", student_id="20-40532", name="Sakibul Hassan")`.
   - Confirms registration to the user with date, venue (`7C05`), and time (`14:00`).

### C. COMPLEX Queries & Multi-Source Synthesis
1. **"I'm free until 2 PM — is there anything on campus I could drop into?"**:
   - **Cross-system check**: First checks student's classes today to know exact free windows.
   - Simultaneously queries `get_events` for today.
   - Filters events happening before 14:00 (`09:00`–`13:00` or drop-in sessions).
   - Combines findings: *"You have no classes until 2:00 PM. On campus right now, there is the Freshers' Orientation in 7C05 starting at 10:00 AM..."*
2. **"Which labs have a projector and can fit at least 30 people?"**:
   - Queries `get_rooms(type="lab", min_capacity=30, equipment="projector")`.
   - Inspects `rooms.json` records: Returns `7B01` (cap 30), `7B02` (cap 30), `7B05` (cap 30), `7B06` (cap 35).
3. **"I need a room for 5 people with a projector, tomorrow between 2 and 4."**:
   - Multi-constraint search: Date = tomorrow, time = `14:00` to `16:00`, capacity >= 5, equipment includes `"projector"`.
   - Evaluates rooms that are not in conflict with regular timetable or existing reservations.
   - Proposes candidate room(s) and offers to book.
4. **Live Data Edit Mid-Evaluation Verification**:
   - Judges will edit a room capacity or change an announcement (e.g. reschedule CSE 4113 to Room 304).
   - Agent MUST execute tool call on every relevant question rather than relying on prompt caching or static JSON memory.

### D. Guardrails, Refusals & Vague Clarification
1. **Vague Intent Handling**:
   - *"Just book me any room tomorrow afternoon."*
   - **Agent behavior**: Refuses to make an arbitrary booking. Asks clarifying questions:
     - *"What specific time slot in the afternoon do you need (e.g., 2 PM to 4 PM)?"*
     - *"How many people need to be accommodated, and do you need specific equipment like a projector or computer lab?"*
2. **Unauthorized / Invalid Actions**:
   - Registering for an event that is full (e.g. `evt-006` Workshop: Git & GitHub has `registered: 30, capacity: 30`, status `"full"`):
     - **Agent behavior**: Politely refuses: *"Registration is closed because the Git & GitHub Workshop is currently full (30/30 seats taken)."*
   - Booking a room with a time conflict:
     - **Agent behavior**: Informs the user that Room `7A06` is already booked for `"bk-001"` or has a scheduled lecture, suggesting alternate rooms.

### E. LLM Function/Tool Declarations Required
The agent should expose a clean set of tool functions:
- `get_schedules(day, course, room, instructor)`
- `get_rooms(type, min_capacity, equipment, floor)`
- `check_room_availability(room_number, date, start_time, end_time)`
- `book_room(room_number, date, start_time, end_time, booked_by, purpose)`
- `get_events(status, date, venue)`
- `register_for_event(event_id, student_id, name)`
- `get_announcements(priority, active_only)`
- `get_assignments(course, status, due_before)`
- `create_announcement(...)` / `update_record(...)`

---

## 5. Technology Stack Recommendation

Considering the **hard deadline (8:30 PM, September 4)** and the critical judging requirement that **the project must run effortlessly on the judges' machine**:

### Recommended Architecture: Unified Full-Stack Node.js (Next.js 14/15 App Router or Express + Vite React)

| Layer | Recommended Choice | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 14 (App Router) + TypeScript** OR **Node/Express + Vite React** | **Single unified codebase and single port (3000)**. Judges only have to run `npm install` and `npm run dev`. Zero CORS issues, zero port synchronization errors between separate backend and frontend servers. |
| **Database** | **SQLite via `better-sqlite3`** (or Prisma with SQLite) | Fully persistent local relational database stored in a single `.db` file. **Requires zero external database server** (no PostgreSQL daemon, no MongoDB service, no Docker required for judges). Survives server restarts and page refreshes. |
| **Frontend UI** | **React 18/19 + Tailwind CSS + Lucide React + Radix UI** | Rapid development of a clean, responsive 5-tab dashboard (Schedules, Rooms, Events, Announcements, Assignments) plus an omnipresent AI Assistant floating drawer or split-pane view for instant 20/20 UI score. |
| **AI / LLM Integration** | **OpenAI SDK / Groq / Google GenAI with Native Function Calling** | Use standard OpenAI function calling format. By using the official SDK or an OpenAI-compatible interface, you can support **Groq** (`llama-3.3-70b-versatile` — blazing fast and free), **OpenAI** (`gpt-4o-mini`), or **Gemini** with the same function-calling handler. |
| **Deployment** | **Vercel** or **Railway** | Deployable in 3 minutes via GitHub repository connection for instant bonus points. |

> **Why NOT separate Python FastAPI + React?**
> A separate Python backend + Node frontend requires judges to have both Python virtualenv/pip and Node/npm working on their local machine. If Python path issues or package compilation errors occur on their Windows/Mac/Linux setup, the submission fails the "it must start straight from your submission" rule. A single Node.js environment is much safer and faster to test.

---

## 6. Implementation Priority List (Roadmap)

### Phase 1: Highest Priority (Must Work for Minimum Passing / 80 Marks)
- [ ] **1.1 Seed Data Ingestion & SQLite DB Setup**:
  - Create SQLite database schema for the 5 entities (`schedules`, `rooms`, `bookings`, `events`, `registrations`, `announcements`, `assignments`).
  - Write an automatic seed loader that loads `data/*.json` into SQLite on initial boot if empty.
- [ ] **1.2 Core CRUD REST API**:
  - Implement full CRUD endpoints (GET, POST, PUT, DELETE) for all 5 systems.
- [ ] **1.3 Data Manager Dashboard UI**:
  - Build responsive dashboard with 5 distinct tabs (Schedules, Rooms, Events, Announcements, Assignments).
  - Implement Add/Edit modal dialogs and Delete confirmation.
  - Implement optimistic / instant UI updates on mutations (no manual browser refresh needed).
- [ ] **1.4 Room Booking & Event Registration Endpoints**:
  - `POST /api/rooms/:room_number/book` with time overlap verification.
  - `POST /api/events/:id/register` with capacity limit check.
- [ ] **1.5 AI Agent Core Engine**:
  - Integrate LLM function calling with live DB query tools (`get_schedules`, `get_rooms`, `get_events`, `get_announcements`, `get_assignments`).
  - Implement action tools (`book_room`, `register_for_event`).
  - Wire AI chat interface into the dashboard.

### Phase 2: Medium Priority (Full Scoring / 100 Marks)
- [ ] **2.1 Multi-Source Reasoning**:
  - Ensure agent checks `announcements` when answering schedule queries (detects rescheduled classes like CSE 4113 moved to Room 7A04).
  - Support "free time until 2 PM" combined schedule + event discovery.
- [ ] **2.2 Room Availability Matrix**:
  - Cross-reference room booking requests against both existing `bookings` AND the regular `schedules` timetable for that day of the week.
- [ ] **2.3 Clarification & Guardrails**:
  - System prompt instructions to ask clarifying questions when requests are vague (e.g. "book me any room").
  - Clear refusal when registering for full events (e.g. `evt-006`).
- [ ] **2.4 One-Click Database Reset Button**:
  - Add a "Reset Seed Data" button on the dashboard UI and API (`POST /api/reset`) to allow judges to restore initial state instantly.

### Phase 3: Low Priority (Bonus & Polish)
- [ ] **3.1 Live Cloud Deployment**:
  - Deploy to Vercel or Railway; add live link to `README.md`.
- [ ] **3.2 UI Polish**:
  - Badges for priority (`high`, `medium`, `low`), status chips (`upcoming`, `full`), smooth transitions, toast notifications.
- [ ] **3.3 Complete README Setup Guide**:
  - Provide bulletproof copy-paste commands and `.env.example`.

---

## 7. Critical Challenges & Solutions

### 1. Room Availability Collision Detection
- **Challenge**: A room is NOT available if:
  1. It already has a booking in `room.bookings` overlapping the target interval on that date.
  2. A regular class is scheduled in `schedules` on that day of the week (e.g. Sunday) during that time.
  3. An event in `events` is taking place in that room as its venue.
- **Solution**: The availability check function must calculate the day of the week from the requested date (e.g. `2026-09-07` is Monday) and check for interval collisions across all three sources:
  $$\text{Overlap} \iff \max(\text{start}_1, \text{start}_2) < \min(\text{end}_1, \text{end}_2)$$

### 2. Event Registration Capacity and Concurrency
- **Challenge**: Event `evt-006` is already full (`30/30`). If a user asks to register, or if a user spam-clicks register, it must not exceed `capacity`.
- **Solution**: Implement database-level transaction checking `registered < capacity` before inserting student into registrations. Set `status = 'full'` when `registered == capacity`.

### 3. Date & Time Context in Natural Language
- **Challenge**: The seed dataset uses a simulated date window in **September 2026** (e.g. announcements from `2026-09-04`, classes starting `2026-09-06`). If the LLM uses the real current calendar date (`2026-09-04` or real 2026), phrases like "tomorrow" or "next class" need an anchor.
- **Solution**: Inject the current reference date and day into the agent's system prompt (e.g. `Current Date: Friday, September 4, 2026. Academic week: Sunday to Thursday`). Allow a date override selector in the UI for demonstration.

### 4. Ensuring Real-Time Data Sync between Dashboard and Agent
- **Challenge**: The judges will deliberately modify a record in the UI (e.g., change an announcement or class location) and immediately query the agent. If the agent uses cached data or vector embeddings that aren't updated, it will give the wrong answer and lose 10 marks.
- **Solution**: The agent must execute SQL/database tool calls directly on every turn. Do NOT cache query results in memory or system prompts.

---

## 8. First Steps & Quick Start

### The First 5 Commands to Run
```bash
# 1. Initialize project with dependencies (Express/Next.js stack with SQLite and OpenAI SDK)
npm init -y

# 2. Install core backend & database packages
npm install express cors dotenv better-sqlite3 openai

# 3. Install dev tools and TypeScript support
npm install -D nodemon typescript @types/node @types/express @types/cors @types/better-sqlite3 ts-node

# 4. Copy environment variable template
cp .env.example .env

# 5. Initialize the database seed script
node -e "console.log('Ready to initialize database')"
```

### The First File to Create
- **`src/db/database.ts`**: Initializes SQLite database (`campusos.db`), creates tables matching the schema, and automatically seeds initial data from `data/schedules.json`, `data/rooms.json`, `data/events.json`, `data/announcements.json`, and `data/assignments.json` if tables are empty.

### The First API Endpoint to Build
- **`GET /api/schedules` & `POST /api/schedules`**:
  Verifies that seed data is loaded into the persistent database, returns structured JSON to the caller, and accepts new entries that survive app reloads.

---

## 9. Files Present vs. Files Needed

### Current Repository Inventory
| File / Path | Size | Purpose / Status |
| :--- | :--- | :--- |
| `PROBLEM_STATEMENT.md` | 7.9 KB | Full hackathon rules, scoring criteria, and guidelines |
| `SUBMISSION.md` | 1.6 KB | Submission guidelines and deadline checklist (8:30 PM, Sep 4) |
| `README.md` | 4.1 KB | Official challenge brief and repository overview |
| `LICENSE` | 1.1 KB | MIT License |
| `.env.example` | 384 B | Template for LLM API keys (`OPENAI_API_KEY`, `PORT`, `DATABASE_URL`) |
| `schema/schema.md` | 5.0 KB | Authoritative data schema definitions, types, and constraints |
| `sample_queries/sample_queries.md` | 832 B | Test queries used during judge evaluation |
| `data/schedules.json` | 6.4 KB | 24 seed class schedule records |
| `data/rooms.json` | 5.4 KB | 20 seed room records with equipment and bookings |
| `data/events.json` | 3.9 KB | 7 seed event records with registrations |
| `data/announcements.json` | 3.9 KB | 8 seed announcement records with priorities and expiry dates |
| `data/assignments.json` | 4.5 KB | 8 seed assignment records with deadlines and status |

### Missing Files Needed to Build Solution
```
campusos/
├── src/
│   ├── db/
│   │   ├── database.ts         ← SQLite initialization and seed data auto-loader
│   │   └── schema.sql          ← SQL table definitions
│   ├── controllers/
│   │   ├── schedules.ts        ← Schedule CRUD handlers
│   │   ├── rooms.ts            ← Room CRUD + booking logic
│   │   ├── events.ts           ← Event CRUD + registration logic
│   │   ├── announcements.ts    ← Announcement CRUD handlers
│   │   └── assignments.ts      ← Assignment CRUD handlers
│   ├── agent/
│   │   ├── tools.ts            ← LLM tool/function call definitions
│   │   ├── executor.ts         ← Tool execution logic connecting to DB
│   │   └── agent.ts            ← Chat loop and prompt orchestration
│   ├── routes/
│   │   └── api.ts              ← Unified API router
│   └── server.ts               ← Express server / app entry point
├── client/                     ← Dashboard UI (Vite + React or Next.js App)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── SchedulesTab.tsx
│   │   │   ├── RoomsTab.tsx
│   │   │   ├── EventsTab.tsx
│   │   │   ├── AnnouncementsTab.tsx
│   │   │   ├── AssignmentsTab.tsx
│   │   │   └── ChatDrawer.tsx  ← Interactive AI assistant
│   │   └── App.tsx
├── package.json                ← Project dependencies and scripts
└── tsconfig.json               ← TypeScript configuration
```
