// sections/hooks/useSchedule.ts

import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import { toast } from "sonner"
import type { ScheduleRow, ScheduleImportRow } from "../components/schedule/types"
import { validateSlot, checkConflicts } from "../components/schedule/autoScheduler"

interface UseScheduleOptions {
  sectionName: string | null
  schoolYear:  string
}

export function useSchedule({ sectionName, schoolYear }: UseScheduleOptions) {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [loading,   setLoading]   = useState(false)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchSchedules = useCallback(async (isBackground = false) => {

    if (!sectionName) { setSchedules([]); return }
    if (!isBackground) setLoading(true)
    try {
      const { data, error } = await supabase
        .from("schedules")
        .select("*, rooms(name)")
        .eq("section", sectionName)
        .order("day")
        .order("start_time")
      if (error) throw error
      const mapped = (data ?? []).map((r: any) => ({
        ...r,
        room: r.rooms?.name || r.room
      }))
      setSchedules(mapped)
    } catch (err: any) {
      if (!isBackground) toast.error("Failed to load schedule")
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, [sectionName])

  useEffect(() => { fetchSchedules() }, [fetchSchedules])

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sectionName) return
    // FIXED: Add a random tab-unique suffix so two browser tabs on the same
    // section name don't share a channel and accidentally trigger each other.
    const tabId = Math.random().toString(36).slice(2, 8)
    const channel = supabase
      .channel(`schedules_${sectionName}_${tabId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" },
        () => fetchSchedules(true))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sectionName, fetchSchedules])

  // ── Shared: fetch ALL schedules for cross-section conflict checking ────────
  const fetchAllSchedules = useCallback(async (): Promise<ScheduleRow[]> => {
    const { data, error } = await supabase.from("schedules").select("*, rooms(name)")
    if (error) throw error
    return (data ?? []).map((r: any) => ({
      ...r,
      room: r.rooms?.name || r.room
    }))
  }, [])

  // ── Add single entry ──────────────────────────────────────────────────────
  /**
   * Before inserting, fetches ALL schedules from the DB and runs validateSlot()
   * to enforce the three hard rules:
   *   • Section  — this section can't have two classes at the same time
   *   • Teacher  — a teacher can't teach two classes at the same time
   *   • Room     — a room can't host two classes at the same time
   *
   * HARD BLOCKS on any conflict — nothing is saved if conflicts exist.
   */
  const addEntry = useCallback(async (
    data: Omit<ScheduleRow, "id" | "created_at"> & { room_id?: string | null }
  ) => {
    if (data.start_time >= data.end_time) {
      const msg = "End time must be after start time."
      toast.error(msg)
      throw new Error(msg)
    }

    const allRows  = await fetchAllSchedules()
    const conflicts = validateSlot(data, allRows)

    if (conflicts.length > 0) {
      // BLOCK — show each conflict and throw so the form stays open
      conflicts.forEach(c => toast.error(c.detail, { duration: 6000 }))
      throw new Error("Schedule conflict detected — entry not saved.")
    }

    if (!data.is_online) {
      const { data: dbRooms } = await supabase.from("rooms").select("id, name")
      const rMap = (dbRooms || []).reduce((acc: any, r: any) => ({ ...acc, [r.name]: r.id }), {})
      if (data.room && rMap[data.room]) data.room_id = rMap[data.room]
    }

    const { error } = await supabase.from("schedules").insert([data])
    if (error) { toast.error(error.message); throw error }
    toast.success(`Added: ${data.subject} on ${data.day}`)
    await fetchSchedules(true)
  }, [fetchSchedules, fetchAllSchedules])

  // ── Update single entry ───────────────────────────────────────────────────
  /**
   * Same hard-block conflict check as addEntry — passes skipId so the entry
   * being edited is excluded from the check (it won't conflict with itself).
   */
  const updateEntry = useCallback(async (
    id: string,
    data: Omit<ScheduleRow, "id" | "created_at"> & { room_id?: string | null }
  ) => {
    if (data.start_time >= data.end_time) {
      const msg = "End time must be after start time."
      toast.error(msg)
      throw new Error(msg)
    }

    const allRows  = await fetchAllSchedules()
    const conflicts = validateSlot(data, allRows, id)

    if (conflicts.length > 0) {
      // BLOCK — show each conflict and throw so the form stays open
      conflicts.forEach(c => toast.error(c.detail, { duration: 6000 }))
      throw new Error("Schedule conflict detected — entry not saved.")
    }

    if (!data.is_online) {
      const { data: dbRooms } = await supabase.from("rooms").select("id, name")
      const rMap = (dbRooms || []).reduce((acc: any, r: any) => ({ ...acc, [r.name]: r.id }), {})
      if (data.room && rMap[data.room]) data.room_id = rMap[data.room]
    } else {
      data.room_id = null
      data.room = null
    }

    const { error } = await supabase.from("schedules").update(data).eq("id", id)
    if (error) { toast.error(error.message); throw error }
    toast.success(`Updated: ${data.subject}`)
    await fetchSchedules(true)
  }, [fetchSchedules, fetchAllSchedules])

  // ── Delete single entry ───────────────────────────────────────────────────
  const deleteEntry = useCallback(async (id: string, label: string) => {
    const { error } = await supabase.from("schedules").delete().eq("id", id)
    if (error) { toast.error(error.message); throw error }
    toast.success(`Removed: ${label}`)
    setSchedules(prev => prev.filter(s => s.id !== id))
  }, [])

  // ── Bulk import (replace all for this section) ────────────────────────────
  /**
   * Validates all rows before saving — hard blocks if ANY conflict found.
   * Cross-checks:
   *   1. Internal duplicates within the import batch
   *   2. Conflicts against OTHER sections' existing schedules in the DB
   */
  const importSchedules = useCallback(async (rows: ScheduleImportRow[]) => {
    if (!sectionName) return
    const toastId = toast.loading("Validating schedule…")

    try {
      const { data: othersData, error: othersErr } = await supabase
        .from("schedules")
        .select("*, rooms(name)")
        .neq("section", sectionName)
      if (othersErr) throw othersErr

      const otherSchedules: ScheduleRow[] = (othersData ?? []).map((r: any) => ({
        ...r,
        room: r.rooms?.name || r.room
      }))

      const { data: dbRooms } = await supabase.from("rooms").select("id, name")
      const rMap = (dbRooms || []).reduce((acc: any, r: any) => ({ ...acc, [r.name]: r.id }), {})

      const inserts = rows.map(r => ({
        section:     sectionName,
        subject:     r.subject,
        day:         r.day,
        start_time:  r.start_time,
        end_time:    r.end_time,
        school_year: r.school_year,
        teacher:     r.teacher    ?? null,
        room:        r.is_online  ? null : (r.room ?? null),
        room_id:     r.is_online  ? null : (r.room ? rMap[r.room] : null),
        notes:       r.notes      ?? null,
        is_online:   r.is_online  ?? false,
        gclass_link: r.gclass_link ?? null,
      }))

      const conflicts = checkConflicts(inserts, otherSchedules, sectionName)

      if (conflicts.length > 0) {
        // HARD BLOCK — abort the import entirely
        toast.error(
          `Import blocked: ${conflicts.length} conflict${conflicts.length !== 1 ? "s" : ""} found.`,
          { id: toastId, duration: 5000 }
        )
        conflicts.slice(0, 5).forEach(c =>
          toast.error(c.detail, { duration: 7000 })
        )
        throw new Error("Import blocked due to conflicts.")
      }

      toast.loading("Importing schedule…", { id: toastId })

      const { error: delErr } = await supabase
        .from("schedules").delete().eq("section", sectionName)
      if (delErr) throw delErr

      const { error: insErr } = await supabase.from("schedules").insert(inserts)
      if (insErr) throw insErr

      toast.success(`Imported ${inserts.length} entries`, { id: toastId })
      await fetchSchedules()
    } catch (err: any) {
      if (!err.message?.includes("conflict") && !err.message?.includes("blocked")) {
        toast.error(err.message ?? "Import failed", { id: toastId })
      }
      throw err
    }
  }, [sectionName, fetchSchedules])

  // ── Additive import (auto-scheduler: only inserts missing subjects) ───────
  /**
   * Unlike importSchedules (which deletes then re-inserts), addSchedules ONLY
   * inserts rows for subjects that don't already have an entry on that day for
   * this section. Manually-placed rows are NEVER deleted.
   */
  const addSchedules = useCallback(async (rows: ScheduleImportRow[]) => {
    if (!sectionName) return
    const toastId = toast.loading("Adding schedule entries…")

    try {
      // 1. Fetch existing rows for THIS section
      const { data: existing, error: fetchErr } = await supabase
        .from("schedules")
        .select("subject, day")
        .eq("section", sectionName)
      if (fetchErr) throw fetchErr

      // 2. Build a set of already-placed subject|day combos
      const alreadyPlaced = new Set(
        (existing ?? []).map((r: any) => `${r.subject}|${r.day}`)
      )

      const { data: dbRooms } = await supabase.from("rooms").select("id, name")
      const rMap = (dbRooms || []).reduce((acc: any, r: any) => ({ ...acc, [r.name]: r.id }), {})

      // 3. Build insert list — skip any row whose subject+day already exists
      const inserts = rows
        .map(r => ({
          section:     sectionName,
          subject:     r.subject,
          day:         r.day,
          start_time:  r.start_time,
          end_time:    r.end_time,
          school_year: r.school_year,
          teacher:     r.teacher     ?? null,
          teacher_id:  (r as any).teacher_id ?? null,
          room:        (r as any).is_online ? null : (r.room ?? null),
          room_id:     (r as any).is_online ? null : (r.room ? rMap[r.room] : null),
          notes:       r.notes       ?? null,
          is_online:   (r as any).is_online  ?? false,
          gclass_link: (r as any).gclass_link ?? null,
        }))
        .filter(r => !alreadyPlaced.has(`${r.subject}|${r.day}`))

      if (inserts.length === 0) {
        toast.success("All subjects already scheduled — nothing to add.", { id: toastId })
        return
      }

      const { error: insErr } = await supabase.from("schedules").insert(inserts)
      if (insErr) throw insErr

      toast.success(`Added ${inserts.length} new entr${inserts.length !== 1 ? "ies" : "y"}`, { id: toastId })
      await fetchSchedules()
    } catch (err: any) {
      toast.error(err.message ?? "Add failed", { id: toastId })
      throw err
    }
  }, [sectionName, fetchSchedules])

  // ── Clear all ─────────────────────────────────────────────────────────────
  const clearSchedules = useCallback(async () => {
    if (!sectionName) return
    if (!confirm(`Delete ALL schedule entries for ${sectionName}? This cannot be undone.`)) return
    const toastId = toast.loading("Clearing schedule…")
    try {
      const { error } = await supabase.from("schedules").delete().eq("section", sectionName)
      if (error) throw error
      setSchedules([])
      toast.success("Schedule cleared", { id: toastId })
    } catch (err: any) {
      toast.error(err.message ?? "Clear failed", { id: toastId })
    }
  }, [sectionName])

  return {
    schedules,
    loading,
    fetchSchedules,
    addEntry,
    updateEntry,
    deleteEntry,
    importSchedules,
    addSchedules,
    clearSchedules,
  }
}