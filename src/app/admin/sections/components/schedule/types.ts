// sections/components/schedule/types.ts
// Shared types for the entire schedule feature

export interface ScheduleRow {
  id: string
  section: string        // matches sections.section_name
  subject: string
  day: string            // Monday | Tuesday | Wednesday | Thursday | Friday | Saturday
  start_time: string     // HH:MM:SS from Postgres
  end_time: string
  school_year: string
  teacher?: string | null
  room?: string | null
  notes?: string | null
  created_at?: string
}

// What comes out of the XLSX import (raw, before save)
export interface ScheduleImportRow {
  section: string
  subject: string
  day: string
  start_time: string     // user enters HH:MM
  end_time: string
  school_year: string
  teacher?: string
  room?: string
  room_id?: string
  notes?: string
  // validation
  _errors?: string[]
  _rowIndex?: number
}

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

export type DayType = (typeof DAYS)[number]

// Parse "HH:MM:SS" or "HH:MM" → "7:30 AM"
export function formatTime(t: string): string {
  if (!t) return ""
  const [h, m] = t.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`
}

// Validate a time string is HH:MM or HH:MM:SS
export function isValidTime(t: string): boolean {
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(t.trim())
}

// Validate a day string
export function isValidDay(d: string): boolean {
  return (DAYS as readonly string[]).includes(d.trim())
}

// Validate a school year string
export function isValidSchoolYear(sy: string): boolean {
  return /^\d{4}-\d{4}$/.test(sy.trim())
}
