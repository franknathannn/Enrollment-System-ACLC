// src/app/teacher/dashboard/components/CuttingClassDetector.tsx
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  AlertTriangle, Check, ChevronLeft, ChevronRight, X, Loader2, Search,
  Calendar, FileText, Download, Mail, ShieldAlert, Users, Info,
  TrendingUp, ArrowRight, BookOpen, Clock, Activity, Award, User, Sparkles
} from "lucide-react"
import { supabase } from "@/lib/supabase/teacher-client"
import { toast } from "sonner"
import { TeacherSession, ScheduleRow, Student } from "../types"

interface AttRecord {
  id?: string
  student_id: string
  student_name: string
  lrn: string
  section: string
  subject: string
  date: string
  time: string
  status: "Present" | "Late" | "Absent"
  notes?: string
}

interface Excuse {
  id: string
  student_id: string
  attendance_date: string
  subject: string | null
  reason: string
}

interface CalendarEvent {
  id: string
  title: string
  event_date: string
  end_date?: string
  event_type: "holiday" | "event" | "meeting" | "exam" | "suspension"
  color: string
  school_year: string
}

interface Props {
  schedules: ScheduleRow[]
  students: Student[]
  dm: boolean
  session: TeacherSession
  schoolYear: string
  advisorySections?: string[]
}

