"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { recordYearlySnapshot } from "@/lib/actions/history"

function revalidateAll() {
  revalidatePath("/admin/applicants")
  revalidatePath("/admin/enrolled")
  revalidatePath("/admin/sections")
  revalidatePath("/admin/archive")
  revalidatePath("/admin/dashboard")
}

async function autoAssignSection(
  supabase: any,
  studentId: string,
  strand: string,
  gradeLevel: string,
  gender: string,
): Promise<{ section_id: string; section_name: string } | null> {
  const [sectionsRes, occupiedRes] = await Promise.all([
    supabase
      .from("sections")
      .select("id, section_name, capacity")
      .eq("strand", strand)
      .eq("grade_level", gradeLevel)
      .order("section_name", { ascending: true }),
    supabase
      .from("students")
      .select("section_id, gender")
      .eq("strand", strand)
      .eq("grade_level", gradeLevel)
      .in("status", ["Accepted", "Approved"])
      .or("is_archived.is.null,is_archived.eq.false")
      .not("section_id", "is", null),
  ])

  const sections = sectionsRes.data || []
  if (sections.length === 0) return null

  const occ: Record<string, { male: number; female: number }> = {}
  sections.forEach((s: any) => { occ[s.id] = { male: 0, female: 0 } })
  ;(occupiedRes.data || []).forEach((s: any) => {
    if (occ[s.section_id]) {
      if (s.gender === "Male") occ[s.section_id].male++
      else occ[s.section_id].female++
    }
  })

  for (const sec of sections) {
    if (!sec.capacity || sec.capacity <= 0) continue
    const { male, female } = occ[sec.id]
    const total = male + female
    if (total >= sec.capacity) continue

    const half = Math.floor(sec.capacity / 2)
    const isEven = sec.capacity % 2 === 0
    let maxM = half, maxF = half

    if (!isEven) {
      if (male === 0 && female === 0) {
        gender === "Male" ? (maxM = half + 1) : (maxF = half + 1)
      } else if (male > female) {
        maxM = half + 1
      } else if (female > male) {
        maxF = half + 1
      } else {
        gender === "Male" ? (maxM = half + 1) : (maxF = half + 1)
      }
    }

    const currentCount = gender === "Male" ? male : female
    const maxForGender = gender === "Male" ? maxM : maxF
    if (currentCount < maxForGender) {
      return { section_id: sec.id, section_name: sec.section_name }
    }
  }

  return null
}

