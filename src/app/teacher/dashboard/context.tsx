// app/teacher/dashboard/context.tsx
"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/teacher-client"
import { toast } from "sonner"
import { TeacherSession, ScheduleRow, Student, Announcement } from "./types"

interface DashboardContextType {
  session: TeacherSession | null
  schedules: ScheduleRow[]
  students: Student[]
  announcements: Announcement[]
  loading: boolean
  studLoad: boolean
  dm: boolean
  online: boolean
  schoolYear: string
  advisorySections: string[]
  allowTeacherGrading: boolean
  sectionMap: Record<string, any>
  isSidebarCollapsed: boolean
  currentDate: string
  selectedStudent: Student | null
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  setSelectedStudent: React.Dispatch<React.SetStateAction<Student | null>>
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleRow[]>>
  setSession: React.Dispatch<React.SetStateAction<TeacherSession | null>>
  toggleDark: () => void
  handleLogout: () => Promise<void>
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const [session, setSession] = useState<TeacherSession | null>(null)
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [studLoad, setStudLoad] = useState(false)
  const [online, setOnline] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [schoolYear, setSchoolYear] = useState("2025-2026")
  const [advisorySections, setAdvisorySections] = useState<string[]>([])
  const [allowTeacherGrading, setAllowTeacherGrading] = useState(false)
  const [sectionMap, setSectionMap] = useState<Record<string, any>>({})
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [currentDate, setCurrentDate] = useState("")

