// sections/components/schedule/autoScheduler.ts
// Pure logic — no UI, no Supabase. Testable in isolation.

import type { ScheduleRow } from "./types"

export const ROOMS = [
  "Comlab 1",
  "Comlab 2",
  "Library",
  "Science Lab",
  "Room 201",
  "Room 301",
  "Room 302",
  "Room 303",
  "Room 401",
  "Room 402",
] as const

export const DURATION_OPTIONS = [
  { label: "30 min",    value: 30  },
  { label: "1 hour",    value: 60  },
  { label: "1.5 hours", value: 90  },
  { label: "2 hours",   value: 120 },
  { label: "2.5 hours", value: 150 },
  { label: "3 hours",   value: 180 },
  { label: "3.5 hours", value: 210 },
  { label: "4 hours",   value: 240 },
  { label: "4.5 hours", value: 270 },
  { label: "5 hours",   value: 300 },
] as const

/**
 * How many times per week a subject should appear.
 * "ONCE"  → 1 slot/week (default — no repeats)
 * "TWICE" → 2 slots/week on different days
 * "THRICE"→ 3 slots/week on different days
 * A subject is NEVER placed twice on the same day.
 */
export type RepetitionMode = "ONCE" | "TWICE" | "THRICE" | "FOUR" | "FIVE"
export type SpreadMode     = "MON_FRI" | "MON_SAT"

export interface SubjectInput {
  id:              string
  subject:         string
  room:            string
  teacher?:        string | null
  duration:        number       // minutes
  preferred_shift: "AM" | "PM"
  repetition:      RepetitionMode
  is_online?:      boolean
  gclass_link?:    string | null
}

export interface AutoScheduleConfig {
  sectionName:       string
  schoolYear:        string
  subjects:          SubjectInput[]
  spreadMode:        SpreadMode
  schoolDayStart:    string   // "07:00"
  schoolDayEnd:      string   // "18:00"
  lunchStart:        string   // "12:00"
  lunchEnd:          string   // "13:00"
  existingSchedules: ScheduleRow[]
}

export interface ConflictItem {
  type:          "ROOM" | "TEACHER" | "SECTION"
  subject:       string
  conflictsWith: string
  section:       string
  day:           string
  time:          string
  detail:        string
}

export interface AutoScheduleResult {
  rows:      Omit<ScheduleRow, "id" | "created_at">[]
  conflicts: ConflictItem[]
  warnings:  string[]
}

// ── Time utils ────────────────────────────────────────────────────────────────
export function toMins(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number)
  return h * 60 + m
}
export function toTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`
}
/**
 * Returns true if [s1, e1) and [s2, e2) overlap.
 * Touching boundaries (e.g. 08:00-09:00 and 09:00-10:00) do NOT overlap.
 */
export function overlaps(s1: number, e1: number, s2: number, e2: number): boolean {
  return s1 < e2 && e1 > s2
}
export function formatAMPM(t: string): string {
  const [h, m] = t.slice(0, 5).split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`
}

// ── Majority shift from students array ────────────────────────────────────────
export function getMajorityShift(
  students: { preferred_shift?: string | null }[]
): "AM" | "PM" {
  let am = 0, pm = 0
  for (const s of students) {
    const shift = s.preferred_shift?.toUpperCase()
    if (shift === "AM") am++
    else if (shift === "PM") pm++
  }
  return pm > am ? "PM" : "AM"
}

// ── Core conflict validator ────────────────────────────────────────────────────
/**
 * Validates a single candidate slot against a pool of existing rows.
 *
 * Enforces all three hard scheduling rules:
 *   SECTION — same section + same day + overlapping time
 *   TEACHER — same teacher + same day + overlapping time
 *   ROOM    — same room + same day + overlapping time
 */
