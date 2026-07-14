"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Save, Loader2, Search, ChevronDown, Check, ShieldAlert, Lock, Unlock, FileDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/teacher-client"
import { toast } from "sonner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { downloadSf9 } from "@/app/admin/lms/gradebook/api/exportSf9"
import type { TeacherSession, ScheduleRow } from "../types"

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

interface GradebookTabProps {
  dm: boolean
  session: TeacherSession
  schedules: ScheduleRow[]
  advisorySections: string[]
  schoolYear: string
}

export function GradebookTab({ dm, session, schedules, advisorySections, schoolYear }: GradebookTabProps) {
  const [selectedSectionName, setSelectedSectionName] = useState<string>("")
  const [section, setSection] = useState<any>(null)
  const [enrolledSubjects, setEnrolledSubjects] = useState<any[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [subjectsLoading, setSubjectsLoading] = useState(false)

  const [students, setStudents] = useState<any[]>([])
  const [gradesData, setGradesData] = useState<Record<string, any>>({})
  const [coreValuesData, setCoreValuesData] = useState<Record<string, any>>({})
  const [studentEnrollmentMap, setStudentEnrollmentMap] = useState<Record<string, string>>({})

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("numerical")
  const [coreValueQuarterView, setCoreValueQuarterView] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isAdviser, setIsAdviser] = useState(false)

  const [isLocked, setIsLocked] = useState(true)
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<any | null>(null)

  const allSections = useMemo(() => {
    const teachingSections = schedules.map((s) => s.section).filter(Boolean)
    const combined = [...new Set([...teachingSections, ...advisorySections])].sort()
    return combined
  }, [schedules, advisorySections])

  useEffect(() => {
    if (allSections.length > 0 && !selectedSectionName) {
      setSelectedSectionName(allSections[0])
    }
  }, [allSections, selectedSectionName])

  useEffect(() => {
    if (!selectedSectionName) return

    async function loadSectionAndSubjects() {
      setSubjectsLoading(true)
      try {
        const { data: secData, error: secErr } = await supabase
          .from("sections")
          .select("*")
          .eq("section_name", selectedSectionName)
          .single()

        if (secErr || !secData) {
          toast.error("Section details not found")
          return
        }
        setSection(secData)

        const adviserStatus = secData.adviser_id === session.id
        setIsAdviser(adviserStatus)

        const mySubjectNames = schedules
          .filter((s) => s.section === selectedSectionName)
          .map((s) => s.subject)

        const { data: subData } = await supabase
          .from("student_subject_enrollment")
          .select("subject_id, subject:subjects(id, name, code, type)")
          .eq("section_id", secData.id)
          .eq("school_year", schoolYear)

        if (subData && subData.length > 0) {
          const uniqueSubjectsMap = new Map()
          subData.forEach((row: any) => {
            if (row.subject && !uniqueSubjectsMap.has(row.subject.id)) {
              if (
                adviserStatus ||
                mySubjectNames.includes(row.subject.name) ||
                mySubjectNames.includes(row.subject.code)
              ) {
                uniqueSubjectsMap.set(row.subject.id, row)
              }
            }
          })
          const uniqueSubjects = Array.from(uniqueSubjectsMap.values())
          setEnrolledSubjects(uniqueSubjects)
          
          if (uniqueSubjects.length > 0) {
            setSelectedSubjectId(uniqueSubjects[0].subject.id)
          } else {
            setSelectedSubjectId(null)
          }
        } else {
          setEnrolledSubjects([])
          setSelectedSubjectId(null)
        }
      } catch (err: any) {
        toast.error("Error loading subjects: " + err.message)
      } finally {
        setSubjectsLoading(false)
      }
    }

    loadSectionAndSubjects()
    setIsLocked(true)
  }, [selectedSectionName, schoolYear, session.id, schedules])

  useEffect(() => {
    if (!section) return

    async function loadGradingData() {
      setLoading(true)
      try {
        const { data: stdData, error: stdErr } = await supabase
          .from("students")
          .select("id, first_name, last_name, middle_name, gender, lrn, profile_picture, two_by_two_url")
          .eq("section_id", section.id)
          .in("status", ["Accepted", "Approved"])
          .order("last_name", { ascending: true })

        if (stdErr) throw stdErr
        const activeStudents = stdData || []
        setStudents(activeStudents)

        if (selectedSubjectId && activeStudents.length > 0) {
          const { data: enrollments } = await supabase
            .from("student_subject_enrollment")
            .select("id, student_id")
            .eq("section_id", section.id)
            .eq("subject_id", selectedSubjectId)

          const enrollMap: Record<string, string> = {}
          if (enrollments) {
            enrollments.forEach((e) => {
              enrollMap[e.student_id] = e.id
            })
          }
          setStudentEnrollmentMap(enrollMap)

          const enrollmentIds = enrollments?.map((e) => e.id) || []
          let grades: any[] = []

          if (enrollmentIds.length > 0) {
            const { data: grData } = await supabase
              .from("grades")
              .select("*")
              .in("enrollment_id", enrollmentIds)
            grades = grData || []
          }

          const initialGrades: Record<string, any> = {}
          activeStudents.forEach((s: any) => {
            const eid = enrollMap[s.id]
            const existingGrade = grades.find((g) => g.enrollment_id === eid)

            initialGrades[s.id] = {
              enrollment_id: eid,
              q1: existingGrade?.q1?.toString() || "",
              q2: existingGrade?.q2?.toString() || "",
              q3: existingGrade?.q3?.toString() || "",
              q4: existingGrade?.q4?.toString() || "",
              final: existingGrade?.final_rating?.toString() || ""
            }
          })
          setGradesData(initialGrades)
        }

        if (activeStudents.length > 0) {
          const { data: cvData } = await supabase
            .from("lms_core_values")
            .select("*")
            .eq("school_year", schoolYear)
            .in("student_id", activeStudents.map((s) => s.id))

          const cvMap: Record<string, any> = {}
          activeStudents.forEach((s) => {
            cvMap[s.id] = {}
            CORE_VALUES.forEach((cv) => {
              cv.statements.forEach((stmt) => {
                const existing = cvData?.find(
                  (d) =>
                    d.student_id === s.id &&
                    d.core_value === cv.id &&
                    d.behavior_statement === stmt
                )
                cvMap[s.id][`${cv.id}_${stmt}`] = {
                  q1: existing?.q1 || "",
                  q2: existing?.q2 || "",
                  q3: existing?.q3 || "",
                  q4: existing?.q4 || ""
                }
              })
            })
          })
          setCoreValuesData(cvMap)
        }
      } catch (err: any) {
        toast.error("Error loading grading data: " + err.message)
      } finally {
        setLoading(false)
      }
    }

    loadGradingData()
    setIsLocked(true)
  }, [selectedSubjectId, section, schoolYear])

  const isTrimester = section?.lms_grading_system === "Trimester"
  const allQuarters = isTrimester ? ["q1", "q2", "q3"] : ["q1", "q2", "q3", "q4"]
  const coreValuesQuarters = coreValueQuarterView === "all" ? allQuarters : [coreValueQuarterView]

  const filteredStudents = students.filter((s: any) => {
    if (!searchQuery.trim()) return true
    const term = searchQuery.toLowerCase()
    return (
      s.first_name?.toLowerCase().includes(term) ||
      s.last_name?.toLowerCase().includes(term) ||
      (s.middle_name && s.middle_name.toLowerCase().includes(term)) ||
      (s.lrn && s.lrn.toLowerCase().includes(term))
    )
  })

  const males = filteredStudents.filter((s) => s.gender === "Male").sort((a, b) => a.last_name.localeCompare(b.last_name))
  const females = filteredStudents.filter((s) => s.gender === "Female").sort((a, b) => a.last_name.localeCompare(b.last_name))

  const handleNumericalChange = (studentId: string, quarter: string, value: string) => {
    if (isLocked) return
    if (value !== "" && isNaN(Number(value))) return
    if (Number(value) > 100) return
    setHasUnsavedChanges(true)

    setGradesData((prev) => {
      const studentGrades = { ...prev[studentId], [quarter]: value }
      let sum = 0
      let count = 0
      allQuarters.forEach((q) => {
        if (studentGrades[q]) {
          sum += Number(studentGrades[q])
          count++
        }
      })

      if (count > 0) {
        studentGrades.final = Math.round(sum / count).toString()
      } else {
        studentGrades.final = ""
      }

      return { ...prev, [studentId]: studentGrades }
    })
  }

  const handleCoreValueChange = (studentId: string, cvId: string, stmt: string, quarter: string, value: string) => {
    if (isLocked) return
    const valid = ["AO", "SO", "RO", "NO", ""]
    const upper = value.toUpperCase()
    if (!valid.includes(upper) && upper !== "A" && upper !== "S" && upper !== "R" && upper !== "N") return

    setHasUnsavedChanges(true)
    const prevVal = coreValuesData[studentId]?.[`${cvId}_${stmt}`]?.[quarter] || ""
    let finalVal = upper

    if (prevVal.length === 2 && upper.length === 1 && prevVal.startsWith(upper)) {
      finalVal = ""
    } else {
      if (upper === "A") finalVal = "AO"
      if (upper === "S") finalVal = "SO"
      if (upper === "R") finalVal = "RO"
      if (upper === "N") finalVal = "NO"
    }

    setCoreValuesData((prev) => ({
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
    const toastId = toast.loading("Saving grades...")

    try {
      if (selectedSubjectId) {
        const numUpserts = []
        for (const student of students) {
          const grades = gradesData[student.id]
          if (!grades || !grades.enrollment_id) continue

          const hasAnyGrade = allQuarters.some((q) => grades[q])
          if (hasAnyGrade) {
            numUpserts.push({
              enrollment_id: grades.enrollment_id,
              q1: grades.q1 ? parseFloat(grades.q1) : null,
              q2: grades.q2 ? parseFloat(grades.q2) : null,
              q3: grades.q3 ? parseFloat(grades.q3) : null,
              q4: grades.q4 ? parseFloat(grades.q4) : null,
              final_rating: grades.final ? parseFloat(grades.final) : null,
              remarks: grades.final && parseFloat(grades.final) >= 75 ? "PASSED" : "FAILED"
            })
          }
        }
        if (numUpserts.length > 0) {
          const { error } = await supabase.from("grades").upsert(numUpserts, { onConflict: "enrollment_id" })
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

            const hasAny = allQuarters.some((q) => vals[q])
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
        const { error } = await supabase.from("lms_core_values").upsert(cvUpserts, {
          onConflict: "student_id, school_year, core_value, behavior_statement"
        })
        if (error) throw error
      }

      toast.success("Gradebook saved successfully!", { id: toastId })
      setHasUnsavedChanges(false)
      setIsLocked(true)
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  const handleExportSF9 = (term: string) => {
    downloadSf9({
      sectionName: section?.section_name || "Unknown",
      gradeLevel: section?.grade_level || "",
      strand: section?.strand || "",
      schoolYear,
      students,
      gradesData,
      coreValuesData,
      term
    })
  }

  const handleExportSingleSF9 = (term: string) => {
    if (!selectedStudentForModal) return
    downloadSf9({
      sectionName: section?.section_name || "Unknown",
      gradeLevel: section?.grade_level || "",
      strand: section?.strand || "",
      schoolYear,
      students: [selectedStudentForModal],
      gradesData,
      coreValuesData,
      term
    })
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Custom Warm light theme & Premium glowing dark theme
  const cardBg = dm ? "border-slate-700/80 bg-slate-955/40 backdrop-blur-md" : "border-[#E3DFD5] bg-white"
  const tableHeaderBg = dm
    ? "bg-slate-900/90 text-slate-400 border-b border-slate-700"
    : "bg-[#FAF8F2] text-[#8F8A7D] border-[#E3DFD5]"
  const subText = dm ? "text-slate-400" : "text-[#8F8A7D]"
  const headText = dm ? "text-white" : "text-slate-900"

  const renderNumericalRows = (studentGroup: any[], groupName: string) => {
    if (studentGroup.length === 0) return null
    return (
      <>
        <tr className={`border-b ${dm ? "bg-slate-900/60 border-slate-700" : "bg-[#F2EFE8] border-[#E3DFD5]"}`}>
          <td
            colSpan={isTrimester ? 6 : 7}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest ${
              groupName === "Female" ? "text-pink-500" : (dm ? "text-blue-400" : "text-[#706B5F]")
            }`}
          >
            {groupName} ({studentGroup.length})
          </td>
        </tr>
        {studentGroup.map((student: any, idx: number) => {
          const grades = gradesData[student.id] || { q1: "", q2: "", q3: "", q4: "", final: "" }
          const isPassed = Number(grades.final) >= 75
          const hasFinal = grades.final !== ""
          const hasEnrollment = !!studentEnrollmentMap[student.id]

          return (
            <tr
              key={student.id}
              className={`transition-all duration-150 border-b hover:bg-blue-50/40 hover:border-[#3b82f6]/40 dark:hover:bg-blue-950/30 dark:hover:shadow-[inset_4px_0_0_#3b82f6] ${
                dm ? "bg-slate-950/20 border-slate-750" : "bg-white border-[#E3DFD5]"
              }`}
            >
              <td
                className={`px-4 py-3 whitespace-nowrap font-bold sticky left-0 z-10 border-r border-b ${
                  dm ? "bg-slate-950 border-slate-750" : "bg-white border-[#E3DFD5]"
                }`}
              >
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setSelectedStudentForModal(student)}>
                  <span className={`text-[10px] w-4 text-right font-black opacity-50 ${dm ? "text-slate-400" : "text-[#8F8A7D]"}`}>
                    {idx + 1}.
                  </span>
                  <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-black border ${
                    dm ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-[#F2EFE8] border-[#E3DFD5] text-[#706B5F]"
                  }`}>
                    {student.two_by_two_url || student.profile_picture ? (
                      <img src={student.two_by_two_url || student.profile_picture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (student.first_name?.[0] || "") + (student.last_name?.[0] || "")
                    )}
                  </div>
                  <div className="leading-tight flex flex-col">
                    <span className={`${dm ? "text-white group-hover:text-blue-400" : "text-[#2C2A24] group-hover:text-blue-600"} transition-colors`}>
                      {student.last_name}, {student.first_name}
                    </span>
                    <span className={`text-[9px] font-medium font-mono ${dm ? "text-slate-500" : "text-[#8F8A7D]"}`}>
                      {student.lrn}
                    </span>
                  </div>
                </div>
              </td>

              {allQuarters.map((q) => (
                <td key={q} className="px-2 py-3 text-center w-20">
                  <Input
                    disabled={!hasEnrollment || isLocked}
                    value={grades[q as keyof typeof grades]}
                    onChange={(e) => handleNumericalChange(student.id, q, e.target.value)}
                    maxLength={3}
                    className={`w-14 h-9 text-center font-bold mx-auto border-transparent shadow-none focus-visible:ring-2 disabled:opacity-30 ${
                      dm ? "bg-slate-900/60 text-white focus-visible:ring-blue-500" : "bg-[#F0EEE6] text-[#2C2A24] focus-visible:ring-[#8F8A7D]"
                    }`}
                  />
                </td>
              ))}

              <td className={`px-4 py-3 text-center border-l border-b ${dm ? "border-slate-750" : "border-[#E3DFD5]"}`}>
                <span
                  className={`text-lg font-black ${!hasFinal ? "text-slate-400 opacity-50" : isPassed ? "text-emerald-500" : "text-red-500"}`}
                >
                  {grades.final || "--"}
                </span>
              </td>

              <td className="px-4 py-3 text-center">
                {hasFinal && (
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                      isPassed ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {isPassed ? "PASSED" : "FAILED"}
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
        <tr className={`border-b ${dm ? "bg-slate-900/60 border-slate-700" : "bg-[#F2EFE8] border-[#E3DFD5]"}`}>
          <td
            colSpan={100}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest sticky left-0 z-10 border-r ${groupName === "Female" ? "text-pink-500" : (dm ? "bg-slate-900/60 border-slate-700 text-blue-400" : "bg-[#F2EFE8] border-[#E3DFD5] text-[#706B5F]")}`}
          >
            {groupName} ({studentGroup.length})
          </td>
        </tr>
        {studentGroup.map((student: any, idx: number) => (
          <tr
            key={student.id}
            className={`transition-all duration-150 border-b hover:bg-blue-50/40 hover:border-[#3b82f6]/40 dark:hover:bg-blue-950/30 dark:hover:shadow-[inset_4px_0_0_#3b82f6] ${
              dm ? "bg-slate-955/20 border-slate-800" : "bg-white border-[#E3DFD5]"
            }`}
          >
            <td
              className={`px-4 py-3 whitespace-nowrap font-bold sticky left-0 z-10 border-b ${
                dm ? "bg-slate-950 border-slate-750" : "bg-white border-[#E3DFD5]"
              } border-r`}
            >
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setSelectedStudentForModal(student)}>
                <span className={`text-[10px] w-4 text-right font-black opacity-50 ${dm ? "text-slate-400" : "text-[#8F8A7D]"}`}>
                  {idx + 1}.
                </span>
                <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-black border ${
                  dm ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-[#F2EFE8] border-[#E3DFD5] text-[#706B5F]"
                }`}>
                  {student.two_by_two_url || student.profile_picture ? (
                    <img src={student.two_by_two_url || student.profile_picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (student.first_name?.[0] || "") + (student.last_name?.[0] || "")
                  )}
                </div>
                <div className="leading-tight flex flex-col">
                  <span className={`${dm ? "text-white group-hover:text-blue-400" : "text-[#2C2A24] group-hover:text-blue-600"} transition-colors`}>
                    {student.last_name}, {student.first_name}
                  </span>
                  <span className={`text-[9px] font-medium font-mono ${dm ? "text-slate-500" : "text-[#8F8A7D]"}`}>
                    {student.lrn}
                  </span>
                </div>
              </div>
            </td>

            {CORE_VALUES.map((cv) =>
              cv.statements.map((stmt, i) =>
                coreValuesQuarters.map((q, j) => {
                  const val = coreValuesData[student.id]?.[`${cv.id}_${stmt}`]?.[q] || ""
                  return (
                    <td
                      key={`${cv.id}-${i}-${q}`}
                      className={`px-1 py-2 text-center border-l ${
                        j === 0 ? (dm ? "border-slate-800" : "border-[#E3DFD5]") : "border-transparent"
                      }`}
                    >
                      <Input
                        disabled={isLocked}
                        value={val}
                        onChange={(e) => handleCoreValueChange(student.id, cv.id, stmt, q, e.target.value)}
                        maxLength={2}
                        className={`w-10 h-8 text-[10px] px-1 text-center font-black uppercase mx-auto border-transparent shadow-none focus-visible:ring-2 disabled:opacity-30 ${
                          dm ? "bg-slate-900/60 text-white focus-visible:ring-blue-500" : "bg-[#F0EEE6] text-[#2C2A24] focus-visible:ring-[#8F8A7D]"
                        }
                          ${val === "AO" ? "text-emerald-500" : val === "SO" ? "text-blue-500" : val === "RO" ? "text-amber-500" : val === "NO" ? "text-red-500" : ""}
                        `}
                      />
                    </td>
                  )
                })
              )
            )}
          </tr>
        ))}
      </>
    )
  }

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {styleTag(dm)}
      
      {/* ── HEADER PANEL ── */}
      <div className={`flex flex-col gap-6 rounded-[28px] p-6 sm:p-8 text-white relative overflow-hidden transition-all duration-300 ${
        dm 
          ? "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-slate-800/80 shadow-[0_0_30px_rgba(59,130,246,0.1)]" 
          : "bg-[#0D2447] border border-[#0D2447] shadow-lg shadow-[#0d2447]/10"
      }`}>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/[0.04] blur-2xl rounded-full" />
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-[0.08em] font-serif">GRADEBOOK MANAGER</h2>
            <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] mt-1 ${dm ? "text-indigo-200" : "text-[#7B94B6]"}`}>
              SELECT A SECTION AND SUBJECT TO START ENTERING GRADES
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border flex items-center gap-1.5 backdrop-blur-sm transition-all ${
              isLocked 
                ? "bg-rose-500/10 border-rose-500/30 text-rose-500" 
                : "bg-[#059669]/10 border-[#059669]/35 text-[#34D399]"
            }`}>
              <Lock size={10} className={isLocked ? "text-rose-500" : "text-[#34D399]"} />
              {isLocked ? "EDITING DISABLED" : "EDITING ENABLED"}
            </span>
          </div>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row gap-5">
          <div className="flex-1 flex flex-col gap-1.5">
            <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${dm ? "text-indigo-200" : "text-[#7B94B6]"}`}>SECTION</span>
            <div className="relative">
              <select
                value={selectedSectionName}
                onChange={(e) => setSelectedSectionName(e.target.value)}
                className={`w-full h-12 px-4 rounded-xl text-white font-black uppercase tracking-widest text-[10px] outline-none backdrop-blur-sm border transition-all appearance-none cursor-pointer ${
                  dm ? "bg-slate-900/60 border-slate-700/80 focus:bg-slate-800" : "bg-white/10 border-white/20 focus:bg-white/20"
                }`}
              >
                <option value="" disabled className="text-slate-900">Select Section</option>
                {allSections.map((secName) => (
                  <option key={secName} value={secName} className="text-slate-900">{secName}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-1.5">
            <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${dm ? "text-indigo-200" : "text-[#7B94B6]"}`}>SUBJECT</span>
            <div className="relative">
              <select
                value={selectedSubjectId || ""}
                onChange={(e) => setSelectedSubjectId(e.target.value || null)}
                disabled={subjectsLoading || enrolledSubjects.length === 0}
                className={`w-full h-12 px-4 rounded-xl text-white font-black uppercase tracking-widest text-[10px] outline-none backdrop-blur-sm border transition-all appearance-none cursor-pointer disabled:opacity-40 ${
                  dm ? "bg-slate-900/60 border-slate-700/80 focus:bg-slate-800" : "bg-white/10 border-white/20 focus:bg-white/20"
                }`}
              >
                {subjectsLoading ? (
                  <option className="text-slate-900">Loading subjects...</option>
                ) : enrolledSubjects.length === 0 ? (
                  <option className="text-slate-900">No subjects taught</option>
                ) : (
                  <>
                    <option value="" disabled className="text-slate-900">Select Subject</option>
                    {enrolledSubjects.map((row) => (
                      <option key={row.subject.id} value={row.subject.id} className="text-slate-900">
                        {row.subject.name} ({row.subject.code})
                      </option>
                    ))}
                  </>
                )}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
            </div>
          </div>
        </div>
      </div>

      {selectedSectionName && selectedSubjectId && !loading && (
        <div className={`p-6 rounded-[28px] border transition-all duration-300 ${cardBg}`}>
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsLocked(!isLocked)}
                className={`h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all active:scale-95 cursor-pointer ${
                  isLocked
                    ? (dm 
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20" 
                        : "bg-[#E5E2D9] border-[#D1CCC0] text-[#5C5648] hover:bg-[#DDD9CD]")
                    : (dm 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" 
                        : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100")
                }`}
              >
                {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                {isLocked ? "Unlock to Edit" : "Lock Editing"}
              </button>

              <button
                onClick={handleSaveAll}
                disabled={saving || isLocked}
                className={`h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all active:scale-95 disabled:opacity-40 disabled:scale-100 cursor-pointer ${
                  dm 
                    ? "bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30" 
                    : "bg-[#E5E2D9] border-[#D1CCC0] text-[#5C5648] hover:bg-[#DDD9CD]"
                }`}
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save Grades
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all active:scale-95 cursor-pointer ${
                      dm 
                        ? "bg-slate-900 border-slate-700 text-white hover:bg-slate-850" 
                        : "bg-[#E5E2D9] border-[#D1CCC0] text-[#5C5648] hover:bg-[#DDD9CD]"
                    }`}
                  >
                    <FileDown size={12} />
                    SF9 Report
                    <ChevronDown size={10} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className={dm ? "bg-slate-900 border-slate-800 text-white" : "bg-[#FAF8F2] border-[#E3DFD5] text-[#2C2A24]"}>
                  {!isTrimester ? (
                    <>
                      <DropdownMenuItem onClick={() => handleExportSF9("SEM 1")} className={`font-bold cursor-pointer ${dm ? "text-white hover:bg-slate-800 focus:bg-slate-850" : "text-[#2C2A24] hover:bg-slate-100 focus:bg-slate-100"}`}>SEM 1</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportSF9("SEM 2")} className={`font-bold cursor-pointer ${dm ? "text-white hover:bg-slate-800 focus:bg-slate-850" : "text-[#2C2A24] hover:bg-slate-100 focus:bg-slate-100"}`}>SEM 2</DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => handleExportSF9("SEM 1")} className={`font-bold cursor-pointer ${dm ? "text-white hover:bg-slate-800 focus:bg-slate-850" : "text-[#2C2A24] hover:bg-slate-100 focus:bg-slate-100"}`}>SEM 1</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportSF9("SEM 3")} className={`font-bold cursor-pointer ${dm ? "text-white hover:bg-slate-800 focus:bg-slate-850" : "text-[#2C2A24] hover:bg-slate-100 focus:bg-slate-100"}`}>SEM 3</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm ${dm ? "border-slate-800 bg-slate-900" : "border-[#D1CCC0] bg-[#FAF8F2]"}`}>
                <img src="/logo-aclc.png" alt="" className="w-5 h-5 object-contain" />
              </div>

              {hasUnsavedChanges && (
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-500 animate-pulse ml-2">
                  UNSAVED CHANGES
                </span>
              )}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${dm ? "text-slate-500" : "text-[#8F8A7D]"}`} size={14} />
              <input
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-9 pr-4 py-2 w-full h-10 rounded-xl text-xs font-bold outline-none border transition-all ${
                  dm 
                    ? "bg-slate-900/60 border-slate-800 text-white focus:border-blue-500" 
                    : "bg-[#FAF8F2] border-[#D1CCC0] text-[#2C2A24] placeholder-[#8F8A7D] focus:border-[#8F8A7D] shadow-sm"
                }`}
              />
            </div>
          </div>

          <div className="w-full">
            <div className="flex border-b border-[#E3DFD5] dark:border-slate-800 mb-6">
              <button
                onClick={() => setActiveTab("numerical")}
                className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all relative cursor-pointer ${
                  activeTab === "numerical"
                    ? (dm ? "text-blue-400 font-bold" : "text-slate-900 font-bold")
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
              >
                Numerical Grades
                {activeTab === "numerical" && (
                  <span className={`absolute bottom-0 left-0 right-0 h-0.5 ${dm ? "bg-blue-500" : "bg-[#0D2447]"}`} />
                )}
              </button>
              <button
                onClick={() => setActiveTab("core")}
                className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all relative cursor-pointer ${
                  activeTab === "core"
                    ? (dm ? "text-blue-400" : "text-slate-900")
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
              >
                DepEd Core Values
                {activeTab === "core" && (
                  <span className={`absolute bottom-0 left-0 right-0 h-0.5 ${dm ? "bg-blue-500" : "bg-[#0D2447]"}`} />
                )}
              </button>
            </div>

            {activeTab === "numerical" && (
              <div className={`rounded-2xl border overflow-auto relative ${cardBg}`} style={{ scrollbarWidth: "thin" }}>
                {!dm && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] z-0">
                    <img src="/logo-aclc.png" alt="" className="w-96 h-96 object-contain" />
                  </div>
                )}
                
                <table className="w-full text-sm text-left relative z-10 border-collapse">
                  <thead className={`text-[10px] font-black uppercase tracking-widest sticky top-0 z-20 border-b ${tableHeaderBg}`}>
                    <tr>
                      <th className={`px-4 py-4 whitespace-nowrap sticky left-0 z-30 ${dm ? "bg-slate-900 border-slate-800" : "bg-[#FAF8F2] border-[#E3DFD5]"} border-r`}>
                        Student Name
                      </th>
                      {allQuarters.map((q, idx) => (
                        <th key={q} className="px-4 py-4 text-center">
                          Q{idx + 1}
                        </th>
                      ))}
                      <th className={`px-4 py-4 text-center border-l ${dm ? "border-slate-800" : "border-[#E3DFD5]"}`}>
                        Final
                      </th>
                      <th className="px-4 py-4 text-center">
                        Remarks
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${dm ? "divide-slate-800/50" : "divide-[#E3DFD5]"}`}>
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={isTrimester ? 6 : 7} className="px-4 py-12 text-center text-slate-500 italic font-bold">
                          No students enrolled in this section.
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
            )}

            {activeTab === "core" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className={`flex items-center gap-2 text-xs font-bold ${subText}`}>
                    <ShieldAlert size={14} className="text-blue-500 shrink-0" />
                    Scale: AO (Always Observed), SO (Sometimes Observed), RO (Rarely Observed), NO (Not Observed)
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-widest ${dm ? "text-slate-500" : "text-[#8F8A7D]"}`}>
                      Quarter View:
                    </span>
                    <div className={`flex rounded-lg p-1 border ${dm ? "bg-slate-900 border-slate-800" : "bg-white border-[#E3DFD5] shadow-sm"}`}>
                      <button
                        onClick={() => setCoreValueQuarterView("all")}
                        className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${
                          coreValueQuarterView === "all" ? "bg-blue-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-750 dark:hover:text-slate-355"
                        }`}
                      >
                        All
                      </button>
                      {allQuarters.map((q, i) => (
                        <button
                          key={q}
                          onClick={() => setCoreValueQuarterView(q)}
                          className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${
                            coreValueQuarterView === q ? "bg-blue-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-750 dark:hover:text-slate-355"
                          }`}
                        >
                          Q{i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`rounded-2xl border overflow-auto ${cardBg}`} style={{ scrollbarWidth: "thin" }}>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className={`text-[10px] font-black uppercase tracking-widest sticky top-0 z-30 border-b ${tableHeaderBg}`}>
                      <tr>
                        <th className={`px-4 py-4 whitespace-nowrap min-w-[200px] sticky left-0 z-40 ${dm ? "bg-slate-900 border-slate-800" : "bg-[#FAF8F2] border-[#E3DFD5]"} border-r`}>
                          Student Name
                        </th>
                        {CORE_VALUES.map((cv) => (
                          <th
                            key={cv.id}
                            className={`px-4 py-4 border-l ${dm ? "border-slate-800 bg-slate-900" : "border-[#E3DFD5] bg-[#FAF8F2]"}`}
                            colSpan={cv.statements.length * coreValuesQuarters.length}
                          >
                            {cv.name}
                          </th>
                        ))}
                      </tr>
                      <tr className={dm ? "bg-slate-900/40 border-slate-800" : "bg-[#FAF8F2] border-[#E3DFD5]"}>
                        <th className={`px-4 py-2 sticky left-0 z-40 border-r ${dm ? "bg-slate-900 border-slate-800" : "bg-[#FAF8F2] border-[#E3DFD5]"}`}></th>
                        {CORE_VALUES.map((cv) =>
                          cv.statements.map((stmt, i) => (
                            <th
                              key={i}
                              colSpan={coreValuesQuarters.length}
                              className={`px-2 py-2 border-l text-[9px] max-w-[150px] leading-tight ${
                                dm ? "border-slate-800 bg-slate-900/60" : "border-[#E3DFD5] bg-[#FAF8F2]"
                              }`}
                            >
                              <div className="truncate" title={stmt}>
                                {stmt}
                              </div>
                            </th>
                          ))
                        )}
                      </tr>
                      <tr className={dm ? "bg-slate-900/40 border-slate-800" : "bg-[#FAF8F2] border-[#E3DFD5]"}>
                        <th className={`px-4 py-1 sticky left-0 z-40 border-r ${dm ? "bg-slate-900 border-slate-800" : "bg-[#FAF8F2] border-[#E3DFD5]"}`}></th>
                        {CORE_VALUES.map((cv) =>
                          cv.statements.map((_, i) =>
                            coreValuesQuarters.map((q, j) => (
                              <th
                                key={`${i}-${j}`}
                                className={`px-1 py-1 text-center border-l ${dm ? "bg-slate-900/20" : "bg-[#FAF8F2]"} ${
                                  j === 0 ? (dm ? "border-slate-800" : "border-[#E3DFD5]") : "border-transparent"
                                }`}
                              >
                                {q.toUpperCase()}
                              </th>
                            ))
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${dm ? "divide-slate-800/50" : "divide-[#E3DFD5]"}`}>
                      {students.length === 0 ? (
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
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="py-20 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Loading student grades...</p>
        </div>
      )}

      {(!selectedSectionName || !selectedSubjectId) && !loading && (
        <div className={`p-16 rounded-[28px] border text-center transition-all duration-350 ${dm ? "border-slate-850 bg-slate-955/20" : "border-[#E3DFD5] bg-white"}`}>
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 ${dm ? "bg-slate-900 border border-slate-800" : "bg-[#F2EFE8]"}`}>
            <Lock className="text-[#8F8A7D] w-6 h-6" />
          </div>
          <p className={`text-sm font-black uppercase tracking-widest ${headText}`}>Gradebook Locked</p>
          <p className={`text-xs mt-1 ${subText} max-w-sm mx-auto`}>
            Please select both a **Section** and a **Subject** above to load the student grade rosters and begin editing.
          </p>
        </div>
      )}

      {/* Student Detail Card Modal */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md p-6 rounded-[28px] border shadow-2xl relative animate-in zoom-in-95 duration-200 ${
            dm ? "bg-slate-900 border-slate-800 text-white" : "bg-[#FAF8F2] border-[#E3DFD5] text-[#2C2A24]"
          }`}>
            <button
              onClick={() => setSelectedStudentForModal(null)}
              className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
                dm ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-[#EBE8DF] text-slate-500"
              }`}
            >
              <X size={16} />
            </button>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`w-28 h-28 rounded-full overflow-hidden border-2 shadow-md ${
                dm ? "border-slate-700 bg-slate-855" : "border-[#D1CCC0] bg-white"
              }`}>
                {selectedStudentForModal.two_by_two_url || selectedStudentForModal.profile_picture ? (
                  <img src={selectedStudentForModal.two_by_two_url || selectedStudentForModal.profile_picture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-black uppercase text-[#8F8A7D]">
                    {(selectedStudentForModal.first_name?.[0] || "") + (selectedStudentForModal.last_name?.[0] || "")}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">
                  {selectedStudentForModal.last_name}, {selectedStudentForModal.first_name}
                </h3>
                <p className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest mt-1">
                  LRN: {selectedStudentForModal.lrn}
                </p>
              </div>

              <div className={`w-full border-t border-b py-3 grid grid-cols-2 gap-2 text-left text-xs ${
                dm ? "border-slate-800 text-slate-400" : "border-[#E3DFD5] text-[#706B5F]"
              }`}>
                <div>
                  <span className="font-bold block uppercase tracking-widest text-[8px] text-slate-400">Gender</span>
                  <span className="font-black text-sm">{selectedStudentForModal.gender}</span>
                </div>
                <div>
                  <span className="font-bold block uppercase tracking-widest text-[8px] text-slate-400">Section</span>
                  <span className="font-black text-sm">{section?.section_name}</span>
                </div>
              </div>

              <div className="w-full pt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]">
                      <FileDown size={14} />
                      Download SF9 Card
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className={dm ? "bg-slate-900 border-slate-800 text-white" : "bg-[#FAF8F2] border-[#E3DFD5] text-[#2C2A24]"}>
                    {!isTrimester ? (
                      <>
                        <DropdownMenuItem onClick={() => handleExportSingleSF9("SEM 1")} className={`font-bold cursor-pointer ${dm ? "text-white hover:bg-slate-800 focus:bg-slate-850" : "text-[#2C2A24] hover:bg-slate-100 focus:bg-slate-100"}`}>SEM 1</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportSingleSF9("SEM 2")} className={`font-bold cursor-pointer ${dm ? "text-white hover:bg-slate-800 focus:bg-slate-850" : "text-[#2C2A24] hover:bg-slate-100 focus:bg-slate-100"}`}>SEM 2</DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => handleExportSingleSF9("SEM 1")} className={`font-bold cursor-pointer ${dm ? "text-white hover:bg-slate-800 focus:bg-slate-850" : "text-[#2C2A24] hover:bg-slate-100 focus:bg-slate-100"}`}>SEM 1</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExportSingleSF9("SEM 3")} className={`font-bold cursor-pointer ${dm ? "text-white hover:bg-slate-800 focus:bg-slate-850" : "text-[#2C2A24] hover:bg-slate-100 focus:bg-slate-100"}`}>SEM 3</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function styleTag(dm: boolean) {
  if (dm) return null;
  return (
    <style jsx global>{`
      body {
        background-color: #FAF9F5 !important;
      }
    `}</style>
  );
}
