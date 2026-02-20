# ActionMinutes

## Overview

ActionMinutes is a personal productivity assistant designed to help users organize their lives through a suite of integrated tools. It features notes, reminders, journaling, a calendar, and custom lists. A key highlight is its AI-powered capability to extract information from meeting notes, transforming them into actionable tasks. The application aims to enhance single-user personal productivity by centralizing various organizational aspects into a seamless experience.

**Key Capabilities:**
- **Inbox:** "Triage & Clarity" processing station with List/Smart Group views, filter pills (All/Unread/Assigned/Snoozed), hover triage actions (Complete/Snooze/Delete), bulk operations bar, visual unread states (blue dot), AI-like smart grouping (Overdue/Waiting/Communication/Deep Work/Quick Wins), and inline TaskDetailModal (two-panel: content+sidebar with subtasks, attachments, activity feed).
- **AI Extraction:** Converts meeting notes into tasks, decisions, and risks.
- **Reminders:** Time-based task management.
- **Journal:** Interactive two-column layout with inline Quick Reflection card (template pills: Morning Intention / Evening Wind-down / Weekly Win, mood selector, textarea, Save Draft), always-visible Mood vs. Output weekly chart, purple gradient Daily Prompt card with rotating prompts, enhanced entry feed with date+time+mood headers, suggested action bars with "+ Add Task", and signal tag pills. AI task extraction, meeting context linking, and mood x productivity analytics.
- **Calendar:** Enhanced "Action Center" calendar with Google/Outlook integration, "Reality Check" capacity planning (8h daily load bars), right sidebar with mini calendar widget, list/reminder filter checkboxes, and draggable unscheduled task backlog for time-blocking. Click on date opens QuickAdd with preselected date. Contextual meeting prep actions (Create Agenda / Take Notes).
- **Notes:** Action-oriented capture system with masonry grid layout, AI "Text-to-Action" extraction pipeline, smart context linking to meetings, collection-based organization, color-coded cards, and right sidebar with Collections and Tags.
- **Custom Lists:** User-defined organizational lists.
- **Quick Add:** Instant information capture.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

ActionMinutes is a full-stack TypeScript application. The frontend is built with React, utilizing Wouter for routing, Zustand for state management, and TanStack React Query for data fetching. UI components are developed with shadcn/ui and styled using Tailwind CSS with a minimal white/amber design system and Phosphor Icons. The backend is an Express.js application, employing Drizzle ORM with PostgreSQL. Authentication is handled via a custom JWT-based system.

A separate mobile application is developed using Expo React Native, connecting to the same backend API and PostgreSQL database, offering all core features.

