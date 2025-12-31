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

### Key Application Flows
1. **Authentication**: Demo-mode auth with email/password, session-based
2. **Meeting Capture**: Create meetings with title, date, attendees, and raw notes
3. **AI Extraction**: Process notes to extract summary, actions, decisions, and risks
4. **Draft Generation**: Auto-generate follow-up emails based on extracted content

### Navigation Structure
Bottom tab navigation with: Inbox, Meetings, Capture, Drafts, Settings. A Blueprint demo page exists at `/blueprint` for showcasing the product.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store accessed via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management
- **drizzle-kit**: Database migration tooling (`npm run db:push`)

### AI/ML Services
- **OpenAI**: For meeting note extraction and draft generation (optional, controlled by user settings)
- **Google Generative AI**: Alternative AI provider support

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