export function CuttingClassDetector({ schedules, students, dm, session, schoolYear, advisorySections = [] }: Props) {
  // Filters & State
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false)

  // Core Data
  const [records, setRecords] = useState<AttRecord[]>([])
  const [excuses, setExcuses] = useState<Excuse[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Calendar Navigation State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date())
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  // Modals
  const [parentModalOpen, setParentModalOpen] = useState(false)
  const [interventionModalOpen, setInterventionModalOpen] = useState(false)
  const [sendingNotification, setSendingNotification] = useState(false)

  // Day Management Modal State
  const [manageDayTarget, setManageDayTarget] = useState<{ dayString: string; dayNumber: number } | null>(null)
  const [manageStatus, setManageStatus] = useState<"present" | "cutting" | "excused" | "unexcused" | "clear">("present")
  const [manageSubject, setManageSubject] = useState<string>("")
  const [manageReason, setManageReason] = useState<string>("Family Request")
  const [savingAttendance, setSavingAttendance] = useState(false)

  // Theme Styling helpers
  const card = dm ? "bg-slate-900 border-white/5 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm"
  const glass = dm ? "bg-white/5 backdrop-blur-xl border-white/5 text-white" : "bg-slate-50 border-slate-200 text-slate-900 shadow-sm"
  const textMuted = dm ? "text-slate-400" : "text-slate-500"
  const textHeading = dm ? "text-white" : "text-slate-900"
  const borderTheme = dm ? "border-slate-800" : "border-slate-200"

  // Handled subjects for this teacher
  const handledSubjects = useMemo(() => {
    return [...new Set(schedules.map(s => s.subject))].filter(Boolean)
  }, [schedules])

  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("")
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false)

  // Initialize selected subject filter
  useEffect(() => {
    if (handledSubjects.length > 0 && !selectedSubjectFilter) {
      setSelectedSubjectFilter(handledSubjects[0])
    }
  }, [handledSubjects, selectedSubjectFilter])

  // Get unique sections the teacher teaches or advises
  const allSections = useMemo(() => {
    const list = [...new Set([...schedules.map(s => s.section), ...advisorySections])].filter(Boolean).sort()
    return list
  }, [schedules, advisorySections])

  // Initialize selected sections
  useEffect(() => {
    if (allSections.length > 0 && selectedSections.length === 0) {
      setSelectedSections([allSections[0]])
    }
  }, [allSections, selectedSections])

  // Load attendance records & school calendar events
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const myStudentIds = students.map(s => s.id)
      if (!myStudentIds.length) {
        setLoading(false)
        return
      }

      // Fetch all attendance for this school year
      const { data: attData, error: attError } = await supabase
        .from("attendance")
        .select("*")
        .in("student_id", myStudentIds)
        .eq("school_year", schoolYear)

      if (attError) throw attError

      // Fetch all excuses
      const { data: excData, error: excError } = await supabase
        .from("attendance_excuses")
        .select("*")
        .in("student_id", myStudentIds)

      if (excError) throw excError

      // Fetch school calendar events for suspensions/holidays
      const { data: calData, error: calError } = await supabase
        .from("school_calendar_events")
        .select("*")
        .eq("school_year", schoolYear)

      if (calError) throw calError

      setRecords(attData || [])
      setExcuses(excData || [])
      setCalendarEvents(calData || [])

    } catch (e: any) {
      toast.error("Failed to load records: " + e.message)
    } finally {
      setLoading(false)
    }
  }, [students, schoolYear])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter records to ONLY include the selected subject being monitored
  const teacherFilteredRecords = useMemo(() => {
    return records.filter(r => r.subject === selectedSubjectFilter)
  }, [records, selectedSubjectFilter])

  // Student list mapping: Rename to STUDENT RECORD, show all students in selected sections (up to 5, rest searchable)
  const studentsInRecord = useMemo(() => {
    // Group occurrences of cutting/absences per student inside selected sections
    const map: Record<string, { cuttingCount: number; latest: string; raw: AttRecord[] }> = {}

    teacherFilteredRecords.forEach(r => {
      if (!map[r.student_id]) {
        map[r.student_id] = { cuttingCount: 0, latest: r.date, raw: [] }
      }
      map[r.student_id].raw.push(r)
      if (r.notes === "CUTTING") {
        map[r.student_id].cuttingCount += 1
      }
      if (new Date(r.date) > new Date(map[r.student_id].latest)) {
        map[r.student_id].latest = r.date
      }
    })

    // Filter students belonging to the selected sections
    let list = students.filter(s => selectedSections.includes(s.section))

    // Apply search filter if active
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase()
      list = list.filter(s => {
        const fullName = `${s.first_name} ${s.last_name}`.toLowerCase()
        return fullName.includes(term) || s.lrn?.includes(term)
      })
    }

    // Map list with cutting incident metrics
    return list.map(s => {
      const stats = map[s.id] || { cuttingCount: 0, latest: new Date().toISOString().split("T")[0], raw: [] }
      return {
        student: s,
        incidentsCount: stats.cuttingCount,
        latestDate: stats.latest,
        rawIncidents: stats.raw
      }
    })
      .sort((a, b) => b.incidentsCount - a.incidentsCount) // Sort by cutting severity first
      .slice(0, 5) // ONLY show 5, rest are searchable
  }, [teacherFilteredRecords, students, selectedSections, searchQuery])

  // Automatically select the first student in the list if none selected
  useEffect(() => {
    if (studentsInRecord.length > 0 && !selectedStudent) {
      setSelectedStudent(studentsInRecord[0].student || null)
    } else if (studentsInRecord.length === 0) {
      setSelectedStudent(null)
    }
  }, [studentsInRecord, selectedStudent])

  // Selected Student's incidents (synced to handled subjects)
  const selectedStudentIncidents = useMemo(() => {
    if (!selectedStudent) return []
    return teacherFilteredRecords.filter(r => r.student_id === selectedStudent.id && r.notes === "CUTTING")
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [teacherFilteredRecords, selectedStudent])

  // Generate Calendar Matrix for Selected Student
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear()
    const month = currentCalendarDate.getMonth()

    const firstDayIndex = new Date(year, month, 1).getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()

    const days = []

    const prevMonthTotalDays = new Date(year, month, 0).getDate()
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNumber: prevMonthTotalDays - i,
        isCurrentMonth: false,
        dateString: new Date(year, month - 1, prevMonthTotalDays - i).toISOString().split("T")[0]
      })
    }

    for (let i = 1; i <= totalDays; i++) {
      days.push({
        dayNumber: i,
        isCurrentMonth: true,
        dateString: `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`
      })
    }

    const remainingSlots = 42 - days.length
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({
        dayNumber: i,
        isCurrentMonth: false,
        dateString: new Date(year, month + 1, i).toISOString().split("T")[0]
      })
    }

    return days
  }, [currentCalendarDate])

  // Get Calendar Event (Holiday/Suspension) for a date
  const getCalendarEvent = useCallback((dateStr: string) => {
    const events = calendarEvents.filter(e =>
      e.end_date ? (dateStr >= e.event_date && dateStr <= e.end_date) : (e.event_date === dateStr)
    )
    return events.find(e => e.event_type === "holiday" || e.event_type === "suspension") || null
  }, [calendarEvents])

  // Earliest record date for selected student and subject
  const earliestRecordDate = useMemo(() => {
    if (!selectedStudent || !selectedSubjectFilter) return null
    const studentSubjectRecs = records.filter(r => r.student_id === selectedStudent.id && r.subject === selectedSubjectFilter)
    if (studentSubjectRecs.length === 0) return null
    
    const sorted = [...studentSubjectRecs].sort((a, b) => a.date.localeCompare(b.date))
    return sorted[0].date
  }, [records, selectedStudent, selectedSubjectFilter])

  // Identify status for a specific calendar day (synced to handled subjects)
  // Identify status for a specific calendar day (synced to handled subjects)
  const getDayStatus = useCallback((dateStr: string) => {
    if (!selectedStudent || !selectedSubjectFilter) return null

    const calEvent = getCalendarEvent(dateStr)
    if (calEvent) return "suspended"

    // Check if the subject is scheduled for this weekday
    const dayOfWeek = new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })
    const isScheduled = schedules.some(s => s.day === dayOfWeek && s.section === selectedStudent.section && s.subject === selectedSubjectFilter)
    
    // Only check attendance statuses if the class was scheduled for that weekday
    if (!isScheduled) return null

    // Check for specific database override records for this subject and date
    const dayRecord = records.find(r => r.student_id === selectedStudent.id && r.date === dateStr && r.subject === selectedSubjectFilter)
    const isExcused = excuses.some(e => e.student_id === selectedStudent.id && e.attendance_date === dateStr && (e.subject === null || e.subject === selectedSubjectFilter))

    if (dayRecord) {
      if (dayRecord.notes === "CUTTING") return "cutting"
      if (dayRecord.status === "Present" || dayRecord.status === "Late") return "present"
      if (isExcused) return "excused"
      return "unexcused" // Absent
    }

    if (isExcused) return "excused"

    // Do not show absences before the class/subject record officially started
    if (!earliestRecordDate || dateStr < earliestRecordDate) return null

    // Get today's local date string
    const todayStr = new Date().toISOString().split("T")[0]

    // If there is no record in the database, but it is scheduled and in the past or today, it is "unexcused" (Absent)
    if (dateStr <= todayStr) {
      return "unexcused"
    }

    return null
  }, [records, excuses, selectedStudent, selectedSubjectFilter, getCalendarEvent, schedules, earliestRecordDate])

  const prevMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1))
  }

  // Export List functionality
  const handleExport = (format: "csv" | "print") => {
    if (studentsInRecord.length === 0) {
      toast.error("No student records to export")
      return
    }

    if (format === "csv") {
      let csvContent = "data:text/csv;charset=utf-8,"
      csvContent += "Student Name,Section,Total Cutting Incidents,Latest Date\n"

      studentsInRecord.forEach(item => {
        const name = `${item.student?.last_name}, ${item.student?.first_name}`
        csvContent += `"${name}","${item.student?.section}",${item.incidentsCount},"${item.latestDate}"\n`
      })

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `student_record_report.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("CSV Report Downloaded!")
    } else {
      window.print()
    }
  }

  // Send Notification Mock
  const sendNotifications = () => {
    if (!selectedStudent) return
    setSendingNotification(true)
    const toastId = toast.loading("Sending automated SMS and Email alerts to parents...")

    setTimeout(() => {
      toast.success("Irregularity report sent to guardian of " + selectedStudent.first_name + " successfully!", { id: toastId })
      setSendingNotification(false)
      setParentModalOpen(false)
    }, 1500)
  }

  // Save manual attendance status change on calendar date click
  const saveAttendanceStatus = async () => {
    if (!selectedStudent || !manageDayTarget) return
    setSavingAttendance(true)
    const dateStr = manageDayTarget.dayString
    const toastId = toast.loading("Saving attendance configuration for " + dateStr + "...")

    try {
      // 1. Delete any existing attendance & excuses for this student, day, and subject
      const subjectToOverride = manageSubject || schedules.find(s => s.section === selectedStudent.section)?.subject || "General"
      await supabase.from("attendance").delete().eq("student_id", selectedStudent.id).eq("date", dateStr).eq("subject", subjectToOverride)
      await supabase.from("attendance_excuses").delete().eq("student_id", selectedStudent.id).eq("attendance_date", dateStr)

      // 2. Perform insert/update based on target status selection
      if (manageStatus === "present") {
        const { error } = await supabase.from("attendance").insert({
          student_id: selectedStudent.id,
          student_name: `${selectedStudent.last_name}, ${selectedStudent.first_name}`,
          lrn: selectedStudent.lrn,
          section: selectedStudent.section,
          subject: subjectToOverride,
          date: dateStr,
          time: new Date().toLocaleTimeString("en-US", { hour12: false }),
          status: "Present",
          school_year: schoolYear,
          strand: selectedStudent.strand || ""
        })
        if (error) throw error
        toast.success("Marked student as Present", { id: toastId })
      }
      else if (manageStatus === "cutting") {
        const { error } = await supabase.from("attendance").insert({
          student_id: selectedStudent.id,
          student_name: `${selectedStudent.last_name}, ${selectedStudent.first_name}`,
          lrn: selectedStudent.lrn,
          section: selectedStudent.section,
          subject: subjectToOverride,
          date: dateStr,
          time: new Date().toLocaleTimeString("en-US", { hour12: false }),
          status: "Absent",
          notes: "CUTTING",
          school_year: schoolYear,
          strand: selectedStudent.strand || ""
        })
        if (error) throw error
        toast.success("Logged Class Cutting incident", { id: toastId })
      }
      else if (manageStatus === "unexcused") {
        const { error } = await supabase.from("attendance").insert({
          student_id: selectedStudent.id,
          student_name: `${selectedStudent.last_name}, ${selectedStudent.first_name}`,
          lrn: selectedStudent.lrn,
          section: selectedStudent.section,
          subject: subjectToOverride,
          date: dateStr,
          time: new Date().toLocaleTimeString("en-US", { hour12: false }),
          status: "Absent",
          school_year: schoolYear,
          strand: selectedStudent.strand || ""
        })
        if (error) throw error
        toast.success("Logged student as Unexcused Absent", { id: toastId })
      }
      else if (manageStatus === "excused") {
        const { error: attErr } = await supabase.from("attendance").insert({
          student_id: selectedStudent.id,
          student_name: `${selectedStudent.last_name}, ${selectedStudent.first_name}`,
          lrn: selectedStudent.lrn,
          section: selectedStudent.section,
          subject: subjectToOverride,
          date: dateStr,
          time: new Date().toLocaleTimeString("en-US", { hour12: false }),
          status: "Absent",
          school_year: schoolYear,
          strand: selectedStudent.strand || ""
        })
        if (attErr) throw attErr

        const { error: excErr } = await supabase.from("attendance_excuses").insert({
          student_id: selectedStudent.id,
          attendance_date: dateStr,
          subject: subjectToOverride,
          reason: manageReason,
          excused_by: session.id
        })
        if (excErr) throw excErr
        toast.success("Logged student as Excused Absent", { id: toastId })
      }
      else if (manageStatus === "clear") {
        toast.success("Cleared attendance configuration", { id: toastId })
      }

      loadData()
      setManageDayTarget(null)
    } catch (e: any) {
      toast.error("Failed to update status: " + e.message, { id: toastId })
    } finally {
      setSavingAttendance(false)
    }
  }

  // Handle day click
  const handleDayClick = (day: { dayNumber: number; isCurrentMonth: boolean; dateString: string }) => {
    if (!day.isCurrentMonth || !selectedStudent) return

    // Resolve current status
    const currentStatus = getDayStatus(day.dateString)
    setManageStatus(currentStatus || "clear")

    // Default subject choice to handled subjects or scheduled
    const dayOfWeek = new Date(day.dateString + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })
    const dayScheds = schedules.filter(s => s.day === dayOfWeek && s.section === selectedStudent.section)
    const daySubjects = [...new Set(dayScheds.map(s => s.subject))].filter(sub => handledSubjects.includes(sub))

    setManageSubject(daySubjects[0] || handledSubjects[0] || "")
    setManageDayTarget(day)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── TOP HEADER DASHBOARD ── */}
      <div className={`p-6 rounded-[28px] border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${card}`}>
        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2.5">
            <Activity className="text-rose-500 animate-pulse" size={24} />
            Teacher's Attendance Dashboard
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            {/* Custom Multi-select dropdown */}
            <div className="relative">
              <button
                onClick={() => setSectionDropdownOpen(prev => !prev)}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all
                  ${dm ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
              >
                Sections: {selectedSections.length === 0 ? "None Selected" : selectedSections.join(", ")}
              </button>

              {sectionDropdownOpen && (
                <div className={`absolute left-0 mt-2 w-48 rounded-xl border shadow-xl z-50 py-1 overflow-hidden transition-all
                  ${dm ? "bg-slate-900 border-slate-800 shadow-black/80" : "bg-white border-slate-200 shadow-slate-200/80"}`}>
                  {allSections.map(sec => {
                    const isSelected = selectedSections.includes(sec)
                    return (
                      <button
                        key={sec}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSections(prev => prev.filter(s => s !== sec))
                          } else {
                            setSelectedSections(prev => [...prev, sec])
                          }
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-colors text-left
                          ${isSelected
                            ? (dm ? "bg-blue-600/20 text-blue-400" : "bg-blue-50 text-blue-600")
                            : (dm ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50")}`}
                      >
                        {sec}
                        {isSelected && <Check size={14} />}
                      </button>
                    )
                  })}
                  <div className={`border-t p-1 flex justify-end gap-1 ${dm ? "border-slate-800" : "border-slate-100"}`}>
                    <button
                      onClick={() => setSectionDropdownOpen(false)}
                      className="px-2 py-1 text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Subject filter dropdown */}
            <div className="relative">
              <button 
                onClick={() => setSubjectDropdownOpen(prev => !prev)}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all
                  ${dm ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
              >
                Subject: {selectedSubjectFilter || "Select Subject"}
              </button>
              
              {subjectDropdownOpen && (
                <div className={`absolute left-0 mt-2 w-48 rounded-xl border shadow-xl z-50 py-1 overflow-hidden transition-all
                  ${dm ? "bg-slate-900 border-slate-800 shadow-black/80" : "bg-white border-slate-200 shadow-slate-200/80"}`}>
                  {handledSubjects.map(sub => {
                    const isSelected = selectedSubjectFilter === sub
                    return (
                      <button
                        key={sub}
                        onClick={() => {
                          setSelectedSubjectFilter(sub)
                          setSubjectDropdownOpen(false)
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-colors text-left
                          ${isSelected 
                            ? (dm ? "bg-blue-600/20 text-blue-400" : "bg-blue-50 text-blue-600") 
                            : (dm ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-50")}`}
                      >
                        {sub}
                        {isSelected && <Check size={14} />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Top Right */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => handleExport("csv")}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer
              ${dm ? "bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10" : "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"}`}
          >
            <Download size={13} />
            Export List
          </button>

          <button
            disabled={!selectedStudent}
            onClick={() => setParentModalOpen(true)}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white flex items-center gap-1.5 transition-all hover:scale-105 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
          >
            <Mail size={13} />
            Notify Parents
          </button>

          <button
            disabled={!selectedStudent}
            onClick={() => setInterventionModalOpen(true)}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-600 text-white flex items-center gap-1.5 transition-all hover:scale-105 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
          >
            <ShieldAlert size={13} />
            Intervention Plan
          </button>
        </div>
      </div>

      {/* ── TWO COLUMN MAIN PANEL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Student list with cutting records */}
        <div className={`lg:col-span-6 p-6 rounded-[28px] border flex flex-col min-h-[500px] ${card}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className={`text-base font-black uppercase tracking-wider ${textHeading}`}>
                Student Record
              </h3>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${textMuted}`}>
                Showing top 5 students (search to find others)
              </p>
            </div>
          </div>

          {/* Search bar inside student list */}
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border mb-4 transition-all ${dm ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
            <Search size={14} className={dm ? "opacity-30" : "text-slate-400"} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search student by name or LRN..."
              className={`bg-transparent border-none outline-none text-xs font-bold w-full ${textHeading} placeholder-slate-400`}
            />
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-blue-500 w-8 h-8 mb-4" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Retrieving Attendance Records...</p>
            </div>
          ) : studentsInRecord.length === 0 ? (
            <div className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 text-center ${borderTheme}`}>
              <Check className="w-10 h-10 text-emerald-500 mb-4 bg-emerald-500/10 p-2 rounded-full" />
              <p className="text-xs font-black uppercase tracking-widest">No student records found</p>
              <p className={`text-[10px] mt-1 font-bold ${textMuted}`}>Perfect attendance verified for selected sections & modes.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className={`text-[9px] font-black uppercase tracking-widest ${dm ? "text-slate-400 bg-slate-950/60" : "text-slate-500 bg-slate-50"} border-b ${borderTheme}`}>
                  <tr>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3 text-center">Section</th>
                    <th className="py-3 px-3 text-center">Cutting Incidents</th>
                    <th className="py-3 px-3">Latest Incident</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {studentsInRecord.map(item => {
                    const isSelected = selectedStudent?.id === item.student?.id
                    const pfp = item.student?.two_by_two_url || item.student?.profile_picture || ""
                    return (
                      <tr 
                        key={item.student?.id}
                        onClick={() => setSelectedStudent(item.student || null)}
                        className={`cursor-pointer transition-all hover:bg-blue-600/5
                          ${isSelected 
                            ? (dm ? "bg-blue-500/15 border-l-4 border-l-blue-500" : "bg-blue-50 border-l-4 border-l-blue-500") 
                            : ""}`}
                      >
                        <td className="py-3 px-3 flex items-center gap-3">
                          {/* 2x2 Styled Square Box for Profile Pictures */}
                          <div className={`w-11 h-11 rounded-lg overflow-hidden shrink-0 border-2 ${isSelected ? "border-blue-500" : borderTheme}`}>
                            {pfp ? (
                              <img src={pfp} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-black uppercase bg-slate-200 dark:bg-slate-800 text-blue-500 text-[10px]">
                                {item.student?.first_name[0]}{item.student?.last_name[0]}
                              </div>
                            )}
                          </div>
                          <span className={`font-black uppercase truncate ${isSelected ? (dm ? "text-blue-400" : "text-blue-600") : textHeading}`}>
                            {item.student?.last_name}, {item.student?.first_name}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold tracking-tight uppercase">{item.student?.section}</td>
                        <td className={`py-3 px-3 text-center font-black text-sm tabular-nums ${dm ? "text-slate-300" : "text-slate-700"}`}>{item.incidentsCount}</td>
                        <td className={`py-3 px-3 font-semibold ${textMuted}`}>
                          {new Date(item.latestDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Selected Student's calendar & details */}
        <div className="lg:col-span-6 space-y-6">
          {selectedStudent ? (
            <div className={`p-6 rounded-[28px] border flex flex-col ${card}`}>
              <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-100 dark:border-slate-800/40">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-500">Currently Reviewing</p>
                  <h3 className={`text-lg font-black uppercase italic tracking-tighter mt-1 ${textHeading}`}>
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </h3>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${textMuted}`}>
                    Section: <span className={textHeading}>{selectedStudent.section}</span> · LRN: <span className={textHeading}>{selectedStudent.lrn}</span>
                  </p>
                </div>

                {/* 2x2 Styled Square Box for Selected Student Photo */}
                <div className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 border-rose-500 shadow-md`}>
                  {selectedStudent.two_by_two_url || selectedStudent.profile_picture ? (
                    <img src={selectedStudent.two_by_two_url || selectedStudent.profile_picture || ""} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black uppercase bg-slate-200 dark:bg-slate-800 text-blue-500">
                      {selectedStudent.first_name[0]}{selectedStudent.last_name[0]}
                    </div>
                  )}
                </div>
              </div>

              {/* CALENDAR VIEW */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black uppercase tracking-widest ${textHeading}`}>
                    {currentCalendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>

                  <div className="flex gap-1">
                    <button
                      onClick={prevMonth}
                      className={`p-1.5 rounded-lg border transition-all hover:bg-slate-500/10 ${dm ? "border-slate-800" : "border-slate-200"}`}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={nextMonth}
                      className={`p-1.5 rounded-lg border transition-all hover:bg-slate-500/10 ${dm ? "border-slate-800" : "border-slate-200"}`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Calendar Days Matrix */}
                <div className="grid grid-cols-7 gap-1 text-center font-black text-[9px] uppercase tracking-widest text-slate-500 mb-2">
                  <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {calendarDays.map((day, idx) => {
                    const status = getDayStatus(day.dateString)
                    const isToday = new Date().toISOString().split("T")[0] === day.dateString
                    const calEvent = getCalendarEvent(day.dateString)

                    // Retrieve subjects scheduled for this weekday
                    const dayOfWeek = new Date(day.dateString + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })
                    const dayScheds = schedules.filter(s => s.day === dayOfWeek && s.section === selectedStudent.section)
                    const daySubjects = [...new Set(dayScheds.map(s => s.subject))].filter(sub => handledSubjects.includes(sub))

                    return (
                      <div
                        key={idx}
                        onClick={() => handleDayClick(day)}
                        className={`aspect-square rounded-xl p-1 relative flex flex-col justify-between border select-none transition-all cursor-pointer hover:scale-105 active:scale-95
                          ${day.isCurrentMonth
                            ? (dm ? "bg-slate-950 border-slate-900 hover:border-slate-700" : "bg-slate-50 border-slate-100 hover:border-slate-350")
                            : "opacity-25 bg-transparent border-transparent cursor-default pointer-events-none"}
                          ${status === "cutting"
                            ? (dm ? "border-rose-500/30 bg-rose-500/10 shadow-sm" : "border-rose-300 bg-rose-50/50 shadow-sm")
                            : ""}
                          ${status === "suspended"
                            ? (dm ? "border-orange-500/30 bg-orange-500/10" : "border-orange-200 bg-orange-50/50")
                            : ""}
                        `}
                      >
                        {/* Day number */}
                        <span className={`text-[10px] font-bold ${isToday ? "text-emerald-500" : ""}`}>
                          {day.dayNumber}
                        </span>

                        {/* Status graphics */}
                        <div className="flex items-center justify-center flex-grow">
                          {status === "suspended" && (
                            <div className="text-[6px] font-black uppercase text-orange-500 tracking-tighter text-center max-w-full truncate leading-none">
                              {calEvent?.event_type === "suspension" ? "SUSPENDED" : "HOLIDAY"}
                            </div>
                          )}
                          {status === "cutting" && (
                            <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-orange-500 bg-orange-500/10 text-orange-500 text-[10px] font-black leading-none">
                              T
                            </div>
                          )}
                          {status === "present" && (
                            <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 shrink-0" />
                          )}
                          {(status === "unexcused" || status === "excused") && (
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                          )}
                        </div>

                        {/* Tiny subject labels or calendar event info */}
                        {day.isCurrentMonth && !status && daySubjects.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 justify-center mb-0.5">
                            {daySubjects.slice(0, 3).map((sub, sIdx) => (
                              <span key={sIdx} className="text-[5px] scale-90 opacity-60 leading-none px-0.5 rounded bg-slate-200 dark:bg-slate-800 truncate max-w-[20px]" title={sub}>
                                {sub.slice(0, 2)}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Today indicator */}
                        {isToday && (
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className={`p-4 rounded-2xl border text-[9px] font-black uppercase tracking-widest grid grid-cols-2 gap-3 mt-4 ${dm ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                    <span>Green Dot/No: Current Day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-600 shrink-0" />
                    <span className="text-rose-500">Red Mark: Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-transparent shrink-0" />
                    <span>Green Circle: Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-orange-500 bg-orange-500/10 flex items-center justify-center text-orange-500 font-black text-[9px] leading-none shrink-0">T</span>
                    <span className="text-orange-500">Orange T: Tardy</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <span className="w-3 h-3 rounded-md bg-orange-500/20 border border-orange-500/30 shrink-0" />
                    <span className="text-orange-500">Orange Box: Suspension/Holiday</span>
                  </div>
                </div>
              </div>

              {/* RECENT CUTTING ACTIVITY DESK */}
              <div className={`p-4 rounded-2xl border mt-6 ${dm ? "bg-slate-950 border-slate-850" : "bg-slate-50 border-slate-100"}`}>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 mb-3 flex items-center gap-1.5">
                  <ShieldAlert size={14} className="animate-bounce" />
                  Recent Cutting Activity: {selectedStudent.first_name}
                </h4>

                {selectedStudentIncidents.length === 0 ? (
                  <p className={`text-[10px] font-bold italic py-4 ${textMuted}`}>No cutting incidents logged.</p>
                ) : (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {selectedStudentIncidents.map((inc, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:scale-[1.01]
                          ${dm ? "bg-white/5 border-white/5" : "bg-white border-slate-200"}`}
                      >
                        <div className="space-y-0.5">
                          <p className={`text-[11px] font-black uppercase tracking-tighter ${textHeading}`}>{inc.subject}</p>
                          <p className={`text-[9px] font-semibold ${textMuted}`}>{inc.time}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold ${textHeading}`}>
                            {new Date(inc.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <AlertTriangle size={14} className="text-rose-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`p-20 rounded-[28px] border text-center flex flex-col items-center justify-center min-h-[500px] ${card}`}>
              <Users size={48} className="text-blue-500/20 mb-4 animate-pulse" />
              <h3 className={`text-base font-black uppercase tracking-widest ${textHeading}`}>Select Student</h3>
              <p className={`text-xs mt-1 font-bold ${textMuted}`}>
                Choose a student from the left panel to display their attendance calendar.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ── DAY ATTENDANCE CONFIGURATION MODAL ── */}
      {manageDayTarget && selectedStudent && (() => {
        const isAlreadyPresent = getDayStatus(manageDayTarget.dateString) === "present"
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`w-full max-w-sm rounded-[32px] p-6 border ${card}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-500">Attendance Override</p>
                  <h3 className="text-base font-black uppercase italic tracking-tighter mt-0.5">Manage Day Status</h3>
                  <p className={`text-[9px] font-bold ${textMuted}`}>
                    {selectedStudent.first_name} {selectedStudent.last_name} · {manageDayTarget.dateString}
                  </p>
                </div>
                <button
                  onClick={() => setManageDayTarget(null)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${dm ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Display scheduled subjects for this date */}
                {(() => {
                  const dayOfWeek = new Date(manageDayTarget.dateString + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })
                  const dayScheds = schedules.filter(s => s.day === dayOfWeek && s.section === selectedStudent.section)
                  const daySubjects = [...new Set(dayScheds.map(s => s.subject))].filter(sub => handledSubjects.includes(sub))
                  if (daySubjects.length === 0) return null
                  return (
                    <div className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-wider ${dm ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-600"}`}>
                      <span className="block text-[8px] font-bold text-slate-400 mb-1">Scheduled Classes Today:</span>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {daySubjects.map((s, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/10">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Target Attendance Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Render PRESENT option ONLY if student is not already present */}
                    {!isAlreadyPresent && (
                      <button
                        onClick={() => setManageStatus("present")}
                        className={`py-2.5 px-3 rounded-xl border text-[9px] font-black uppercase tracking-wider text-center transition-all col-span-2
                          ${manageStatus === "present"
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10"
                            : dm ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"}`}
                      >
                        Present
                      </button>
                    )}

                    {[
                      { val: "cutting", label: "Tardy" },
                      { val: "excused", label: "Excused" },
                      { val: "unexcused", label: "Absent" },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => setManageStatus(opt.val as any)}
                        className={`py-2.5 px-3 rounded-xl border text-[9px] font-black uppercase tracking-wider text-center transition-all
                          ${manageStatus === opt.val
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10"
                            : dm ? "bg-slate-950 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"}`}
                      >
                        {opt.label}
                      </button>
                    ))}

                    <button
                      onClick={() => setManageStatus("clear")}
                      className={`py-2.5 px-3 rounded-xl border text-[9px] font-black uppercase tracking-wider text-center transition-all col-span-2
                        ${manageStatus === "clear"
                          ? "bg-rose-600 border-rose-600 text-white shadow-md"
                          : dm ? "bg-slate-950 border-slate-800 text-rose-500" : "bg-rose-50 border-rose-100 text-rose-600"}`}
                    >
                      Clear / Reset Records
                    </button>
                  </div>
                </div>

                {/* Subject Selector (If applicable) */}
                {manageStatus !== "clear" && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Subject Class</label>
                    <select
                      value={manageSubject}
                      onChange={e => setManageSubject(e.target.value)}
                      className={`w-full h-10 rounded-xl px-3 text-[10px] font-black uppercase border outline-none ${dm ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}
                    >
                      {(() => {
                        const dayOfWeek = new Date(manageDayTarget.dateString + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })
                        const dayScheds = schedules.filter(s => s.day === dayOfWeek && s.section === selectedStudent.section)
                        const uniqueSubjectsForDay = [...new Set(dayScheds.map(s => s.subject))].filter(sub => handledSubjects.includes(sub))

                        if (uniqueSubjectsForDay.length === 0) {
                          return <option value="">No handled classes scheduled today</option>
                        }

                        return uniqueSubjectsForDay.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))
                      })()}
                    </select>
                  </div>
                )}

                {/* Excused Reason */}
                {manageStatus === "excused" && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Excuse Reason</label>
                    <input
                      type="text"
                      value={manageReason}
                      onChange={e => setManageReason(e.target.value)}
                      placeholder="e.g., Clinic visit, family request"
                      className={`w-full h-10 rounded-xl px-3 text-[10px] font-bold border outline-none ${dm ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"}`}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setManageDayTarget(null)}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-98
                    ${dm ? "border-white/5 text-slate-400" : "border-slate-200 text-slate-500"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={saveAttendanceStatus}
                  disabled={savingAttendance}
                  className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all hover:scale-98"
                >
                  {savingAttendance ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Confirm Status
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── PARENT NOTIFICATION MODAL ── */}
      {parentModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`w-full max-w-md rounded-[32px] p-8 border ${card}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-500">Guardian Contact Portal</p>
                <h3 className="text-xl font-black uppercase italic tracking-tighter mt-1">Send Incident Notification</h3>
              </div>
              <button
                onClick={() => setParentModalOpen(false)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${dm ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border space-y-1.5 ${dm ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                <p className="text-[10px] font-black uppercase text-slate-400">Student Identity</p>
                <p className="text-sm font-black uppercase">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                <p className="text-[9px] font-bold text-rose-500">Cutting Alerts logged: {selectedStudentIncidents.length}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Automated Message Draft</label>
                <div className={`p-4 rounded-2xl border text-xs font-semibold text-left leading-relaxed ${dm ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                  Dear Guardian, <br /><br />
                  This is an official alert from ACLC School Management System. Our logs indicate that your ward, <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong>, has missed several scheduled periods without valid excuses (Latest: {selectedStudentIncidents[0]?.date || new Date().toDateString()}). <br /><br />
                  Please coordinate with the school adviser to address these irregularities.
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setParentModalOpen(false)}
                className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-98
                  ${dm ? "border-white/5 text-slate-400" : "border-slate-200 text-slate-500"}`}
              >
                Cancel
              </button>
              <button
                onClick={sendNotifications}
                disabled={sendingNotification}
                className="flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all hover:scale-98"
              >
                {sendingNotification ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                Send Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INTERVENTION PLAN MODAL ── */}
      {interventionModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`w-full max-w-lg rounded-[32px] p-8 border ${card}`}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                <Award className="text-rose-500" size={24} />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-rose-500">Student Support Desk</p>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter mt-0.5">Academic Intervention Plan</h3>
                </div>
              </div>
              <button
                onClick={() => setInterventionModalOpen(false)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${dm ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold leading-relaxed">
              <p>An intervention plan is triggered for students exceeding 3 cutting offenses. You can print this and have the student and guardian sign it during consultation.</p>

              <div className={`p-5 rounded-2xl border space-y-4 text-left ${dm ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[8px] font-black uppercase text-slate-400 block">Student Name</span>
                    <span className="font-black uppercase">{selectedStudent.first_name} {selectedStudent.last_name}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black uppercase text-slate-400 block">Track & Section</span>
                    <span className="font-black uppercase">{selectedStudent.section}</span>
                  </div>
                </div>

                <div className="border-t pt-3 border-slate-200 dark:border-slate-800">
                  <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Recommended Interventions</span>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>Conduct a formal guidance guidance consultation session.</li>
                    <li>Establish a bi-weekly attendance report signed by all subject teachers.</li>
                    <li>Restrict participation in extracurricular activities until verification.</li>
                    <li>Draft a contractual pledge of attendance signed by guardian.</li>
                  </ul>
                </div>

                <div className="border-t pt-4 border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-6 text-[10px] font-black uppercase tracking-widest text-center mt-6">
                  <div className="border-t border-slate-450 dark:border-slate-700 pt-2 mt-4">
                    Student Signature
                  </div>
                  <div className="border-t border-slate-450 dark:border-slate-700 pt-2 mt-4">
                    Guardian Signature
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setInterventionModalOpen(false)}
                className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-98
                  ${dm ? "border-white/5 text-slate-400" : "border-slate-200 text-slate-500"}`}
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print()
                  setInterventionModalOpen(false)
                }}
                className="flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-700 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 transition-all hover:scale-98"
              >
                <FileText size={12} />
                Print Plan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}