# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Next.js)
npm run build     # Production build (TypeScript errors are ignored — see next.config.ts)
npm run lint      # Run ESLint
npm run start     # Serve production build
```

There are no automated tests in this project.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudflare Turnstile — bot protection on the enrollment form
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Upstash Redis — rate limiting on /admin/login and /teacher/login (optional; skipped if absent)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Architecture Overview

**Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase · Zustand · shadcn/ui

### Three Portals

| Portal | Routes | Auth |
|--------|--------|------|
| Student | `/`, `/enroll`, `/enroll/success`, `/status` | None |
| Admin | `/admin/*` | Supabase session cookie |
| Teacher | `/teacher/login`, `/teacher/dashboard` | Supabase session cookie |

### Data Layer

Most DB mutations go through **Next.js Server Actions** in `src/lib/actions/`. These files use `"use server"` and import from `src/lib/supabase/server.ts`. **Exception**: the Teachers and Communication admin pages call the Supabase client singleton directly (no server action) — they are the only admin features that do this.

Two Supabase clients exist:
- `createClient()` — cookie-based, respects RLS. Use for standard operations.
- `createAdminClient()` — service role key, **bypasses RLS**. Use only in trusted server actions that need unrestricted access (e.g. archiving, grade rollover).

Client-side realtime subscriptions use the singleton from `src/lib/supabase/client.ts`.

### State Management

Two Zustand stores in `src/store/`:
- `useEnrollmentStore` — persisted multi-step enrollment form state (steps 1–5, `EnrollmentData`)
- `useThemeStore` — dark/light mode, persisted to `localStorage` under key `aclc-theme`

Theme is bootstrapped via a blocking inline `<script>` in `layout.tsx` that reads `aclc-theme` before React hydrates, preventing flash-of-wrong-theme.

### Student Enrollment Flow

The enrollment form at `/enroll` is a 5-step wizard:
1. `Step1Identity` — personal info
2. `Step2Academic` — grade level, strand, last school
3. `Step3Family` — guardian info
4. `Step4Documents` — file uploads to Supabase Storage
5. `Step5Review` — final submission to `students` table

Whether the portal is open is controlled by `system_config` (single row): `is_portal_active`, `enrollment_start`, `enrollment_end`, `capacity`, `control_mode`. The gating logic lives in `src/lib/actions/settings.ts → getEnrollmentStatus()`.

### Admin Feature Pages

- **Dashboard** (`/admin/dashboard`) — live metrics via Supabase realtime + polling; Grade 11/12 toggle persisted to `localStorage`
- **Applicants** (`/admin/applicants`) — review pending applications; accept/reject; bulk actions
- **Enrolled** (`/admin/enrolled`) — manage accepted students; edit requests
- **Sections** (`/admin/sections`) — create sections, assign students, auto-scheduler, schedule grid
- **Teachers** (`/admin/teachers`) — teacher CRUD, schedule assignment, announcements
- **Schedules** (`/admin/schedules`) — strand/shift schedule grid view
- **Settings** (`/admin/settings`) — enrollment portal control, capacity, financial config, grade operations (rollover, archive)
- **Archive** (`/admin/archive`) — view/restore archived students by school year; graduate lock/unlock
- **Predictive Analytics** (`/admin/predictive-analytics`) — charts using Recharts; predictions powered by a pure-TypeScript 4-model ensemble in `src/lib/utils/ensemble.ts` (OLS, Recency-Weighted OLS, Polynomial, Exponential Smoothing)
- **Activity Logs** (`/admin/activity_logs`) — audit trail
- **Communication** (`/admin/communication`) — realtime announcement board backed by Supabase (not EmailJS)

### Key Directories

```
src/
  app/
    (student)/enroll/     # Student enrollment wizard
    admin/                # Admin portal pages + co-located components/hooks
    teacher/              # Teacher portal
    status/               # Student application status lookup
  components/
    forms/                # Step1–Step5 enrollment form components
    ui/                   # shadcn/ui primitives
    shared/               # ThemeProvider, ThemeApplier, mode-toggle
  hooks/                  # Global custom hooks (useTheme, use-realtime, etc.)
  lib/
    actions/              # All server actions (one file per domain)
    supabase/             # client.ts + server.ts
    utils/                # Field requirements, predictive data helpers
    validators/           # Zod-style enrollment validation
  store/                  # Zustand stores
```

### Path Alias

`@/*` resolves to `src/*`.

### Middleware (`src/middleware.ts`)

Matcher covers `/admin/:path*` and `/teacher/:path*`, but behaviors differ:
- **Auth guard** (redirect to `/admin/login`) applies to `/admin/*` routes only. `/teacher/*` routes are **not** auth-protected by middleware — teacher auth must be enforced at the page/component level.
- **Rate limiting** applies to both `/admin/login` and `/teacher/login`: 10 requests/minute per IP via Upstash Redis sliding window; returns HTTP 429 if exceeded. Silently skipped when Upstash env vars are absent.

### Teacher Dashboard

`/teacher/dashboard` is a tabbed interface with:
- **Schedule** — teacher's assigned periods
- **Attendance** — QR-code scanner (`jsqr`) for marking Present/Late/Absent/Excused; manual fallback; realtime sync via Supabase
- **Cutting Class Detector** — flags students with repeated absences
- **Student Detail** — per-student attendance breakdown
- **Reports** — exportable attendance reports
- **Announcements** — reads announcements posted from the admin portal
- **Academic Calendar** — shared calendar view

### Notable Patterns

- Feature hooks are co-located with their page under `hooks/` subdirectories (e.g. `src/app/admin/applicants/hooks/`).
- Document generation uses `docxtemplater` + `pizzip`; Excel export uses `xlsx`.
- `typescript.ignoreBuildErrors: true` is intentional — Supabase Deno edge function types would otherwise break the build.
- React Compiler is enabled (`reactCompiler: true` in `next.config.ts`).
- `src/lib/themeColors.ts` exports a `themeColors` token map consumed by components that apply theme colors imperatively (alongside `useThemeStore`).
