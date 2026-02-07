# ActionMinutes

## Overview

ActionMinutes is a personal productivity assistant designed to help users organize their lives through a suite of integrated tools. It features notes, reminders, journaling, a calendar, and custom lists. A key highlight is its AI-powered capability to extract information from meeting notes, transforming them into actionable tasks. The application aims to enhance single-user personal productivity by centralizing various organizational aspects into a seamless experience.

**Key Capabilities:**
- **Inbox:** Central hub for all activities.
- **AI Extraction:** Converts meeting notes into tasks, decisions, and risks.
- **Reminders:** Time-based task management.
- **Journal:** Daily reflection with AI prompts.
- **Calendar:** Integration with Google and Outlook.
- **Notes:** Encrypted notes with tagging and linking.
- **Custom Lists:** User-defined organizational lists.
- **Quick Add:** Instant information capture.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

ActionMinutes is a full-stack TypeScript application. The frontend is built with React, utilizing Wouter for routing, Zustand for state management, and TanStack React Query for data fetching. UI components are developed with shadcn/ui and styled using Tailwind CSS, adhering to a Vibrant Enterprise design system with Phosphor Icons. The backend is an Express.js application, employing Drizzle ORM with PostgreSQL. Authentication is handled via a custom JWT-based system.

A separate mobile application is developed using Expo React Native, connecting to the same backend API and PostgreSQL database, offering all core features.

**Core Architectural Decisions:**
- **Authentication:** Secure JWT-based system with access and refresh tokens.
- **AI Integration:** Features for meeting capture, AI extraction for summaries, action items, decisions, risks, and automated follow-up email draft generation.
- **Access Control:** Plan-based access control (Free and Pro tiers) managing features and usage limits.
- **UI/UX Design:** Category-based sidebar navigation with three sections: "Action To Do" (Inbox + custom lists), "AI Assistant" (Capture, Meetings, Calendar), "Action Reflect" (Journal, Notes). Actioned and Deleted views at sidebar bottom. Transcripts/Drafts/Reminders removed from sidebar (routes still exist).
- **Soft Delete:** Tasks and personal reminders support soft deletion via `deletedAt` timestamp. Deleted items viewable and restorable from the Deleted page. Actioned page shows completed items.
- **Meeting Source Card:** Extraction page shows a "Source" card at top displaying linked transcripts with AI summaries (from transcript_summaries) and meeting notes.
- **Theme System:** Five themes (Aurora, Paper, Grid, Clay, Terminal) × light/dark modes = 10 configurations. Architecture:
    - `client/src/theme/themes.css`: Single source of truth with `html[data-theme]` selectors, shadow tokens, status tokens (--success, --warning), per-theme typography.
    - `client/src/theme/demo-utilities.css`: Reusable classes (.navItem, .shadow-token, .glass-panel, .pill-secondary, etc.).
    - `client/src/theme/theme.ts`: `initTheme()` runs before React render in main.tsx.
    - `client/src/theme/useTheme.ts`: Zustand store for React components.
    - All UI components use semantic CSS tokens exclusively (zero hardcoded slate/white colors in global UI). Pill classes use `color-mix()` with CSS variables for transparency effects.
    - Settings page has theme switcher with color preview dots, light/dark toggle, and live ThemePreview component.
- **Notes Module:** Features AES-256-GCM encryption for note content at rest, with searchable keyword indexing. Supports mood tracking, tags, bi-directional links, and attachments.
- **Calendar Synchronization:** Adapters for Google Calendar and Microsoft Outlook, supporting CRUD operations for events, real-time sync via webhooks, and free/busy queries.
- **AI Summarization Service:** Structured summarization of transcripts, extracting concise summaries, key decisions, actionable tasks (with assignees, due dates, priority), sentiment analysis, and keywords.
- **Voice Command Activation:** Speech-to-action interface for interacting with the summarization service.
- **Audio Transcription:** Multi-provider support (Gemini, OpenAI Whisper API) for speech-to-text, with transcript storage, full-text search, and export options.
- **Live Meeting Recording:** In-browser audio recording via MediaRecorder API (audio/webm). GDPR consent dialog shown on first use (stored as `recordingConsentAt` timestamp in users table). Auto-transcribes on stop and inserts text into notes without user prompt. Compatible with template summarization and AI extraction flows.
- **Template Summaries:** 18 professional templates across 6 categories with markdown rendering, Export PDF/Print/Copy actions, and database persistence via `transcript_summaries` table with `promptVersion: template:${templateId}` tracking.
- **DatePickerModal:** Reusable modal component (`client/src/components/date-picker-modal.tsx`) with Date and Duration tabs. Date tab has quick icons (Today/Tomorrow/+7/Month), mini calendar, time input, reminder dropdown, repeat dropdown, and repeat-ends. Duration tab has start/end date+time, all-day toggle, same reminder/repeat options. Internal state management, commits on OK press.
- **Task Detail Page:** Card-based glass-panel layout matching Meeting page style. Task title at top, cards for Task Details, Schedule (due date via DatePickerModal, duration, deadline, reminder, repeat, priority), Location+Tags row, and Notes with attachment support.
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
- **Authentication:** Passport.js, express-session, connect-pg-simple.
- **Frontend Libraries:**
    - Chart.js (`react-chartjs-2`).
    - date-fns.
    - zod.