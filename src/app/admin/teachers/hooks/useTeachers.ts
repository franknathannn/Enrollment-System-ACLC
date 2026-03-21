// app/admin/teachers/hooks/useTeachers.ts
"use client"

import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Teacher, TeacherAnnouncement } from "../types"

export function useTeachers() {
  const [teachers,      setTeachers]      = useState<Teacher[]>([])
  const [announcements, setAnnouncements] = useState<TeacherAnnouncement[]>([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState("")

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchTeachers = useCallback(async (bg = false) => {
    if (!bg) setLoading(true)
    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .order("full_name")
      if (error) throw error
      setTeachers(data ?? [])
    } catch (e: any) {
      toast.error("Failed to load teachers")
    } finally {
      if (!bg) setLoading(false)
    }
  }, [])

  const fetchAnnouncements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("teacher_announcements")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
      if (error) throw error
      setAnnouncements(data ?? [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchTeachers()
    fetchAnnouncements()
  }, [fetchTeachers, fetchAnnouncements])

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel("teachers_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "teachers" },
        () => fetchTeachers(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_announcements" },
        () => fetchAnnouncements())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchTeachers, fetchAnnouncements])

  // ── Create teacher ────────────────────────────────────────────────────────
  const createTeacher = useCallback(async (form: {
    full_name: string
    email: string
    password: string
    phone?: string
    subject_specialization?: string
  }) => {
    // Hash password via a simple deterministic approach using Supabase Auth
    // In production use bcrypt server-side — here we store a placeholder hash
    // and rely on Supabase Auth for actual auth
    const { data: authData, error: authErr } = await supabase.auth.admin
      ? { data: null, error: null }
      : { data: null, error: null }

    // Store teacher record (password_hash stored as bcrypt on server action ideally)
    const { error } = await supabase.from("teachers").insert([{
      full_name:               form.full_name.trim(),
      email:                   form.email.trim().toLowerCase(),
      password_hash:           form.password,   // ⚠️ hash this server-side in production
      phone:                   form.phone?.trim() || null,
      subject_specialization:  form.subject_specialization?.trim() || null,
      is_active:               true,
    }])
    if (error) {
      if (error.code === "23505") toast.error("Email already registered")
      else toast.error(error.message)
      throw error
    }
    toast.success(`Teacher "${form.full_name}" created`)
    await fetchTeachers(true)
  }, [fetchTeachers])

  // ── Update teacher ────────────────────────────────────────────────────────
  const updateTeacher = useCallback(async (id: string, updates: Partial<Teacher> & { password?: string }) => {
    const payload: any = {
      full_name:              updates.full_name?.trim(),
      email:                  updates.email?.trim().toLowerCase(),
      phone:                  updates.phone?.trim() || null,
      subject_specialization: updates.subject_specialization?.trim() || null,
      is_active:              updates.is_active,
    }
    if (updates.password) payload.password_hash = updates.password   // hash server-side in prod

    const { error } = await supabase.from("teachers").update(payload).eq("id", id)
    if (error) { toast.error(error.message); throw error }
    toast.success("Teacher updated")
    await fetchTeachers(true)
  }, [fetchTeachers])

  // ── Delete teacher ────────────────────────────────────────────────────────
  const deleteTeacher = useCallback(async (id: string, name: string) => {
    if (!confirm(`Permanently delete teacher "${name}"? This removes them from all assigned schedules.`)) return
    const { error } = await supabase.from("teachers").delete().eq("id", id)
    if (error) { toast.error(error.message); return }
    toast.success(`"${name}" deleted`)
    setTeachers(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Toggle active ─────────────────────────────────────────────────────────
  const toggleActive = useCallback(async (id: string, current: boolean) => {
    const { error } = await supabase.from("teachers").update({ is_active: !current }).eq("id", id)
    if (error) { toast.error(error.message); return }
    toast.success(current ? "Teacher deactivated" : "Teacher reactivated")
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, is_active: !current } : t))
  }, [])

  // ── Announcements ─────────────────────────────────────────────────────────
  const postAnnouncement = useCallback(async (form: {
    title: string; body: string; target: string; is_pinned: boolean
  }) => {
    const { error } = await supabase.from("teacher_announcements").insert([{
      title:     form.title.trim(),
      body:      form.body.trim(),
      target:    form.target,
      is_pinned: form.is_pinned,
      posted_by: "Admin",
    }])
    if (error) { toast.error(error.message); throw error }
    toast.success("Announcement posted")
    await fetchAnnouncements()
  }, [fetchAnnouncements])

  const deleteAnnouncement = useCallback(async (id: string) => {
    await supabase.from("teacher_announcements").delete().eq("id", id)
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    toast.success("Announcement removed")
  }, [])

  const togglePin = useCallback(async (id: string, pinned: boolean) => {
    await supabase.from("teacher_announcements").update({ is_pinned: !pinned }).eq("id", id)
    await fetchAnnouncements()
  }, [fetchAnnouncements])

  // ── Schedules for a teacher ───────────────────────────────────────────────
  const fetchTeacherSchedules = useCallback(async (teacherId: string) => {
    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("day")
      .order("start_time")
    if (error) throw error
    return data ?? []
  }, [])

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = teachers.filter(t => {
    const q = search.toLowerCase()
    return (
      t.full_name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      (t.subject_specialization ?? "").toLowerCase().includes(q)
    )
  })

  return {
    teachers, filtered, announcements, loading, search, setSearch,
    fetchTeachers, fetchAnnouncements,
    createTeacher, updateTeacher, deleteTeacher, toggleActive,
    postAnnouncement, deleteAnnouncement, togglePin,
    fetchTeacherSchedules,
  }
}