// ─── Shared types for the schedules feature ──────────────────────────────────

/** Row from the `sections` table */
export interface SectionRow {
    id: string
    section_name: string
    strand: "ICT" | "GAS"
    capacity: number | null
    male_count: number | null
    female_count: number | null
    created_at: string | null
  }
  
  export interface ScheduleRow {
    id: string
    section: string
    subject: string
    day: string
    start_time: string  // "HH:MM" or "HH:MM:SS"
    end_time: string
    school_year: string
    teacher: string | null
    room: string | null
    notes: string | null
    teacher_id: string | null
  }
  
  export type StrandFilter = "BOTH" | "ICT" | "GAS"
  
  export const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] as const
  export type Day = typeof DAYS[number]
  export const DAY_SHORT: Record<Day, string> = {
    Monday:"MON", Tuesday:"TUE", Wednesday:"WED", Thursday:"THU", Friday:"FRI", Saturday:"SAT"
  }
  
  // Grid geometry
  export const SLOT_MINS = 30        // minutes per grid row
  export const SLOT_H    = 64        // px per 30-min row
  export const COL_W     = 200       // px per section column
  export const TIME_W    = 84        // px for the time-axis gutter
  export const ABS_START = 6  * 60  // 6:00 AM in minutes
  export const ABS_END   = 19 * 60  // 7:00 PM in minutes
  
  // Subject colour palette  (light + dark variants)
  // Inline-style palette — no Tailwind dark class dependency.
  // Each entry has light/dark as { bg, border, text } objects + dot hex.
  export const PALETTE = [
    { light:{ bg:"#f7fee7", border:"#bef264", text:"#14532d" }, dark:{ bg:"rgba(63,98,18,0.25)",  border:"rgba(132,204,22,0.40)",  text:"#bef264" }, dot:"#84cc16" },
    { light:{ bg:"#eff6ff", border:"#93c5fd", text:"#1e3a8a" }, dark:{ bg:"rgba(30,58,138,0.25)", border:"rgba(59,130,246,0.40)",  text:"#93c5fd" }, dot:"#3b82f6" },
    { light:{ bg:"#fdf2f8", border:"#f9a8d4", text:"#831843" }, dark:{ bg:"rgba(131,24,67,0.25)",  border:"rgba(236,72,153,0.40)",  text:"#f9a8d4" }, dot:"#ec4899" },
    { light:{ bg:"#ecfdf5", border:"#6ee7b7", text:"#064e3b" }, dark:{ bg:"rgba(6,78,59,0.25)",    border:"rgba(16,185,129,0.40)",  text:"#6ee7b7" }, dot:"#10b981" },
    { light:{ bg:"#f5f3ff", border:"#c4b5fd", text:"#4c1d95" }, dark:{ bg:"rgba(76,29,149,0.25)",  border:"rgba(139,92,246,0.40)",  text:"#c4b5fd" }, dot:"#8b5cf6" },
    { light:{ bg:"#fffbeb", border:"#fcd34d", text:"#78350f" }, dark:{ bg:"rgba(120,53,15,0.25)",  border:"rgba(245,158,11,0.40)",  text:"#fcd34d" }, dot:"#f59e0b" },
    { light:{ bg:"#ecfeff", border:"#67e8f9", text:"#164e63" }, dark:{ bg:"rgba(22,78,99,0.25)",   border:"rgba(6,182,212,0.40)",   text:"#67e8f9" }, dot:"#06b6d4" },
    { light:{ bg:"#fff1f2", border:"#fda4af", text:"#881337" }, dark:{ bg:"rgba(136,19,55,0.25)",  border:"rgba(244,63,94,0.40)",   text:"#fda4af" }, dot:"#f43f5e" },
    { light:{ bg:"#fff7ed", border:"#fdba74", text:"#7c2d12" }, dark:{ bg:"rgba(124,45,18,0.25)",  border:"rgba(249,115,22,0.40)",  text:"#fdba74" }, dot:"#f97316" },
    { light:{ bg:"#eef2ff", border:"#a5b4fc", text:"#312e81" }, dark:{ bg:"rgba(49,46,129,0.25)",  border:"rgba(99,102,241,0.40)",  text:"#a5b4fc" }, dot:"#6366f1" },
    { light:{ bg:"#f0fdfa", border:"#5eead4", text:"#134e4a" }, dark:{ bg:"rgba(19,78,74,0.25)",   border:"rgba(20,184,166,0.40)",  text:"#5eead4" }, dot:"#14b8a6" },
    { light:{ bg:"#fdf4ff", border:"#e879f9", text:"#701a75" }, dark:{ bg:"rgba(112,26,117,0.25)", border:"rgba(217,70,239,0.40)",  text:"#e879f9" }, dot:"#d946ef" },
  ] as const

  export function subjectPalette(subject: string) {
    let h = 0
    for (const c of subject) h = (h * 31 + c.charCodeAt(0)) & 0xffff
    return PALETTE[h % PALETTE.length]
  }
  
  // ── Time helpers ──────────────────────────────────────────────────────────────
  /** "HH:MM" or "HH:MM:SS" → total minutes */
  export const toMins = (t: string): number => {
    const [h, m] = t.split(":").map(Number)
    return h * 60 + m
  }
  
  /** total minutes → "H:MM AM/PM" */
  export const toDisp = (m: number): string => {
    const h = Math.floor(m / 60), mn = m % 60, ap = h >= 12 ? "PM" : "AM"
    return `${h % 12 || 12}:${String(mn).padStart(2, "0")} ${ap}`
  }
  
  /** total minutes → "HH:MM" (24h zero-padded) */
  export const toStr = (m: number): string =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
  
  export const snapSlot = (m: number): number => Math.round(m / SLOT_MINS) * SLOT_MINS
  
  /** Build array of {value, label} for time dropdowns */
  export function buildTimeOpts(start = ABS_START, end = ABS_END) {
    const opts: { value: string; label: string }[] = []
    for (let m = start; m <= end; m += SLOT_MINS)
      opts.push({ value: toStr(m), label: toDisp(m) })
    return opts
  }
  export const TIME_OPTS = buildTimeOpts()