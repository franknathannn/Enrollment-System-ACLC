"use server"

import { createAdminClient } from "@/lib/supabase/server"

export async function createStudentAccount(studentId: string, password: string) {
  if (password.length < 8) return { error: "Password must be at least 8 characters." }

  const admin = createAdminClient()

  // Verify student exists, is enrolled, and is not archived
  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id, status, is_archived")
    .eq("id", studentId)
    .single()

  if (studentError || !student) return { error: "Student record not found." }
  if (student.is_archived) return { error: "This record is archived." }
  if (student.status !== "Accepted" && student.status !== "Approved") {
    return { error: "Only accepted or approved students can create an account." }
  }

  // Check if account already exists
  const { data: existing } = await admin.auth.admin.getUserById(studentId)
  if (existing?.user) return { error: "account_exists" }

  // Create auth user with the same UUID as students.id
  const { error: createError } = await admin.auth.admin.createUser({
    id: studentId,
    email: `${studentId}@student.portal`,
    password,
    email_confirm: true,
    app_metadata: { role: "student" },
  })

  if (createError) return { error: createError.message }
  return { success: true }
}

export async function checkStudentAccount(studentId: string): Promise<{ exists: boolean }> {
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.getUserById(studentId)
  return { exists: !!data?.user }
}

// Resolves the 8-char tracking prefix (first UUID segment) to a full student email.
// Uses a SECURITY DEFINER RPC function to avoid PostgREST column-cast limitations.
export async function resolveTrackingPrefix(prefix: string): Promise<{ email: string | null }> {
  if (!/^[0-9a-f]{8}$/i.test(prefix)) return { email: null }

  const admin = createAdminClient()

  const { data, error } = await admin.rpc("find_student_by_tracking_prefix", {
    p_prefix: prefix.toLowerCase(),
  })

  if (error || !data) return { email: null }
  return { email: `${data}@student.portal` }
}

// Used by setup page to verify the student before showing the form
export async function getStudentSetupData(studentId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("students")
    .select("id, first_name, last_name, lrn, status, is_archived")
    .eq("id", studentId)
    .single()
  return data
}
