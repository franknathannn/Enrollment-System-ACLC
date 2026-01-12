// src/lib/actions/enrolled.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getEnrolledStudents() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .in('status', ['Enrolled', 'Promoted', 'Graduated']) // Adjust statuses as needed
    .order('last_name', { ascending: true })

  if (error) throw error
  return data
}

export async function updateStudentInformation(id: string, data: any) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('students')
    .update(data)
    .eq('id', id)

  if (error) throw error

  revalidatePath("/admin/enrolled")
  return { success: true }
}

export async function toggleStudentLock(id: string, isLocked: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('students')
    .update({ is_locked: isLocked })
    .eq('id', id)

  if (error) throw error

  revalidatePath("/admin/sections")
  return { success: true }
}
