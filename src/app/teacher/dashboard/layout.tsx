// app/teacher/dashboard/layout.tsx
"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { CalendarDays, Bell, QrCode, BarChart2, AlertTriangle, Calendar, MessageSquare, FileText, BookOpen, Sun, Moon, LogOut, Menu } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { DashboardProvider, useDashboard } from "./context"
import { DashboardNav } from "./components/DashboardNav"
import { ProfileCard } from "./components/ProfileCard"
import { StudentDetailTab } from "./components/StudentDetailTab"
import { useMemo } from "react"
import { COLORS } from "./types"

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const {
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
    setSession,
    toggleDark,
    handleLogout,
  } = useDashboard()

  const currentTab = useMemo(() => {
    const parts = pathname.split("/")
    return parts[parts.length - 1] || "schedule"
  }, [pathname])

  const colorMap = useMemo(() => {
    const unique = [...new Set(schedules.map(s => s.subject))]
    return Object.fromEntries(unique.map((sub, i) => [sub, COLORS[i % COLORS.length]]))
  }, [schedules])

  const pinnedCount = announcements.filter(a => a.is_pinned).length

  // Theme styling
  const page = dm ? "bg-slate-950" : "bg-slate-50"
  const sub = dm ? "text-slate-400" : "text-slate-500"

  const tabBtn = (active: boolean) =>
    `flex items-center justify-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest py-2.5 rounded-2xl transition-all duration-200 w-full relative
     ${active
      ? "text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/25"
      : (dm ? "text-slate-500 hover:text-slate-200 hover:bg-slate-700/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/60")}`

  if (loading || !session) {
    return (
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
  }

  const navigateTo = (key: string) => {
    router.push(`/teacher/dashboard/${key}`)
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col ${page}`}>
      <style jsx global>{`body{overflow-y:auto}::-webkit-scrollbar{display:none}*{-ms-overflow-style:none;scrollbar-width:none}`}</style>

      {/* ── FULL WIDTH TOP HEADER BAR ── */}
      <header className={`h-16 w-full border-b flex items-center justify-between px-4 md:px-6 z-50 sticky top-0 shrink-0 transition-all duration-300
        ${dm ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
        
        <div className="flex items-center gap-3 md:gap-4">
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

        <div className="flex items-center gap-4">
          <div className={`hidden lg:flex flex-col text-right leading-tight border-r pr-4 ${dm ? "border-slate-800" : "border-slate-200"}`}>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${dm ? "text-slate-400" : "text-slate-500"}`}>{currentDate}</span>
            <span className={`text-[10px] font-black ${dm ? "text-amber-400" : "text-slate-700"}`}>Welcome, {session.full_name}</span>
          </div>

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

          <div className="flex items-center gap-1">
            <button
              onClick={toggleDark}
              className={`p-2 rounded-xl transition-colors ${dm ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"}`}
            >
              {dm ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <Link
              href="/teacher/dashboard/announcements"
              className={`p-2 rounded-xl transition-colors relative ${dm ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"}`}
            >
              <Bell size={14} />
              {pinnedCount > 0 && (
                <span className="absolute top-1 right-1 bg-amber-500 text-white text-[7px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {pinnedCount}
                </span>
              )}
            </Link>

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
        <aside
          className={`border-r hidden md:flex flex-col fixed top-16 left-0 h-[calc(100vh-4rem)] shrink-0 transition-all duration-300 z-40
            ${isSidebarCollapsed ? "w-16" : "w-64"}
            ${dm ? "bg-slate-900 border-slate-800" : "bg-slate-50/60 border-slate-200"}`}
        >
          <TooltipProvider delayDuration={100}>
            <nav className="flex-1 p-3 space-y-2.5 overflow-y-auto">
              {([
                { key: "schedule",     label: "Class Schedule",  icon: <CalendarDays size={15} /> },
                { key: "gradebook",    label: "Gradebook",       icon: <BookOpen size={15} /> },
                { key: "attendance",   label: "QR Scanner",      icon: <QrCode size={15} /> },
                { key: "cutting",      label: "Cutting Detector",icon: <AlertTriangle size={15} /> },
                { key: "reports",      label: "Reports",         icon: <FileText size={15} /> },
                { key: "announcements",label: "Portal News",     icon: <Bell size={15} /> },
                { key: "calendar",     label: "Academic Calendar",icon: <Calendar size={15} /> },
                { key: "chat",         label: "Teacher Chat",    icon: <MessageSquare size={15} /> },
              ] as const).map(item => {
                const active = currentTab === item.key

                const buttonEl = (
                  <Link
                    href={`/teacher/dashboard/${item.key}`}
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
                  </Link>
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

        <main className={`flex-1 min-w-0 overflow-y-auto transition-all duration-300 ${isSidebarCollapsed ? "md:pl-16" : "md:pl-64"}`} style={{ scrollbarWidth: "none" }}>
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 md:py-8 space-y-5 pb-24">
            
            <div className="md:hidden">
              <DashboardNav
                dm={dm}
                online={online}
                onToggleDark={toggleDark}
                onLogout={handleLogout}
              />
            </div>

            <div className="md:hidden">
              <ProfileCard
                session={session}
                schedules={schedules}
                colorMap={colorMap}
                dm={dm}
                onAvatarUpdate={(url) => setSession(prev => prev ? { ...prev, avatar_url: url } : prev)}
              />
            </div>

            <div className="md:hidden">
              <TooltipProvider delayDuration={300}>
                <div className={`grid grid-cols-9 gap-1 p-1.5 rounded-2xl border backdrop-blur-sm w-full ${dm ? "border-slate-700/60 bg-slate-800/50" : "border-slate-200/80 bg-white/70 shadow-sm"}`}>
                  <Link className={tabBtn(currentTab === "schedule")} href="/teacher/dashboard/schedule">
                    <CalendarDays size={13} />
                  </Link>
                  <Link className={tabBtn(currentTab === "gradebook")} href="/teacher/dashboard/gradebook">
                    <BookOpen size={13} />
                  </Link>
                  <Link className={tabBtn(currentTab === "attendance")} href="/teacher/dashboard/attendance">
                    <QrCode size={13} />
                  </Link>
                  <Link className={tabBtn(currentTab === "cutting")} href="/teacher/dashboard/cutting">
                    <AlertTriangle size={13} />
                  </Link>
                  <Link className={tabBtn(currentTab === "reports")} href="/teacher/dashboard/reports">
                    <FileText size={13} />
                  </Link>
                  <Link className={tabBtn(currentTab === "announcements")} href="/teacher/dashboard/announcements">
                    <Bell size={13} />
                  </Link>
                  <Link className={tabBtn(currentTab === "calendar")} href="/teacher/dashboard/calendar">
                    <Calendar size={13} />
                  </Link>
                  <Link className={tabBtn(currentTab === "chat")} href="/teacher/dashboard/chat">
                    <MessageSquare size={13} />
                  </Link>
                </div>
              </TooltipProvider>
            </div>

            {children}
          </div>
        </main>
      </div>

      <StudentDetailTab
        student={selectedStudent}
        dm={dm}
        sectionId={selectedStudent?.section ? sectionMap[selectedStudent.section]?.id : null}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardProvider>
  )
}
