"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { recordYearlySnapshot, snapshotCurrentYearData } from "@/lib/actions/history"

function revalidateAll() {
  revalidatePath("/admin/applicants")
  revalidatePath("/admin/enrolled")
  revalidatePath("/admin/sections")
  revalidatePath("/admin/archive")
  revalidatePath("/admin/dashboard")
}

/**
 * Assigns students to sections in the target grade level using the same
 * gender-balance algorithm as bulkUpdateApplicantStatus (applicant acceptance).
 *
 * Fills section A first (M/F balanced), spills into B only when A is full.
 * Accounts for any students already occupying the target sections so existing
 * occupancy is respected before adding more.
 */
async function assignStudentsToSections(
  supabase: any,
  students: { id: string; strand: string; gender: string }[],
  targetGrade: string,
): Promise<Record<string, { section_id: string | null; section_name: string }>> {
  const results: Record<string, { section_id: string | null; section_name: string }> = {}
  if (students.length === 0) return results

  // Group by strand
  const strandGroups: Record<string, typeof students> = {}
  for (const s of students) {
    if (!strandGroups[s.strand]) strandGroups[s.strand] = []
    strandGroups[s.strand].push(s)
  }

  for (const [strand, group] of Object.entries(strandGroups)) {
    // Fetch target sections + current occupancy in parallel
    const [sectionsRes, existingRes] = await Promise.all([
      supabase.from("sections").select("id, section_name, capacity")
        .eq("strand", strand).eq("grade_level", targetGrade)
        .order("section_name", { ascending: true }),
      supabase.from("students").select("section_id, gender")
        .eq("strand", strand).eq("grade_level", targetGrade)
        .in("status", ["Accepted", "Approved"])
        .eq("is_archived", false)
        .not("section_id", "is", null),
    ])

    const sections = sectionsRes.data || []
    const existing = existingRes.data || []

    // Build occupancy map (in-memory — prevents stale reads between iterations)
    const occupancy: Record<string, { male: number; female: number; total: number }> = {}
    const sectionNames: Record<string, string> = {}
    for (const sec of sections) {
      occupancy[sec.id] = { male: 0, female: 0, total: 0 }
      sectionNames[sec.id] = sec.section_name
    }
    for (const s of existing) {
      if (occupancy[s.section_id]) {
        if (s.gender === "Male") occupancy[s.section_id].male++
        else occupancy[s.section_id].female++
        occupancy[s.section_id].total++
      }
    }

    // Assign each student — exact same logic as bulkUpdateApplicantStatus
    for (const student of group) {
      let assignedId: string | null = null
      let assignedName = "Unassigned"

      for (const sec of sections) {
        const occ = occupancy[sec.id]
        if (occ.total >= sec.capacity) continue

        const halfCap = Math.floor(sec.capacity / 2)
        const isEven  = sec.capacity % 2 === 0
        let maxMale: number, maxFemale: number

        if (isEven) {
          maxMale = halfCap; maxFemale = halfCap
        } else {
          if (occ.male === 0 && occ.female === 0) {
            if (student.gender === "Male") { maxMale = halfCap + 1; maxFemale = halfCap }
            else { maxMale = halfCap; maxFemale = halfCap + 1 }
          } else if (occ.male > occ.female) {
            maxMale = halfCap + 1; maxFemale = halfCap
          } else if (occ.female > occ.male) {
            maxMale = halfCap; maxFemale = halfCap + 1
          } else {
            if (student.gender === "Male") { maxMale = halfCap + 1; maxFemale = halfCap }
            else { maxMale = halfCap; maxFemale = halfCap + 1 }
          }
        }

        const currentCount  = student.gender === "Male" ? occ.male   : occ.female
        const maxForGender  = student.gender === "Male" ? maxMale     : maxFemale

        if (currentCount < maxForGender) {
          assignedId   = sec.id
          assignedName = sectionNames[sec.id]
          // Update in-memory occupancy immediately so next student sees fresh counts
          if (student.gender === "Male") occ.male++
          else occ.female++
          occ.total++
          break
        }
      }

      results[student.id] = { section_id: assignedId, section_name: assignedName }
    }
  }

  return results
}

