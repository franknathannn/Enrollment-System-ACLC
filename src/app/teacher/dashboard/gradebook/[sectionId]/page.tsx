"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Save, Loader2, Search, ChevronDown, Check, ShieldAlert, ArrowLeft, Lock, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/teacher-client"
import { toast } from "sonner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useTheme } from "@/hooks/useTheme"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { downloadSf9 } from "@/app/admin/lms/gradebook/api/exportSf9"

const CORE_VALUES = [
  {
    id: "maka-diyos",
    name: "Maka-Diyos",
    statements: [
      "Expresses one's spiritual beliefs while respecting the spiritual beliefs of others",
      "Shows adherence to ethical principles by upholding truth"
    ]
  },
  {
    id: "makatao",
    name: "Makatao",
    statements: [
      "Is sensitive to individual, social, and cultural differences",
      "Demonstrates contributions toward solidarity"
    ]
  },
  {
    id: "makakalikasan",
    name: "Makakalikasan",
    statements: [
      "Cares for the environment and utilizes resources wisely, judiciously, and economically"
    ]
  },
  {
    id: "makabansa",
    name: "Makabansa",
    statements: [
      "Demonstrates pride in being a Filipino; exercises the rights and responsibilities of a Filipino citizen",
      "Demonstrates appropriate behavior in carrying out activities in the school, community, and country"
    ]
  }
]

