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
- **Styling**: Tailwind CSS with custom design tokens (Outfit font, teal/stone/slate color palette)
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
1. **Authentication**: Demo-mode auth with email/password, session-based
2. **Meeting Capture**: Create meetings with title, date, attendees, and raw notes
3. **AI Extraction**: Process notes to extract summary, actions, decisions, and risks
4. **Draft Generation**: Auto-generate follow-up emails based on extracted content

### Navigation Structure
Bottom tab navigation with: Inbox, Meetings, Capture, Drafts, Settings. A Blueprint demo page exists at `/blueprint` for showcasing the product.

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