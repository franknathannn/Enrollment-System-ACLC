"use server"

import { createClient } from "@supabase/supabase-js"

const getAdminSupabase = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase URL or Service Role Key")
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function clearMockData(ids: string[]) {
  const supabase = getAdminSupabase()
  
  // 1. Delete references in attendance
  const { error: attErr } = await supabase.from('attendance').delete().in('student_id', ids)
  if (attErr) throw new Error(`attendance delete: ${attErr.message}`)

  // 2. Delete references in activity_logs
  const { error: logErr } = await supabase.from('activity_logs').delete().in('student_id', ids)
  if (logErr) throw new Error(`activity_logs delete: ${logErr.message}`)

  // 3. Delete students
  const { data, error: stErr } = await supabase.from('students').delete().in('id', ids).select('id')
  if (stErr) throw new Error(`students delete: ${stErr.message}`)
  
  return data?.length || 0
}