function SubjectSelect({ value, subjects, onChange, isDarkMode }: {
  value: string | null; subjects: any[]; onChange: (id: string) => void
  isDarkMode: boolean;
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
          ${open ? "ring-2 ring-blue-500/40 border-blue-500" : ""}`}>
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
              <div className={`px-3 py-6 text-center text-xs font-bold ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>No subjects available</div>
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

export default function TeacherGradebookPage() {
  const { sectionId } = useParams()
  const router = useRouter()
  const { isDarkMode } = useTheme()

  const [section, setSection] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [enrolledSubjects, setEnrolledSubjects] = useState<any[]>([]) 
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  
  const [gradesData, setGradesData] = useState<Record<string, any>>({}) 
  const [coreValuesData, setCoreValuesData] = useState<Record<string, any>>({})
  const [studentEnrollmentMap, setStudentEnrollmentMap] = useState<Record<string, string>>({})
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [isAdviser, setIsAdviser] = useState(false)
  
  const [activeTab, setActiveTab] = useState("numerical")
  const [coreValueQuarterView, setCoreValueQuarterView] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  const [schoolYear, setSchoolYear] = useState("2025-2026")

  useEffect(() => {
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (!user || user.user_metadata?.role !== "teacher") {
          router.replace("/teacher/login")
          return
        }

        const { data: teacher, error: teacherErr } = await supabase
          .from("teachers")
          .select("id")
          .eq("email", user.email!)
          .single()
        
        if (teacherErr || !teacher) {
          router.replace("/teacher/login")
          return
        }

        const { data: cfg } = await supabase.from('system_config').select('school_year').single()
        const sy = cfg?.school_year || "2025-2026"
        setSchoolYear(sy)

        const { data: secData, error: secErr } = await supabase
          .from('sections')
          .select('*')
          .eq('id', sectionId)
          .single()

        if (secErr || !secData) {
          toast.error("Section not found")
          router.push("/teacher/dashboard")
          return
        }
        setSection(secData)

        const adviserStatus = secData.adviser_id === teacher.id
        setIsAdviser(adviserStatus)

        // Fetch teacher's schedules for this section
        const { data: mySchedules } = await supabase
          .from('schedules')
          .select('subject')
          .eq('section', secData.section_name)
          .eq('teacher_id', teacher.id)
          
        const mySubjectNames = mySchedules?.map(s => s.subject) || []

        if (!adviserStatus && mySubjectNames.length === 0) {
          setAccessDenied(true)
          setLoading(false)
          return
        }

        // Fetch students
        const { data: stdData } = await supabase
          .from('students')
          .select('id, first_name, last_name, gender')
          .eq('section_id', secData.id)
          .in('status', ['Accepted', 'Approved'])
          .order('last_name', { ascending: true })

        setStudents(stdData || [])

        // Fetch enrolled subjects
        const { data: subData } = await supabase
          .from('student_subject_enrollment')
          .select('subject_id, subject:subjects(id, name, code, type)')
          .eq('section_id', secData.id)
          .eq('school_year', sy)

        if (subData && subData.length > 0) {
          const uniqueSubjectsMap = new Map()
          subData.forEach((row: any) => {
            if (row.subject && !uniqueSubjectsMap.has(row.subject.id)) {
              if (adviserStatus || mySubjectNames.includes(row.subject.name) || mySubjectNames.includes(row.subject.code)) {
                uniqueSubjectsMap.set(row.subject.id, row)
              }
            }
          })
          const uniqueSubjects = Array.from(uniqueSubjectsMap.values())
          setEnrolledSubjects(uniqueSubjects)
          if (uniqueSubjects.length > 0) {
            setSelectedSubject(uniqueSubjects[0].subject.id)
          }
        }

        // Fetch Core Values
        const { data: cvData } = await supabase
          .from('lms_core_values')
          .select('*')
          .eq('school_year', sy)
          .in('student_id', stdData?.map(s => s.id) || [])
          
        const cvMap: Record<string, any> = {}
        stdData?.forEach(s => {
          cvMap[s.id] = {}
          CORE_VALUES.forEach(cv => {
            cv.statements.forEach(stmt => {
              const existing = cvData?.find(d => d.student_id === s.id && d.core_value === cv.id && d.behavior_statement === stmt)
              cvMap[s.id][`${cv.id}_${stmt}`] = {
                q1: existing?.q1 || '',
                q2: existing?.q2 || '',
                q3: existing?.q3 || '',
                q4: existing?.q4 || ''
              }
            })
          })
        })
        setCoreValuesData(cvMap)
        
      } catch (e: any) {
        toast.error(e.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [sectionId, router])

  useEffect(() => {
    if (!selectedSubject || students.length === 0 || !section) return

    async function fetchNumericalGrades() {
      const { data: enrollments } = await supabase
        .from('student_subject_enrollment')
        .select('id, student_id')
        .eq('section_id', section.id)
        .eq('subject_id', selectedSubject)

      if (!enrollments) return

      const enrollMap: Record<string, string> = {}
      enrollments.forEach(e => { enrollMap[e.student_id] = e.id })
      setStudentEnrollmentMap(enrollMap)

      const enrollmentIds = enrollments.map(e => e.id)
      if (enrollmentIds.length === 0) return
      
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
    
    fetchNumericalGrades()
  }, [selectedSubject, students, section])

  const isTrimester = section?.lms_grading_system === 'Trimester'
  const allQuarters = isTrimester ? ['q1', 'q2', 'q3'] : ['q1', 'q2', 'q3', 'q4']
  const coreValuesQuarters = coreValueQuarterView === 'all' ? allQuarters : [coreValueQuarterView]

  const filteredStudents = students.filter((s: any) => {
    if (!searchQuery.trim()) return true
    const term = searchQuery.toLowerCase()
    return s.first_name?.toLowerCase().includes(term) || s.last_name?.toLowerCase().includes(term)
  })

  // Separate males and females and sort
  const males = filteredStudents.filter(s => s.gender === 'Male').sort((a,b) => a.last_name.localeCompare(b.last_name))
  const females = filteredStudents.filter(s => s.gender === 'Female').sort((a,b) => a.last_name.localeCompare(b.last_name))

  const handleNumericalChange = (studentId: string, quarter: string, value: string) => {
    if (value !== '' && isNaN(Number(value))) return
    if (Number(value) > 100) return
    setHasUnsavedChanges(true)

    setGradesData(prev => {
      const studentGrades = { ...prev[studentId], [quarter]: value }
      
      let sum = 0
      let count = 0
      allQuarters.forEach(q => {
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

  const handleCoreValueChange = (studentId: string, cvId: string, stmt: string, quarter: string, value: string) => {
    const valid = ['AO', 'SO', 'RO', 'NO', '']
    const upper = value.toUpperCase()
    if (!valid.includes(upper) && upper !== 'A' && upper !== 'S' && upper !== 'R' && upper !== 'N') return
    
    setHasUnsavedChanges(true)

    const prevVal = coreValuesData[studentId]?.[`${cvId}_${stmt}`]?.[quarter] || ''
    
    let finalVal = upper
    
    if (prevVal.length === 2 && upper.length === 1 && prevVal.startsWith(upper)) {
      finalVal = ''
    } else {
      if (upper === 'A') finalVal = 'AO'
      if (upper === 'S') finalVal = 'SO'
      if (upper === 'R') finalVal = 'RO'
      if (upper === 'N') finalVal = 'NO'
    }

    setCoreValuesData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [`${cvId}_${stmt}`]: {
          ...prev[studentId][`${cvId}_${stmt}`],
          [quarter]: finalVal
        }
      }
    }))
  }

  const handleSaveAll = async () => {
    setSaving(true)
    const toastId = toast.loading("Saving gradebook...")

    try {
      if (selectedSubject) {
        const numUpserts = []
        for (const student of students) {
          const grades = gradesData[student.id]
          if (!grades || !grades.enrollment_id) continue
          
          const hasAnyGrade = allQuarters.some(q => grades[q])
          if (hasAnyGrade) {
            numUpserts.push({
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
        if (numUpserts.length > 0) {
          const { error } = await supabase.from('grades').upsert(numUpserts, { onConflict: 'enrollment_id' })
          if (error) throw error
        }
      }

      const cvUpserts = []
      for (const student of students) {
        const cData = coreValuesData[student.id]
        if (!cData) continue
        
        for (const cv of CORE_VALUES) {
          for (const stmt of cv.statements) {
            const vals = cData[`${cv.id}_${stmt}`]
            if (!vals) continue
            
            const hasAny = allQuarters.some(q => vals[q])
            if (hasAny) {
              cvUpserts.push({
                student_id: student.id,
                school_year: schoolYear,
                core_value: cv.id,
                behavior_statement: stmt,
                q1: vals.q1 || null,
                q2: vals.q2 || null,
                q3: vals.q3 || null,
                q4: vals.q4 || null
              })
            }
          }
        }
      }
      
      if (cvUpserts.length > 0) {
        const { error } = await supabase.from('lms_core_values').upsert(cvUpserts, { onConflict: 'student_id, school_year, core_value, behavior_statement' })
        if (error) throw error
      }

      toast.success("Gradebook saved successfully!", { id: toastId })
      setHasUnsavedChanges(false)
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  const handleExportSF9 = (term: string) => {
    downloadSf9({
      sectionName: section?.section_name || 'Unknown',
      gradeLevel: section?.grade_level || '',
      strand: section?.strand || '',
      schoolYear,
      students,
      gradesData,
      coreValuesData,
      term
    })
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-500">Loading Gradebook...</p>
        </div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className={`p-8 rounded-3xl border text-center max-w-md ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-widest mb-2">Access Denied</h2>
          <p className={`text-sm mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            You do not have permission to view this gradebook. Only the section adviser and assigned subject teachers can access it.
          </p>
          <Button onClick={() => router.push('/teacher/dashboard')} className="w-full font-bold">
            Return to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const renderNumericalRows = (studentGroup: any[], groupName: string) => {
    if (studentGroup.length === 0) return null
    return (
      <>
        <tr className={isDarkMode ? 'bg-slate-900/80' : 'bg-slate-100/80'}>
          <td colSpan={isTrimester ? 6 : 7} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            {groupName} ({studentGroup.length})
          </td>
        </tr>
        {studentGroup.map((student: any, idx: number) => {
          const grades = gradesData[student.id] || { q1: '', q2: '', q3: '', q4: '', final: '' }
          const isPassed = Number(grades.final) >= 75
          const hasFinal = grades.final !== ''
          const hasEnrollment = !!studentEnrollmentMap[student.id]

          return (
            <tr key={student.id} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
              <td className={`px-4 py-3 whitespace-nowrap font-bold sticky left-0 z-10 border-r ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] w-4 text-right font-black opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{idx + 1}.</span>
                  <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>
                    {student.last_name}, {student.first_name}
                  </span>
                </div>
              </td>
              
              {allQuarters.map((q) => (
                <td key={q} className="px-2 py-3 text-center w-20">
                  <Input 
                    disabled={!hasEnrollment}
                    value={grades[q as keyof typeof grades]}
                    onChange={(e) => handleNumericalChange(student.id, q, e.target.value)}
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
        })}
      </>
    )
  }

  const renderCoreValueRows = (studentGroup: any[], groupName: string) => {
    if (studentGroup.length === 0) return null
    return (
      <>
        <tr className={isDarkMode ? 'bg-slate-900/80' : 'bg-slate-100/80'}>
          <td colSpan={100} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest sticky left-0 z-10 border-r ${isDarkMode ? 'bg-slate-900/80 border-slate-800 text-blue-400' : 'bg-slate-100/80 border-slate-200 text-blue-600'}`}>
            {groupName} ({studentGroup.length})
          </td>
        </tr>
        {studentGroup.map((student: any, idx: number) => (
          <tr key={student.id} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
            <td className={`px-4 py-3 whitespace-nowrap font-bold sticky left-0 z-10 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} border-r`}>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] w-4 text-right font-black opacity-50 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{idx + 1}.</span>
                <span className={isDarkMode ? 'text-white' : 'text-slate-900'}>
                  {student.last_name}, {student.first_name}
                </span>
              </div>
            </td>
            
            {CORE_VALUES.map(cv => (
              cv.statements.map((stmt, i) => (
                coreValuesQuarters.map((q, j) => {
                  const val = coreValuesData[student.id]?.[`${cv.id}_${stmt}`]?.[q] || ''
                  return (
                    <td key={`${cv.id}-${i}-${q}`} className={`px-1 py-2 text-center border-l ${j === 0 ? (isDarkMode ? 'border-slate-800' : 'border-slate-200') : 'border-transparent'}`}>
                      <Input 
                        value={val}
                        onChange={(e) => handleCoreValueChange(student.id, cv.id, stmt, q, e.target.value)}
                        maxLength={2}
                        className={`w-10 h-8 text-[10px] px-1 text-center font-black uppercase mx-auto border-transparent shadow-none focus-visible:ring-2 ${isDarkMode ? 'bg-slate-900 focus-visible:ring-blue-500' : 'bg-slate-100 focus-visible:ring-blue-400'}
                          ${val === 'AO' ? 'text-emerald-500' : val === 'SO' ? 'text-blue-500' : val === 'RO' ? 'text-amber-500' : val === 'NO' ? 'text-red-500' : ''}
                        `}
                      />
                    </td>
                  )
                })
              ))
            ))}
          </tr>
        ))}
      </>
    )
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 px-6 py-4 border-b flex items-center justify-between ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'} backdrop-blur-xl`}>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/teacher/dashboard')} className="rounded-xl">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
              Gradebook
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                {section?.section_name}
              </span>
            </h1>
            <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>{schoolYear}</span>
              <span>•</span>
              <span>Total: {students.length}</span>
              <span>•</span>
              <span className="text-blue-500">M: {males.length}</span>
              <span className="text-pink-500">F: {females.length}</span>
              {isAdviser && (
                <>
                  <span>•</span>
                  <span className="text-emerald-500 border border-emerald-500/30 px-1.5 rounded bg-emerald-500/10">Adviser Mode</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hasUnsavedChanges && (
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 rounded-md animate-pulse">
              Unsaved Changes
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-xl font-bold px-4 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white">
                <FileDown size={16} className="mr-2" />
                SF9 <ChevronDown size={14} className="ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}>
              {!isTrimester ? (
                <>
                  <DropdownMenuItem onClick={() => handleExportSF9('SEM 1')} className="font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800">SEM 1</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportSF9('SEM 2')} className="font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800">SEM 2</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => handleExportSF9('SEM 1')} className="font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800">SEM 1</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportSF9('SEM 3')} className="font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800">SEM 3</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            onClick={handleSaveAll} 
            disabled={saving} 
            className={`rounded-xl font-bold px-6 shadow-md transition-all duration-300
              ${hasUnsavedChanges 
                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white scale-105 shadow-xl shadow-orange-500/40 animate-pulse ring-4 ring-orange-500/30"
                : isDarkMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
          >
            {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
            Save Changes
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className={`px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b ${isDarkMode ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-100/50'}`}>
            <div className="flex items-center gap-4">
              <TabsList className={`rounded-full p-1 h-auto ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}>
                <TabsTrigger value="numerical" className="rounded-full px-6 py-2 text-xs font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  Numerical Grades
                </TabsTrigger>
                <TabsTrigger value="core" className="rounded-full px-6 py-2 text-xs font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  DepEd Core Values
                </TabsTrigger>
              </TabsList>
              
              {activeTab === 'numerical' && (
                <SubjectSelect 
                  value={selectedSubject} 
                  subjects={enrolledSubjects} 
                  onChange={setSelectedSubject} 
                  isDarkMode={isDarkMode} 
                />
              )}
            </div>

            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} size={16} />
              <Input 
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-9 w-64 rounded-xl border-transparent focus-visible:ring-2 ${isDarkMode ? 'bg-slate-900 focus-visible:ring-blue-500' : 'bg-white focus-visible:ring-blue-400 shadow-sm'}`}
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 p-6 overflow-hidden">
            {/* NUMERICAL GRADES */}
            <TabsContent value="numerical" className="mt-0 h-full min-h-0 overflow-hidden outline-none flex flex-col">
              <div className={`rounded-2xl border overflow-auto flex-1 ${isDarkMode ? 'border-slate-800 bg-slate-900/20' : 'border-slate-200 bg-white'}`} style={{ scrollbarWidth: "thin" }}>
                <table className="w-full text-sm text-left relative">
                  <thead className={`text-[10px] font-black uppercase tracking-widest sticky top-0 z-20 ${isDarkMode ? 'bg-slate-900 text-slate-400 shadow-sm shadow-black/50' : 'bg-slate-100 text-slate-500 shadow-sm shadow-slate-200'}`}>
                    <tr>
                      <th className={`px-4 py-4 whitespace-nowrap sticky left-0 z-30 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'} border-b border-r`}>Student Name</th>
                      {allQuarters.map((q, idx) => (
                        <th key={q} className={`px-4 py-4 text-center border-b ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-100'}`}>Q{idx+1}</th>
                      ))}
                      <th className={`px-4 py-4 text-center border-l border-b ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-100'}`}>Final</th>
                      <th className={`px-4 py-4 text-center border-b ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-100'}`}>Remarks</th>
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
                        No subjects assigned to this section yet.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {renderNumericalRows(males, "Male")}
                      {renderNumericalRows(females, "Female")}
                      {filteredStudents.length === 0 && (
                        <tr>
                          <td colSpan={isTrimester ? 6 : 7} className="px-4 py-12 text-center text-slate-500 font-bold">
                            No students found matching your search.
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
              </div>
            </TabsContent>

            {/* CORE VALUES */}
            <TabsContent value="core" className="mt-0 h-full min-h-0 overflow-hidden outline-none flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 flex-shrink-0">
                <div className={`flex items-center gap-2 text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <ShieldAlert size={14} className="text-blue-500" />
                  Scale: AO (Always Observed), SO (Sometimes Observed), RO (Rarely Observed), NO (Not Observed)
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Quarter View:</span>
                  <div className={`flex rounded-lg p-1 border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <button 
                      onClick={() => setCoreValueQuarterView('all')}
                      className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${coreValueQuarterView === 'all' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      All
                    </button>
                    {allQuarters.map((q, i) => (
                      <button 
                        key={q}
                        onClick={() => setCoreValueQuarterView(q)}
                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${coreValueQuarterView === q ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        Q{i+1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border overflow-auto flex-1 ${isDarkMode ? 'border-slate-800 bg-slate-900/20' : 'border-slate-200 bg-white'}`} style={{ scrollbarWidth: "thin" }}>
                <table className="w-full text-sm text-left relative border-collapse">
                  <thead className={`text-[10px] font-black uppercase tracking-widest sticky top-0 z-30 ${isDarkMode ? 'bg-slate-900 text-slate-400 shadow-sm shadow-black/50' : 'bg-slate-100 text-slate-500 shadow-sm shadow-slate-200'}`}>
                    <tr>
                      <th className={`px-4 py-4 whitespace-nowrap min-w-[200px] sticky left-0 z-40 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'} border-r border-b`}>Student Name</th>
                      {CORE_VALUES.map(cv => (
                        <th key={cv.id} className={`px-4 py-4 border-l border-b ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-100'}`} colSpan={cv.statements.length * coreValuesQuarters.length}>
                          {cv.name}
                        </th>
                      ))}
                    </tr>
                    <tr className={`${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                      <th className={`px-4 py-2 sticky left-0 z-40 border-r border-b ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}></th>
                      {CORE_VALUES.map(cv => (
                        cv.statements.map((stmt, i) => (
                          <th key={i} colSpan={coreValuesQuarters.length} className={`px-2 py-2 border-l border-b text-[9px] max-w-[150px] leading-tight ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-100'}`}>
                            <div className="truncate" title={stmt}>{stmt}</div>
                          </th>
                        ))
                      ))}
                    </tr>
                    <tr className={`${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                      <th className={`px-4 py-1 sticky left-0 z-40 border-r border-b ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}></th>
                      {CORE_VALUES.map(cv => (
                        cv.statements.map((_, i) => (
                          coreValuesQuarters.map((q, j) => (
                            <th key={`${i}-${j}`} className={`px-1 py-1 text-center border-l border-b ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'} ${j === 0 ? (isDarkMode ? 'border-slate-800' : 'border-slate-200') : 'border-transparent'}`}>
                              {q.toUpperCase()}
                            </th>
                          ))
                        ))
                      ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                  {students?.length === 0 ? (
                    <tr>
                      <td colSpan={100} className="px-4 py-12 text-center text-slate-500 italic font-bold">
                        No students enrolled in this section.
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={100} className="px-4 py-12 text-center text-slate-500 font-bold">
                        No students found matching your search.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {renderCoreValueRows(males, "Male")}
                      {renderCoreValueRows(females, "Female")}
                    </>
                  )}
                </tbody>
              </table>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  )
}
