"use server"

import { createAdminClient } from "@/lib/supabase/server"
import crypto from "crypto"

// ── Token helpers ─────────────────────────────────────────────────────────────

function generateCryptoToken(): string {
  return crypto.randomBytes(32).toString("hex") // 64-char hex
}

/**
 * Generate a setup token for a newly approved student.
 * Called from the /status page when a student clicks "Open" to create their account.
 */
export async function generateSetupToken(studentId: string): Promise<{ token: string | null; error?: string }> {
  const admin = createAdminClient()

  // Verify student exists and is eligible
  const { data: student } = await admin
    .from("students")
    .select("id, status, is_archived")
    .eq("id", studentId)
    .single()

  if (!student) return { token: null, error: "Student not found." }
  if (student.is_archived) return { token: null, error: "This record is archived." }
  if (student.status !== "Accepted" && student.status !== "Approved") {
    return { token: null, error: "Only accepted students can create an account." }
  }

  // Check if account already exists
  const { data: existing } = await admin.auth.admin.getUserById(studentId)
  if (existing?.user) return { token: null, error: "account_exists" }

  // Invalidate any previous unused setup tokens for this student
  await admin
    .from("password_reset_tokens")
    .update({ used: true })
    .eq("student_id", studentId)
    .eq("type", "setup")
    .eq("used", false)

  const token = generateCryptoToken()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

  const { error } = await admin.from("password_reset_tokens").insert({
    student_id: studentId,
    token,
    type: "setup",
    expires_at: expiresAt,
  })

  if (error) return { token: null, error: error.message }
  return { token }
}

/**
 * Validate a token — check it exists, isn't expired, isn't used.
 */
export async function validateToken(token: string): Promise<{
  valid: boolean
  studentId?: string
  type?: "setup" | "reset"
  error?: string
}> {
  if (!token || token.length !== 64) return { valid: false, error: "Invalid token format." }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("password_reset_tokens")
    .select("student_id, type, expires_at, used")
    .eq("token", token)
    .single()

  if (error || !data) return { valid: false, error: "Token not found." }
  if (data.used) return { valid: false, error: "This link has already been used." }
  if (new Date(data.expires_at) < new Date()) return { valid: false, error: "This link has expired." }

  return { valid: true, studentId: data.student_id, type: data.type }
}

/**
 * Mark a token as consumed (single-use).
 */
async function consumeToken(token: string) {
  const admin = createAdminClient()
  await admin.from("password_reset_tokens").update({ used: true }).eq("token", token)
}

// ── Account creation (token-based) ───────────────────────────────────────────

export async function createStudentAccount(token: string, password: string) {
  if (password.length < 8) return { error: "Password must be at least 8 characters." }

  // Validate token
  const validation = await validateToken(token)
  if (!validation.valid) return { error: validation.error || "Invalid or expired link." }
  if (validation.type !== "setup") return { error: "This link is not for account creation." }

  const studentId = validation.studentId!
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

  // Consume the token
  await consumeToken(token)

  return { success: true, studentId }
}

// ── Forgot password flow ─────────────────────────────────────────────────────

/**
 * Generate a reset token and send the email.
 * Called from the login page "Forgot Password" form.
 */
export async function generateResetToken(trackingPrefix: string): Promise<{ success: boolean; error?: string }> {
  if (!/^[0-9a-f]{8}$/i.test(trackingPrefix)) {
    return { success: false, error: "Invalid tracking ID format." }
  }

  const admin = createAdminClient()

  // Find the student by tracking prefix (first segment of UUID)
  const { data: studentId } = await admin.rpc("find_student_by_tracking_prefix", {
    p_prefix: trackingPrefix.toLowerCase(),
  })

  if (!studentId) return { success: false, error: "No student found with that tracking ID." }

  // Verify account exists (can't reset if never set up)
  const { data: existing } = await admin.auth.admin.getUserById(studentId)
  if (!existing?.user) {
    return { success: false, error: "No account exists for this student yet. Please create one first via the Status page." }
  }

  // Get student details for the email
  const { data: student } = await admin
    .from("students")
    .select("first_name, last_name, email, guardian_email")
    .eq("id", studentId)
    .single()

  if (!student) return { success: false, error: "Student record not found." }

  // Need a real email to send to
  const targetEmail = student.email || student.guardian_email
  if (!targetEmail) {
    return { success: false, error: "No email address on file. Please contact the admin physically to reset your password." }
  }

  // Invalidate any previous unused reset tokens
  await admin
    .from("password_reset_tokens")
    .update({ used: true })
    .eq("student_id", studentId)
    .eq("type", "reset")
    .eq("used", false)

  const token = generateCryptoToken()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

  const { error: insertError } = await admin.from("password_reset_tokens").insert({
    student_id: studentId,
    token,
    type: "reset",
    expires_at: expiresAt,
  })

  if (insertError) return { success: false, error: insertError.message }

  // The email is now sent automatically via a Supabase Edge Function 
  // triggered by a database webhook on the password_reset_tokens table.
  return { success: true }
}

/**
 * Reset student password using a valid reset token.
 */
export async function resetStudentPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  if (newPassword.length < 8) return { success: false, error: "Password must be at least 8 characters." }

  const validation = await validateToken(token)
  if (!validation.valid) return { success: false, error: validation.error || "Invalid or expired link." }
  if (validation.type !== "reset") return { success: false, error: "This link is not for password reset." }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(validation.studentId!, {
    password: newPassword,
  })

  if (error) return { success: false, error: error.message }

  await consumeToken(token)
  return { success: true }
}

// ── Existing helpers (unchanged) ──────────────────────────────────────────────

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
