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
- **UI/UX Design:** Streamlined sidebar navigation providing access to all features.
- **Theme System:** Five distinct themes (Aurora, Studio Paper, Monochrome Grid, Warm Clay, Terminal Luxe), each supporting light and dark modes, totaling ten configurations. Themes are managed via CSS custom properties and a Zustand store for persistence.
- **Notes Module:** Features AES-256-GCM encryption for note content at rest, with searchable keyword indexing. Supports mood tracking, tags, bi-directional links, and attachments.
- **Calendar Synchronization:** Adapters for Google Calendar and Microsoft Outlook, supporting CRUD operations for events, real-time sync via webhooks, and free/busy queries.
- **AI Summarization Service:** Structured summarization of transcripts, extracting concise summaries, key decisions, actionable tasks (with assignees, due dates, priority), sentiment analysis, and keywords.
- **Voice Command Activation:** Speech-to-action interface for interacting with the summarization service.
- **Audio Transcription:** Multi-provider support (Gemini, OpenAI Whisper API) for speech-to-text, with transcript storage, full-text search, and export options.

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