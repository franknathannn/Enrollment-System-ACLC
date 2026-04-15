"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

async function chunkInsert(supabase: ReturnType<typeof createAdminClient>, table: string, rows: any[]) {
  const CHUNK = 200
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + CHUNK))
    if (error) throw new Error(`Insert into ${table} failed: ${error.message}`)
  }
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function createRestorePoint(name: string): Promise<{ success: boolean; error?: string }> {
  if (!name.trim()) return { success: false, error: "Snapshot name is required." }
  try {
    const supabase = createAdminClient()

    const [
      { data: students,     error: e1 },
      { data: sections,     error: e2 },
      { data: teachers,     error: e3 },
      { data: schedules,    error: e4 },
      { data: config,       error: e5 },
      { data: attendance,   error: e6 },
    ] = await Promise.all([
      supabase.from("students").select("*"),
      supabase.from("sections").select("*"),
      supabase.from("teachers").select("*"),
      supabase.from("schedules").select("*"),
      supabase.from("system_config").select("*"),
      supabase.from("attendance").select("*"),
    ])

    const firstErr = [e1, e2, e3, e4, e5, e6].find(Boolean)
    if (firstErr) return { success: false, error: `Read failed: ${firstErr.message}` }

    const { error: insertErr } = await supabase.from("demo_snapshots").insert({
      snapshot_name:    name.trim(),
      students_data:    students    ?? [],
      sections_data:    sections    ?? [],
      teachers_data:    teachers    ?? [],
      schedules_data:   schedules   ?? [],
      system_config_data: config    ?? [],
      attendance_data:  attendance  ?? [],
    })

    if (insertErr) return { success: false, error: insertErr.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Unknown error" }
  }
}

// ── List ──────────────────────────────────────────────────────────────────────
export async function listRestorePoints(): Promise<{
  id: string
  snapshot_name: string
  created_at: string
  students_count: number
  sections_count: number
  teachers_count: number
  schedules_count: number
  attendance_count: number
}[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("demo_snapshots")
      .select("id, snapshot_name, created_at, students_data, sections_data, teachers_data, schedules_data, attendance_data")
      .order("created_at", { ascending: false })
    if (error || !data) return []

    return data.map(r => ({
      id:               r.id,
      snapshot_name:    r.snapshot_name,
      created_at:       r.created_at,
      students_count:   Array.isArray(r.students_data)  ? r.students_data.length  : 0,
      sections_count:   Array.isArray(r.sections_data)  ? r.sections_data.length  : 0,
      teachers_count:   Array.isArray(r.teachers_data)  ? r.teachers_data.length  : 0,
      schedules_count:  Array.isArray(r.schedules_data) ? r.schedules_data.length : 0,
      attendance_count: Array.isArray(r.attendance_data) ? r.attendance_data.length : 0,
    }))
  } catch {
    return []
  }
}

// ── Restore ───────────────────────────────────────────────────────────────────
export async function restoreFromPoint(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()

    const { data: rp, error: rpErr } = await supabase
      .from("demo_snapshots")
      .select("students_data, sections_data, teachers_data, schedules_data, system_config_data, attendance_data")
      .eq("id", id)
      .single()

    if (rpErr || !rp) return { success: false, error: "Snapshot not found." }

    // Delete in dependency order (children first)
    const deleteOrder = ["attendance", "activity_logs", "schedules", "students", "sections", "teachers"]
    for (const table of deleteOrder) {
      const { error } = await supabase.from(table).delete().not("id", "is", null)
      if (error) return { success: false, error: `Failed to clear ${table}: ${error.message}` }
    }

    // Re-insert in dependency order (parents first)
    const insertPlan: [string, any[]][] = [
      ["teachers",   rp.teachers_data   ?? []],
      ["sections",   rp.sections_data   ?? []],
      ["students",   rp.students_data   ?? []],
      ["schedules",  rp.schedules_data  ?? []],
      ["attendance", rp.attendance_data ?? []],
    ]
    for (const [table, rows] of insertPlan) {
      if (rows.length > 0) await chunkInsert(supabase, table, rows)
    }

    // system_config is always a single row — upsert, never delete
    const cfgRows: any[] = rp.system_config_data ?? []
    if (cfgRows.length > 0) {
      const { error } = await supabase.from("system_config").upsert(cfgRows, { onConflict: "id" })
      if (error) return { success: false, error: `Failed to restore system_config: ${error.message}` }
    }

    revalidatePath("/admin", "layout")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Unknown error" }
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function deleteRestorePoint(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("demo_snapshots").delete().eq("id", id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Unknown error" }
  }
}
