# ActionMinutes

## Overview

ActionMinutes is a web application designed to streamline meeting workflows by converting raw meeting notes into actionable insights. It aims to generate concise summaries, assignable action items with due dates, and draft follow-up emails rapidly. The project's vision is to enhance productivity by transforming unstructured meeting data into structured, actionable tasks and communications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

ActionMinutes is a full-stack TypeScript application. The frontend uses React with Wouter for routing, Zustand for state management, and TanStack React Query for data fetching. UI components are built with shadcn/ui and styled using Tailwind CSS, adhering to a Vibrant Enterprise design system. Icons are primarily Phosphor Icons. The backend is an Express.js application, utilizing Drizzle ORM with PostgreSQL. Authentication is custom JWT-based, ensuring secure token handling.

Key application flows include:
- **Authentication**: Secure JWT-based system with access and refresh tokens.
- **Meeting Capture**: Functionality to create and manage meeting notes.
- **AI Extraction**: Processing of notes to extract summaries, action items, decisions, and risks.
- **Draft Generation**: Automated creation of follow-up emails.

The system incorporates plan-based access control with Free, Pro, and Team tiers, managing features and usage limits. Admin access is available for demo purposes. A feedback system allows users to submit feedback with optional diagnostics.

The UI/UX emphasizes a mode-based navigation structure, differentiating between Personal and Team/Work modes, each with tailored primary navigation.

## External Dependencies

- **Database**: PostgreSQL (via `DATABASE_URL`), Drizzle ORM, and `drizzle-kit` for migrations.
- **AI/ML Services**:
    - **OpenAI**: Primary provider for AI services, integrated via Replit AI Integrations.
    - **Journal AI**: Utilizes gpt-4o-mini for personal journaling features like smart prompts and summarization.
- **OCR**: Tesseract.js for text extraction from images.
- **Audio Transcription**: Gemini (Replit AI Integrations) and OpenAI Whisper API for speech-to-text.
- **Frontend Libraries**: Chart.js (and `react-chartjs-2`), date-fns, zod.
- **Email/Communication**: Nodemailer for sending emails.
- **Authentication**: Passport.js, express-session, connect-pg-simple for session management.

## Key Features

### Audio Transcription (Voice-to-Text)
- **Multi-Provider Support**: Gemini (fast), Whisper API (97+ languages), Self-hosted Whisper (privacy)
- **Transcript Storage**: Full-text search, keyword extraction, SRT/TXT export
- **Rate Limiting**: 5 requests/minute per user

### AI Summarization Service
- **Transcript Summarization** (`server/summarization/index.ts`): Converts transcripts into structured summaries
  - Concise summary generation (2-4 sentences)
  - Key decisions extraction with context
  - Actionable tasks with assignees, due dates, priority, and keywords
  - Sentiment analysis (positive/negative/neutral/mixed with -1 to 1 score)
  - Top keywords extraction (up to 15)
- **Database Tables**: 
  - `transcript_summaries`: Stores summaries with sentiment analysis and AI metadata
  - `transcript_tasks`: Stores extracted tasks with assignees, due dates, status, and keywords
- **API Endpoints**:
  - `POST /api/transcripts/:id/summarize`: Generate summary for a transcript
  - `GET /api/transcripts/:id/summary`: Get existing summary and tasks
  - `GET /api/transcripts/:id/tasks`: Get tasks for a transcript
  - `PUT /api/transcript-tasks/:id`: Update task status, assignee, due date, etc.

### Voice Command Activation
- **Voice Command Service** (`server/summarization/voice-commands.ts`): Speech-to-action interface
  - Supported commands: summarize, get_summary, list_tasks, list_decisions, show_keywords, analyze_sentiment
  - Natural language patterns: "Summarize my meeting", "What are the action items?", "How did the meeting go?"
  - Voice response generation for spoken feedback
- **API Endpoints**:
  - `GET /api/voice-commands`: List supported voice commands with examples
  - `POST /api/voice-command`: Process voice audio and execute command
  - `POST /api/voice-command/text`: Process text command (for testing/accessibility)

### Calendar Synchronization
- **Provider Adapters** (`server/calendar-providers.ts`): Google Calendar and Microsoft Outlook integration
  - Event CRUD operations (create, update, delete)
  - Calendar sync with incremental tokens (Google syncToken, Microsoft deltaLink)
  - Free/busy queries and calendar listing
- **Database Tables**:
  - `calendar_events`: User calendar events with provider sync metadata
  - `calendar_webhooks`: Webhook subscriptions for real-time sync
  - `oauth_connections`: Extended with calendarSyncToken, calendarId, lastCalendarSync fields
- **Security Features**:
  - Per-user oauthConnection validation before external operations
  - connectionId tracking on synced events
  - Unique constraint on (user_id, provider, provider_event_id) prevents duplicates
- **API Endpoints** (`server/calendar-routes.ts`):
  - `GET /api/calendar/events`: List user's calendar events with date range filter
  - `POST /api/calendar/events`: Create event (local or synced to provider)
  - `PUT /api/calendar/events/:id`: Update event
  - `DELETE /api/calendar/events/:id`: Delete event
  - `POST /api/calendar/sync`: Sync events from provider
  - `GET /api/calendar/providers`: List available calendar providers and connection status
  - `GET /api/calendar/calendars`: List user's calendars from connected providers
  - `GET /api/calendar/free-busy`: Query free/busy times
- **Frontend** (`client/src/pages/calendar.tsx`):
  - Day/week/month view toggle
  - Event creation dialog with provider selection
  - Sync buttons for connected providers
  - Navigation for date range selection

### Notes Module
- **Encryption at Rest** (`server/crypto.ts`): AES-256-GCM encryption for note content
  - `encryptNoteContent`: Encrypts plaintext with random IV
  - `decryptNoteContent`: Decrypts using stored IV
  - `generateSearchVector`: Creates searchable keyword index from content
- **Database Tables**:
  - `notes`: User notes with encrypted content, mood tracking, visibility settings
  - `note_tags`: User-defined tags for organization
  - `note_tag_map`: Many-to-many note-tag relationships
  - `note_links`: Bi-directional links between notes
  - `note_attachments`: File attachments with transcript integration
- **API Endpoints** (`server/notes-routes.ts`):
  - `GET /api/notes`: List notes with search, tag filter, journal filter
  - `POST /api/notes`: Create encrypted note with tags
  - `GET /api/notes/:id`: Get decrypted note with tags, attachments, links
  - `PUT /api/notes/:id`: Update note
  - `DELETE /api/notes/:id`: Delete note
  - `GET /api/notes/feed`: Recent notes feed
  - `GET /api/notes/search`: Full-text search
  - `GET /api/notes/prompts/daily`: Get daily journal prompt
  - `POST/DELETE /api/notes/:id/tags/:tagId`: Tag management
  - `POST/DELETE /api/notes/:id/links/:targetId`: Note linking
  - `POST /api/notes/:id/attachments`: Upload attachments
- **Frontend** (`client/src/pages/notes.tsx`):
  - Rich text editor with TipTap (bold, italic, lists, links, images)
  - Note cards with color coding and mood indicators
  - Tag-based filtering and full-text search
  - Daily journal prompts with mood tracking
  - Recent activity feed sidebar
  - Pin notes for quick access