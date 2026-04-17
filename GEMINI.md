# GEMINI.md - Enrollment System

This project is a comprehensive Enrollment Management System for ACLC NORTHBAY, built with a modern web stack including Next.js 16, React 19, and Supabase.

## Project Overview

- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase, Zustand, shadcn/ui.
- **Purpose:** Manages the entire student enrollment lifecycle, from application to class scheduling and attendance tracking.
- **Portals:**
    - **Student:** Multi-step enrollment wizard, application status lookup.
    - **Admin:** Dashboard, applicant review, student management, sectioning, scheduling, analytics, and settings.
    - **Teacher:** Attendance tracking (QR code), schedule viewing, class reports, and announcements.

## Building and Running

### Key Commands
- `npm run dev`: Starts the development server.
- `npm run build`: Generates the production build (Note: TypeScript errors are ignored in `next.config.ts` due to Deno Edge Function types).
- `npm run start`: Serves the production build.
- `npm run lint`: Runs ESLint for code quality checks.

### Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase connection.
- `SUPABASE_SERVICE_ROLE_KEY`: For administrative bypass of RLS.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile protection.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`: For login rate limiting.

## Development Conventions

- **Path Aliases:** `@/*` maps to `src/*`.
- **Server Actions:** All database mutations are handled via Next.js Server Actions located in `src/lib/actions/`.
- **Database Clients:**
    - `createClient()`: standard cookie-based client (respects RLS).
    - `createAdminClient()`: uses service role key (bypasses RLS).
- **State Management:**
    - `useEnrollmentStore`: Handles multi-step form state.
    - `useThemeStore`: Manages dark/light mode.
- **Theme Implementation:** Theme is bootstrapped via a blocking inline script in `src/app/layout.tsx` to prevent flash-of-wrong-theme.
- **File Organization:** Feature-specific hooks and components are often co-located with their respective page routes (e.g., `src/app/admin/applicants/hooks/`).

## Architecture & Data Flow

- **Enrollment Wizard:** A 5-step process (Identity -> Academic -> Family -> Documents -> Review) persisting state in Zustand before final submission.
- **Realtime:** Real-time metrics and attendance sync via Supabase Realtime.
- **Authentication:** Admin and Teacher portals are protected by Supabase session cookies via middleware in `src/middleware.ts`.
- **Rate Limiting:** Login routes are rate-limited using Upstash Redis.
- **Document Generation:** `docxtemplater` for DOCX and `xlsx` for Excel exports.

## Key Directories

- `src/app/`: App Router pages and layouts.
- `src/components/`: UI primitives (shadcn) and shared components.
- `src/hooks/`: Global and feature-specific custom hooks.
- `src/lib/`: Core logic, including server actions, Supabase configuration, and validators.
- `src/store/`: Zustand state definitions.
- `supabase/`: Database functions and configurations.
