"use client"

import { useState, useEffect, useRef } from "react"
import { BookOpen, Save, Loader2, Search, ChevronDown, Check, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase/admin-client"
import { toast } from "sonner"

// --- Custom Subject Select (for Gradebook View) ---
function SubjectSelect({ value, subjects, onChange, isDarkMode, error }: {
  value: string | null; subjects: any[]; onChange: (id: string) => void
  isDarkMode: boolean; error?: string
}) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState("")
  const ref               = useRef<HTMLDivElement>(null)
  
  const selected          = subjects.find(t => t.subject?.id === value)
  
  const filtered = query.trim()
    ? subjects.filter(t => t.subject?.name.toLowerCase().includes(query.toLowerCase()) || t.subject?.code.toLowerCase().includes(query.toLowerCase()))
    : subjects

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery("") }
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  return (
    <div ref={ref} className="relative w-full md:w-[280px]">
      <button type="button" onClick={() => { setOpen(v => !v); setQuery("") }}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all cursor-pointer select-none
          ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}
          ${open ? `ring-2 ring-blue-500/40 border-blue-500` : ""}
          ${error ? "border-red-500/60" : ""}`}>
        <div className="flex items-center gap-2 min-w-0">
          {selected ? (
            <span className={`text-sm font-bold truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              {selected.subject?.name}
            </span>
          ) : (
            <span className={`text-sm font-bold ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Select Subject</span>
          )}
        </div>
        <ChevronDown size={16} className={`flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""} ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
      </button>

      {open && (
        <div className={`absolute z-[100] mt-2 w-full rounded-2xl border shadow-2xl overflow-hidden
          ${isDarkMode ? "bg-slate-900 border-slate-800 shadow-black/60" : "bg-white border-slate-200 shadow-slate-200/80"}`}>
          <div className={`px-3 py-2.5 border-b ${isDarkMode ? "border-slate-800 bg-slate-950/60" : "border-slate-100 bg-slate-50"}`}>
            <div className="relative">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
              <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search subject..."
                className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs font-bold outline-none border
                  ${isDarkMode ? "bg-slate-900 border-slate-800 text-white placeholder-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"}`} />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1" style={{ scrollbarWidth: "none" }}>
            {filtered.length === 0 && (
              <div className={`px-3 py-6 text-center text-xs font-bold ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>No subjects enrolled</div>
            )}
            {filtered.map(t => (
              <button key={t.subject?.id} type="button"
                onClick={() => { onChange(t.subject?.id); setOpen(false); setQuery("") }}
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors
                  ${t.subject?.id === value 
                    ? (isDarkMode ? "bg-blue-600/20 text-blue-400" : "bg-blue-50 text-blue-600") 
                    : (isDarkMode ? "text-white hover:bg-slate-800" : "text-slate-900 hover:bg-slate-50")}`}>
                <span className="text-sm font-bold truncate text-left">{t.subject?.name}</span>
                {t.subject?.id === value && <Check size={16} className="flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function LMSDashboard({ sectionName, sectionId, strand, gradingSystem, isDarkMode, students, schoolYear }: any) {
  const [activeTab, setActiveTab] = useState('grades')
  const [enrolledSubjects, setEnrolledSubjects] = useState<any[]>([]) 
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  
  const [gradesData, setGradesData] = useState<Record<string, any>>({}) 
  const [studentEnrollmentMap, setStudentEnrollmentMap] = useState<Record<string, string>>({})
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // -- Manage Subjects Dialog State --
  const [isManageOpen, setIsManageOpen] = useState(false)
  const [masterSubjects, setMasterSubjects] = useState<any[]>([])
  const [selectedForEnrollment, setSelectedForEnrollment] = useState<string[]>([])
  const [enrolling, setEnrolling] = useState(false)

  const isTrimester = gradingSystem === 'Trimester'
  const quarters = isTrimester ? ['q1', 'q2', 'q3'] : ['q1', 'q2', 'q3', 'q4']

  const fetchEnrolledSubjects = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('student_subject_enrollment')
      .select('subject_id, subject:subjects(id, name, code, type)')
      .eq('section_id', sectionId)
      .eq('school_year', schoolYear)

    if (data && data.length > 0) {
      const uniqueSubjectsMap = new Map()
      data.forEach((row: any) => {
        if (row.subject && !uniqueSubjectsMap.has(row.subject.id)) {
          uniqueSubjectsMap.set(row.subject.id, row)
        }
      })
      const uniqueSubjects = Array.from(uniqueSubjectsMap.values())
      setEnrolledSubjects(uniqueSubjects)
      
      if (!selectedSubject || !uniqueSubjects.find(s => s.subject.id === selectedSubject)) {
        setSelectedSubject(uniqueSubjects[0].subject.id)
      }
    } else {
      setEnrolledSubjects([])
      setSelectedSubject(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEnrolledSubjects()
  }, [sectionId, schoolYear])

  useEffect(() => {
    if (!isManageOpen) return
    async function fetchMaster() {
      const { data } = await supabase.from('subjects').select('*').order('type', { ascending: true })
      if (data) {
        const filtered = data.filter(s => {
          if (s.type === 'Core' || s.type === 'Applied') return true
          if (strand && s.type.includes(`Specialized`) && s.type.includes(strand)) return true
          if (!strand) return true 
          return false
        })
        setMasterSubjects(filtered)
        const currentlyEnrolledIds = enrolledSubjects.map(s => s.subject.id)
        setSelectedForEnrollment(currentlyEnrolledIds)
      }
    }
    fetchMaster()
  }, [isManageOpen, strand, enrolledSubjects])

  const handleAssignSubjects = async () => {
    if (!students || students.length === 0) {
      toast.error("No students in this section to enroll.")
      return
    }

    setEnrolling(true)
    const toastId = toast.loading("Enrolling students...")

    try {
      const { data: existing } = await supabase
        .from('student_subject_enrollment')
        .select('student_id, subject_id')
        .eq('section_id', sectionId)

      const existingSet = new Set(existing?.map(e => `${e.student_id}_${e.subject_id}`) || [])

      const toInsert: any[] = []
      
      students.forEach((student: any) => {
        selectedForEnrollment.forEach(subjectId => {
          if (!existingSet.has(`${student.id}_${subjectId}`)) {
            toInsert.push({
              student_id: student.id,
              subject_id: subjectId,
              section_id: sectionId,
              school_year: schoolYear,
              term: 'Year-Round'
            })
          }
        })
      })

      if (toInsert.length > 0) {
        const { error } = await supabase.from('student_subject_enrollment').insert(toInsert)
        if (error) throw error
      }

      toast.success("Subjects successfully assigned!", { id: toastId })
      setIsManageOpen(false)
      fetchEnrolledSubjects()
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setEnrolling(false)
    }
  }

  useEffect(() => {
    if (!selectedSubject || !students || students.length === 0) {
      setGradesData({})
      setStudentEnrollmentMap({})
      return
    }

    async function fetchGrades() {
      const { data: enrollments } = await supabase
        .from('student_subject_enrollment')
        .select('id, student_id')
        .eq('section_id', sectionId)
        .eq('subject_id', selectedSubject)

      if (!enrollments) return

      const enrollMap: Record<string, string> = {}
      enrollments.forEach(e => { enrollMap[e.student_id] = e.id })
      setStudentEnrollmentMap(enrollMap)

      const enrollmentIds = enrollments.map(e => e.id)
      
      const { data: grades } = await supabase
        .from('grades')
        .select('*')
        .in('enrollment_id', enrollmentIds)

      const initialData: Record<string, any> = {}
      
      students.forEach((s: any) => {
        const eid = enrollMap[s.id]
        const existingGrade = grades?.find(g => g.enrollment_id === eid)
        
        initialData[s.id] = { 
          enrollment_id: eid,
          q1: existingGrade?.q1?.toString() || '', 
          q2: existingGrade?.q2?.toString() || '', 
          q3: existingGrade?.q3?.toString() || '', 
          q4: existingGrade?.q4?.toString() || '', 
          final: existingGrade?.final_rating?.toString() || '' 
        }
      })
      
      setGradesData(initialData)
    }
    
    fetchGrades()
  }, [selectedSubject, students, sectionId])

  const handleGradeChange = (studentId: string, quarter: string, value: string) => {
    if (value !== '' && isNaN(Number(value))) return
    if (Number(value) > 100) return

    setGradesData(prev => {
      const studentGrades = { ...prev[studentId], [quarter]: value }
      
      let sum = 0
      let count = 0
      quarters.forEach(q => {
        if (studentGrades[q]) { sum += Number(studentGrades[q]); count++ }
      })

      if (count > 0) {
        studentGrades.final = Math.round(sum / count).toString()
      } else {
        studentGrades.final = ''
      }

      return { ...prev, [studentId]: studentGrades }
    })
  }

  const handleSaveGrades = async () => {
    setSaving(true)
    const toastId = toast.loading("Saving grades...")

    try {
      const upserts = []
      
      for (const student of students) {
        const grades = gradesData[student.id]
        if (!grades || !grades.enrollment_id) continue
        
        const hasAnyGrade = quarters.some(q => grades[q])
        
        if (hasAnyGrade) {
          upserts.push({
            enrollment_id: grades.enrollment_id,
            q1: grades.q1 ? parseFloat(grades.q1) : null,
            q2: grades.q2 ? parseFloat(grades.q2) : null,
            q3: grades.q3 ? parseFloat(grades.q3) : null,
            q4: grades.q4 ? parseFloat(grades.q4) : null,
            final_rating: grades.final ? parseFloat(grades.final) : null,
            remarks: (grades.final && parseFloat(grades.final) >= 75) ? 'PASSED' : 'FAILED'
          })
        }
      }

      if (upserts.length > 0) {
        const { error } = await supabase.from('grades').upsert(upserts, { onConflict: 'enrollment_id' })
        if (error) throw error
      }

      toast.success("Grades saved successfully!", { id: toastId })
    } catch (error: any) {
      toast.error(error.message, { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`p-4 md:p-8 rounded-[30px] border shadow-2xl transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 border-white/5' : 'bg-white border-slate-200'}`}>
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BookOpen className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} size={24} />
            <h2 className={`text-xl md:text-2xl font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              LMS Gradebook
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              {sectionName} • {schoolYear}
            </p>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              {gradingSystem || 'Quarterly'}
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">

          {/* SUBJECT SELECTOR (Only Enrolled Subjects) */}
          <SubjectSelect 
            value={selectedSubject} 
            subjects={enrolledSubjects} 
            onChange={setSelectedSubject} 
            isDarkMode={isDarkMode} 
          />

          {/* MANAGE SUBJECTS BUTTON */}
          <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className={`flex-shrink-0 h-11 w-11 rounded-xl ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                <Plus size={18} />
              </Button>
            </DialogTrigger>
            <DialogContent className={`max-w-xl ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white'}`}>
              <DialogHeader>
                <DialogTitle className={`text-lg font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Assign Subjects to Section</DialogTitle>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Select subjects</p>
              </DialogHeader>
              
              <div className="max-h-[60vh] overflow-y-auto mt-4 space-y-2 pr-2" style={{ scrollbarWidth: "thin" }}>
                {masterSubjects.map(sub => {
                  const isSelected = selectedForEnrollment.includes(sub.id)
                  return (
                    <div 
                      key={sub.id} 
                      onClick={() => {
                        if (isSelected) {
                          setSelectedForEnrollment(prev => prev.filter(id => id !== sub.id))
                        } else {
                          setSelectedForEnrollment(prev => [...prev, sub.id])
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors
                        ${isSelected ? (isDarkMode ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-blue-50 border-blue-300 text-blue-700') 
                                     : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}
                      `}
                    >
                      <div>
                        <p className="font-bold text-sm">{sub.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{sub.type}</p>
                      </div>
                      <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-400'}`}>
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-end mt-4">
                <Button 
                  onClick={handleAssignSubjects} 
                  disabled={enrolling}
                  className="font-black uppercase tracking-widest text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {enrolling ? <Loader2 className="animate-spin mr-2" size={16} /> : <Check className="mr-2" size={16} />}
                  Enroll Section
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            onClick={handleSaveGrades} 
            disabled={saving || !selectedSubject}
            className={`w-full md:w-auto rounded-xl font-black uppercase tracking-wider text-xs transition-all active:scale-95 shadow-lg ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
            Save Grades
          </Button>
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              <tr>
                <th className="px-4 py-4 whitespace-nowrap">Student Name</th>
                {quarters.map((q, idx) => (
                  <th key={q} className="px-4 py-4 text-center">Q{idx+1}</th>
                ))}
                <th className="px-4 py-4 text-center border-l border-slate-200 dark:border-slate-800">Final</th>
                <th className="px-4 py-4 text-center">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
              {students?.length === 0 ? (
                <tr>
                  <td colSpan={isTrimester ? 6 : 7} className="px-4 py-12 text-center text-slate-500 italic font-bold">
                    No students enrolled in this section.
                  </td>
                </tr>
              ) : enrolledSubjects.length === 0 ? (
                <tr>
                  <td colSpan={isTrimester ? 6 : 7} className="px-4 py-12 text-center text-slate-500 font-bold">
                    <p>No subjects assigned.</p>
                    <p className="text-xs opacity-60 mt-1 font-normal">Click the <Plus size={12} className="inline mx-1"/> button above to enroll this section into subjects.</p>
                  </td>
                </tr>
              ) : (
                students?.map((student: any) => {
                  const grades = gradesData[student.id] || { q1: '', q2: '', q3: '', q4: '', final: '' }
                  const isPassed = Number(grades.final) >= 75
                  const hasFinal = grades.final !== ''
                  const hasEnrollment = !!studentEnrollmentMap[student.id]

                  return (
                    <tr key={student.id} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
                      <td className="px-4 py-3 whitespace-nowrap font-bold">
                        <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>
                          {student.last_name}, {student.first_name}
                        </span>
                      </td>
                      
                      {quarters.map((q) => (
                        <td key={q} className="px-2 py-3 text-center w-20">
                          <Input 
                            disabled={!hasEnrollment}
                            value={grades[q as keyof typeof grades]}
                            onChange={(e) => handleGradeChange(student.id, q, e.target.value)}
                            maxLength={3}
                            className={`w-14 h-9 text-center font-bold mx-auto border-transparent shadow-none focus-visible:ring-2 disabled:opacity-30 ${isDarkMode ? 'bg-slate-900 focus-visible:ring-blue-500' : 'bg-slate-100 focus-visible:ring-blue-400'}`}
                          />
                        </td>
                      ))}

                      <td className="px-4 py-3 text-center border-l border-slate-200 dark:border-slate-800">
                        <span className={`text-lg font-black ${!hasFinal ? 'text-slate-400 opacity-50' : isPassed ? 'text-emerald-500' : 'text-red-500'}`}>
                          {grades.final || '--'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {hasFinal && (
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${isPassed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {isPassed ? 'PASSED' : 'FAILED'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
