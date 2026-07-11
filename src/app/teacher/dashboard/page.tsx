// app/teacher/dashboard/page.tsx
"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, Bell, QrCode, BarChart2, AlertTriangle, Calendar, MessageSquare, FileText, Sun, Moon, LogOut, Menu, ChevronLeft, ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabase/teacher-client"
import { toast } from "sonner"

import { DashboardNav } from "./components/DashboardNav"
import { ProfileCard } from "./components/ProfileCard"
import { ScheduleTab } from "./components/ScheduleTab"
import { AnnouncementsTab } from "./components/AnnouncementsTab"
import { StudentDetailTab } from "./components/StudentDetailTab"
import { AttendanceTab } from "./components/AttendanceTab"
import { CuttingClassDetector } from "./components/CuttingClassDetector"
import { QuarterlyUpdateTab } from "./components/QuarterlyUpdateTab"
import { ReportsTab } from "./components/ReportsTab"
import { AcademicCalendarTab } from "./components/AcademicCalendarTab"
import { ChatTab } from "./components/ChatTab"

import {
  TeacherSession, ScheduleRow, Student, Announcement,
  COLORS, todayName,
} from "./types"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

type TabName = "schedule" | "announcements" | "attendance" | "cutting" | "quarterly" | "reports" | "calendar" | "chat"