export async function archiveCurrentYear(): Promise<{
  success: boolean; archived: number; error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: config } = await supabase.from("system_config").select("school_year").single()
    if (!config?.school_year) return { success: false, archived: 0, error: "No school year configured." }

    const schoolYear = config.school_year
    const { data: students, error: fetchErr } = await supabase
      .from("students")
      .select("id, gender")
      .eq("school_year", schoolYear)
      .in("status", ["Accepted", "Approved"])
      .or("mock.is.null,mock.eq.false")

    if (fetchErr) throw fetchErr
    if (!students || students.length === 0) return { success: true, archived: 0 }

    const ids = students.map((s: any) => s.id)
    const chunkSize = 50
    for (let i = 0; i < ids.length; i += chunkSize) {
      const { error } = await supabase
        .from("students")
        .update({ is_archived: true })
        .in("id", ids.slice(i, i + chunkSize))
      if (error) throw error
    }

    const maleCount = students.filter((s: any) => s.gender === "Male").length
    const femaleCount = students.filter((s: any) => s.gender === "Female").length
    const totalCount = maleCount + femaleCount

    // Fix 3: Write to enrollment_history (gender breakdown for dashboard)
    await recordYearlySnapshot(schoolYear, maleCount, femaleCount)

    // Fix 3: ALSO write to enrollment_predictions_data so Predictive Analytics
    // always receives the real final count instead of having to estimate it.
    // Also pull JHS and ALS student_category counts for the market data columns.
    const [jhsRes, alsRes] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true })
        .eq("school_year", schoolYear).eq("student_category", "JHS")
        .in("status", ["Accepted", "Approved"]).or("mock.is.null,mock.eq.false"),
      supabase.from("students").select("id", { count: "exact", head: true })
        .eq("school_year", schoolYear).eq("student_category", "ALS")
        .in("status", ["Accepted", "Approved"]).or("mock.is.null,mock.eq.false"),
    ])
    await supabase.from("enrollment_predictions_data").upsert({
      id: crypto.randomUUID(),
      school_year: schoolYear,
      total_enrolled: totalCount,
      jhs_graduates_count: jhsRes.count || 0,
      als_passers_count:   alsRes.count || 0,
      others_count:        0,
      created_at:          new Date().toISOString(),
    }, { onConflict: "school_year" })

    revalidateAll()
    return { success: true, archived: students.length }
  } catch (err: any) {
    console.error("Archive Error:", err)
    return { success: false, archived: 0, error: err?.message || "Unknown error" }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UNARCHIVE CURRENT YEAR
// Restores is_archived = false. Section is already preserved on the row.
//
// BUG FIX: Previously this ignored graduate_lock entirely, allowing locked
// graduates to be unarchived. Now we filter them out before the update.
// Students with graduate_lock=true + grade_level=12 + section_id=null
// are PERMANENTLY archived and must NEVER have is_archived set to false.
// ─────────────────────────────────────────────────────────────────────────────
export async function unarchiveCurrentYear(): Promise<{
  success: boolean; unarchived: number; skippedLocked: number; error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: config } = await supabase.from("system_config").select("school_year").single()
    if (!config?.school_year) return { success: false, unarchived: 0, skippedLocked: 0, error: "No school year configured." }

    const schoolYear = config.school_year

    // Fetch all archived students for this year, including lock state
    const { data: students, error: fetchErr } = await supabase
      .from("students")
      .select("id, grade_level, section_id, graduate_lock")
      .eq("school_year", schoolYear)
      .eq("is_archived", true)
      .or("mock.is.null,mock.eq.false")

    if (fetchErr) throw fetchErr
    if (!students || students.length === 0) return { success: true, unarchived: 0, skippedLocked: 0 }

    // A locked graduate = grade_level=12 AND section_id IS NULL AND graduate_lock=true
    // These must NEVER be unarchived regardless of what any admin action requests.
    const eligible: string[] = []
    let skippedLocked = 0

    for (const s of students as any[]) {
      const isLockedGraduate = s.graduate_lock === true
        && s.grade_level === "12"
        && s.section_id === null
      if (isLockedGraduate) {
        skippedLocked++
      } else {
        eligible.push(s.id)
      }
    }

    if (eligible.length === 0) return { success: true, unarchived: 0, skippedLocked }

    const chunkSize = 50
    for (let i = 0; i < eligible.length; i += chunkSize) {
      const { error } = await supabase
        .from("students")
        .update({ is_archived: false })
        .in("id", eligible.slice(i, i + chunkSize))
      if (error) throw error
    }

    revalidateAll()
    return { success: true, unarchived: eligible.length, skippedLocked }
  } catch (err: any) {
    console.error("Unarchive Error:", err)
    return { success: false, unarchived: 0, skippedLocked: 0, error: err?.message || "Unknown error" }
  }
}

