# ActionMinutes

## Overview

ActionMinutes is a work-first web application that transforms messy meeting notes into actionable outputs. The core product promise is "Minutes → Actions → Follow-ups" - turning raw meeting notes into concise summaries, clear action items with owners and due dates, and ready-to-send follow-up email drafts in under 60 seconds.

The application is built as a full-stack TypeScript application with a React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: Zustand with persistence middleware for local storage
- **Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with Vibrant Enterprise design system (Inter font, Indigo/Purple gradient palette)
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **API Pattern**: RESTful JSON APIs under `/api/*` prefix

### Database Schema
The schema (`shared/schema.ts`) defines these core entities:
- **users**: Authentication and preferences (tone, timezone, AI settings)
- **meetings**: Meeting metadata and raw notes with parse state machine (draft → processing → parsed → finalized → error)
- **attendees**: Meeting participants (name required, email optional)
- **decisions**: Key decisions extracted from meetings
- **risks**: Identified risks with severity levels
- **clarifyingQuestions**: AI-generated questions for ambiguous content
- **actionItems**: Extracted tasks with owner, due date, status, and confidence scores
- **followUpDrafts**: Generated email drafts with recipient and content
- **personalEntries**: Optional personal journal entries (secondary feature)
- **feedback**: User-submitted feedback with type, message, optional email, diagnostics (route, viewport, userAgent), and status

