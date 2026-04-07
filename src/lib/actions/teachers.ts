"use server"

import { createAdminClient } from "@/lib/supabase/server"

// Finds a Supabase Auth user ID by email using the admin API.
// Needed because auth.admin has no direct getUserByEmail.
async function findAuthUserId(admin: ReturnType<typeof createAdminClient>, email: string): Promise<string | null> {
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users?.length) break
    const found = data.users.find((u) => u.email === email)
    if (found) return found.id
    if (data.users.length < 1000) break
    page++
  }
  return null
}

export async function createTeacherWithAuth(form: {
  full_name: string
  email: string
  password: string
  phone?: string
  subject_specialization?: string
  gender: string
}) {
  const admin = createAdminClient()
  const email = form.email.trim().toLowerCase()

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: form.password,
    email_confirm: true,
    user_metadata: { role: "teacher", full_name: form.full_name.trim() },
  })
  if (authErr) {
    if (authErr.message.toLowerCase().includes("already registered")) {
      throw new Error("Email already registered")
    }
    throw new Error(authErr.message)
  }

  // Try with auth_user_id first (requires the migration to have been run).
  // If the column doesn't exist yet, fall back to inserting without it.
  const baseRecord = {
    full_name:              form.full_name.trim(),
    email,
    password_hash:          "__supabase_auth__",
    phone:                  form.phone?.trim() || null,
    subject_specialization: form.subject_specialization?.trim() || null,
    gender:                 form.gender,
    is_active:              true,
  }

  let { error } = await admin.from("teachers").insert([{ ...baseRecord, auth_user_id: authData.user.id }])

  if (error?.message?.includes("auth_user_id")) {
    // Column doesn't exist yet — insert without it
    const fallback = await admin.from("teachers").insert([baseRecord])
    error = fallback.error
  }

  if (error) {
    await admin.auth.admin.deleteUser(authData.user.id)
    if (error.code === "23505") throw new Error("Email already registered")
    throw new Error(error.message)
  }
}

export async function updateTeacherWithAuth(
  id: string,
  updates: {
    full_name?: string
    email?: string
    phone?: string | null
    subject_specialization?: string | null
    gender?: string | null
    is_active?: boolean
    password?: string
  }
) {
  const admin = createAdminClient()

  const { data: teacher, error: fetchErr } = await admin
    .from("teachers")
    .select("auth_user_id, email")
    .eq("id", id)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)

  const payload: Record<string, unknown> = {}
  if (updates.full_name !== undefined)               payload.full_name = updates.full_name.trim()
  if (updates.email !== undefined)                   payload.email = updates.email.trim().toLowerCase()
  if (updates.phone !== undefined)                   payload.phone = updates.phone?.trim() || null
  if (updates.subject_specialization !== undefined)  payload.subject_specialization = updates.subject_specialization?.trim() || null
  if (updates.gender !== undefined)                  payload.gender = updates.gender || null
  if (updates.is_active !== undefined)               payload.is_active = updates.is_active

  const { error: updateErr } = await admin.from("teachers").update(payload).eq("id", id)
  if (updateErr) throw new Error(updateErr.message)

  // Resolve auth user ID: prefer stored value, fall back to email lookup
  const authUserId: string | null = teacher.auth_user_id
    ?? await findAuthUserId(admin, teacher.email)

  if (authUserId) {
    const authUpdates: Record<string, unknown> = {}
    if (updates.password) authUpdates.password = updates.password
    if (updates.email)    authUpdates.email = updates.email.trim().toLowerCase()
    if (Object.keys(authUpdates).length > 0) {
      const { error: authUpdateErr } = await admin.auth.admin.updateUserById(authUserId, authUpdates)
      if (authUpdateErr) throw new Error(authUpdateErr.message)
    }
    // Store auth_user_id if we found it via email lookup (requires migration)
    if (!teacher.auth_user_id) {
      await admin.from("teachers").update({ auth_user_id: authUserId }).eq("id", id)
    }
  } else if (updates.password) {
    // No auth account at all — create one now
    const email = updates.email?.trim().toLowerCase() ?? teacher.email
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email,
      password: updates.password,
      email_confirm: true,
      user_metadata: { role: "teacher" },
    })
    if (!authErr && authData?.user) {
      await admin.from("teachers").update({ auth_user_id: authData.user.id, password_hash: "__supabase_auth__" }).eq("id", id)
    }
  }
}

export async function deleteTeacherWithAuth(id: string) {
  const admin = createAdminClient()

  const { data: teacher } = await admin
    .from("teachers")
    .select("auth_user_id, email")
    .eq("id", id)
    .single()

  const { error } = await admin.from("teachers").delete().eq("id", id)
  if (error) throw new Error(error.message)

  const authUserId: string | null = teacher?.auth_user_id
    ?? (teacher?.email ? await findAuthUserId(admin, teacher.email) : null)

  if (authUserId) {
    await admin.auth.admin.deleteUser(authUserId)
  }
}