export async function increaseGradeLevel(): Promise<{
  success: boolean; promotedToG12: number; archivedG12: number; overAge: number; error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: config } = await supabase.from("system_config").select("school_year").single()
    if (!config?.school_year) {
      return { success: false, promotedToG12: 0, archivedG12: 0, overAge: 0, error: "No school year configured." }
    }
    const currentSYStart = parseInt(config.school_year.split("-")[0])

    const { data: g12Students, error: g12Err } = await supabase
      .from("students")
      .select("id, section")
      .eq("grade_level", "12")
      .in("status", ["Accepted", "Approved"])
      .or("mock.is.null,mock.eq.false")

    if (g12Err) throw g12Err

    const g12Ids = (g12Students || []).map((s: any) => s.id)
    let archivedG12 = 0

    if (g12Ids.length > 0) {
      const chunkSize = 50
      for (let i = 0; i < g12Ids.length; i += chunkSize) {
        const { error } = await supabase
          .from("students")
          .update({ is_archived: true, section_id: null })
          .in("id", g12Ids.slice(i, i + chunkSize))
        if (error) throw error
      }
      archivedG12 = g12Ids.length
    }

    const { data: g11Students, error: g11Err } = await supabase
      .from("students")
      .select("id, school_year, gender, strand")
      .eq("grade_level", "11")
      .in("status", ["Accepted", "Approved"])
      .or("mock.is.null,mock.eq.false")

    if (g11Err) throw g11Err

    const toPromote: typeof g11Students = []
    const toOverAge: string[] = []

    for (const s of g11Students || []) {
      const studentSYStart = s.school_year ? parseInt(s.school_year.split("-")[0]) : null
      if (studentSYStart === null) { toPromote!.push(s); continue }
      const yearDiff = currentSYStart - studentSYStart
      if (yearDiff >= 2) toOverAge.push(s.id)
      else toPromote!.push(s)
    }

    let promotedToG12 = 0
    let overAge = 0

    if (toPromote && toPromote.length > 0) {
      for (const student of toPromote) {
        const assigned = await autoAssignSection(
          supabase, student.id, student.strand, "12", student.gender
        )
        const newSection = assigned?.section_name ?? "Unassigned"
        const { error } = await supabase
          .from("students")
          .update({
            grade_level: "12",
            section_id: assigned?.section_id ?? null,
            section: newSection,
          })
          .eq("id", student.id)
        if (error) throw error

        // Fix 4: Patch attendance records so historical data stays linked
        // to the correct section. Without this, Reports Tab calculates wrong
        // percentages and Calendar Tab misses records after rollover.
        if (assigned?.section_name) {
          await supabase
            .from("attendance")
            .update({ section: newSection })
            .eq("student_id", student.id)
            .neq("section", newSection) // only update if section actually changed
        }
      }
      promotedToG12 = toPromote.length
    }

    if (toOverAge.length > 0) {
      const chunkSize = 50
      for (let i = 0; i < toOverAge.length; i += chunkSize) {
        const { error } = await supabase
          .from("students")
          .update({ is_archived: true })
          .in("id", toOverAge.slice(i, i + chunkSize))
        if (error) throw error
      }
      overAge = toOverAge.length
    }

    revalidateAll()
    return { success: true, promotedToG12, archivedG12, overAge }
  } catch (err: any) {
    console.error("Increase Grade Level Error:", err)
    return { success: false, promotedToG12: 0, archivedG12: 0, overAge: 0, error: err?.message || "Unknown error" }
  }
}

export async function decreaseGradeLevel(): Promise<{
  success: boolean; demoted: number; skippedGraduated: number; error?: string
}> {
  try {
    const supabase = await createClient()

    const { data: config } = await supabase.from("system_config").select("school_year").single()
    const currentSYStart = config?.school_year ? parseInt(config.school_year.split("-")[0]) : null

    const { data: g12Students, error: fetchErr } = await supabase
      .from("students")
      .select("id, gender, strand, section_id, is_archived, school_year, graduate_lock")
      .eq("grade_level", "12")
      .in("status", ["Accepted", "Approved"])
      .or("mock.is.null,mock.eq.false")

    if (fetchErr) throw fetchErr
    if (!g12Students || g12Students.length === 0) return { success: true, demoted: 0, skippedGraduated: 0 }

    let demoted = 0
    let skippedGraduated = 0

    for (const student of g12Students) {
      const wasGraduated = student.section_id === null

      if (student.graduate_lock === true) {
        skippedGraduated++
        continue
      }

      if (wasGraduated && currentSYStart !== null && student.school_year) {
        const studentSYStart = parseInt(student.school_year.split("-")[0])
        const gap = currentSYStart - studentSYStart
        if (gap >= 2) {
          skippedGraduated++
          continue
        }
      }

      const assigned = await autoAssignSection(
        supabase, student.id, student.strand, "11", student.gender
      )
      const { error } = await supabase
        .from("students")
        .update({
          grade_level: "11",
          section_id: assigned?.section_id ?? null,
          section: assigned?.section_name ?? "Unassigned",
          ...(wasGraduated ? { is_archived: false } : {}),
        })
        .eq("id", student.id)
      if (error) throw error
      demoted++
    }

    revalidateAll()
    return { success: true, demoted, skippedGraduated }
  } catch (err: any) {
    console.error("Decrease Grade Level Error:", err)
    return { success: false, demoted: 0, skippedGraduated: 0, error: err?.message || "Unknown error" }
  }
}

export async function unarchiveSingleStudent(studentId: string): Promise<{
  success: boolean; error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: student } = await supabase
      .from("students")
      .select("graduate_lock, section_id, grade_level")
      .eq("id", studentId)
      .single()

    if (student?.graduate_lock === true && student?.section_id === null && student?.grade_level === "12") {
      return { success: false, error: "This student is a locked graduate and cannot be restored." }
    }

    const { error } = await supabase
      .from("students")
      .update({ is_archived: false })
      .eq("id", studentId)
    if (error) throw error
    revalidateAll()
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Unknown error" }
  }
}