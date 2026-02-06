# ActionMinutes

## Overview

ActionMinutes is a personal productivity assistant that helps users organize their life with notes, reminders, journal, calendar, and custom lists. Features AI-powered meeting note extraction as a highlight tool. The app focuses on single-user personal productivity with 8 core features: Inbox (central hub), AI Extraction (meeting notes to tasks), Reminders (time-based task organization), Journal (daily reflection with AI prompts), Calendar (Google/Outlook sync), Notes (encrypted with tags and links), Custom Lists (user-created), and Quick Add (instant capture).

**Pricing Structure:**
- **Free**: Unlimited notes & lists, personal reminders, daily journal, 5 AI extractions/month
- **Pro €8/$10/month**: Everything in Free + unlimited AI extractions, Gmail/Outlook sync, calendar integration, voice transcription

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

ActionMinutes is a full-stack TypeScript application. The frontend uses React with Wouter for routing, Zustand for state management, and TanStack React Query for data fetching. UI components are built with shadcn/ui and styled using Tailwind CSS, adhering to a Vibrant Enterprise design system. Icons are primarily Phosphor Icons. The backend is an Express.js application, utilizing Drizzle ORM with PostgreSQL. Authentication is custom JWT-based, ensuring secure token handling.

### Mobile App (Expo React Native)
A separate React Native mobile app is available in `mobile-app/` directory:
- **Tech Stack**: Expo, React Navigation, TanStack Query, Zustand, Expo SecureStore
- **Features**: All core features (Inbox, Capture, Tasks, Notes, Journal, Calendar, Settings, AI Extraction)
- **API**: Connects to the same backend API and PostgreSQL database
- **Build**: Requires Expo CLI and EAS for building (external to Replit)
- **Setup**: See `mobile-app/README.md` for detailed instructions

Key application flows include:
- **Authentication**: Secure JWT-based system with access and refresh tokens.
- **Meeting Capture**: Functionality to create and manage meeting notes.
- **AI Extraction**: Processing of notes to extract summaries, action items, decisions, and risks.
- **Draft Generation**: Automated creation of follow-up emails.

The system incorporates plan-based access control with Free and Pro tiers, managing features and usage limits. Admin access is available for demo purposes. A feedback system allows users to submit feedback with optional diagnostics.

The UI/UX is designed as a personal productivity assistant with a streamlined sidebar navigation showing all features at once.

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

## UX Enhancement Components

### Onboarding & Empty States
- **Empty State** (`client/src/components/empty-state.tsx`): Reusable animated empty state with 10+ page variants (inbox, meetings, transcripts, drafts, journal, calendar, notes, tasks, capture, generic). Includes tips section, CTA buttons, and inline variant.
- **Getting Started** (`client/src/components/getting-started.tsx`): Dismissible onboarding widget with 3-step progress tracking (capture meeting, create note, connect calendar). Auto-hides when all steps complete. State persisted in localStorage.
- **Sample Data** (`client/src/lib/sample-data.ts`): Demo mode with 3 sample meetings, extracted items, and follow-up draft emails for new user walkthrough.

### Performance & Loading
- **Skeleton Loaders** (`client/src/components/skeleton-loader.tsx`): Theme-aware skeleton components for cards, actions, meetings, journals, notes, calendar, and transcripts. Includes SkeletonList wrapper.
- **Lazy Loading**: Calendar and Transcripts pages use React.lazy with Suspense for code splitting, reducing initial bundle size.

### Error Handling
- **Error Boundary** (`client/src/components/error-boundary.tsx`): React class error boundary with retry, page-level and section-level fallback UIs. Includes useErrorHandler hook and withErrorBoundary HOC.
- **Toast Notifications**: All network mutations across pages (notes, tasks, reminders, lists, calendar, transcripts, inbox) have both success and error toast feedback.

### AI Accuracy Controls
- **AI Settings** (`client/src/components/ai-settings.tsx`): Dialog for configuring output language (12 languages), writing tone (formal/neutral/informal), summary length (brief/standard/detailed), confidence threshold slider, auto-extract toggle, and confidence score visibility. Persisted in localStorage.
- **Extraction Review** (`client/src/components/extraction-review.tsx`): Side-by-side review panel showing original notes alongside extracted items (actions, decisions, risks) with confidence badges, accept/reject/edit per item, and batch accept.
- **Text Highlighter** (`client/src/components/text-highlighter.tsx`): Manual text selection UI for highlighting meeting notes and marking them as action items, decisions, or risks. Includes assignee editing and filter tabs.

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

### Theme System
- **5 Themes**: Aurora (violet glassmorphism, default), Studio Paper (warm editorial), Monochrome Grid (enterprise), Warm Clay (earth tones), Terminal Luxe (graphite + neon)
- **Light/Dark Modes**: Each theme supports both light and dark modes (10 total configurations)
- **Architecture** (`client/src/theme/`):
  - `theme-types.ts`: Theme definitions, IDs, preview colors, descriptions, bestFor field
  - `theme.ts`: Single theme manager with `initTheme()` and `applyTheme()` functions. Called before React render in main.tsx.
  - `useTheme.ts`: Zustand store for theme/mode state with localStorage persistence (keys: `am.theme`, `am.mode`). Uses shared `applyTheme()` from theme.ts.
  - `ThemeProvider.tsx`: Context provider wrapping app root, handles DOM updates via `useLayoutEffect` using shared `applyTheme()`.
  - `themes.css`: CSS custom properties for all theme+mode combinations using `html[data-theme="X"]` selectors. Includes shadow tokens, Aurora/Terminal gradient backgrounds.
  - `demo-utilities.css`: Utility classes matching Theme Gallery demo — `.shadow-token`, `.shadow-token-2`, `.navItem`, `.navItemActive`, `.meta`, `.ring-token`, `.card-token`, `.pill-secondary`, `.pill-accent`, `.section-label`.
  - `ThemePreview.tsx`: Live preview component showing buttons, badges, inputs, and text colors
- **DOM Convention**: `data-theme="aurora|paper|grid|clay|terminal"` attribute + `.light` class on `<html>` element. Dark mode also adds `.dark` class.
- **Settings UI**: Appearance section in Settings page with theme cards, mode toggle, reset button, and live preview
- **Integration**: Body background uses theme-specific CSS in themes.css (Aurora/Terminal have radial gradient backgrounds). Single `initTheme()` call in main.tsx before React render ensures no flash of unstyled content.
- **Font System**: Per-theme font families via `--font-sans` CSS variable in themes.css. Aurora/Grid use Inter, Paper uses Lora (serif), Clay uses DM Sans (rounded), Terminal uses JetBrains Mono. Logo text always uses Plus Jakarta Sans via `--font-logo` / `.font-logo` utility class. Google Fonts loaded in index.html.
- **Token System**: HSL-based shadcn/ui tokens (space-separated format) converted to hsl() in themes.css. ALL components use semantic variables exclusively (--primary, --foreground, --border, --card, --muted, --accent, etc.). Zero hardcoded text-white/text-gray/bg-slate classes in components. Shadow tokens (--shadow-1, --shadow-2) shared across themes. Legacy palette definitions kept in @theme inline block for Tailwind compatibility only. Sidebar uses `.navItem`/`.navItemActive` CSS classes from demo-utilities.css.