### Key Application Flows
1. **Authentication**: Username/password authentication with bcrypt password hashing
   - Server routes: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/user`
   - Client hook: `useAuth()` from `@/hooks/use-auth` with `login`, `register`, `logout` functions
   - Session-based auth with PostgreSQL session store
   - Test credentials: `test@actionminutes.com` / `testpass123` (after seeding)
2. **Meeting Capture**: Create meetings with title, date, attendees, and raw notes
3. **AI Extraction**: Process notes to extract summary, actions, decisions, and risks
4. **Draft Generation**: Auto-generate follow-up emails based on extracted content

### Navigation Structure
Mode-based navigation controlled by workspace selection:
- **Personal Mode** (no workspace selected): Inbox, Reminders (primary), Journal
  - Settings accessible via sidebar footer (desktop) or header icon (mobile)
  - Inbox automatically filters to show only tasks assigned to the logged-in user
- **Team/Work Mode** (workspace selected): Inbox, Meetings, Capture (primary), Drafts, Settings
  - Inbox shows filter toggle for Mine vs Workspace views

### Admin Access Control (Demo-Only)
Admin endpoints (`/api/admin/*`) are protected by a `requireAdminAccess` middleware that:
1. Requires `userId` query parameter
2. Verifies user exists in database
3. Checks email against allow-list: emails containing "admin", or exactly "test@actionminutes.com" or "demo@actionminutes.com"

**Note**: This is demo-grade security. Production should use proper role-based access control.

### Feedback System
- **Settings**: "Send feedback" button opens modal
- **Modal**: Type (Bug/Feature/UX/Other), Message (required), Email (optional), Diagnostics toggle (default ON)
- **Diagnostics**: Captures route, viewport size, user agent
- **Admin page**: `/admin/feedback` with search, status filtering, detail view

### Production Hardening
- **Configuration Module** (`server/config.ts`): Centralized environment validation and feature flags
- **Feature Flags**: AI_FEATURE_ENABLED, INTEGRATIONS_FEATURE_ENABLED, PERSONAL_FEATURE_ENABLED, TEAM_FEATURE_ENABLED, REMINDERS_FEATURE_ENABLED
- **Release Readiness Panel**: Settings > Release tab shows status of AI, Gmail, Outlook, Database, and Mobile build
- **Graceful Degradation**: 
  - Capture page disables extraction when AI is off
  - Extraction page shows unavailable message when AI disabled
  - Settings pages show feature disabled messages
- **Error Handling**: Global async error handler with stack traces only in development
- **Environment Template**: `.env.example` documents all configuration options

## External Dependencies

### Database
- **PostgreSQL**: Primary data store accessed via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management
- **drizzle-kit**: Database migration tooling (`npm run db:push`)

### AI/ML Services
- **AI Module** (`server/ai/index.ts`): Provider-agnostic service with strict JSON validation
  - **OpenAI**: Primary provider via Replit AI Integrations (credits-based, no API key required)
  - **Mock Fallback**: Deterministic mock extraction when AI is disabled or unavailable
  - **Prompt Versioning**: PROMPT_VERSION constant (v1.0.0) tracked in audit logs
  - **Confidence Mapping**: Action items with confidence <0.65 get status "needs_review"
- **AI Audit Logging** (`aiAuditLogs` table): Tracks provider, model, promptVersion, inputHash, outputJson, validJson, errorText per AI call
- **Unit Tests**: 19 tests in `server/ai/ai.test.ts` for schema validation, confidence mapping, hash consistency

### Journal AI (Personal Mode)
- **Journal AI Module** (`server/journal-ai/index.ts`): AI-powered personal journal features
  - **Smart Prompts**: 25 prompts tagged by intent (clarify, prioritize, unblock, reflect, plan)
  - **Signal Detection**: Detects overwhelm, deadlines, conflict, decision, avoidance patterns in entries
  - **AI Summarization**: Generates summary, top 3 points, and next steps using gpt-4o-mini
  - **Safety Detection**: Flags entries with self-harm keywords, displays supportive message with crisis resources
  - **Prompt Tracking**: `journalPromptShown` table tracks shown prompts and user responses
- **Personal AI Toggle**: Separate `personalAiEnabled` user setting independent from work AI (`aiEnabled`)
- **Journal Page UI**: Card-based layout showing detected signals, AI summaries, and suggested prompts
- **Unit Tests**: 45 tests in `server/journal-ai/journal-ai.test.ts` for prompt selection, signal detection, schema validation

### Personal Reminders
- **Reminders Page** (`client/src/pages/reminders.tsx`): Kanban-style reminder board
  - **5 Bucket Columns**: Today, Tomorrow, Next Week, Next Month, Sometime
  - **Quick Add**: Text input with bucket selector at top
  - **Drag/Drop**: HTML5 drag-and-drop between buckets with automatic due date updates
  - **Snooze Actions**: Move reminders to Tomorrow, Next Week, or Sometime
  - **Rebucket**: Recomputes bucket based on current due date
  - **Recently Done**: Section showing completed reminders
  - **ICS Export**: Calendar export for reminders with due dates (all-day events)
- **Bucket Logic**: daysDiff calculation ensures bucket consistency
  - Today: ≤0 days, Tomorrow: 1 day, Next Week: 2-7 days, Next Month: 8-30 days, Sometime: >30 days
  - Due date generation places items in middle of bucket range (3 days for next_week, 14 days for next_month)
- **Unit Tests**: 26 tests in `server/reminders/reminders.test.ts` for bucket logic, ICS export, and rebucket consistency

### OCR (Handwritten Notes Import)
- **OCR Module** (`server/ocr/index.ts`): Text extraction from images using Tesseract.js
  - **Provider**: Local Tesseract.js (configurable via OCR_PROVIDER env var, "cloud" scaffold available)
  - **File Validation**: Accepts JPG, PNG, WebP; max 10MB file size
  - **Rate Limiting**: 10 requests/minute per user (in-memory counter)
  - **Confidence Scoring**: Returns confidence percentage for extracted text
- **Capture Page Integration**: Upload photo button with progress indicator, preview dialog, insert/append modes
- **Privacy Setting**: `allowImageStorage` user preference (default false) - images are not stored by default
- **Mobile Camera Scaffold**: Capacitor camera integration placeholder ready for future mobile build
- **Unit Tests**: 10 tests in `server/ocr/ocr.test.ts` for file validation

### Frontend Libraries
- **Chart.js**: Data visualization for the Blueprint demo page
- **react-chartjs-2**: React wrapper for Chart.js
- **date-fns**: Date formatting and manipulation
- **zod**: Runtime schema validation shared between client and server

### Email/Communication
- **Nodemailer**: Email sending capability for follow-up drafts

### Authentication
- **Passport.js**: Authentication middleware with local strategy
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session storage