# ActionMinutes Developer Guide

*Last updated: February 2026*

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Authentication System](#5-authentication-system)
6. [API Reference](#6-api-reference)
7. [Frontend Architecture](#7-frontend-architecture)
8. [AI Services](#8-ai-services)
9. [Theme System](#9-theme-system)
10. [Calendar Integration](#10-calendar-integration)
11. [Subscription & Billing](#11-subscription--billing)
12. [Feature Links & Data Flow](#12-feature-links--data-flow)
13. [Missing Links & Gaps](#13-missing-links--gaps)
14. [Suggested Features](#14-suggested-features)

---

## 1. Architecture Overview

ActionMinutes is a full-stack TypeScript monorepo with a React frontend and Express.js backend, sharing types through a common `shared/` directory.

```
Client (React + Vite)  <-->  Server (Express.js)  <-->  PostgreSQL (Drizzle ORM)
       |                           |
       |                     AI Services
       |                   (OpenAI, Gemini)
       |                           |
       +-- Zustand (state)    Stripe (billing)
       +-- React Query (data) Nodemailer (email)
       +-- Wouter (routing)   OAuth (Google/Microsoft)
```

### Key Design Decisions

- **Monorepo with shared types** — `shared/schema.ts` is the single source of truth for all data models, used by both frontend and backend.
- **Drizzle ORM** — Type-safe database queries with schema push (no migration files).
- **Storage interface pattern** — All database operations go through `IStorage` interface in `server/storage.ts`, making the data layer swappable.
- **React.lazy for all pages** — Every page uses dynamic imports with `Suspense` for code splitting.
- **Semantic CSS tokens** — All UI components use CSS custom properties, never hardcoded colors.

---

## 2. Tech Stack

### Frontend

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Vite | Build tool and dev server |
| Wouter | Lightweight routing |
| Zustand | Global state management |
| TanStack React Query | Server state and caching |
| Tailwind CSS | Utility-first styling |
| shadcn/ui + Radix UI | Component library |
| Phosphor Icons | Icon system |
| Framer Motion | Animations |
| date-fns | Date formatting and manipulation |
| Chart.js (react-chartjs-2) | Data visualization |
| Zod | Runtime type validation |

### Backend

| Technology | Purpose |
|-----------|---------|
| Express.js | HTTP server |
| Drizzle ORM | Database ORM |
| PostgreSQL (Neon) | Primary database |
| Custom JWT (`server/jwt.ts`) | Authentication (access + refresh tokens) |
| bcryptjs | Password hashing |
| Nodemailer | Email sending |
| Multer | File upload handling |
| Tesseract.js | OCR (image to text) |
| Stripe | Payment processing |

### AI/ML Services

| Service | Purpose |
|---------|---------|
| OpenAI | Meeting extraction, draft generation, journal analysis |
| Gemini | Audio transcription |
| OpenAI Whisper | Alternative audio transcription |

---

## 3. Project Structure

```
/
├── client/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/           # Base shadcn/ui components
│   │   │   ├── layout.tsx    # Main app layout with sidebar
│   │   │   ├── quick-add.tsx # Quick Add dialog
│   │   │   ├── error-boundary.tsx
│   │   │   ├── template-picker.tsx
│   │   │   ├── action-edit-sheet.tsx
│   │   │   ├── upgrade-prompt.tsx
│   │   │   └── ...
│   │   ├── pages/            # Route-level page components
│   │   │   ├── inbox.tsx
│   │   │   ├── capture.tsx
│   │   │   ├── meetings.tsx
│   │   │   ├── extraction.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── journal.tsx
│   │   │   ├── notes.tsx
│   │   │   ├── reminders.tsx
│   │   │   ├── list.tsx
│   │   │   ├── action-detail.tsx
│   │   │   ├── actioned.tsx
│   │   │   ├── deleted.tsx
│   │   │   ├── settings.tsx
│   │   │   ├── drafts.tsx
│   │   │   ├── transcripts.tsx
│   │   │   ├── landing.tsx
│   │   │   └── ...
│   │   ├── hooks/            # Custom React hooks
│   │   │   ├── use-auth.ts
│   │   │   ├── use-plan.ts
│   │   │   ├── use-mobile.ts
│   │   │   └── use-toast.ts
│   │   ├── theme/            # Theme system
│   │   │   ├── themes.css
│   │   │   ├── demo-utilities.css
│   │   │   ├── theme.ts
│   │   │   ├── useTheme.ts
│   │   │   ├── theme-types.ts
│   │   │   ├── ThemeProvider.tsx
│   │   │   └── ThemePreview.tsx
│   │   ├── lib/              # Utilities and shared logic
│   │   │   ├── store.ts      # Zustand store
│   │   │   ├── queryClient.ts
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts      # Data fetching hooks
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   ├── App.tsx           # Root component with routing
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Global styles
│   └── index.html
├── server/
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # Main API routes (~3600 lines)
│   ├── storage.ts            # IStorage interface + DatabaseStorage
│   ├── routes/
│   │   ├── auth.ts           # Authentication routes
│   │   └── billing.ts        # Stripe billing routes
│   ├── calendar-routes.ts    # Calendar sync routes
│   ├── calendar-providers.ts # Google/Outlook calendar adapters
│   ├── notes-routes.ts       # Notes API routes
│   ├── jwt.ts                # JWT auth utilities (sign, verify, middleware)
│   ├── crypto.ts             # Encryption utilities
│   ├── config.ts             # Server configuration
│   ├── db.ts                 # Database connection
│   ├── email-providers.ts    # Email provider adapters
│   ├── rbac.ts               # Role-based access control
│   ├── stripeClient.ts       # Stripe client initialization
│   ├── stripeConfig.ts       # Stripe price IDs and config
│   ├── webhookHandlers.ts    # Stripe webhook handlers
│   ├── static.ts             # Static file serving
│   ├── ai-service.ts         # AI extraction service
│   ├── summarization-service.ts # Transcript summarization
│   └── replit_integrations/  # Replit-managed integrations
├── shared/
│   ├── schema.ts             # Drizzle schema (all tables)
│   └── models/
│       ├── auth.ts           # Auth-related tables
│       └── chat.ts           # Chat tables
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## 4. Database Schema

### Core Tables

#### Users & Authentication
- `users` — User profiles (id, email, name, tone, timezone, settings, stripe IDs)
- `sessions` — Active sessions
- `refresh_tokens` — JWT refresh tokens
- `password_reset_tokens` — Password reset flow
- `usage_tracking` — Monthly usage tracking for plan limits

#### Meetings & Extraction
- `meetings` — Meeting records (title, date, rawNotes, summary, parseState)
- `attendees` — Meeting participants (FK: meetings)
- `action_items` — AI-extracted actions (FK: meetings, with owner, dueDate, status, confidence scores)
- `decisions` — AI-extracted decisions (FK: meetings)
- `risks` — AI-extracted risks with severity (FK: meetings)
- `clarifying_questions` — Questions needing follow-up (FK: meetings)
- `follow_up_drafts` — Generated email drafts (FK: meetings, users)

#### Personal Productivity
- `personal_entries` — Journal entries (FK: users, with mood, signals, AI analysis)
- `personal_reminders` — User-created tasks (FK: users, with bucket, priority, repeat, soft-delete)
- `journal_prompts` — AI-generated journal prompts
- `journal_prompt_shown` — Tracks which prompts have been shown

#### Notes
- `notes` — Encrypted notes (FK: users, with AES-256-GCM encryption)
- `note_tags` — Tag definitions
- `note_tag_map` — Note-to-tag associations
- `note_links` — Bi-directional note links
- `note_attachments` — Files attached to notes

#### Organization
- `custom_lists` — User-defined lists (name, color, icon, position)
- `custom_list_items` — Items in lists (FK: custom_lists, personal_reminders, tasks, action_items)
- `global_tags` — User-defined tags
- `user_locations` — Saved location labels

#### Tasks & Projects
- `projects` — Project grouping
- `tasks` — General tasks (FK: users, projects, with recurrence)
- `task_attachments` — Files attached to tasks

#### Transcripts
- `transcripts` — Audio transcriptions (FK: users, meetings)
- `transcript_summaries` — Template-generated summaries
- `transcript_tasks` — Tasks extracted from transcripts

#### Calendar
- `calendar_events` — Synced and local calendar events
- `calendar_webhooks` — Webhook registrations for sync
- `calendar_exports` — Exported .ics files

#### Workspaces (Scaffolded)
- `workspaces` — Team workspaces
- `workspace_members` — Membership with roles
- `workspace_invites` — Invitation tokens

#### Other
- `oauth_connections` — Google/Microsoft OAuth tokens
- `ai_audit_logs` — AI usage audit trail
- `feedback` — User feedback submissions
- `conversations` / `messages` — Chat functionality tables

### Key Relationships

```
users ─┬── meetings ─┬── action_items ──┐
       │             ├── decisions       │
       │             ├── risks           │
       │             ├── clarifying_questions
       │             ├── attendees       │
       │             ├── follow_up_drafts│
       │             └── transcripts     │
       │                                 │
       ├── personal_reminders ──────────┐│
       │                                ││
       ├── custom_lists ── custom_list_items
       │                   (FK: reminders, action_items, tasks)
       │
       ├── personal_entries (journal)
       ├── notes ─┬── note_tags / note_tag_map
       │          ├── note_links
       │          └── note_attachments
       ├── tasks ── task_attachments
       ├── oauth_connections ── calendar_events
       └── usage_tracking
```

---

## 5. Authentication System

### JWT-Based Authentication

The app uses a custom JWT implementation in `server/jwt.ts` with access and refresh tokens:

1. **Registration** — `POST /api/auth/register` with email, password, name. Password hashed with bcrypt (12 rounds).
2. **Login** — `POST /api/auth/login` with email and password.
3. **Access Token** — Short-lived JWT returned in the response body, sent by frontend as `Authorization: Bearer <token>`.
4. **Refresh Token** — Long-lived token stored as an HTTP-only secure cookie. Token hash stored in `refresh_tokens` table (7-day expiry).
5. **Auto-Refresh** — Frontend calls `POST /api/auth/refresh` when access token expires.
6. **Replit Auth** — Alternate auth path via Replit's built-in authentication (`server/replit_integrations/auth/`).

### Auth Flow

```
Register → POST /api/auth/register → { user, accessToken } + Set-Cookie: refreshToken
Login    → POST /api/auth/login    → { user, accessToken } + Set-Cookie: refreshToken
           ↓
Request → Authorization: Bearer <accessToken>
           ↓
Expired? → POST /api/auth/refresh (reads cookie) → { accessToken }
```

### Middleware (`server/jwt.ts`)

- `requireAuth` — Validates JWT, attaches `req.user`, rejects with 401 if invalid
- Password reset flow via `forgot-password` and `reset-password` endpoints with time-limited tokens

### Frontend Auth Hook

`useAuth()` in `client/src/hooks/use-auth.ts` provides:
- `isAuthenticated` — Boolean auth state
- `isLoading` — Loading state during token refresh
- `login()` / `logout()` — Auth actions
- `authenticatedFetch()` — Fetch wrapper that auto-attaches JWT bearer token and handles token refresh on 401

---

## 6. API Reference

### Authentication (`server/routes/auth.ts`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login with credentials |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/auth/user` | Get current authenticated user |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/:id` | Get user by ID |
| GET | `/api/user/email/:email` | Get user by email |
| POST | `/api/user` | Create user |
| PATCH | `/api/user/:id` | Update user profile |
| PATCH | `/api/users/me` | Update current user (authenticated) |
| GET | `/api/users/me/plan` | Get subscription plan info |

### Meetings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meetings` | List all meetings |
| POST | `/api/meetings` | Create a meeting |
| GET | `/api/meetings/:id` | Get meeting details |
| PATCH | `/api/meetings/:id` | Update meeting |
| DELETE | `/api/meetings/:id` | Delete meeting |
| POST | `/api/meetings/:id/extract` | AI extraction |
| POST | `/api/meetings/:id/generate-drafts` | Generate email drafts |

### Action Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/actions` | List action items |
| GET | `/api/actions/:id` | Get single action item |
| PATCH | `/api/actions/:id` | Update action item |
| DELETE | `/api/actions/:id` | Delete action item |
| GET | `/api/actions/:id/list` | Get list membership |
| POST | `/api/actions/:id/move` | Move to a custom list |

### Attendees, Decisions, Risks, Questions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/DELETE | `/api/meetings/:id/attendees` | Manage attendees |
| GET/POST | `/api/meetings/:id/decisions` | Manage decisions |
| GET/POST | `/api/meetings/:id/risks` | Manage risks |
| GET/POST | `/api/meetings/:id/questions` | Manage questions |

### Personal Reminders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/personal/reminders` | List reminders |
| POST | `/api/personal/reminders` | Create reminder |
| PATCH | `/api/personal/reminders/:id` | Update reminder |
| DELETE | `/api/personal/reminders/:id` | Soft-delete reminder |
| GET | `/api/reminders/:id/list` | Get list membership |
| POST | `/api/reminders/:id/move` | Move to a custom list |

### Journal
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/personal/journal` | List journal entries |
| GET | `/api/personal/journal/:id` | Get single entry |
| POST | `/api/personal/journal` | Create entry |
| PATCH | `/api/personal/journal/:id` | Update entry |
| DELETE | `/api/personal/journal/:id` | Delete entry |
| POST | `/api/personal/journal/:id/analyze` | AI analysis |
| GET | `/api/personal/journal/prompts` | Get AI prompts |

### Custom Lists
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lists` | List all custom lists |
| POST | `/api/lists` | Create a list |
| PATCH | `/api/lists/:id` | Update list |
| DELETE | `/api/lists/:id` | Delete list |
| GET | `/api/lists/:id` | Get list with items |
| POST | `/api/lists/:id/items` | Add item to list |
| DELETE | `/api/lists/:listId/items/:itemId` | Remove item |

### Transcription & OCR
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transcribe` | Transcribe audio file |
| POST | `/api/ocr` | Extract text from image |
| GET | `/api/transcripts` | List transcripts |
| POST | `/api/transcripts/:id/summarize` | AI summarize |
| POST | `/api/transcripts/:id/summarize-template` | Template summary |

### Drafts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/drafts` | List follow-up drafts |
| PATCH | `/api/drafts/:id` | Update draft |
| POST | `/api/drafts/:id/create-gmail-draft` | Push to Gmail |
| POST | `/api/drafts/:id/create-outlook-draft` | Push to Outlook |

### Calendar
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calendar/events` | List events |
| POST | `/api/calendar/events` | Create event |
| PATCH | `/api/calendar/events/:id` | Update event |
| DELETE | `/api/calendar/events/:id` | Delete event |
| POST | `/api/sync` | Trigger calendar sync |
| GET | `/api/free-busy` | Check availability |

### OAuth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/oauth/google/start` | Start Google OAuth |
| GET | `/api/oauth/google/callback` | Google OAuth callback |
| GET | `/api/oauth/microsoft/start` | Start Microsoft OAuth |
| GET | `/api/oauth/microsoft/callback` | Microsoft OAuth callback |

### Notes (`/api/notes/*` via `server/notes-routes.ts`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | List all notes |
| GET | `/api/notes/feed` | Notes activity feed |
| GET | `/api/notes/search` | Search notes |
| GET | `/api/notes/prompts/daily` | Daily writing prompts |
| GET | `/api/notes/tags` | List note tags |
| POST | `/api/notes/tags` | Create note tag |
| GET | `/api/notes/:id` | Get note |
| POST | `/api/notes` | Create note |
| POST | `/api/notes/:id/tags/:tagId` | Tag a note |
| POST | `/api/notes/:id/links/:targetId` | Link two notes |
| GET | `/api/notes/:id/attachments` | List note attachments |
| POST | `/api/notes/:id/attachments` | Upload note attachment |

### Voice Commands
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/voice-commands` | List available voice commands |
| POST | `/api/voice-command` | Process voice audio command |
| POST | `/api/voice-command/text` | Process text command |

### Projects & Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| POST | `/api/tasks/parse` | Parse natural language into task |
| PUT | `/api/tasks/:id` | Update task |
| POST | `/api/tasks/:id/complete` | Toggle task completion |
| DELETE | `/api/tasks/:id` | Delete task |

### Actioned & Deleted
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/actioned` | List completed/actioned items |
| GET | `/api/deleted` | List soft-deleted items |
| POST | `/api/deleted/:type/:id/restore` | Restore a deleted item |
| DELETE | `/api/deleted/:type/:id/permanent` | Permanently delete |

### Tags, Locations, Attachments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/tags` | Global tags |
| GET/POST | `/api/locations` | User locations |
| GET/POST/DELETE | `/api/attachments` | Task attachments |

### Billing (`server/routes/billing.ts`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/create-checkout-session` | Create Stripe checkout session |
| POST | `/api/create-portal-session` | Create Stripe customer portal |

---

## 7. Frontend Architecture

### Routing (Wouter)

All routes defined in `client/src/App.tsx`:

| Route | Page | Auth Required |
|-------|------|:---:|
| `/` | Landing | No |
| `/login` | Auth | No |
| `/privacy-policy` | Privacy | No |
| `/terms` | Terms | No |
| `/support` | Support | No |
| `/about` | About | No |
| `/guide` | Guide | No |
| `/app/onboarding` | Onboarding | Yes |
| `/app/inbox` | Inbox | Yes |
| `/app/meetings` | Meetings | Yes |
| `/app/capture` | Capture | Yes |
| `/app/meeting/:id` | Meeting Detail | Yes |
| `/app/drafts` | Drafts | Yes |
| `/app/settings` | Settings | Yes |
| `/app/journal` | Journal | Yes |
| `/app/reminders` | Reminders | Yes |
| `/app/calendar` | Calendar | Yes |
| `/app/transcripts` | Transcripts | Yes |
| `/app/tasks` | Tasks | Yes |
| `/app/notes` | Notes | Yes |
| `/app/lists/:id` | Custom List | Yes |
| `/app/action/:type/:id` | Task Detail | Yes |
| `/app/actioned` | Actioned Items | Yes |
| `/app/deleted` | Deleted Items | Yes |
| `/app/agenda` | Agenda | Yes |

### State Management

- **Zustand** (`lib/store.ts`) — Global state for user data, sidebar state
- **React Query** — Server state with automatic caching, refetching, and invalidation
- **React Query keys** — `["meetings"]`, `["reminders"]`, `["actions"]`, `["custom-lists"]`, `["custom-list", id]`, `["item-list", type, id]`, `["inbox-items"]`, `["user-plan"]`

### Code Splitting

All pages use `React.lazy()` with `Suspense`:
```tsx
const InboxPage = React.lazy(() => import("@/pages/inbox"));
// Wrapped in <Suspense fallback={<PageLoader />}>
```

### Page Transitions

CSS fade-in animation on route changes:
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.page-enter { animation: fadeIn 0.15s ease-out; }
```
Applied via `ProtectedRoute` wrapper keyed to `location` pathname.

---

## 8. AI Services

### Meeting Extraction (`server/ai-service.ts`)

Processes meeting notes and returns structured JSON:
- **Summary** — Concise meeting overview
- **Action Items** — Tasks with assignee, due date, priority, confidence scores
- **Decisions** — Key decisions made
- **Risks** — Identified risks with severity
- **Clarifying Questions** — Items needing follow-up

### Transcript Summarization (`server/summarization-service.ts`)

18 templates across 6 categories:
- Generates formatted summaries from transcript text
- Persisted in `transcript_summaries` table with `promptVersion: template:${templateId}`
- Supports Export PDF, Print, Copy actions

### Journal Analysis

- AI prompts for guided reflection
- Signal detection (overwhelm, deadlines, conflict, decisions, avoidance)
- Entry analysis for patterns and insights

### Draft Generation

- Auto-generates follow-up emails per attendee
- Includes relevant action items and decisions
- Respects user's preferred communication tone

### Providers

- **OpenAI** — Primary for text-based AI (extraction, drafts, analysis)
- **Gemini** — Audio transcription
- **OpenAI Whisper** — Alternative audio transcription

---

## 9. Theme System

### Architecture

```
themes.css (CSS variables)
  └── html[data-theme="aurora"] { --primary: ...; }
  └── html[data-theme="aurora"].light { --primary: ...; }

demo-utilities.css (reusable classes)
  └── .navItem, .shadow-token, .glass-panel, .pill-secondary

theme-types.ts (TypeScript config)
  └── ThemeId, Mode, ThemeConfig, THEMES array

theme.ts (init + apply functions)
  └── initTheme() — runs before React render in main.tsx
  └── applyTheme() — sets data-theme + class on <html>

useTheme.ts (Zustand store)
  └── { theme, mode, setTheme, setMode, toggleMode }
  └── Persists to localStorage

ThemeProvider.tsx (React component)
  └── Calls applyTheme() on theme/mode change
```

### Rules

- All UI uses semantic CSS tokens exclusively (`--primary`, `--background`, `--foreground`, etc.)
- Zero hardcoded `slate-*` / `white` / `black` in global UI
- Pill classes use `color-mix()` with CSS variables for transparency
- Per-theme typography: Aurora/Paper/Grid use one font family, Clay/Terminal use another

---

## 10. Calendar Integration

### Adapters

Two adapters in `server/calendar-adapters.ts`:

- **GoogleCalendarAdapter** — Uses Google Calendar API v3
- **OutlookCalendarAdapter** — Uses Microsoft Graph API

### OAuth Flow

1. User clicks "Connect" in Settings
2. Redirect to provider's OAuth consent screen
3. Callback stores tokens in `oauth_connections` table
4. Tokens auto-refresh when expired

### Sync

- **Pull sync** — `POST /api/sync` fetches events from connected calendars
- **Push sync** — Local event changes pushed to connected calendars
- **Webhook sync** — Real-time updates via webhook subscriptions (when available)
- **Delta sync** — Uses sync tokens / delta links for efficient incremental updates

### Events

The `calendar_events` table supports:
- Multiple providers (google, microsoft, local)
- All-day events
- Recurrence rules (RRULE format)
- Color coding
- Status (confirmed, tentative, cancelled)

---

## 11. Subscription & Billing

### Stripe Integration

- **Stripe SDK** — Server-side payment processing
- **Pricing** — Geo-aware pricing (USD vs EUR)
- **Price IDs** — Stored as environment secrets (STRIPE_PRO_MONTHLY_PRICE_ID, etc.)
- **Webhook** — Handles subscription lifecycle events
- **Customer sync** — `stripeCustomerId` and `stripeSubscriptionId` stored on user record

### Plan Checking

Frontend: `usePlan()` hook in `client/src/hooks/use-plan.ts`
Backend: `GET /api/users/me/plan` returns plan info, usage, and capabilities

### Usage Tracking

Monthly tracking in `usage_tracking` table for:
- AI extraction count
- Transcription minutes
- Reset monthly

---

## 12. Feature Links & Data Flow

### Existing Cross-Feature Links

| From | To | Link Type |
|------|----|-----------|
| Meeting → Action Items | 1:N | `action_items.meetingId` FK |
| Meeting → Decisions | 1:N | `decisions.meetingId` FK |
| Meeting → Risks | 1:N | `risks.meetingId` FK |
| Meeting → Drafts | 1:N | `follow_up_drafts.meetingId` FK |
| Meeting → Transcripts | 1:N | `transcripts.meetingId` FK |
| Meeting → Attendees | 1:N | `attendees.meetingId` FK |
| Transcript → Summaries | 1:N | `transcript_summaries.transcriptId` FK |
| Action Item → Custom List | via `custom_list_items.actionItemId` |
| Reminder → Custom List | via `custom_list_items.reminderId` |
| Task → Custom List | via `custom_list_items.taskId` |
| Note → Tags | M:N | via `note_tag_map` junction table |
| Note → Notes | M:N | via `note_links` (bi-directional) |
| Note → Attachments | 1:N | `note_attachments.noteId` FK |
| Task → Attachments | 1:N | `task_attachments` |
| User → OAuth | 1:N | `oauth_connections.userId` FK |
| OAuth → Calendar Events | 1:N | via `connectionId` FK |
| User → Usage Tracking | 1:N | monthly records |
| Extraction Page → Source Card | Shows linked transcripts + meeting notes |
| Action Detail → Back Link | Dynamic: remembers source (list, inbox, meeting) |
| Action Detail → List Pill | Shows current list assignment |

### Data Flow: Meeting Capture → Action Items

```
User types/records/uploads notes
  → POST /api/meetings (create meeting)
  → POST /api/meetings/:id/extract (AI extraction)
  → AI returns { summary, actions, decisions, risks, questions }
  → Each action item → INSERT into action_items
  → Each decision → INSERT into decisions
  → Each risk → INSERT into risks
  → Optional: POST /api/meetings/:id/generate-drafts
  → Drafts INSERT into follow_up_drafts
  → Action items appear in Inbox
  → User can move action items to custom lists
```

### Data Flow: Quick Add

```
User presses Q or clicks lightning bolt
  → Fills form (title, due date, priority, destination)
  → Based on destination:
    → "inbox" or "reminders" → POST /api/personal/reminders
    → "meetings" → POST /api/meetings
    → Custom list ID → POST /api/personal/reminders + POST /api/lists/:id/items
```

---

## 13. Missing Links & Gaps

### Broken or Incomplete Connections

| Gap | Description | Impact |
|-----|-------------|--------|
| **Notes ↔ Meetings** | No way to link a note to a meeting | Users can't reference their notes from meeting pages or vice versa |
| **Notes ↔ Action Items** | No way to link a note to a specific action item | Can't attach context notes to tasks |
| **Journal ↔ Action Items** | Journal entries can't reference tasks | Can't reflect on specific work items |
| **Calendar ↔ Meetings** | Calendar events don't automatically link to meeting records | Must manually capture meetings that appear on calendar |
| **Transcripts ↔ Notes** | Transcripts don't link to Notes module | Can't cross-reference spoken content with written notes |
| **Reminders ↔ Calendar** | Reminders with due dates don't show on calendar | Tasks and schedule are disconnected |
| **Action Items ↔ Tasks** | Action items (from meetings) and tasks (general) are separate tables | Duplicated functionality, items can't be unified |
| **Workspace ↔ Everything** | Workspace tables exist but UI routes are not active | Team features scaffolded but not connected |
| **Chat ↔ Everything** | Chat tables (`conversations`, `messages`) exist but no UI | Chat scaffolded but not implemented |

### Missing UI Connections

| Area | Gap |
|------|-----|
| **Agenda page** | Route exists but unclear relationship to Calendar and Reminders |
| **Tasks page** | Separate from Reminders; items don't appear in Inbox filter |
| **Deleted page** | May not show deleted action items (only reminders with `deletedAt`) |
| **Actioned page** | May not show completed action items alongside completed reminders |
| **Search** | No global search across meetings, notes, reminders, and action items |
| **Notifications** | No in-app notification system for due dates, reminders, or calendar events |
| **Breadcrumbs** | Limited navigation context — only back links, no full breadcrumb trail |

### Data Model Gaps

| Gap | Description |
|-----|-------------|
| **No `deletedAt` on action_items** | Can't soft-delete meeting action items consistently |
| **No `completedAt` on action_items** | Can't track when actions were completed |
| **No unified task model** | `action_items`, `personal_reminders`, and `tasks` are three separate entities |
| **No activity log** | No user-facing history of changes (audit trail exists for AI only) |
| **No recurrence on action_items** | Recurring meeting actions not supported |
| **No notification preferences** | Users can't configure when/how to be notified |

---

## 14. Suggested Features

### Based on Industry Standards (Todoist, Notion, Fellow, Otter.ai, Fireflies.ai)

#### High Priority

| Feature | Description | Competitors |
|---------|-------------|-------------|
| **Global Search** | Search across all content types (meetings, notes, tasks, transcripts) | Notion, Todoist, Fellow |
| **Unified Task Model** | Merge action items, reminders, and tasks into one system | Todoist, Asana, ClickUp |
| **In-App Notifications** | Due date reminders, overdue alerts, meeting summaries | All major apps |
| **Drag & Drop** | Reorder tasks, move between lists, reorganize boards | Todoist, Trello, Notion |
| **Calendar-Task Integration** | Show tasks on calendar, create tasks from events | Google Tasks, Todoist |
| **Recurring Tasks** | Full recurrence support with completion tracking | Todoist, Things, TickTick |
| **Labels/Tags Filtering** | Filter inbox and lists by tags | Todoist, Notion |

#### Medium Priority

| Feature | Description | Competitors |
|---------|-------------|-------------|
| **Meeting-Calendar Link** | Auto-create meeting records from calendar events | Fellow, Fireflies.ai |
| **Real-time Collaboration** | Share meetings, action items with team members | Fellow, Notion |
| **Kanban Board View** | Visual board for tasks with customizable columns | Trello, Notion, Asana |
| **Weekly/Monthly Review** | AI-generated productivity reports and insights | Fellow, Todoist Karma |
| **Note Templates** | Pre-made templates for different note types | Notion, Bear, Obsidian |
| **File Attachments Everywhere** | Attach files to meetings, journal entries, list items | Notion, Asana |
| **Subtasks** | Break tasks into smaller steps with progress tracking | Todoist, Asana, ClickUp |
| **Task Dependencies** | Define which tasks block other tasks | Asana, Monday.com |
| **Focus/Pomodoro Mode** | Timer for focused work sessions | Forest, Focus@Will |
| **Email-to-Task** | Forward emails to create tasks automatically | Todoist, Asana |

#### Lower Priority / Nice-to-Have

| Feature | Description | Competitors |
|---------|-------------|-------------|
| **Mobile Push Notifications** | Native push for due dates and reminders | All mobile apps |
| **Zapier/Webhook Integration** | Connect with external tools and automation | Todoist, Notion, Asana |
| **API Keys for Users** | Let users build custom integrations | Notion, Todoist |
| **Offline Mode** | Work without internet, sync when reconnected | Todoist, Notion, Bear |
| **Data Import** | Import from Todoist, Notion, Asana, CSV | Most competitor apps |
| **Data Export** | Export all data as JSON, CSV, or Markdown | GDPR requirement |
| **Multi-Language AI** | AI extraction and summaries in multiple languages | Otter.ai, Fireflies |
| **Meeting Analytics** | Track meeting frequency, duration, action completion rates | Fellow, Fireflies.ai |
| **Habit Tracking** | Daily habit streaks alongside journal entries | Notion, Streaks, Habitica |
| **Smart Scheduling** | AI suggests optimal times based on calendar | Reclaim.ai, Clockwise |
| **Team Dashboard** | Overview of team's action items, meetings, progress | Fellow, Asana, Monday |
| **Voice Assistant** | "Hey ActionMinutes, add a task..." | Apple Reminders, Google Tasks |
| **Browser Extension** | Capture notes from any webpage | Notion Web Clipper, Todoist |
| **Markdown Export** | Export notes and journal entries as Markdown files | Obsidian, Bear |
| **Graph View for Notes** | Visual knowledge graph of linked notes | Obsidian, Roam Research |
| **Auto-Tagging** | AI suggests tags based on content | Notion AI, Evernote |
| **Meeting Highlights Reel** | AI-curated key moments from long transcripts | Otter.ai, Fireflies.ai |
| **Agenda Builder** | Create meeting agendas with time allocation | Fellow |
| **Follow-Up Tracking** | Track if follow-up emails were opened/responded to | HubSpot, Mixmax |

---

*For user-facing documentation, see [USER_GUIDE.md](./USER_GUIDE.md).*
