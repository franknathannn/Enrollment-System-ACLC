"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface ArchivedStudent {
  id: string
  lrn: string
  first_name: string
  last_name: string
  middle_name: string | null
  gender: string
  strand: string
  grade_level: string
  student_category: string | null
  section: string | null
  section_id: string | null
  status: string
  school_year: string
  created_at: string
  email: string | null
  address: string | null
  guardian_first_name: string | null
  guardian_last_name: string | null
  guardian_middle_name: string | null
  gwa_grade_10: number | null
  profile_picture: string | null
  age: number | null
  birth_date: string | null
  contact_no: string | null
  phone: string | null
  civil_status: string | null
  religion: string | null
  nationality: string | null
  last_school_attended: string | null
  form_138_url: string | null
  good_moral_url: string | null
  cor_url: string | null
  af5_url: string | null
  diploma_url: string | null
  birth_certificate_url: string | null
  two_by_two_url: string | null
  preferred_modality: string | null
  preferred_shift: string | null
  guardian_phone: string | null
  is_archived: boolean | null
  graduate_lock: boolean | null
}

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
].join(", ")

/**
 * Returns distinct school_years that have ANY archived students (all statuses).
 */
export async function getArchiveYears(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("students")
    .select("school_year")
    .eq("is_archived", true)
    // FIX: removed .in("status", [...]) — archived Pending/Rejected students
    // were never showing up in the year dropdown at all
    // FIX: .neq("mock", true) drops NULL rows — use .or() instead
    .or("mock.is.null,mock.eq.false")
    .order("school_year", { ascending: false })

  if (error || !data) return []
  const years = [...new Set(data.map((d) => d.school_year).filter(Boolean))]
  return years.sort((a, b) => b.localeCompare(a))
}

/**
 * Returns paginated archived students (ALL statuses — Accepted, Approved, Pending, Rejected).
 */