export function validateSlot(
  candidate: Omit<ScheduleRow, "id" | "created_at">,
  existing: (ScheduleRow | Omit<ScheduleRow, "id" | "created_at">)[],
  skipId?: string
): ConflictItem[] {
  const conflicts: ConflictItem[] = []
  const seen = new Set<string>()

  const cS   = toMins(candidate.start_time)
  const cE   = toMins(candidate.end_time)
  const time = `${formatAMPM(candidate.start_time)} – ${formatAMPM(candidate.end_time)}`

  const add = (c: ConflictItem, key: string) => {
    if (!seen.has(key)) { seen.add(key); conflicts.push(c) }
  }

  for (const ex of existing) {
    if ("id" in ex && skipId && ex.id === skipId) continue
    if (ex.day !== candidate.day) continue

    const eS = toMins(ex.start_time)
    const eE = toMins(ex.end_time)
    if (!overlaps(cS, cE, eS, eE)) continue

    // ── SECTION RULE ─────────────────────────────────────────────────────────
    if (ex.section === candidate.section) {
      if (ex.subject !== candidate.subject) {
        add({
          type:          "SECTION",
          subject:       candidate.subject,
          conflictsWith: ex.subject,
          section:       candidate.section,
          day:           candidate.day,
          time,
          detail: `"${candidate.subject}" overlaps with "${ex.subject}" for ${candidate.section} on ${candidate.day} (${time}).`,
        }, `section:${candidate.section}:${candidate.day}:${Math.min(cS, eS)}`)
      }
    }

    // ── TEACHER RULE ─────────────────────────────────────────────────────────
    if (
      candidate.teacher?.trim() &&
      ex.teacher?.trim() &&
      candidate.teacher.trim().toLowerCase() === ex.teacher.trim().toLowerCase() &&
      !(ex.section === candidate.section && ex.subject === candidate.subject)
    ) {
      add({
        type:          "TEACHER",
        subject:       candidate.subject,
        conflictsWith: ex.subject,
        section:       ex.section,
        day:           candidate.day,
        time,
        detail: `"${candidate.teacher}" is already teaching "${ex.subject}" (${ex.section}) on ${candidate.day} at ${time}.`,
      }, `teacher:${candidate.teacher.trim().toLowerCase()}:${candidate.day}:${cS}`)
    }

    // ── ROOM RULE ─────────────────────────────────────────────────────────────
    // Skip room conflict entirely when either side is an online class
    if (
      !(candidate as any).is_online &&
      !(ex as any).is_online &&
      candidate.room?.trim() &&
      ex.room?.trim() &&
      candidate.room.trim().toLowerCase() === ex.room.trim().toLowerCase() &&
      !(ex.section === candidate.section && ex.subject === candidate.subject)
    ) {
      add({
        type:          "ROOM",
        subject:       candidate.subject,
        conflictsWith: ex.subject,
        section:       ex.section,
        day:           candidate.day,
        time,
        detail: `"${candidate.room}" is already booked by "${ex.subject}" (${ex.section}) on ${candidate.day} at ${time}.`,
      }, `room:${candidate.room.trim().toLowerCase()}:${candidate.day}:${cS}`)
    }
  }

  return conflicts
}

// ── Batch conflict checker ───────────────────────────────────────────────────
export function checkConflicts(
  newRows: Omit<ScheduleRow, "id" | "created_at">[],
  existing: ScheduleRow[],
  _sectionName: string
): ConflictItem[] {
  const allConflicts: ConflictItem[] = []
  const seen = new Set<string>()

  const addAll = (items: ConflictItem[]) => {
    for (const c of items) {
      const key = `${c.type}:${c.subject}:${c.conflictsWith}:${c.section}:${c.day}:${c.time}`
      if (!seen.has(key)) { seen.add(key); allConflicts.push(c) }
    }
  }

  for (let i = 0; i < newRows.length; i++) {
    addAll(validateSlot(newRows[i], existing))
    const batchSoFar = newRows.slice(0, i)
    addAll(validateSlot(newRows[i], batchSoFar))
  }

  return allConflicts
}

// ── Repetition helpers ────────────────────────────────────────────────────────
export function repetitionCount(r: RepetitionMode): number {
  if (r === "TWICE")  return 2
  if (r === "THRICE") return 3
  if (r === "FOUR")   return 4
  if (r === "FIVE")   return 5
  return 1
}