**Core Architectural Decisions:**
- **Authentication:** Secure JWT-based system with access and refresh tokens.
- **AI Integration:** Features for meeting capture, AI extraction for summaries, action items, decisions, risks, and automated follow-up email draft generation.
- **Access Control:** Plan-based access control (Free and Pro tiers) managing features and usage limits.
- **UI/UX Design:** Clean white top navigation bar with logo left, nav links center, and user actions right. Mobile bottom tab bar with 5 tabs (Inbox, Capture, Calendar, Journal, Notes). Additional pages accessible via user dropdown menu. Actioned and Deleted views in dropdown menu.
- **Soft Delete:** Tasks and personal reminders support soft deletion via `deletedAt` timestamp. Deleted items viewable and restorable from the Deleted page. Actioned page shows completed items.
- **Meeting Source Card:** Extraction page shows a "Source" card at top displaying linked transcripts with AI summaries (from transcript_summaries) and meeting notes.
- **Design System:** Single light theme with minimal white/amber aesthetic. Architecture:
    - `client/src/index.css`: CSS variable definitions for all semantic tokens (--color-background: #FFFFFF, --color-primary: #F59E0B amber, --color-muted: #F5F5F0 warm grey, --color-foreground: #1A1A1A charcoal, --color-border: #E5E5E0).
    - Inter font from Google Fonts, typography scale 32/24/18/16/14px.
    - White cards with 12px radius and subtle shadow (0 2px 8px rgba(0,0,0,0.06)).
    - Amber buttons (#F59E0B bg, black text, 8px radius, 600 weight).
    - Light grey inputs (#F5F5F0) with amber focus rings.
    - No dark mode, no multi-theme system, no gradients, no glassmorphism.
    - `client/src/theme/` files kept as minimal no-ops to avoid breaking imports.
- **Notes Module:** Features AES-256-GCM encryption for note content at rest, with searchable keyword indexing. Supports mood tracking, tags, bi-directional links, and attachments. Notes page (`client/src/pages/notes.tsx`) redesigned as action-oriented capture system: (1) Masonry grid layout (CSS columns) with color-coded cards using semantic CSS tokens via `color-mix()`. (2) Create New card with action icons (voice, checklist, template). (3) Search bar with filter pills (All/Work/Personal/Meeting). (4) Right sidebar with Collections and Tags sections. (5) Smart context linking via `meetingId` column — notes linked to meetings show meeting badge. (6) AI "Text-to-Action" extraction via POST `/api/notes/:id/extract-actions` — scans note content and creates tasks in inbox. (7) Grid/list view toggle. (8) Collection-based organization via `collection` column on notes table.
- **Calendar Synchronization:** Adapters for Google Calendar and Microsoft Outlook, supporting CRUD operations for events, real-time sync via webhooks, and free/busy queries.
- **Calendar Action Center:** Calendar page (`client/src/pages/calendar.tsx`) redesigned as spacious full-width layout: (1) Flexible-width month grid with large day cells, capacity load bars (green/amber/red) computing tasks+events vs 8h. (2) Fixed 240px right sidebar with discreet sync status (green dot = connected, "Connect" link for unconnected) and draggable unscheduled tasks list. (3) HTML5 drag-and-drop from sidebar onto calendar day cells for time-blocking (also supports click-to-schedule). (4) No "Today" detail widget — grid is primary interaction surface. (5) Meeting prep dialog for external events (Google/Outlook) offering "Create Agenda" and "Take Notes".
- **AI Summarization Service:** Structured summarization of transcripts, extracting concise summaries, key decisions, actionable tasks (with assignees, due dates, priority), sentiment analysis, and keywords.
- **Voice Command Activation:** Speech-to-action interface for interacting with the summarization service.
- **Audio Transcription:** Multi-provider support (Gemini, OpenAI Whisper API) for speech-to-text, with transcript storage, full-text search, and export options.
- **Live Meeting Recording:** In-browser audio recording via MediaRecorder API (audio/webm). GDPR consent dialog shown on first use (stored as `recordingConsentAt` timestamp in users table). Auto-transcribes on stop and inserts text into notes without user prompt. Compatible with template summarization and AI extraction flows.
- **Template Summaries:** 18 professional templates across 6 categories with markdown rendering, Export PDF/Print/Copy actions, and database persistence via `transcript_summaries` table with `promptVersion: template:${templateId}` tracking.
- **DatePickerModal:** Reusable modal component (`client/src/components/date-picker-modal.tsx`) with Date and Duration tabs. Date tab has quick icons (Today/Tomorrow/+7/Month), mini calendar, time input, reminder dropdown, repeat dropdown, and repeat-ends. Duration tab has start/end date+time, all-day toggle, same reminder/repeat options. Internal state management, commits on OK press.
- **Task Detail Page:** Card-based layout with white cards and subtle shadows. Task title at top, cards for Task Details, Schedule (due date via DatePickerModal, duration, deadline, reminder, repeat, priority), Location+Tags row, and Notes with attachment support.
- **Priority System:** High/Normal/Low/None (None as default). Maps to "normal" on backend for DB compatibility.
- **Task Attachments:** `task_attachments` table in schema, multer-based file upload to `uploads/tasks/`, supports PDF, Word, Excel, PowerPoint, Markdown, and image files. API endpoints: GET/POST/DELETE `/api/attachments`.

## External Dependencies

- **Database:** PostgreSQL (via Drizzle ORM and `drizzle-kit`).
- **AI/ML Services:**
    - OpenAI (primary provider for AI services via Replit AI Integrations).
    - Gemini (for audio transcription via Replit AI Integrations).
    - OpenAI Whisper API (for audio transcription).
    - Tesseract.js (for OCR).
- **Email/Communication:** Nodemailer.
- **Authentication:** Custom JWT (bcrypt, `server/jwt.ts`), Replit Auth integration.
- **Frontend Libraries:**
    - Chart.js (`react-chartjs-2`).
    - date-fns.
    - zod.

## Documentation

- `docs/USER_GUIDE.md` — Comprehensive user-facing guide (20 sections covering all features, navigation, keyboard shortcuts, subscription plans)
- `docs/DEVELOPER_GUIDE.md` — Developer reference (14 sections: architecture, tech stack, project structure, database schema, auth system, full API reference with all actual endpoints, frontend architecture, AI services, theme system, calendar integration, billing, feature links/data flow, missing links/gaps analysis, 40+ suggested features by priority)

## Recent Changes

- **February 2026:** Created comprehensive User Guide and Developer Guide documentation in `docs/` folder. Developer Guide includes accurate API reference verified against actual routes, database schema audit, missing links/gaps analysis, and industry-standard feature suggestions.
- **February 2026:** Added global search feature (Ctrl+F), ActionPlanner daily dashboard with weather widget, and four strategic journal enhancements: AI task extraction from entries, meeting context linking, structured templates (Morning Intentions / Evening Wind-down), and mood x productivity analytics dashboard.
- **February 2026:** Redesigned Calendar page into spacious full-width layout matching design mockup: (1) Flexible-width month grid with large day cells showing events/tasks with capacity load bars, (2) Narrow 240px right sidebar with discreet sync status indicator (Google Cal / Outlook with green dot for connected) and unscheduled tasks list, (3) HTML5 drag-and-drop from sidebar tasks onto calendar day cells for time-blocking, (4) Removed "Today" detail widget — calendar grid is the primary interaction surface. Header has month/year title, prev/next nav, Today button, Filter button, and New Event. Meeting prep dialog retained for Google/Outlook events.
- **February 2026:** Redesigned Notes page into action-oriented capture system: (1) Masonry grid layout with color-coded cards (semantic CSS tokens via color-mix), (2) Create New card with action icons (voice, checklist, template), (3) Search bar with filter pills (All/Work/Personal/Meeting), (4) Right sidebar with Collections and Tags, (5) Smart context linking — notes linked to meetings show meeting badge via meetingId column, (6) AI "Text-to-Action" extraction pipeline — POST /api/notes/:id/extract-actions scans note content and creates tasks in inbox, (7) Grid/list view toggle, (8) Collection-based organization via collection column. Schema enhanced with meetingId and collection columns on notes table.
- **February 2026:** Redesigned Journal page into interactive two-column layout matching design mockup: (1) Inline Quick Reflection card with template pill buttons (Morning Intention, Evening Wind-down, Weekly Win), compact mood selector, textarea with "Save Draft", (2) Always-visible "Mood vs. Output" weekly bar chart with productivity insight, (3) Purple gradient Daily Prompt card with rotating prompts and "Answer" button, (4) Enhanced entry feed with date+time+mood headers, "Suggested Action" bars with "+ Add Task", and signal tag pills. Analytics always fetched (removed toggle).