export async function getArchivedStudents(params: {
  school_year: string
  strand?: string
  grade_level?: string
  search?: string
  page?: number
  // optional: filter by status if you want to keep a status filter in the UI
  status?: string
}): Promise<{ students: ArchivedStudent[]; total: number }> {
  const supabase = await createClient()
  const { school_year, strand, grade_level, search, page = 1, status } = params
  const PAGE_SIZE = 20

  let query = supabase
    .from("students")
    .select(ARCHIVE_SELECT, { count: "exact" })
    .eq("school_year", school_year)
    .eq("is_archived", true)
    // FIX: removed hard-coded .in("status", ["Accepted", "Approved"])
    // so ALL archived students appear regardless of their status
    .or("mock.is.null,mock.eq.false")

  // Optional status filter (if the UI adds a status dropdown later)
  if (status && status !== "ALL") {
    query = query.eq("status", status) as any
  }

  if (strand && strand !== "ALL") query = query.eq("strand", strand) as any

  if (grade_level && grade_level !== "ALL") {
    if (grade_level === "11") {
      query = query.or("grade_level.eq.11,grade_level.is.null") as any
    } else if (grade_level === "GRADUATED") {
      // Graduated = archived G12 with section_id nulled out (promoted past G12)
      query = query.eq("grade_level", "12").is("section_id", null) as any
    } else {
      // grade_level === "12": show G12 students who still have a section assigned
      query = query.eq("grade_level", grade_level).not("section_id", "is", null) as any
    }
  }

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,lrn.ilike.%${search}%`
    ) as any
  }

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error, count } = await query
    .order("last_name", { ascending: true })
    .range(from, to)

  if (error) {
    console.error("getArchivedStudents error:", error)
    return { students: [], total: 0 }
  }
  return { students: (data as unknown as ArchivedStudent[]) || [], total: count || 0 }
}

/**
 * CSV export — includes all statuses now
 */
export async function exportArchiveCSV(school_year: string): Promise<string> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("students")
    .select(
      "lrn, last_name, first_name, middle_name, gender, strand, grade_level, " +
      "student_category, section, status, school_year, gwa_grade_10, email, " +
      "address, guardian_first_name, guardian_last_name, created_at"
    )
    .eq("school_year", school_year)
    .eq("is_archived", true)
    .or("mock.is.null,mock.eq.false")
    .order("last_name", { ascending: true })

  if (error || !data) return ""

  const headers = [
    "LRN", "Last Name", "First Name", "Middle Name", "Gender", "Strand", "Grade Level",
    "Category", "Section", "Status", "School Year", "GWA", "Email",
    "Address", "Guardian First Name", "Guardian Last Name", "Date Applied",
  ]

  const rows = data.map((s: any) => [
    s.lrn, s.last_name, s.first_name, s.middle_name || "",
    s.gender, s.strand, s.grade_level || "11", s.student_category || "",
    s.section || "Unassigned", s.status, s.school_year,
    s.gwa_grade_10 || "", s.email || "", s.address || "",
    s.guardian_first_name || "", s.guardian_last_name || "",
    s.created_at ? new Date(s.created_at).toLocaleDateString() : "",
  ])

  return [headers, ...rows]
    .map((row) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n")
}
/**
 * Unlock all graduated students — sets graduate_lock=false on all students
 * where (grade_level='GRADUATED' OR (grade_level='12' AND section_id IS NULL)) AND is_archived=true.
 */
export async function unlockGraduatedStudents(): Promise<{
  success: boolean; unlocked: number; error?: string
}> {
  const supabase = await createClient()
  try {
    const { data, error: fetchErr } = await supabase
      .from("students")
      .select("id")
      .eq("is_archived", true)
      .eq("graduate_lock", true)
      .or("grade_level.eq.GRADUATED,and(grade_level.eq.12,section_id.is.null)")

    if (fetchErr) throw fetchErr
    if (!data || data.length === 0) return { success: true, unlocked: 0 }

    const ids = data.map(s => s.id)
    const chunkSize = 50
    let unlocked = 0

    for (let i = 0; i < ids.length; i += chunkSize) {
      const { error } = await supabase
        .from("students")
        .update({ graduate_lock: false })
        .in("id", ids.slice(i, i + chunkSize))
      if (error) throw error
      unlocked += Math.min(chunkSize, ids.length - i)
    }

    revalidatePath("/admin/archive")
    return { success: true, unlocked }
  } catch (err: any) {
    console.error("unlockGraduatedStudents error:", err)
    return { success: false, unlocked: 0, error: err?.message || "Unknown error" }
  }
}

/**
 * Returns count of graduated students where graduate_lock=false.
 * Used to determine whether to show Lock or Unlock button.
 * If count > 0 → show Lock button.
 * If count = 0 and any graduated students exist → show Unlock button.
 */
export async function getGraduateLockState(): Promise<{
  unlockedCount: number; totalGraduated: number
}> {
  const supabase = await createClient()

  const [{ count: total }, { count: unlocked }] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true })
      .eq("is_archived", true)
      .or("grade_level.eq.GRADUATED,and(grade_level.eq.12,section_id.is.null)"),
    supabase.from("students").select("id", { count: "exact", head: true })
      .eq("is_archived", true)
      .or("graduate_lock.is.null,graduate_lock.eq.false")
      .or("grade_level.eq.GRADUATED,and(grade_level.eq.12,section_id.is.null)"),
  ])

  return { unlockedCount: unlocked ?? 0, totalGraduated: total ?? 0 }
}
export async function lockGraduatedStudents(): Promise<{
  success: boolean; locked: number; error?: string
}> {
  const supabase = await createClient()
  try {
    // Find all graduated students (GRADUATED grade_level, OR G12 + archived + no section)
    const { data, error: fetchErr } = await supabase
      .from("students")
      .select("id")
      .eq("is_archived", true)
      .or("graduate_lock.is.null,graduate_lock.eq.false")
      .or("grade_level.eq.GRADUATED,and(grade_level.eq.12,section_id.is.null)")

    if (fetchErr) throw fetchErr
    if (!data || data.length === 0) return { success: true, locked: 0 }

    const ids = data.map(s => s.id)
    const chunkSize = 50
    let locked = 0

    for (let i = 0; i < ids.length; i += chunkSize) {
      const { error } = await supabase
        .from("students")
        .update({ graduate_lock: true })
        .in("id", ids.slice(i, i + chunkSize))
      if (error) throw error
      locked += Math.min(chunkSize, ids.length - i)
    }

    revalidatePath("/admin/archive")
    return { success: true, locked }
  } catch (err: any) {
    console.error("lockGraduatedStudents error:", err)
    return { success: false, locked: 0, error: err?.message || "Unknown error" }
  }
}