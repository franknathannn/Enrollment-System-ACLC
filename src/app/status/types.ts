// app/status/types.ts

export interface StudentRecord {
    id: string
    lrn: string
    first_name: string
    last_name: string
    middle_name?: string | null
    strand: string
    status: "Pending" | "Accepted" | "Approved" | "Rejected"
    section?: string | null
    school_year: string
    registrar_feedback?: string | null
    decline_reason?: string | null   // ← set by admin when approving/declining re-enrollment
    is_locked: boolean
    // personal
    gender?: string | null
    age?: number | null
    birth_date?: string | null
    civil_status?: string | null
    nationality?: string | null
    religion?: string | null
    address?: string | null
    email?: string | null
    phone?: string | null
    contact_no?: string | null
    // guardian
    guardian_first_name?: string | null
    guardian_last_name?: string | null
    guardian_phone?: string | null
    guardian_contact?: string | null
    // academic
    student_category?: string | null
    last_school_attended?: string | null
    gwa_grade_10?: number | null
    preferred_modality?: string | null
    preferred_shift?: string | null
    // photo
    profile_picture?: string | null
    two_by_two_url?: string | null
    // sections join
    sections?: { section_name: string } | null
  }
  
  export interface ScheduleRow {
    id: string
    section: string
    subject: string
    day: string
    start_time: string
    end_time: string
    school_year: string
    teacher?: string | null
    room?: string | null
  }
  
  export const ALL_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] as const
  export type DayName = typeof ALL_DAYS[number]
  
  export const SUBJ_COLORS = [
    { bg: "bg-blue-500/10",    border: "border-blue-500/20",    text: "text-blue-400",    dot: "bg-blue-500"    },
    { bg: "bg-violet-500/10",  border: "border-violet-500/20",  text: "text-violet-400",  dot: "bg-violet-500"  },
    { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-500" },
    { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400",   dot: "bg-amber-500"   },
    { bg: "bg-rose-500/10",    border: "border-rose-500/20",    text: "text-rose-400",    dot: "bg-rose-500"    },
    { bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    text: "text-cyan-400",    dot: "bg-cyan-500"    },
    { bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20", text: "text-fuchsia-400", dot: "bg-fuchsia-500" },
  ] as const
  
  export function fmt(t: string): string {
    if (!t) return ""
    const [h, m] = t.slice(0,5).split(":").map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`
  }
  
  export function todayDayName(): DayName {
    const d = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()]
    return (ALL_DAYS.includes(d as DayName) ? d : "Monday") as DayName
  }