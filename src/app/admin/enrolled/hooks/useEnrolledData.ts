// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\enrolled\hooks\useEnrolledData.ts

import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"

export function useEnrolledData() {
  const [students, setStudents] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStudents = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    try {
      // Fetch only students who are effectively enrolled (Approved status only per request)
      const [studentsRes, sectionsRes] = await Promise.all([
        supabase
          .from('students')
          .select('*')
          .eq('status', 'Approved')
          .order('last_name', { ascending: true }),
        supabase.from('sections').select('id, section_name, strand').order('section_name')
      ])
      
      if (studentsRes.error) throw studentsRes.error
      setStudents(studentsRes.data || [])
      setSections(sectionsRes.data || [])
    } catch (err) {
      console.error(err)
      if (!isBackground) toast.error("Failed to load enrolled students")
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, [])

  // Realtime subscription
  useEffect(() => {
    fetchStudents()
    const channel = supabase.channel('enrolled_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        fetchStudents(true)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchStudents])

  return { students, setStudents, sections, loading, fetchStudents }
}