export const REPETITION_OPTIONS: { label: string; value: RepetitionMode; description: string }[] = [
  { label: "Once",        value: "ONCE",   description: "1× per week" },
  { label: "Twice",       value: "TWICE",  description: "2× per week" },
  { label: "Three times", value: "THRICE", description: "3× per week" },
  { label: "Four times",  value: "FOUR",   description: "4× per week" },
  { label: "Five times",  value: "FIVE",   description: "5× per week" },
]

// ── Slot finder ───────────────────────────────────────────────────────────────
/**
 * Finds the earliest available start time on a day for a given duration,
 * starting from `fromMins`. Safely skips:
 *   - the lunch window
 *   - any already-occupied time blocks (section / room / teacher)
 *
 * Returns null if the school day ends before a slot can fit.
 */
function findNextSlot(
  fromMins:   number,
  duration:   number,
  lunchS:     number,
  lunchE:     number,
  dayEndMins: number,
  occupied:   { start: number; end: number }[]
): number | null {
  let cursor = fromMins

  for (let guard = 0; guard < 300; guard++) {
    if (cursor + duration > dayEndMins) return null

    const end = cursor + duration

    // Skip lunch window
    if (overlaps(cursor, end, lunchS, lunchE)) {
      cursor = lunchE
      continue
    }

    // Skip any colliding occupied block
    const hit = occupied.find(o => overlaps(cursor, end, o.start, o.end))
    if (hit) {
      cursor = hit.end
      continue
    }

    return cursor
  }

  return null
}

// ── Main generator ────────────────────────────────────────────────────────────
/**
 * Generates a conflict-free weekly schedule for a single section.
 *
 * KEY FIX: The `getOccupied` function now checks ALL three conflict rules
 * against BOTH existingSchedules (DB — all other sections) AND the rows
 * already generated in this batch. This ensures that when ICT 11-B tries
 * to place "Oral Communication" in Comlab 1 at 7:00 AM Monday (already taken
 * by ICT 11-A), the slot finder automatically shifts to the next free time
 * (e.g. 8:00 AM) rather than generating a conflict.
 */
