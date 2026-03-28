"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { exportArchiveCSV, ArchivedStudent } from "@/lib/actions/archive"
import { toast } from "sonner"

const ARCHIVE_SELECT = [
  "id", "lrn", "first_name", "last_name", "middle_name",
  "gender", "strand", "grade_level", "student_category",
  "section", "section_id", "status", "school_year", "created_at",
  "email", "address",
  "guardian_first_name", "guardian_last_name", "guardian_middle_name",
  "gwa_grade_10", "profile_picture",
  "age", "birth_date", "contact_no", "phone",
  "civil_status", "religion", "nationality",
  "last_school_attended",
  "form_138_url", "good_moral_url", "cor_url",
  "af5_url", "diploma_url", "birth_certificate_url", "two_by_two_url",
  "preferred_modality", "preferred_shift", "guardian_phone",
  "is_archived", "graduate_lock",
  "g11_section", "g11_section_id",
].join(", ")

const PAGE_SIZE = 5

export function useArchive() {
  const [years, setYears] = useState<string[]>([])
  const [selectedYear, setSelectedYear] = useState<string>("")
  const [students, setStudents] = useState<ArchivedStudent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [yearsLoading, setYearsLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const [search, setSearch] = useState("")
  const [strand, setStrand] = useState("ALL")
  const [gradeLevel, setGradeLevel] = useState("ALL")
  const [page, setPage] = useState(1)
  const [selectedStudent, setSelectedStudent] = useState<ArchivedStudent | null>(null)

  // Refs so the realtime callback always sees latest filter values
  // without needing to re-subscribe every time a filter changes
  const filterRef = useRef({ selectedYear, strand, gradeLevel, search, page })
  useEffect(() => {
    filterRef.current = { selectedYear, strand, gradeLevel, search, page }
  }, [selectedYear, strand, gradeLevel, search, page])

  // ── Load years directly from browser client ──────────────────────────────
  const fetchYears = useCallback(async () => {
    setYearsLoading(true)
    try {
      const { data } = await supabase
        .from("students")
        .select("school_year")
        .eq("is_archived", true)
        .or("mock.is.null,mock.eq.false")
        .order("school_year", { ascending: false })

      if (data) {
        const unique = [...new Set(data.map((d: any) => d.school_year).filter(Boolean))]
          .sort((a: any, b: any) => b.localeCompare(a)) as string[]
        setYears(unique)
        setSelectedYear(prev => prev || unique[0] || "")
      }
    } finally {
      setYearsLoading(false)
    }
  }, [])

  useEffect(() => { fetchYears() }, [fetchYears])

  // ── Fetch students directly from browser client ───────────────────────────
  // isBackground=true → skip the loading spinner (used by realtime callback)
  const fetchStudents = useCallback(async (isBackground = false) => {
    const { selectedYear, strand, gradeLevel, search, page } = filterRef.current
    if (!selectedYear) return
    if (!isBackground) setLoading(true)
    try {
      let query = supabase
        .from("students")
        .select(ARCHIVE_SELECT, { count: "exact" })
        .eq("school_year", selectedYear)
        .eq("is_archived", true)
        .or("mock.is.null,mock.eq.false")

      if (strand && strand !== "ALL") query = query.eq("strand", strand) as any
      if (gradeLevel && gradeLevel !== "ALL") {
        if (gradeLevel === "11") {
          query = query.or("grade_level.eq.11,grade_level.is.null") as any
        } else if (gradeLevel === "GRADUATED") {
          query = query.eq("grade_level", "12").is("section_id", null) as any
        } else {
          query = query.eq("grade_level", gradeLevel).not("section_id", "is", null) as any
        }
      }
      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,lrn.ilike.%${search}%`
        ) as any
      }

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, count, error } = await query
        .order("last_name", { ascending: true })
        .range(from, to)

      if (error) throw error
      setStudents((data as unknown as ArchivedStudent[]) || [])
      setTotal(count || 0)
    } catch (err) {
      console.error("fetchStudents error:", err)
      if (!isBackground) toast.error("Failed to load archive records")
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, []) // no deps — reads from filterRef so realtime always uses latest filters

  // ── Re-fetch when filters/page change ────────────────────────────────────
  useEffect(() => {
    fetchStudents()
  }, [fetchStudents, selectedYear, strand, gradeLevel, search, page]) // eslint-disable-line

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [selectedYear, strand, gradeLevel, search])

  // ── Realtime subscription — same pattern as enrolled/applicants ───────────
  useEffect(() => {
    const channel = supabase
      .channel("archive_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () => {
        fetchStudents(true)   // background refresh — no spinner
        fetchYears()          // year list might change too
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchStudents, fetchYears])

  // ── CSV export (still uses server action — that's fine for export) ─────────
  const handleExportCSV = async () => {
    const year = filterRef.current.selectedYear
    if (!year) return
    setExporting(true)
    const toastId = toast.loading("Preparing CSV export...")
    try {
      const csv = await exportArchiveCSV(year)
      if (!csv) { toast.error("No data to export.", { id: toastId }); return }

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Archive_${year.replace("-", "_")}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("CSV exported successfully.", { id: toastId })
    } catch {
      toast.error("Export failed.", { id: toastId })
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return {
    years, selectedYear, setSelectedYear,
    students, total, loading, yearsLoading, exporting,
    search, setSearch,
    strand, setStrand,
    gradeLevel, setGradeLevel,
    page, setPage, totalPages,
    handleExportCSV,
    selectedStudent, setSelectedStudent,
    fetchStudents,
  }
}