  // Theme Syncing
  const [dm, setDm] = useState(false)
  const [dmReady, setDmReady] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("teacher_dark_mode")
    if (stored !== null) {
      setDm(stored === "true")
    } else {
      setDm(window.matchMedia("(prefers-color-scheme: dark)").matches)
    }
    setDmReady(true)
  }, [])

  const toggleDark = () => {
    setDm(v => {
      const next = !v
      localStorage.setItem("teacher_dark_mode", String(next))
      return next
    })
  }

  // Date ticker
  useEffect(() => {
    const updateDate = () => {
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }
      setCurrentDate(new Date().toLocaleDateString('en-US', options))
    }
    updateDate()
    const timer = setInterval(updateDate, 60000)
    return () => clearInterval(timer)
  }, [])

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedLoadData = useCallback((sess: TeacherSession) => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)
    fetchTimeoutRef.current = setTimeout(() => {
      loadData(sess, true)
    }, 300)
  }, [])

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async (sess: TeacherSession, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [{ data: byId }, { data: byName }, { data: config }, { data: sysData }, { data: strandData }] = await Promise.all([
        supabase.from("schedules").select("*, rooms(name)").eq("teacher_id", sess.id).order("day").order("start_time"),
        supabase.from("schedules").select("*, rooms(name)").ilike("teacher", `%${sess.full_name}%`).order("day").order("start_time"),
        supabase.from("system_config").select("school_year").single(),
        supabase.from("system_settings").select("*").eq("setting_key", "allow_teacher_grading").single(),
        supabase.from("system_settings").select("*").eq("setting_key", "available_strands").single(),
      ])

      if (config?.school_year) setSchoolYear(config.school_year)
      if (sysData) setAllowTeacherGrading(sysData.value_text === 'true')

      let strands = ['ICT', 'GAS']
      if (strandData?.value_text) {
        try { strands = JSON.parse(strandData.value_text) } catch(e) {}
      }

      const seen = new Set<string>()
      const merged = [...(byId ?? []), ...(byName ?? [])].filter(r => {
        if (seen.has(r.id)) return false
        seen.add(r.id)
        return true
      }).map((r: any) => ({
        ...r,
        room: r.rooms?.name || r.room
      }))

      const sectionNames = [...new Set(merged.map(s => s.subject))] // filter active strands, sections etc.
      // Let's resolve sections properly
      const sectionUniqueNames = [...new Set(merged.map(s => s.section))].filter(Boolean)
      let activeSchedules = merged
      
      if (sectionUniqueNames.length > 0) {
        if (!silent) setStudLoad(true)
        const { data: sectionRows } = await supabase
          .from("sections")
          .select("id, section_name, lms_grading_system, strand")
          .in("section_name", sectionUniqueNames)
          
        const map: Record<string, any> = {}
        if (sectionRows) {
          sectionRows.forEach(s => map[s.section_name] = s)
          setSectionMap(map)
        }

        activeSchedules = merged.filter(s => {
          const secStrand = map[s.section]?.strand
          return secStrand ? strands.includes(secStrand) : true
        })
        
        const sectionIds = (sectionRows ?? []).filter(s => strands.includes(s.strand)).map(s => s.id)
        if (sectionIds.length > 0) {
          const { data: studData, error: studErr } = await supabase
            .from("students")
            .select("id, first_name, last_name, middle_name, lrn, gender, section, strand, status, profile_picture, two_by_two_url, last_login_at")
            .in("section_id", sectionIds)
            .not("status", "eq", "Pending")
          if (!studErr) setStudents((studData ?? []).filter(s => strands.includes(s.strand)))
        }
        if (!silent) setStudLoad(false)
      }
      setSchedules(activeSchedules)

      // ── Fetch advisory sections ────────────────────────────────────────
      const { data: advRows } = await supabase
        .from("sections")
        .select("id, section_name, strand")
        .eq("adviser_id", sess.id)
      const advSections = (advRows ?? []).filter(r => r.section_name && strands.includes(r.strand)).map(r => r.section_name)
      setAdvisorySections(advSections)

      if (advSections.length > 0) {
        const advOnlySections = advSections.filter(s => !sectionUniqueNames.includes(s))
        if (advOnlySections.length > 0) {
          const { data: advSecRows } = await supabase
            .from("sections").select("id, section_name, strand").in("section_name", advOnlySections)
          if (advSecRows) {
            setSectionMap(prev => {
              const next = { ...prev }
              advSecRows.forEach(s => { next[s.section_name] = s })
              return next
            })
          }
          const advSecIds = (advSecRows ?? []).filter(s => strands.includes(s.strand)).map(s => s.id)
          if (advSecIds.length > 0) {
            const { data: advStudents } = await supabase
              .from("students")
              .select("id, first_name, last_name, middle_name, lrn, gender, section, strand, status, profile_picture, two_by_two_url, last_login_at")
              .in("section_id", advSecIds)
              .not("status", "eq", "Pending")
            if (advStudents?.length) {
              setStudents(prev => {
                const existingIds = new Set(prev.map(s => s.id))
                return [...prev, ...advStudents.filter(s => strands.includes(s.strand) && !existingIds.has(s.id))]
              })
            }
          }
        }
      }

      const { data: ann } = await supabase
        .from("teacher_announcements")
        .select("*")
        .or(`target.eq.ALL,target.eq.${sess.id}`)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
      setAnnouncements(ann ?? [])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()
      const user = supabaseSession?.user
      if (!user || user.user_metadata?.role !== "teacher") {
        router.replace("/teacher/login")
        return
      }
      const { data: teacher, error } = await supabase
        .from("teachers")
        .select("id, full_name, email, avatar_url, gender")
        .eq("email", user.email!)
        .single()
      if (error?.code === "PGRST116" || (!error && !teacher)) {
        router.replace("/teacher/login")
        return
      }
      if (error) {
        toast.error("Could not load profile. Please refresh.")
        setLoading(false)
        return
      }
      const sess: TeacherSession = {
        id: teacher!.id,
        full_name: teacher!.full_name,
        email: teacher!.email,
        avatar_url: teacher!.avatar_url ?? null,
        gender: teacher!.gender ?? null,
      }
      setSession(sess)
      loadData(sess)
    }
    init()
  }, [router, loadData])

  // Realtime
  useEffect(() => {
    if (!session) return
    const chan = supabase
      .channel("teacher_dashboard_rt")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "schedules" }, (payload) => {
        setSchedules(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s))
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "schedules" }, () => debouncedLoadData(session))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "schedules" }, () => debouncedLoadData(session))
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () => debouncedLoadData(session))
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_announcements" }, () => debouncedLoadData(session))
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "teachers", filter: `id=eq.${session.id}` },
        (payload) => {
          const updated = payload.new as { is_active?: boolean }
          if (updated.is_active === false) {
            toast.error("Your account has been deactivated by the administrator.", { duration: 4000 })
            setTimeout(async () => {
              await supabase.auth.signOut()
              router.replace("/teacher/login")
            }, 2000)
          } else if (updated.is_active === true) {
            toast.success("Your account has been reactivated.")
          }
        }
      )
      .subscribe(status => setOnline(status === "SUBSCRIBED"))
    return () => { supabase.removeChannel(chan) }
  }, [session, debouncedLoadData, router])

  const handleLogout = async () => {
    sessionStorage.removeItem("teacher_active_tab")
    sessionStorage.removeItem("teacher_scroll_pos")
    await supabase.auth.signOut()
    router.push("/teacher/login")
  }

  return (
    <DashboardContext.Provider
      value={{
        session,
        schedules,
        students,
        announcements,
        loading,
        studLoad,
        dm,
        online,
        schoolYear,
        advisorySections,
        allowTeacherGrading,
        sectionMap,
        isSidebarCollapsed,
        currentDate,
        selectedStudent,
        setIsSidebarCollapsed,
        setSelectedStudent,
        setSchedules,
        setSession,
        toggleDark,
        handleLogout,
      }}
    >
      {dmReady && children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider")
  }
  return context
}
