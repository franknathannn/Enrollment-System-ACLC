// app/teacher/dashboard/page.tsx
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, Bell, QrCode, BarChart2, AlertTriangle, Calendar } from "lucide-react"
import { supabase } from "@/lib/supabase/teacher-client"
import { toast } from "sonner"

import { DashboardNav }            from "./components/DashboardNav"
import { ProfileCard }             from "./components/ProfileCard"
import { ScheduleTab }             from "./components/ScheduleTab"
import { AnnouncementsTab }        from "./components/AnnouncementsTab"
import { StudentDetailTab }        from "./components/StudentDetailTab"
import { AttendanceTab }           from "./components/AttendanceTab"
import { CuttingClassDetector }    from "./components/CuttingClassDetector"
import { ReportsTab }              from "./components/ReportsTab"
import { AcademicCalendarTab }     from "./components/AcademicCalendarTab"

import {
  TeacherSession, ScheduleRow, Student, Announcement,
  COLORS, todayName,
} from "./types"

type TabName = "schedule" | "announcements" | "attendance" | "cutting" | "reports" | "calendar"

export default function TeacherDashboard() {
  const router = useRouter()

  const [session,       setSession]       = useState<TeacherSession | null>(null)
  const [schedules,     setSchedules]     = useState<ScheduleRow[]>([])
  const [students,      setStudents]      = useState<Student[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading,       setLoading]       = useState(true)
  const [studLoad,      setStudLoad]      = useState(false)
  const [tab,           setTab]           = useState<TabName>("schedule")
  const [online,        setOnline]        = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [schoolYear,    setSchoolYear]    = useState("2025-2026")
  const [advisorySections, setAdvisorySections] = useState<string[]>([])

  // Persistent dark mode — initialise as false (safe for SSR), then sync from
  // localStorage in a useEffect so server and client HTML always start identical.
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

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // getSession() reads from cookies — no network call, fast and resilient.
      // Middleware already verified the JWT with getUser() before this page loaded,
      // so trusting the session here is safe.
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user || user.user_metadata?.role !== "teacher") {
        router.replace("/teacher/login")
        return
      }
      const { data: teacher, error } = await supabase
        .from("teachers")
        .select("id, full_name, email, avatar_url")
        .eq("email", user.email!)
        .single()
      // PGRST116 = no rows — teacher record genuinely doesn't exist
      if (error?.code === "PGRST116" || (!error && !teacher)) {
        router.replace("/teacher/login")
        return
      }
      // Any other error (network, RLS) is transient — don't kick the teacher out
      if (error) {
        toast.error("Could not load profile. Please refresh.")
        setLoading(false)
        return
      }
      const sess: TeacherSession = {
        id:         teacher!.id,
        full_name:  teacher!.full_name,
        email:      teacher!.email,
        avatar_url: teacher!.avatar_url ?? null,
      }
      setSession(sess)
      loadData(sess)
    }
    init()
  }, []) // eslint-disable-line

  // ── React to real sign-out events (token refresh failure, external revocation)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/teacher/login")
      }
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async (sess: TeacherSession) => {
    setLoading(true)
    try {
      const [{ data: byId }, { data: byName }, { data: config }] = await Promise.all([
        supabase.from("schedules").select("*, rooms(name)").eq("teacher_id", sess.id).order("day").order("start_time"),
        supabase.from("schedules").select("*, rooms(name)").ilike("teacher", sess.full_name).order("day").order("start_time"),
        supabase.from("system_config").select("school_year").single(),
      ])

      if (config?.school_year) setSchoolYear(config.school_year)

      const seen = new Set<string>()
      const merged = [...(byId ?? []), ...(byName ?? [])].filter(r => {
        if (seen.has(r.id)) return false
        seen.add(r.id)
        return true
      }).map((r: any) => ({
        ...r,
        room: r.rooms?.name || r.room
      }))
      setSchedules(merged)

      const sectionNames = [...new Set(merged.map(s => s.section))].filter(Boolean)
      if (sectionNames.length > 0) {
        setStudLoad(true)
        // Resolve section names → section IDs so that renames don't break the lookup
        const { data: sectionRows } = await supabase
          .from("sections")
          .select("id")
          .in("section_name", sectionNames)
        const sectionIds = (sectionRows ?? []).map(s => s.id)
        if (sectionIds.length > 0) {
          const { data: studData, error: studErr } = await supabase
            .from("students")
            .select("id, first_name, last_name, middle_name, lrn, gender, section, strand, status, profile_picture, two_by_two_url")
            .in("section_id", sectionIds)
            .not("status", "eq", "Pending")
          if (!studErr) setStudents(studData ?? [])
        }
        setStudLoad(false)
      }

      // ── Fetch advisory sections ────────────────────────────────────────
      const { data: advRows } = await supabase
        .from("sections")
        .select("section_name")
        .eq("adviser_id", sess.id)
      const advSections = (advRows ?? []).map(r => r.section_name).filter(Boolean)
      setAdvisorySections(advSections)

      // Merge advisory students that aren't already loaded
      if (advSections.length > 0) {
        const advOnlySections = advSections.filter(s => !sectionNames.includes(s))
        if (advOnlySections.length > 0) {
          const { data: advSecRows } = await supabase
            .from("sections").select("id").in("section_name", advOnlySections)
          const advSecIds = (advSecRows ?? []).map(s => s.id)
          if (advSecIds.length > 0) {
            const { data: advStudents } = await supabase
              .from("students")
              .select("id, first_name, last_name, middle_name, lrn, gender, section, strand, status, profile_picture, two_by_two_url")
              .in("section_id", advSecIds)
              .not("status", "eq", "Pending")
            if (advStudents?.length) {
              setStudents(prev => {
                const existingIds = new Set(prev.map(s => s.id))
                return [...prev, ...advStudents.filter(s => !existingIds.has(s.id))]
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
      setLoading(false)
    }
  }, [])

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return
    const chan = supabase
      .channel("teacher_dashboard_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" },             () => loadData(session))
      .on("postgres_changes", { event: "*", schema: "public", table: "students" },              () => loadData(session))
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_announcements" }, () => loadData(session))
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
  }, [session, loadData])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/teacher/login")
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const colorMap = useMemo(() => {
    const unique = [...new Set(schedules.map(s => s.subject))]
    return Object.fromEntries(unique.map((sub, i) => [sub, COLORS[i % COLORS.length]]))
  }, [schedules])

  const pinnedCount = announcements.filter(a => a.is_pinned).length

  // ── Theme ──────────────────────────────────────────────────────────────────
  const page = dm ? "bg-slate-950" : "bg-slate-50"
  const sub  = dm ? "text-slate-400" : "text-slate-500"

  const tabBtn = (active: boolean) =>
    `flex items-center justify-center md:justify-start gap-1.5 w-full md:w-auto text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 md:px-5 py-2.5 rounded-2xl transition-all duration-200
     ${active
       ? "text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/25"
       : (dm ? "text-slate-500 hover:text-slate-200 hover:bg-slate-700/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/60")}`

  if (loading || !session || !dmReady) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-950">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-20 h-20 rounded-full border border-blue-500/10 animate-ping" />
        <div className="absolute w-14 h-14 rounded-full border border-blue-500/20 animate-pulse" />
        <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Teacher Portal</p>
        <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">AMA ACLC Northbay</p>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen transition-colors duration-300 ${page}`}>
      <style jsx global>{`body{overflow-y:auto}::-webkit-scrollbar{display:none}*{-ms-overflow-style:none;scrollbar-width:none}`}</style>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-5 md:py-8 space-y-5 pb-24">

        {/* Nav */}
        <DashboardNav
          dm={dm}
          online={online}
          onToggleDark={toggleDark}
          onLogout={handleLogout}
        />

        {/* Profile */}
        <ProfileCard
          session={session}
          schedules={schedules}
          colorMap={colorMap}
          dm={dm}
          onAvatarUpdate={(url) => setSession(prev => prev ? { ...prev, avatar_url: url } : prev)}
        />

        {/* Tab switcher — 2×3 grid on mobile, single row on desktop */}
        <div className="md:overflow-x-auto md:pb-1">
        <div className={`grid grid-cols-3 md:flex md:flex-nowrap md:items-center md:w-fit gap-1 p-1.5 rounded-2xl border backdrop-blur-sm ${dm ? "border-slate-700/60 bg-slate-800/50" : "border-slate-200/80 bg-white/70 shadow-sm"}`}>
          <button className={tabBtn(tab === "schedule")} onClick={() => setTab("schedule")}>
            <CalendarDays size={11} /> Schedule
          </button>
          <button className={tabBtn(tab === "attendance")} onClick={() => setTab("attendance")}>
            <QrCode size={11} /> Attendance
          </button>
          <button className={tabBtn(tab === "cutting")} onClick={() => setTab("cutting")}>
            <AlertTriangle size={11} /> Cutting
          </button>
          <button className={tabBtn(tab === "reports")} onClick={() => setTab("reports")}>
            <BarChart2 size={11} /> Reports
          </button>
          <button className={tabBtn(tab === "announcements")} onClick={() => setTab("announcements")}>
            <Bell size={11} /> Announcements
            {pinnedCount > 0 && (
              <span className="bg-amber-500 text-white text-[7px] font-black rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-amber-500/30">
                {pinnedCount}
              </span>
            )}
          </button>
          <button className={tabBtn(tab === "calendar")} onClick={() => setTab("calendar")}>
            <Calendar size={11} /> Calendar
          </button>
        </div>
        </div>

        {/* Tab content */}
        {tab === "schedule" && (
          <ScheduleTab
            schedules={schedules}
            students={students}
            studLoad={studLoad}
            colorMap={colorMap}
            dm={dm}
            onStudentClick={setSelectedStudent}
          />
        )}

        {tab === "attendance" && session && (
          <AttendanceTab
            schedules={schedules}
            students={students}
            dm={dm}
            session={session}
            schoolYear={schoolYear}
            advisorySections={advisorySections}
          />
        )}

        {tab === "cutting" && session && (
          <CuttingClassDetector
            schedules={schedules}
            students={students}
            dm={dm}
            session={session}
            schoolYear={schoolYear}
            advisorySections={advisorySections}
          />
        )}

        {tab === "reports" && session && (
          <ReportsTab
            schedules={schedules}
            students={students}
            dm={dm}
            session={session}
            schoolYear={schoolYear}
            advisorySections={advisorySections}
          />
        )}

        {tab === "announcements" && (
          <AnnouncementsTab announcements={announcements} dm={dm} />
        )}

        {tab === "calendar" && (
          <AcademicCalendarTab dm={dm} schoolYear={schoolYear} />
        )}
      </div>

      {/* Student detail modal */}
      <StudentDetailTab
        student={selectedStudent}
        dm={dm}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  )
}