export default function TeacherDashboard() {
  const router = useRouter()

  const [session, setSession] = useState<TeacherSession | null>(null)
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [studLoad, setStudLoad] = useState(false)
  const [tab, setTab] = useState<TabName>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("teacher_active_tab")
      if (saved && ["schedule", "announcements", "attendance", "cutting", "quarterly", "reports", "calendar", "chat"].includes(saved))
        return saved as TabName
    }
    return "schedule"
  })
  const [online, setOnline] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [schoolYear, setSchoolYear] = useState("2025-2026")
  const [advisorySections, setAdvisorySections] = useState<string[]>([])
  const [allowTeacherGrading, setAllowTeacherGrading] = useState(false)
  const [sectionMap, setSectionMap] = useState<Record<string, any>>({})
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [currentDate, setCurrentDate] = useState("")

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
        .select("id, full_name, email, avatar_url, gender")
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
  const loadData = useCallback(async (sess: TeacherSession, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [{ data: byId }, { data: byName }, { data: config }, { data: sysData }] = await Promise.all([
        supabase.from("schedules").select("*, rooms(name)").eq("teacher_id", sess.id).order("day").order("start_time"),
        supabase.from("schedules").select("*, rooms(name)").ilike("teacher", `%${sess.full_name}%`).order("day").order("start_time"),
        supabase.from("system_config").select("school_year").single(),
        supabase.from("system_settings").select("*").eq("setting_key", "allow_teacher_grading").single(),
      ])

      if (config?.school_year) setSchoolYear(config.school_year)
      
      if (sysData) setAllowTeacherGrading(sysData.value_text === 'true')

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
        if (!silent) setStudLoad(true)
        // Resolve section names → section IDs so that renames don't break the lookup
        const { data: sectionRows } = await supabase
          .from("sections")
          .select("id, section_name, lms_grading_system")
          .in("section_name", sectionNames)
          
        if (sectionRows) {
          const map: Record<string, any> = {}
          sectionRows.forEach(s => map[s.section_name] = s)
          setSectionMap(map)
        }
        
        const sectionIds = (sectionRows ?? []).map(s => s.id)
        if (sectionIds.length > 0) {
          const { data: studData, error: studErr } = await supabase
            .from("students")
            .select("id, first_name, last_name, middle_name, lrn, gender, section, strand, status, profile_picture, two_by_two_url, last_login_at")
            .in("section_id", sectionIds)
            .not("status", "eq", "Pending")
          if (!studErr) setStudents(studData ?? [])
        }
        if (!silent) setStudLoad(false)
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
            .from("sections").select("id, section_name").in("section_name", advOnlySections)
          if (advSecRows) {
            setSectionMap(prev => {
              const next = { ...prev }
              advSecRows.forEach(s => { next[s.section_name] = s })
              return next
            })
          }
          const advSecIds = (advSecRows ?? []).map(s => s.id)
          if (advSecIds.length > 0) {
            const { data: advStudents } = await supabase
              .from("students")
              .select("id, first_name, last_name, middle_name, lrn, gender, section, strand, status, profile_picture, two_by_two_url, last_login_at")
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
      if (!silent) setLoading(false)
    }
  }, [])

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return
    const chan = supabase
      .channel("teacher_dashboard_rt")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "schedules" }, (payload) => {
        // Patch the changed row in-place — no full reload, no spinner
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
  }, [session, debouncedLoadData])

  useEffect(() => {
    sessionStorage.setItem("teacher_active_tab", tab)
  }, [tab])

  // ── Scroll position — save on scroll, restore once loading finishes ────────
  useEffect(() => {
    const onScroll = () => sessionStorage.setItem("teacher_scroll_pos", window.scrollY.toString())
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (loading || !session) return
    const saved = sessionStorage.getItem("teacher_scroll_pos")
    if (saved) setTimeout(() => window.scrollTo({ top: parseInt(saved), behavior: "instant" }), 60)
  }, [loading, session])

  const handleLogout = async () => {
    sessionStorage.removeItem("teacher_active_tab")
    sessionStorage.removeItem("teacher_scroll_pos")
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
  const sub = dm ? "text-slate-400" : "text-slate-500"

  const tabBtn = (active: boolean) =>
    `flex items-center justify-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest py-2.5 rounded-2xl transition-all duration-200 w-full relative
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
        <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">ACLC NORTHBAY</p>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col ${page}`}>
      <style jsx global>{`body{overflow-y:auto}::-webkit-scrollbar{display:none}*{-ms-overflow-style:none;scrollbar-width:none}`}</style>

      {/* ── FULL WIDTH TOP HEADER BAR ── */}
      <header className={`h-16 w-full border-b flex items-center justify-between px-4 md:px-6 z-50 sticky top-0 shrink-0 transition-all duration-300
        ${dm ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
        
        {/* Left: Logo, Title, and Sidebar Toggle */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Sidebar Toggle for Desktop (Minimize/Maximize) */}
          <button
            onClick={() => setIsSidebarCollapsed(v => !v)}
            className={`hidden md:flex items-center justify-center p-2 rounded-xl transition-colors ${dm ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-955"}`}
          >
            <Menu size={16} />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white p-0.5 shadow-md border border-slate-100">
              <img src="/logo-aclc.png" alt="ACLC" className="w-full h-full object-contain" />
            </div>
            <div className="leading-tight">
              <h1 className={`text-xs font-black tracking-[0.15em] flex items-center gap-1.5 uppercase ${dm ? "text-white" : "text-slate-900"}`}>
                Teacher Portal
              </h1>
              <p className={`text-[8px] font-bold uppercase tracking-widest ${dm ? "text-slate-400" : "text-slate-500"}`}>ACLC NORTHBAY · SHS</p>
            </div>
          </div>
        </div>

        {/* Right: Date, Profile, Actions */}
        <div className="flex items-center gap-4">
          {/* Live Sync and Date (Hidden on mobile) */}
          <div className={`hidden lg:flex flex-col text-right leading-tight border-r pr-4 ${dm ? "border-slate-800" : "border-slate-200"}`}>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${dm ? "text-slate-400" : "text-slate-500"}`}>{currentDate}</span>
            <span className={`text-[10px] font-black ${dm ? "text-amber-400" : "text-slate-700"}`}>Welcome, {session?.full_name}</span>
          </div>

          {/* Teacher Profile Summary (Avatar + Name) */}
          {session && (
            <div className={`flex items-center gap-2 pr-4 md:border-r ${dm ? "border-slate-800" : "border-slate-250"}`}>
              <div className="text-right leading-tight hidden sm:block">
                <p className={`text-[10px] font-black uppercase tracking-wide ${dm ? "text-white" : "text-slate-900"}`}>{session.full_name}</p>
                <p className={`text-[8px] font-bold ${dm ? "text-slate-400" : "text-slate-500"}`}>Class Adviser</p>
              </div>
              <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-black border ${dm ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-blue-50 text-blue-600 border-blue-100"}`}>
                {session.avatar_url ? (
                  <img src={session.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  session.full_name.split(" ").filter(Boolean).map(p => p[0]).join("").slice(0, 2).toUpperCase()
                )}
              </div>
            </div>
          )}

          {/* Action icons */}
          <div className="flex items-center gap-1">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className={`p-2 rounded-xl transition-colors ${dm ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"}`}
            >
              {dm ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {/* Notification Alert Bell (News trigger shortcut) */}
            <button
              onClick={() => setTab("announcements")}
              className={`p-2 rounded-xl transition-colors relative ${dm ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"}`}
            >
              <Bell size={14} />
              {pinnedCount > 0 && (
                <span className="absolute top-1 right-1 bg-amber-500 text-white text-[7px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {pinnedCount}
                </span>
              )}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className={`p-2 rounded-xl transition-colors ${dm ? "hover:bg-red-500/10 text-slate-400 hover:text-red-400" : "hover:bg-red-50 text-slate-500 hover:text-red-500"}`}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ── LOWER PART: SIDEBAR + MAIN CONTENT ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* DESKTOP SIDEBAR */}
        <aside
          className={`border-r hidden md:flex flex-col fixed top-16 left-0 h-[calc(100vh-4rem)] shrink-0 transition-all duration-300 z-40
            ${isSidebarCollapsed ? "w-16" : "w-64"}
            ${dm ? "bg-slate-900 border-slate-800" : "bg-slate-50/60 border-slate-200"}`}
        >
          {/* Navigation Menu */}
          <TooltipProvider delayDuration={100}>
            <nav className="flex-1 p-3 space-y-2.5 overflow-y-auto">
              {([
                { key: "schedule",     label: "Class Schedule",  icon: <CalendarDays size={15} /> },
                { key: "attendance",   label: "QR Scanner",      icon: <QrCode size={15} /> },
                { key: "cutting",      label: "Cutting Detector",icon: <AlertTriangle size={15} /> },
                { key: "quarterly",    label: "Submit Grades",   icon: <BarChart2 size={15} /> },
                { key: "reports",      label: "Reports",         icon: <FileText size={15} /> },
                { key: "announcements",label: "Portal News",     icon: <Bell size={15} /> },
                { key: "calendar",     label: "Academic Calendar",icon: <Calendar size={15} /> },
                { key: "chat",         label: "Teacher Chat",    icon: <MessageSquare size={15} /> },
              ] as const).map(item => {
                const active = tab === item.key
                
                const buttonEl = (
                  <button
                    onClick={() => setTab(item.key)}
                    className={`flex items-center rounded-2xl transition-all duration-200 w-full relative overflow-hidden
                      ${isSidebarCollapsed ? "justify-center p-3.5" : "gap-3 px-4 py-3.5 text-[10px] font-black uppercase tracking-widest"}
                      ${active
                        ? "text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-md shadow-blue-500/25"
                        : dm
                          ? "text-slate-400 hover:text-white hover:bg-slate-850"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      }`}
                  >
                    {item.icon}
                    {!isSidebarCollapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        {item.key === "announcements" && pinnedCount > 0 && (
                          <span className="ml-auto bg-amber-500 text-white text-[8px] font-black rounded-full px-2 py-0.5 shadow-sm shadow-amber-500/20">
                            {pinnedCount}
                          </span>
                        )}
                      </>
                    )}
                    {isSidebarCollapsed && item.key === "announcements" && pinnedCount > 0 && (
                      <span className={`absolute top-2.5 right-2.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse border ${dm ? "border-slate-900" : "border-white"} shadow-sm`} />
                    )}
                  </button>
                )

                if (!isSidebarCollapsed) {
                  return <div key={item.key}>{buttonEl}</div>
                }

                return (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>
                      {buttonEl}
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={12} className="bg-slate-950 text-white border-slate-800 backdrop-blur-md px-3 py-1.5 rounded-lg z-50">
                      <p className="font-bold text-[9px] uppercase tracking-widest">{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </nav>
          </TooltipProvider>

          {/* Sidebar Footer Indicator */}
          {!isSidebarCollapsed && (
            <div className={`p-4 border-t ${dm ? "border-slate-800" : "border-slate-100"}`}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[8px] font-black uppercase tracking-wider
                ${online
                  ? (dm ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600")
                  : (dm ? "bg-red-500/10 border-red-500/25 text-red-400" : "bg-red-50 border-red-200 text-red-500")
                }`}>
                <span className="relative flex shrink-0">
                  {online && <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-50" />}
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${online ? "bg-emerald-500" : "bg-red-500"}`} />
                </span>
                <span>{online ? "Feed Live" : "Offline"}</span>
              </div>
            </div>
          )}
        </aside>

        {/* MAIN SCROLLABLE CONTENT */}
        <main className={`flex-1 min-w-0 overflow-y-auto transition-all duration-300 ${isSidebarCollapsed ? "md:pl-16" : "md:pl-64"}`} style={{ scrollbarWidth: "none" }}>
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 md:py-8 space-y-5 pb-24">
          
          {/* Mobile-only Nav Header */}
          <div className="md:hidden">
            <DashboardNav
              dm={dm}
              online={online}
              onToggleDark={toggleDark}
              onLogout={handleLogout}
            />
          </div>

          {/* Mobile-only Profile Card */}
          <div className="md:hidden">
            <ProfileCard
              session={session}
              schedules={schedules}
              colorMap={colorMap}
              dm={dm}
              onAvatarUpdate={(url) => setSession(prev => prev ? { ...prev, avatar_url: url } : prev)}
            />
          </div>

          {/* Mobile-only Tab switcher */}
          <div className="md:hidden">
            <TooltipProvider delayDuration={300}>
              <div className={`grid grid-cols-8 gap-1 p-1.5 rounded-2xl border backdrop-blur-sm w-full ${dm ? "border-slate-700/60 bg-slate-800/50" : "border-slate-200/80 bg-white/70 shadow-sm"}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className={tabBtn(tab === "schedule")} onClick={() => setTab("schedule")}>
                      <CalendarDays size={13} /><span className="hidden md:inline truncate">Schedule</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-950 text-white border-slate-800 backdrop-blur-md px-4 py-2 rounded-xl">
                    <p className="font-bold text-[10px] uppercase tracking-widest">Your class schedule</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className={tabBtn(tab === "attendance")} onClick={() => setTab("attendance")}>
                      <QrCode size={13} /><span className="hidden md:inline truncate">Scan</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-950 text-white border-slate-800 backdrop-blur-md px-4 py-2 rounded-xl">
                    <p className="font-bold text-[10px] uppercase tracking-widest">Scan QR to mark attendance</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className={tabBtn(tab === "cutting")} onClick={() => setTab("cutting")}>
                      <AlertTriangle size={13} /><span className="hidden md:inline truncate">Cutting</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-950 text-white border-slate-800 backdrop-blur-md px-4 py-2 rounded-xl">
                    <p className="font-bold text-[10px] uppercase tracking-widest">Students who skipped class</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className={tabBtn(tab === "quarterly")} onClick={() => setTab("quarterly")}>
                      <BarChart2 size={13} /><span className="hidden md:inline truncate">Submit</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-950 text-white border-slate-800 backdrop-blur-md px-4 py-2 rounded-xl">
                    <p className="font-bold text-[10px] uppercase tracking-widest">Submit quarterly grades</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className={tabBtn(tab === "reports")} onClick={() => setTab("reports")}>
                      <FileText size={13} /><span className="hidden md:inline truncate">Reports</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-950 text-white border-slate-800 backdrop-blur-md px-4 py-2 rounded-xl">
                    <p className="font-bold text-[10px] uppercase tracking-widest">Download attendance reports</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className={tabBtn(tab === "announcements")} onClick={() => setTab("announcements")}>
                      <Bell size={13} /><span className="hidden md:inline truncate">News</span>
                      {pinnedCount > 0 && (
                        <span className="absolute top-1 right-1 bg-amber-500 text-white text-[7px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                          {pinnedCount}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-950 text-white border-slate-800 backdrop-blur-md px-4 py-2 rounded-xl">
                    <p className="font-bold text-[10px] uppercase tracking-widest">School news and updates</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className={tabBtn(tab === "calendar")} onClick={() => setTab("calendar")}>
                      <Calendar size={13} /><span className="hidden md:inline truncate">Calendar</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-950 text-white border-slate-800 backdrop-blur-md px-4 py-2 rounded-xl">
                    <p className="font-bold text-[10px] uppercase tracking-widest">Academic calendar</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className={tabBtn(tab === "chat")} onClick={() => setTab("chat")}>
                      <MessageSquare size={13} /><span className="hidden md:inline truncate">Chat</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-950 text-white border-slate-800 backdrop-blur-md px-4 py-2 rounded-xl">
                    <p className="font-bold text-[10px] uppercase tracking-widest">Chat with staff</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
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
              onLinkUpdated={(id, link) => setSchedules(prev => prev.map(s => s.id === id ? { ...s, gclass_link: link } : s))}
              session={session}
              schoolYear={schoolYear}
              allowTeacherGrading={allowTeacherGrading}
              sectionMap={sectionMap}
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

          {tab === "quarterly" && session && (
            <QuarterlyUpdateTab dm={dm} session={session} />
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

          {tab === "chat" && session && (
            <ChatTab session={session} dm={dm} />
          )}
        </div>
      </main>
      </div>
      {/* Student detail modal */}
      <StudentDetailTab
        student={selectedStudent}
        dm={dm}
        sectionId={selectedStudent?.section ? sectionMap[selectedStudent.section]?.id : null}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  )
}