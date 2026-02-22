# ActionMinutes

## Overview
ActionMinutes is a personal productivity assistant designed to centralize and organize a user's life through integrated tools like notes, reminders, journaling, a calendar, and custom lists. A core feature is its AI-powered capability to transform meeting notes into actionable tasks, decisions, and risks. The application aims to enhance single-user personal productivity by providing a seamless, unified experience for managing tasks and information.

Key capabilities include:
- **Inbox:** A central station for managing and triaging all tasks, offering smart grouping and bulk operations.
- **AI Extraction:** Automated conversion of meeting notes into actionable items.
- **Unified Task Management:** All tasks are managed through a single system.
- **Journal:** An interactive journal with quick reflection cards, mood tracking, daily prompts, and AI task extraction.
- **Calendar:** An "Action Center" calendar with integration for Google/Outlook, capacity planning, and time-blocking features.
- **Notes:** An action-oriented capture system with AI "Text-to-Action" extraction, smart context linking, and collection-based organization.
- **Custom Lists:** User-defined lists for flexible organization.
- **Quick Add:** For instant information capture across the application.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
ActionMinutes is a full-stack TypeScript application. The frontend uses React with Wouter for routing, Zustand for state management, and TanStack React Query for data fetching. UI components are built with shadcn/ui and styled using Tailwind CSS, featuring a minimal white/amber design system and Phosphor Icons. The backend is an Express.js application using Drizzle ORM with PostgreSQL. Authentication is handled via a custom JWT-based system. A separate mobile application, developed with Expo React Native, connects to the same backend API and PostgreSQL database, offering all core features.

**Core Architectural Decisions:**
- **Authentication:** Secure JWT-based system utilizing access and refresh tokens.
- **AI Integration:** AI features encompass meeting capture, extraction of summaries, action items, decisions, risks, and automated follow-up email draft generation.
- **Access Control:** A plan-based system (Free and Pro tiers) manages feature access and usage limits.
- **UI/UX Design:** A clean white top navigation bar and a mobile bottom tab bar provide intuitive navigation. The design adheres to a single light theme with a minimal white/purple aesthetic, using specific CSS variables for colors, Inter font, and consistent card styling.
- **Soft Delete:** Tasks and personal reminders are soft-deleted using a `deletedAt` timestamp, allowing for restoration.
- **Meeting Source Card:** Extraction pages display a source card with linked transcripts and AI summaries.
- **Notes Module:** Features AES-256-GCM encryption for note content, searchable keyword indexing, mood tracking, tags, bi-directional links, and attachments. The notes page uses a masonry grid layout with color-coded cards and supports AI "Text-to-Action" extraction.
- **Calendar Synchronization:** Adapters for Google Calendar and Microsoft Outlook enable CRUD operations for events, real-time sync, and free/busy queries.
- **Calendar Action Center:** The calendar page features a spacious full-width layout with capacity load bars, a right sidebar for unscheduled tasks, and drag-and-drop time-blocking.
- **AI Summarization Service:** Provides structured summarization of transcripts, extracting key information like decisions, tasks, sentiment, and keywords.
- **Voice Command Activation:** Speech-to-action interface for interacting with the summarization service.
- **Audio Transcription:** Multi-provider support (Gemini, OpenAI Whisper API) for speech-to-text, including transcript storage, full-text search, and export options.
- **Live Meeting Recording:** In-browser audio recording via MediaRecorder API, with GDPR consent, auto-transcription, and integration with AI extraction flows.
- **Template Summaries:** Offers 18 professional templates for structured content, with markdown rendering, export options, and database persistence.
- **DatePickerModal:** A reusable component for date and duration selection, including quick date options, time input, reminders, and repeat functionality.
- **Task Detail Page:** A card-based layout for task details, scheduling, location, tags, and notes with attachment support.
- **Priority System:** Tasks can be assigned High, Normal, Low, or None priority.
- **Task Attachments:** Supports various file types (PDF, Word, Excel, PowerPoint, Markdown, images) via `multer`-based file upload.
- **Subtasks:** Tasks can be linked as subtasks to parent tasks, visible within the parent task's detail view.

## External Dependencies
- **Database:** PostgreSQL (via Drizzle ORM and `drizzle-kit`).
- **AI/ML Services:**
    - OpenAI (primary provider via Replit AI Integrations).
    - Gemini (for audio transcription via Replit AI Integrations).
    - OpenAI Whisper API (for audio transcription).
    - Tesseract.js (for OCR).
- **Email/Communication:** Nodemailer.
- **Authentication:** Custom JWT (bcrypt, `server/jwt.ts`), Replit Auth integration.
- **Frontend Libraries:**
    - Chart.js (`react-chartjs-2`).
    - date-fns.
    - zod.