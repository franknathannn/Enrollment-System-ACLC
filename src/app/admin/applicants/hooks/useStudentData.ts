import { useState, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"

export function useStudentData() {
  const [students, setStudents] = useState<any[]>([])
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [strandStats, setStrandStats] = useState<Record<string, boolean>>({ ICT: false, GAS: false })
  const [sections, setSections] = useState<any[]>([])

  const fetchStrandStats = useCallback(async () => {
    const { data: sections } = await supabase
      .from('sections')
      .select('strand, capacity, students(status)')

    if (sections) {
      const stats: Record<string, boolean> = {}
      const strands = ['ICT', 'GAS']
      strands.forEach(strand => {
        const strandSecs = sections.filter((s: any) => s.strand === strand)
        const totalCap = strandSecs.reduce((sum, s) => sum + (s.capacity || 0), 0)
        const totalEnrolled = strandSecs.reduce((sum, s) => 
          sum + s.students.filter((st: any) => st.status === 'Approved' || st.status === 'Accepted').length, 0)
        stats[strand] = totalEnrolled >= totalCap && totalCap > 0
      })
      setStrandStats(stats)
    }
  }, [])

  const fetchStudents = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    try {
      const [studentsRes, configRes, sectionsRes] = await Promise.all([
        supabase.from('students')
        .select('id, lrn, first_name, last_name, middle_name, gender, strand, contact_no, phone, email, gwa_grade_10, profile_picture, status, decline_reason, guardian_name, guardian_contact, section_id, school_year, form_138_url, good_moral_url, created_at, cor_url, af5_url, diploma_url, age, civil_status, last_school_attended, guardian_first_name, guardian_middle_name, guardian_last_name, student_category, two_by_two_url, guardian_phone, birth_date, religion, address, updated_at, registrar_feedback, section')
        .order('created_at', { ascending: false })
        .range(0, 5999),
        supabase.from('system_config').select('school_year').single(),
        supabase.from('sections').select('id, section_name, strand').order('section_name')
      ])
      if (studentsRes.error) throw studentsRes.error
      setStudents(studentsRes.data || [])
      if (sectionsRes.data) setSections(sectionsRes.data)
      if (configRes.data) setConfig(configRes.data)
      fetchStrandStats()
    } catch (err) {
      if (!isBackground) toast.error("Failed to load registrar database")
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, [fetchStrandStats])

  return { students, setStudents, config, loading, fetchStudents, strandStats, fetchStrandStats, sections }
}