export function generateSchedule(cfg: AutoScheduleConfig): AutoScheduleResult {
  const {
    sectionName, schoolYear, subjects, spreadMode,
    schoolDayStart, schoolDayEnd, lunchStart, lunchEnd,
    existingSchedules,
  } = cfg

  const DAYS = spreadMode === "MON_SAT"
    ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

  const dayStartMins = toMins(schoolDayStart)
  const dayEndMins   = toMins(schoolDayEnd)
  const lunchS       = toMins(lunchStart)
  const lunchE       = toMins(lunchEnd)

  const warnings: string[] = []
  const rows: Omit<ScheduleRow, "id" | "created_at">[] = []

  const daySubjectSet: Record<string, Set<string>> = {}
  for (const d of DAYS) daySubjectSet[d] = new Set()

  /**
   * Collects all time blocks occupied on a given day for a given room and
   * teacher — pulling from BOTH the existing DB schedules (all sections) AND
   * the rows already placed in this current generation batch.
   *
   * This is the critical fix: previously "rows" was cast to any[] which could
   * miss the room/teacher checks. Now ALL three rules are enforced consistently.
   */
  const getOccupied = (
    day:        string,
    room:       string | null | undefined,
    teacher:    string | null | undefined,
    section:    string,
    subj_is_online = false
  ): { start: number; end: number }[] => {
    const slots: { start: number; end: number }[] = []

    // Combine the DB pool and the already-generated rows in this batch
    const pool: (ScheduleRow | Omit<ScheduleRow, "id" | "created_at">)[] = [
      ...existingSchedules,
      ...rows,
    ]

    for (const ex of pool) {
      if (ex.day !== day) continue
      const eS = toMins(ex.start_time)
      const eE = toMins(ex.end_time)

      // SECTION RULE: this section's own classes block all its time
      if (ex.section === section) {
        slots.push({ start: eS, end: eE })
        continue
      }

      // ROOM RULE: same room used by ANY other section blocks this room
      // Skip when either the candidate or existing entry is an online class
      if (
        !subj_is_online &&
        !(ex as any).is_online &&
        room?.trim() &&
        ex.room?.trim() &&
        room.trim().toLowerCase() === ex.room.trim().toLowerCase()
      ) {
        slots.push({ start: eS, end: eE })
        continue
      }

      // TEACHER RULE: same teacher busy with another section
      if (
        teacher?.trim() &&
        ex.teacher?.trim() &&
        teacher.trim().toLowerCase() === ex.teacher.trim().toLowerCase()
      ) {
        slots.push({ start: eS, end: eE })
      }
    }

    return slots.sort((a, b) => a.start - b.start)
  }

  const placeOnDay = (subj: SubjectInput, day: string): boolean => {
    if (daySubjectSet[day].has(subj.subject)) return false

    const shiftStart = subj.preferred_shift === "AM" ? dayStartMins : lunchE
    const shiftEnd   = subj.preferred_shift === "AM" ? lunchS : dayEndMins

    // Get all occupied blocks for this room, teacher, and section on this day
    const occupied = getOccupied(day, subj.room, subj.teacher ?? null, sectionName, subj.is_online)

    const start = findNextSlot(shiftStart, subj.duration, lunchS, lunchE, shiftEnd, occupied)

    if (start === null) {
      // Try the OTHER shift if the preferred one is fully packed
      const altShiftStart = subj.preferred_shift === "AM" ? lunchE : dayStartMins
      const altShiftEnd   = subj.preferred_shift === "AM" ? dayEndMins : lunchS
      const altStart = findNextSlot(altShiftStart, subj.duration, lunchS, lunchE, altShiftEnd, occupied)

      if (altStart === null) {
        warnings.push(
          `"${subj.subject}" skipped on ${day} — no available slot ` +
          `(room, teacher, or section schedule is fully booked for the entire day).`
        )
        return false
      }

      // Placed in alternative shift — log as info, not a warning
      // (this is expected behaviour when the preferred shift is fully booked)

      const end = altStart + subj.duration
      rows.push({
        section:     sectionName,
        subject:     subj.subject,
        day,
        start_time:  toTime(altStart),
        end_time:    toTime(end),
        school_year: schoolYear,
        teacher:     subj.teacher?.trim() || null,
        room:        subj.is_online ? null : (subj.room?.trim() || null),
        notes:       null,
        is_online:   subj.is_online ?? false,
        gclass_link: subj.gclass_link ?? null,
      })
      daySubjectSet[day].add(subj.subject)
      return true
    }

    const end = start + subj.duration

    rows.push({
      section:     sectionName,
      subject:     subj.subject,
      day,
      start_time:  toTime(start),
      end_time:    toTime(end),
      school_year: schoolYear,
      teacher:     subj.teacher?.trim() || null,
      room:        subj.is_online ? null : (subj.room?.trim() || null),
      notes:       null,
      is_online:   subj.is_online ?? false,
      gclass_link: subj.gclass_link ?? null,
    })

    daySubjectSet[day].add(subj.subject)
    return true
  }

  const assignDays = (subj: SubjectInput, startDayIdx: number): number => {
    const needed   = Math.min(repetitionCount(subj.repetition), DAYS.length)
    let placed     = 0
    let idx        = startDayIdx
    let iterations = 0

    while (placed < needed && iterations < DAYS.length * 3) {
      const day = DAYS[idx % DAYS.length]
      if (!daySubjectSet[day].has(subj.subject)) {
        if (placeOnDay(subj, day)) placed++
      }
      idx++
      iterations++
    }

    if (placed === 0) {
      warnings.push(`"${subj.subject}" could not be scheduled — no slots available on any day.`)
    } else if (placed < needed) {
      warnings.push(`"${subj.subject}" scheduled ${placed}/${needed} time(s) — not enough slots remaining.`)
    }

    return idx
  }

  const distributeGroup = (group: SubjectInput[]) => {
    let dayIdx = 0
    for (const subj of group) dayIdx = assignDays(subj, dayIdx)
  }

  distributeGroup(subjects.filter(s => s.preferred_shift === "AM"))
  distributeGroup(subjects.filter(s => s.preferred_shift === "PM"))

  // Final safety-net: confirm the output is clean
  const conflicts = checkConflicts(rows, existingSchedules, sectionName)
  return { rows, conflicts, warnings }
}