export async function archiveCurrentYear(): Promise<{
  success: boolean; archived: number; error?: string
}> {
  try {
    const supabase = createAdminClient()
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
    const supabase = createAdminClient()
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

    // Graduates have grade_level = 'GRADUATED' and must never be unarchived.
    const eligible: string[] = []
    let skippedLocked = 0

    for (const s of students as any[]) {
      const isGraduate = s.grade_level === "GRADUATED" || (s.graduate_lock === true && s.section_id === null)
      if (isGraduate) {
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
    const supabase = createAdminClient()
    const { data: config } = await supabase.from("system_config").select("school_year").single()
    if (!config?.school_year) {
      return { success: false, promotedToG12: 0, archivedG12: 0, overAge: 0, error: "No school year configured." }
    }
    const currentSYStart = parseInt(config.school_year.split("-")[0])

    // Auto-snapshot current year into both history tables BEFORE any grade changes.
    // This preserves the real enrolled count even if the admin skipped a manual archive.
    await snapshotCurrentYearData(config.school_year)

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
      .select("id, school_year, gender, strand, section, section_id")
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
      // Assign promoted students to G12 sections using gender-balance (same as accepting applicants)
      const assignments = await assignStudentsToSections(supabase, toPromote, "12")

      // Group by assigned section for batched DB writes
      const updatesBySection: Record<string, string[]> = {}
      for (const student of toPromote) {
        const assigned = assignments[student.id]
        const key = assigned?.section_id ?? "null"
        if (!updatesBySection[key]) updatesBySection[key] = []
        updatesBySection[key].push(student.id)
      }

      for (const [secId, studentIds] of Object.entries(updatesBySection)) {
        const sectionId   = secId === "null" ? null : secId
        const sectionName = secId === "null" ? "Unassigned" : (assignments[studentIds[0]]?.section_name ?? "Unassigned")
        const chunkSize = 50
        for (let i = 0; i < studentIds.length; i += chunkSize) {
          const { error } = await supabase
            .from("students")
            .update({ grade_level: "12", section_id: sectionId, section: sectionName })
            .in("id", studentIds.slice(i, i + chunkSize))
          if (error) throw error
        }
        if (sectionId) {
          await supabase.from("attendance").update({ section: sectionName })
            .in("student_id", studentIds).neq("section", sectionName)
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
    const supabase = createAdminClient()

    const { data: config } = await supabase.from("system_config").select("school_year").single()
    const currentSYStart = config?.school_year ? parseInt(config.school_year.split("-")[0]) : null

    const { data: g12Students, error: fetchErr } = await supabase
      .from("students")
      .select("id, gender, strand, section, section_id, is_archived, school_year, graduate_lock")
      .eq("grade_level", "12")
      .eq("is_archived", false)
      .in("status", ["Accepted", "Approved"])
      .or("mock.is.null,mock.eq.false")

    if (fetchErr) throw fetchErr
    if (!g12Students || g12Students.length === 0) return { success: true, demoted: 0, skippedGraduated: 0 }

    let skippedGraduated = 0
    const eligible: typeof g12Students = []

    for (const student of g12Students) {
      if (student.graduate_lock === true) { skippedGraduated++; continue }
      const wasGraduated = student.section_id === null
      if (wasGraduated && currentSYStart !== null && student.school_year) {
        const gap = currentSYStart - parseInt(student.school_year.split("-")[0])
        if (gap >= 2) { skippedGraduated++; continue }
      }
      eligible.push(student)
    }

    if (eligible.length === 0) return { success: true, demoted: 0, skippedGraduated }

    // Assign demoted students to G11 sections using gender-balance (same as accepting applicants)
    const assignments = await assignStudentsToSections(supabase, eligible, "11")

    // Group by assigned section for batched DB writes
    const updatesBySection: Record<string, string[]> = {}
    for (const student of eligible) {
      const assigned = assignments[student.id]
      const key = assigned?.section_id ?? "null"
      if (!updatesBySection[key]) updatesBySection[key] = []
      updatesBySection[key].push(student.id)
    }

    let demoted = 0
    for (const [secId, studentIds] of Object.entries(updatesBySection)) {
      const sectionId   = secId === "null" ? null : secId
      const sectionName = secId === "null" ? "Unassigned" : (assignments[studentIds[0]]?.section_name ?? "Unassigned")
      const chunkSize = 50
      for (let i = 0; i < studentIds.length; i += chunkSize) {
        const { error } = await supabase
          .from("students")
          .update({ grade_level: "11", section_id: sectionId, section: sectionName })
          .in("id", studentIds.slice(i, i + chunkSize))
        if (error) throw error
      }
      demoted += studentIds.length
    }

    revalidateAll()
    return { success: true, demoted, skippedGraduated }
  } catch (err: any) {
    console.error("Decrease Grade Level Error:", err)
    return { success: false, demoted: 0, skippedGraduated: 0, error: err?.message || "Unknown error" }
  }
}

export async function advanceSchoolYear(): Promise<{
  success: boolean
  graduatedG12: number
  promotedToG12: number
  archivedOverAge: number
  nextYear: string
  error?: string
}> {
  try {
    const supabase = createAdminClient()
    const { data: config } = await supabase
      .from("system_config")
      .select("id, school_year")
      .single()

    if (!config?.school_year) {
      return { success: false, graduatedG12: 0, promotedToG12: 0, archivedOverAge: 0, nextYear: "", error: "No school year configured." }
    }

    const currentYear = config.school_year

    // Step 1: Snapshot before any mutations
    await snapshotCurrentYearData(currentYear)

    // Step 2: Graduate & archive all current G12 (graduate_lock = true)
    const { data: g12Students, error: g12Err } = await supabase
      .from("students")
      .select("id")
      .eq("grade_level", "12")
      .in("status", ["Accepted", "Approved"])
      .or("mock.is.null,mock.eq.false")

    if (g12Err) throw g12Err

    const g12Ids = (g12Students || []).map((s: any) => s.id)
    if (g12Ids.length > 0) {
      const chunkSize = 50
      for (let i = 0; i < g12Ids.length; i += chunkSize) {
        const { error } = await supabase
          .from("students")
          .update({ is_archived: true, section_id: null, graduate_lock: true, grade_level: "GRADUATED" })
          .in("id", g12Ids.slice(i, i + chunkSize))
        if (error) throw error
      }
    }

    // Step 3: Get G11 students, split eligible vs overage
    const currentSYStart = parseInt(currentYear.split("-")[0])
    const { data: g11Students, error: g11Err } = await supabase
      .from("students")
      .select("id, school_year, gender, strand, section, section_id")
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

    // Step 4: Promote eligible G11 → G12 (gender-balance, same as accepting applicants)
    if ((toPromote || []).length > 0) {
      const assignments = await assignStudentsToSections(supabase, toPromote!, "12")

      const updatesBySection: Record<string, string[]> = {}
      for (const student of toPromote!) {
        const assigned = assignments[student.id]
        const key = assigned?.section_id ?? "null"
        if (!updatesBySection[key]) updatesBySection[key] = []
        updatesBySection[key].push(student.id)
      }

      for (const [secId, studentIds] of Object.entries(updatesBySection)) {
        const sectionId   = secId === "null" ? null : secId
        const sectionName = secId === "null" ? "Unassigned" : (assignments[studentIds[0]]?.section_name ?? "Unassigned")
        const chunkSize = 50
        for (let i = 0; i < studentIds.length; i += chunkSize) {
          const { error } = await supabase
            .from("students")
            .update({ grade_level: "12", section_id: sectionId, section: sectionName })
            .in("id", studentIds.slice(i, i + chunkSize))
          if (error) throw error
        }
        if (sectionId) {
          await supabase.from("attendance").update({ section: sectionName })
            .in("student_id", studentIds).neq("section", sectionName)
        }
      }
    }

    // Step 5: Archive overage G11
    if (toOverAge.length > 0) {
      const chunkSize = 50
      for (let i = 0; i < toOverAge.length; i += chunkSize) {
        const { error } = await supabase
          .from("students")
          .update({ is_archived: true })
          .in("id", toOverAge.slice(i, i + chunkSize))
        if (error) throw error
      }
    }

    // Step 6: Compute next school year
    const [startY, endY] = currentYear.split("-").map(Number)
    const nextYear = `${startY + 1}-${endY + 1}`

    // Step 7: Update system_config — advance year, close portal, clear dates
    const { error: configErr } = await supabase
      .from("system_config")
      .update({ school_year: nextYear, is_portal_active: false, enrollment_start: null, enrollment_end: null })
      .eq("id", config.id)
    if (configErr) throw configErr

    revalidateAll()
    revalidatePath("/admin/settings")
    return {
      success: true,
      graduatedG12: g12Ids.length,
      promotedToG12: (toPromote || []).length,
      archivedOverAge: toOverAge.length,
      nextYear,
    }
  } catch (err: any) {
    console.error("Advance School Year Error:", err)
    return { success: false, graduatedG12: 0, promotedToG12: 0, archivedOverAge: 0, nextYear: "", error: err?.message || "Unknown error" }
  }
}

export async function resetAllToGrade11(): Promise<{
  success: boolean; reset: number; error?: string
}> {
  try {
    const supabase = createAdminClient()

    // Fetch ALL students that are G12 or GRADUATED (archived or not), Accepted/Approved, non-mock
    const { data: students, error: fetchErr } = await supabase
      .from("students")
      .select("id, gender, strand")
      .in("grade_level", ["12", "GRADUATED"])
      .in("status", ["Accepted", "Approved"])
      .or("mock.is.null,mock.eq.false")

    if (fetchErr) throw fetchErr
    if (!students || students.length === 0) return { success: true, reset: 0 }

    // First unblock all of them so assignStudentsToSections can query G11 sections freely
    const ids = students.map((s: any) => s.id)
    const chunkSize = 50
    for (let i = 0; i < ids.length; i += chunkSize) {
      const { error } = await supabase
        .from("students")
        .update({ is_archived: false, graduate_lock: false, grade_level: "11", section_id: null, section: "Unassigned" })
        .in("id", ids.slice(i, i + chunkSize))
      if (error) throw error
    }

    // Now assign to G11 sections using gender-balance
    const assignments = await assignStudentsToSections(supabase, students, "11")

    // Group by assigned section for batched writes
    const updatesBySection: Record<string, string[]> = {}
    for (const student of students) {
      const assigned = assignments[student.id]
      const key = assigned?.section_id ?? "null"
      if (!updatesBySection[key]) updatesBySection[key] = []
      updatesBySection[key].push(student.id)
    }

    for (const [secId, studentIds] of Object.entries(updatesBySection)) {
      const sectionId   = secId === "null" ? null : secId
      const sectionName = secId === "null" ? "Unassigned" : (assignments[studentIds[0]]?.section_name ?? "Unassigned")
      for (let i = 0; i < studentIds.length; i += chunkSize) {
        const { error } = await supabase
          .from("students")
          .update({ section_id: sectionId, section: sectionName })
          .in("id", studentIds.slice(i, i + chunkSize))
        if (error) throw error
      }
    }

    revalidateAll()
    return { success: true, reset: students.length }
  } catch (err: any) {
    console.error("Reset All to G11 Error:", err)
    return { success: false, reset: 0, error: err?.message || "Unknown error" }
  }
}

export async function unarchiveSingleStudent(studentId: string): Promise<{
  success: boolean; error?: string
}> {
  try {
    const supabase = createAdminClient()
    const { data: student } = await supabase
      .from("students")
      .select("graduate_lock, section_id, grade_level")
      .eq("id", studentId)
      .single()

    if (student?.grade_level === "GRADUATED" || (student?.graduate_lock === true && student?.section_id === null)) {
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