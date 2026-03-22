"use server"

import { supabase } from "@/lib/supabase/client"
import { revalidatePath } from "next/cache"

/**
 * DUAL-TABLE SNAPSHOT
 * Called automatically before school year changes and before grade level increases.
 * Writes real student counts into BOTH enrollment_history (dashboard) and
 * enrollment_predictions_data (predictive analytics) so they never diverge.
 */
export async function snapshotCurrentYearData(schoolYear: string): Promise<{
  success: boolean
  total: number
  error?: string
}> {
  if (!schoolYear) return { success: false, total: 0, error: "No school year provided." }
  try {
    const [maleRes, femaleRes, jhsRes, alsRes] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true })
        .eq("school_year", schoolYear).in("status", ["Accepted", "Approved"])
        .eq("gender", "Male").or("mock.is.null,mock.eq.false"),
      supabase.from("students").select("id", { count: "exact", head: true })
        .eq("school_year", schoolYear).in("status", ["Accepted", "Approved"])
        .eq("gender", "Female").or("mock.is.null,mock.eq.false"),
      supabase.from("students").select("id", { count: "exact", head: true })
        .eq("school_year", schoolYear).eq("student_category", "JHS")
        .in("status", ["Accepted", "Approved"]).or("mock.is.null,mock.eq.false"),
      supabase.from("students").select("id", { count: "exact", head: true })
        .eq("school_year", schoolYear).eq("student_category", "ALS")
        .in("status", ["Accepted", "Approved"]).or("mock.is.null,mock.eq.false"),
    ])

    const maleCount  = maleRes.count  || 0
    const femaleCount = femaleRes.count || 0
    const total = maleCount + femaleCount

    await Promise.all([
      // dashboard archives table
      supabase.from("enrollment_history").upsert({
        school_year:     schoolYear,
        male_total:      maleCount,
        female_total:    femaleCount,
        total_combined:  total,
        recorded_at:     new Date().toISOString(),
      }, { onConflict: "school_year" }),

      // predictive analytics table
      supabase.from("enrollment_predictions_data").upsert({
        id:                   crypto.randomUUID(),
        school_year:          schoolYear,
        total_enrolled:       total,
        jhs_graduates_count:  jhsRes.count  || 0,
        als_passers_count:    alsRes.count  || 0,
        others_count:         0,
        created_at:           new Date().toISOString(),
      }, { onConflict: "school_year" }),
    ])

    revalidatePath("/admin/dashboard")
    revalidatePath("/admin/predictive-analytics")
    return { success: true, total }
  } catch (error: any) {
    console.error("Snapshot Error:", error.message)
    return { success: false, total: 0, error: error.message }
  }
}

/**
 * Records or updates a yearly enrollment snapshot.
 * Uses .upsert() to overwrite existing records for the same year, 
 * which resolves the "unique constraint" error.
 */
export async function recordYearlySnapshot(year: string, maleCount: number, femaleCount: number) {
  try {
    const { data, error } = await supabase
      .from('enrollment_history')
      .upsert(
        { 
          school_year: year, 
          male_total: maleCount, 
          female_total: femaleCount,
          total_combined: maleCount + femaleCount,
          recorded_at: new Date().toISOString()
        },
        // CRITICAL: This tells Supabase to look for a conflict in 'school_year'
        // and perform an UPDATE instead of a fresh INSERT.
        { onConflict: 'school_year' } 
      )

    if (error) {
      console.error("❌ Snapshot Database Error:", error.message)
      return { success: false, error: error.message }
    }

    // Refresh the dashboard cache to show the new data immediately
    revalidatePath('/admin/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error("🔥 Snapshot Action Crash:", error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Retrieves all saved enrollment snapshots.
 * Ordered by school year descending.
 */
export async function getEnrollmentHistory() {
  try {
    const { data, error } = await supabase
      .from('enrollment_history')
      .select('*')
      .order('school_year', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error: any) {
    console.error("Fetch History Error:", error.message)
    return []
  }
}

/**
 * Deletes a specific yearly snapshot from the archives.
 */
export async function deleteSnapshot(id: string) {
  try {
    const { error } = await supabase
      .from('enrollment_history')
      .delete()
      .eq('id', id)

    if (error) throw error
    
    revalidatePath('/admin/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error("Delete Snapshot Error:", error.message)
    return { success: false, error: error.message }
  }
}