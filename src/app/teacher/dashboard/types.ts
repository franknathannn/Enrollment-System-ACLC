// app/teacher/dashboard/types.ts

export interface TeacherSession {
  id: string
  full_name: string
  email: string
  avatar_url?: string | null
  gender?: string | null
}

export interface ScheduleRow {
  id: string
  section: string
  subject: string
  day: string
  start_time: string
  end_time: string
  school_year: string
  room?: string | null
  teacher?: string | null
  teacher_id?: string | null
  is_online?: boolean
  gclass_link?: string | null
}

export interface Student {
  id: string
  first_name: string
  last_name: string
  middle_name?: string | null
  lrn: string
  gender: string
  section: string
  strand?: string
  status: string
  profile_picture?: string | null
  two_by_two_url?: string | null
}

export interface Announcement {
  id: string
  title: string
  body: string
  posted_by: string
  target: string
  is_pinned: boolean
  created_at: string
}

export const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const
export type DayName = typeof ALL_DAYS[number]

export const COLORS = [
  { bg: "bg-blue-500/10",    border: "border-blue-500/20",    text: "text-blue-600 dark:text-blue-400",    dot: "bg-blue-500"    },
  { bg: "bg-violet-500/10",  border: "border-violet-500/20",  text: "text-violet-600 dark:text-violet-400",  dot: "bg-violet-500"  },
  { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-600 dark:text-amber-400",   dot: "bg-amber-500"   },
  { bg: "bg-rose-500/10",    border: "border-rose-500/20",    text: "text-rose-600 dark:text-rose-400",    dot: "bg-rose-500"    },
  { bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    text: "text-cyan-600 dark:text-cyan-400",    dot: "bg-cyan-500"    },
  { bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20", text: "text-fuchsia-600 dark:text-fuchsia-400", dot: "bg-fuchsia-500" },
  { bg: "bg-teal-500/10",    border: "border-teal-500/20",    text: "text-teal-600 dark:text-teal-400",    dot: "bg-teal-500"    },
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────
export function fmt(t: string): string {
  if (!t) return ""
  const [h, m] = t.slice(0, 5).split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

export function todayName(): DayName {
  const d = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()]
  return (ALL_DAYS.includes(d as DayName) ? d : "Monday") as DayName
}

export function timeAgo(ts: string): string {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

/** Resolves a student's photo URL — prefers two_by_two_url, falls back to profile_picture */
export function getStudentPhotoUrl(student: Student): string | null {
  return student.two_by_two_url || student.profile_picture || null
}