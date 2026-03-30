// app/admin/teachers/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Users, GraduationCap, Eye, Edit2, Trash2, Loader2, Megaphone, BarChart2, CalendarDays } from "lucide-react"
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTeachers }         from "./hooks/useTeachers"
import { TeacherFormDialog }   from "./components/TeacherFormDialog"
import { TeacherDetailDrawer } from "./components/TeacherDetailDrawer"
import { AnnouncementPanel }   from "./components/AnnouncementPanel"
import type { Teacher }        from "./types"
import { supabase } from "@/lib/supabase/admin-client"
import { AcademicCalendarTab } from "@/app/teacher/dashboard/components/AcademicCalendarTab"

import { useTheme } from "@/hooks/useTheme"

/** Renders teacher avatar — uses avatar_url from Supabase storage if available */
function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
  const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="rounded-full object-cover flex-shrink-0 ring-2 ring-white/20"
        style={{ width: size, height: size }}
        onError={e => {
          const t = e.currentTarget
          t.style.display = "none"
          const parent = t.parentElement
          if (parent && !parent.querySelector(".avatar-fallback")) {
            const fb = document.createElement("div")
            fb.className = "avatar-fallback rounded-full flex items-center justify-center font-black text-white select-none flex-shrink-0"
            fb.style.cssText = `width:${size}px;height:${size}px;font-size:${size * 0.33}px;background:hsl(${hue},65%,45%)`
            fb.textContent = initials
            parent.appendChild(fb)
          }
        }}
      />
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-black text-white select-none flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.33, background: `hsl(${hue},65%,45%)` }}
    >
      {initials}
    </div>
  )
}

// ── Admin-wide attendance report (all sections, all teachers) ─────────────────
function AdminAllSectionsReport({ isDarkMode, schoolYear }: { isDarkMode: boolean; schoolYear: string }) {
  const [data, setData]       = useState<any[]>([])
  const [sects, setSects]     = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const dm   = isDarkMode
  const sub  = dm ? "text-slate-400" : "text-slate-500"
  const head = dm ? "text-white" : "text-slate-900"
  const card = dm ? "bg-slate-900/60 border-slate-700/50" : "bg-white border-slate-200"
  const divB = dm ? "border-slate-700/40" : "border-slate-100"

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [{ data: attData }, { data: sectData }] = await Promise.all([
          supabase.from("attendance").select("student_id, section, subject, date, status").eq("school_year", schoolYear),
          supabase.from("sections").select("section_name, strand"),
        ])
        setData(attData || [])
        setSects(sectData || [])
      } finally { setLoading(false) }
    }
    load()
    const ch = supabase.channel("admin_report_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [schoolYear])

  const toggle = (k: string) => setExpanded(prev => {
    const s = new Set(prev); if (s.has(k)) s.delete(k); else s.add(k); return s
  })

  // Group by section
  const sections = [...new Set(data.map((r: any) => r.section))].filter(Boolean).sort()

  const PctBar = ({ pct }: { pct: number }) => (
    <div className={`h-1.5 rounded-full overflow-hidden w-full ${dm ? "bg-slate-700" : "bg-slate-200"}`}>
      <div className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
    </div>
  )

  if (loading) return <div className="flex items-center gap-2 py-8"><Loader2 size={14} className="animate-spin text-blue-400" /><span className={`text-xs ${sub}`}>Loading…</span></div>
  if (sections.length === 0) return <p className={`text-xs ${sub} py-8 text-center`}>No attendance data yet for {schoolYear}</p>

  return (
    <div className="space-y-3">
      {sections.map(section => {
        const sRecs = data.filter((r: any) => r.section === section)
        const subjects = [...new Set(sRecs.map((r: any) => r.subject))].sort()
        const presentCount = sRecs.filter((r: any) => r.status === "Present" || r.status === "Late").length
        const absentCount  = sRecs.filter((r: any) => r.status === "Absent").length
        const totalRecs    = sRecs.length
        const pct          = totalRecs > 0 ? Math.round((presentCount / totalRecs) * 100) : 0
        const sect         = sects.find((s: any) => s.section_name === section)
        const isExpanded   = expanded.has(section)

        return (
          <div key={section} className={`rounded-2xl border overflow-hidden ${card}`}>
            <button onClick={() => toggle(section)} className={`w-full px-5 py-4 flex items-center gap-3 transition-colors text-left ${dm ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-black uppercase ${head}`}>{section}</p>
                  {sect && <span className={`text-[7px] font-black px-2 py-0.5 rounded-full ${sect.strand === "ICT" ? "bg-blue-500/15 text-blue-500" : "bg-amber-500/15 text-amber-500"}`}>{sect.strand}</span>}
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${pct >= 80 ? "bg-green-500/15 text-green-500" : pct >= 60 ? "bg-amber-500/15 text-amber-500" : "bg-red-500/15 text-red-500"}`}>{pct}%</span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className={`text-[9px] text-green-500`}>P: {presentCount}</span>
                  <span className={`text-[9px] text-red-500`}>A: {absentCount}</span>
                  <span className={`text-[9px] ${sub}`}>{subjects.length} subjects</span>
                </div>
                <div className="mt-2 max-w-xs"><PctBar pct={pct} /></div>
              </div>
              <svg className={`w-4 h-4 ${sub} transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isExpanded && (
              <div className={`border-t ${divB} divide-y ${dm ? "divide-slate-700/30" : "divide-slate-100"}`}>
                {subjects.map(subject => {
                  const subRecs = sRecs.filter((r: any) => r.subject === subject)
                  const sp = subRecs.filter((r: any) => r.status === "Present" || r.status === "Late").length
                  const sa = subRecs.filter((r: any) => r.status === "Absent").length
                  const spct = subRecs.length > 0 ? Math.round((sp / subRecs.length) * 100) : 0
                  return (
                    <div key={subject} className="px-5 py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-[10px] font-black uppercase truncate ${head}`}>{subject}</p>
                          <span className={`text-[9px] font-black ml-2 shrink-0 ${spct >= 80 ? "text-green-500" : spct >= 60 ? "text-amber-500" : "text-red-500"}`}>{spct}%</span>
                        </div>
                        <PctBar pct={spct} />
                        <div className="flex gap-3 mt-1">
                          <span className={`text-[8px] font-bold text-green-500`}>P: {sp}</span>
                          <span className={`text-[8px] font-bold text-red-500`}>A: {sa}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function TeachersPage() {
  const { isDarkMode: dm, mounted } = useTheme()
  const {
    teachers, filtered, announcements, loading, search, setSearch,
    createTeacher, updateTeacher, deleteTeacher, toggleActive,
    postAnnouncement, deleteAnnouncement, togglePin,
  } = useTeachers()

  const [formOpen, setFormOpen] = useState(false)
  const [editing,  setEditing]  = useState<Teacher | null>(null)
  const [viewing,  setViewing]  = useState<Teacher | null>(null)
  const [tab,      setTab]      = useState<"list" | "announcements" | "reports" | "calendar">("list")
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const [schoolYear, setSchoolYear] = useState("2025-2026")

  // Load school year for reports + calendar
  useEffect(() => {
    supabase.from("system_config").select("school_year").single()
      .then(({ data }) => { if (data?.school_year) setSchoolYear(data.school_year) })
  }, [])

  // Pagination
  const TEACHERS_PER_PAGE = 5
  const [teachersPage, setTeachersPage] = useState(1)
  // Reset to page 1 when search changes
  const handleSearchChange = (v: string) => { setSearch(v); setTeachersPage(1) }
  const totalTeacherPages = Math.max(1, Math.ceil(filtered.length / TEACHERS_PER_PAGE))
  const pagedTeachers = filtered.slice((teachersPage - 1) * TEACHERS_PER_PAGE, teachersPage * TEACHERS_PER_PAGE)

  // Derive live teacher for the drawer from the canonical teachers list so
  // toggleActive / updateTeacher changes reflect immediately without re-opening.
  const viewingTeacher = viewing ? (teachers.find(t => t.id === viewing.id) ?? viewing) : null

  const openCreate = () => { setEditing(null); setFormOpen(true) }
  const openEdit   = (t: Teacher) => { setEditing(t); setFormOpen(true); setViewing(null) }
  const handleSave = async (data: any) => {
    if (editing) await updateTeacher(editing.id, data)
    else await createTeacher(data)
  }

  const handleToggle = async (id: string, current: boolean) => {
    setToggling(prev => new Set(prev).add(id))
    try {
      await toggleActive(id, current)
    } finally {
      setToggling(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  // ── Theme tokens ────────────────────────────────────────────────────────────
  const page    = dm ? "bg-slate-950"              : "bg-slate-50"
  const surface = dm ? "bg-slate-900/60 backdrop-blur-xl" : "bg-white"
  const border  = dm ? "border-slate-700/60"        : "border-slate-200"
  const sub     = dm ? "text-slate-400"              : "text-slate-500"
  const txt     = dm ? "text-white"                  : "text-slate-900"
  const divB    = dm ? "rgba(71,85,105,0.25)"        : "rgba(226,232,240,1)"
  const rowHov  = dm ? "hover:bg-slate-800/40"       : "hover:bg-slate-50"
  const input   = `w-full pl-11 pr-4 py-3 rounded-2xl border text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 ${dm ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"}`
  const tabBase = `text-[9px] font-black uppercase tracking-widest px-3 sm:px-5 py-2.5 rounded-2xl transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap`
  const tabAct  = "text-white bg-blue-600 shadow-md"
  const tabInact= `${sub} ${dm ? "hover:text-white" : "hover:text-slate-900"}`

  const stats = {
    total:    teachers.length,
    active:   teachers.filter(t => t.is_active).length,
    inactive: teachers.filter(t => !t.is_active).length,
  }

  if (!mounted || (loading && teachers.length === 0)) return (
    <div className={`h-screen flex flex-col items-center justify-center gap-6 ${dm ? "bg-slate-950" : "bg-slate-50"}`}>
      <div className="relative flex items-center justify-center">
        <span className="absolute w-24 h-24 rounded-full border-2 border-blue-500/15 animate-ping" />
        <span className="absolute w-16 h-16 rounded-full border-2 border-blue-400/20 animate-ping" style={{ animationDelay: "0.15s" }} />
        <span className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 shadow-lg shadow-blue-500/30 flex items-center justify-center relative z-10">
          <Loader2 className="animate-spin text-white" size={20} />
        </span>
      </div>
      <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${dm ? 'text-blue-400' : 'text-blue-600'}`}>Loading Teachers…</p>
    </div>
  )

  return (
    <TooltipProvider delayDuration={100}>
    <div className={`relative min-h-screen transition-colors duration-500 ${page}`}>
      {/* Meta viewport + global mobile styles */}
      <style jsx global>{`
        html { -webkit-text-size-adjust: 100%; }
        body { overflow-y: auto; overflow-x: hidden; }
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
        @media (max-width: 768px) {
          .teachers-table-row { grid-template-columns: 1fr auto !important; }
          .teachers-table-row .col-email,
          .teachers-table-row .col-spec,
          .teachers-table-row .col-status-desktop { display: none !important; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6 pb-20">

        {/* Header */}
        <div className={`rounded-[24px] sm:rounded-[32px] border p-4 sm:p-6 md:p-10 ${surface} ${border} relative overflow-hidden`}>
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />
          <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-[60px] pointer-events-none ${dm ? 'bg-blue-600/8' : 'bg-blue-400/6'}`} />
          <div className="flex flex-col gap-4 sm:gap-6 relative">
            {/* Title row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl ${dm ? "bg-blue-500/10" : "bg-blue-50"}`}>
                  <GraduationCap size={18} className="text-blue-400 sm:hidden" />
                  <GraduationCap size={22} className="text-blue-400 hidden sm:block" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${dm ? 'text-blue-400' : 'text-blue-500'}`}>Faculty Registry</p>
                  </div>
                  <h1 className={`text-2xl sm:text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none ${txt}`}>Teachers</h1>
                  <p className={`text-[10px] sm:text-[11px] font-semibold italic mt-1 ${sub}`}>AMA ACLC Northbay — Faculty</p>
                </div>
              </div>
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-11 px-3 sm:px-6 rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/25 transition-all active:scale-95 shrink-0"
              >
                <Plus size={13} />
                <span className="hidden xs:inline sm:inline">Add Teacher</span>
                <span className="xs:hidden sm:hidden">Add</span>
              </button>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {[
                { label: "Total",    val: stats.total,    color: "text-blue-400",    bg: dm ? "bg-blue-500/8 border-blue-500/20" : "bg-blue-50 border-blue-200"    },
                { label: "Active",   val: stats.active,   color: "text-emerald-400", bg: dm ? "bg-emerald-500/8 border-emerald-500/20" : "bg-emerald-50 border-emerald-200" },
                { label: "Inactive", val: stats.inactive, color: "text-slate-400",   bg: dm ? "bg-slate-800/50 border-slate-700/40" : "bg-slate-50 border-slate-200" },
              ].map(s => (
                <div key={s.label} className={`rounded-xl sm:rounded-2xl border px-3 sm:px-4 py-2 sm:py-2.5 text-center min-w-[58px] sm:min-w-[70px] ${s.bg}`}>
                  <p className={`text-lg sm:text-2xl font-black tabular-nums ${s.color}`}>{s.val}</p>
                  <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${sub}`}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className={`grid grid-cols-2 sm:flex sm:flex-row gap-1 sm:gap-2 p-1.5 rounded-2xl border ${border} ${dm ? "bg-slate-800/40" : "bg-slate-100"}`}>
          <button className={`${tabBase} justify-center ${tab === "list" ? tabAct : tabInact}`} onClick={() => setTab("list")}>
            <Users size={12} /> <span>Teachers</span>
          </button>
          <button className={`${tabBase} justify-center ${tab === "announcements" ? tabAct : tabInact}`} onClick={() => setTab("announcements")}>
            <Megaphone size={12} /> <span>Announcements</span>
            {announcements.length > 0 && (
              <span className="bg-amber-500 text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center shrink-0">{announcements.length}</span>
            )}
          </button>
          <button className={`${tabBase} justify-center ${tab === "reports" ? tabAct : tabInact}`} onClick={() => setTab("reports")}>
            <BarChart2 size={12} /> <span>Reports</span>
          </button>
          <button className={`${tabBase} justify-center ${tab === "calendar" ? tabAct : tabInact}`} onClick={() => setTab("calendar")}>
            <CalendarDays size={12} /> <span>Calendar</span>
          </button>
        </div>

        {/* Teachers list */}
        {tab === "list" && (
          <div className="space-y-3 sm:space-y-4">
            <div className="relative max-w-sm">
              <Search size={14} className={`absolute left-4 top-1/2 -translate-y-1/2 ${sub}`} />
              <input value={search} onChange={e => handleSearchChange(e.target.value)} placeholder="Search teachers…" className={input} />
            </div>

            <div className={`rounded-2xl sm:rounded-[32px] border overflow-hidden ${surface} ${border} relative shadow-xl shadow-blue-500/5`}>
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
              
              {/* Top Pagination Switcher */}
              {totalTeacherPages > 1 && (
                <div className={`flex items-center justify-between px-6 py-4 border-b bg-slate-500/5`} style={{ borderColor: divB }}>
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>
                      Page {teachersPage} of {totalTeacherPages}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setTeachersPage(p => Math.max(1, p - 1))}
                      disabled={teachersPage <= 1}
                      className={`h-8 px-3 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 border
                        ${dm ? "bg-slate-800 border-slate-750 hover:bg-slate-700 text-slate-300" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"}`}
                    >Prev</button>
                    <button
                      onClick={() => setTeachersPage(p => Math.min(totalTeacherPages, p + 1))}
                      disabled={teachersPage >= totalTeacherPages}
                      className={`h-8 px-3 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 border
                        ${dm ? "bg-slate-800 border-slate-750 hover:bg-slate-700 text-slate-300" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"}`}
                    >Next</button>
                  </div>
                </div>
              )}

              {/* Table header — desktop only */}
              <div
                className={`hidden md:grid gap-4 px-6 py-3 border-b text-[9px] font-black uppercase tracking-widest mt-[3px] ${border} ${sub}`}
                style={{ gridTemplateColumns: "2fr 2fr 2fr 1fr 110px" }}
              >
                <span>Name</span><span>Email</span><span>Specialization</span><span>Status</span><span className="text-right">Actions</span>
              </div>

              {filtered.length === 0 && (
                <div className="px-6 py-16 text-center">
                  <GraduationCap size={32} className={`mx-auto mb-3 ${dm ? "text-slate-700" : "text-slate-300"}`} />
                  <p className={`text-sm font-bold ${sub}`}>{search ? "No teachers match your search" : "No teachers yet — add one above"}</p>
                </div>
              )}

              <div className="divide-y" style={{ borderColor: divB }}>
                {pagedTeachers.map(t => (
                  <div key={t.id}>
                    {/* ── Desktop row ── */}
                    <div
                      className={`hidden md:grid gap-4 px-6 py-4 items-center transition-colors ${rowHov}`}
                      style={{ gridTemplateColumns: "2fr 2fr 2fr 1fr 110px" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={t.full_name} url={t.avatar_url} size={36} />
                        <div className="min-w-0">
                          <p className={`text-sm font-bold truncate ${txt}`}>{t.full_name}</p>
                          {t.phone && <p className={`text-[10px] truncate ${sub}`}>{t.phone}</p>}
                        </div>
                      </div>
                      <p className={`text-xs truncate ${sub}`}>{t.email}</p>
                      <p className={`text-xs truncate ${sub}`}>{t.subject_specialization || "—"}</p>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleToggle(t.id, t.is_active)} disabled={toggling.has(t.id)}
                          role="switch" aria-checked={t.is_active}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 disabled:opacity-50
                            ${t.is_active ? "bg-emerald-500" : dm ? "bg-slate-600" : "bg-slate-300"}`}>
                          {toggling.has(t.id)
                            ? <span className="absolute inset-0 flex items-center justify-center"><Loader2 size={10} className="animate-spin text-white" /></span>
                            : <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${t.is_active ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                          }
                        </button>
                        <span className={`text-[9px] font-black uppercase tracking-widest
                          ${t.is_active ? "text-emerald-400" : dm ? "text-slate-500" : "text-slate-400"}`}>
                          {t.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => setViewing(t)} className={`p-2 rounded-xl transition-colors ${dm ? "hover:bg-slate-700 text-slate-400 hover:text-blue-400" : "hover:bg-blue-50 text-slate-400 hover:text-blue-500"}`}><Eye size={13} /></button>
                          </TooltipTrigger>
                          <TooltipContent>View</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => openEdit(t)} className={`p-2 rounded-xl transition-colors ${dm ? "hover:bg-slate-700 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"}`}><Edit2 size={13} /></button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={() => deleteTeacher(t.id, t.full_name)} className={`p-2 rounded-xl transition-colors ${dm ? "hover:bg-red-500/10 text-slate-600 hover:text-red-400" : "hover:bg-red-50 text-slate-300 hover:text-red-400"}`}><Trash2 size={13} /></button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* ── Mobile card ── */}
                    <div className={`md:hidden relative overflow-hidden px-4 py-4 transition-colors ${rowHov}`}>
                      {/* Active status left bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-[3px] transition-colors ${t.is_active ? 'bg-emerald-500' : 'bg-slate-600/30'}`} />
                      <div className="flex items-center gap-3 pl-2">
                        <Avatar name={t.full_name} url={t.avatar_url} size={44} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-black truncate ${txt}`}>{t.full_name}</p>
                            <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full
                              ${t.is_active
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                              }`}>
                              <span className={`w-1 h-1 rounded-full ${t.is_active ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                              {t.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          {t.subject_specialization && <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${dm ? 'text-blue-400/70' : 'text-blue-500/70'}`}>{t.subject_specialization}</p>}
                          {t.email && <p className={`text-[9px] truncate mt-0.5 ${sub}`}>{t.email}</p>}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => setViewing(t)} className={`p-2.5 rounded-xl transition-colors ${dm ? "hover:bg-slate-700 text-slate-400 hover:text-blue-400" : "hover:bg-blue-50 text-slate-400 hover:text-blue-500"}`}><Eye size={15} /></button>
                          <button onClick={() => openEdit(t)} className={`p-2.5 rounded-xl transition-colors ${dm ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-400"}`}><Edit2 size={15} /></button>
                          <button type="button" onClick={() => handleToggle(t.id, t.is_active)} disabled={toggling.has(t.id)}
                            role="switch" aria-checked={t.is_active}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 disabled:opacity-50
                              ${t.is_active ? "bg-emerald-500" : dm ? "bg-slate-600" : "bg-slate-300"}`}>
                            {toggling.has(t.id)
                              ? <span className="absolute inset-0 flex items-center justify-center"><Loader2 size={10} className="animate-spin text-white" /></span>
                              : <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${t.is_active ? "translate-x-6" : "translate-x-1"}`} />
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Teachers Pagination — Bottom */}
              {totalTeacherPages > 1 && (
                <div className={`flex items-center justify-between px-6 py-5 border-t bg-slate-500/5`} style={{ borderColor: divB }}>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>
                    {filtered.length} teacher{filtered.length !== 1 ? "s" : ""} · Overall count
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setTeachersPage(p => Math.max(1, p - 1))}
                      disabled={teachersPage <= 1}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all disabled:opacity-30 border shadow-sm
                        ${dm ? "bg-slate-800 border-slate-750 hover:bg-slate-700 text-slate-300" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"}`}
                    >‹</button>
                    {Array.from({ length: totalTeacherPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalTeacherPages || Math.abs(p - teachersPage) <= 1)
                      .reduce<(number | string)[]>((acc, p, i, arr) => {
                        if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…")
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, i) => typeof p === "string" ? (
                        <span key={`e${i}`} className={`text-[10px] px-1 ${sub}`}>…</span>
                      ) : (
                        <button key={p}
                          onClick={() => setTeachersPage(p as number)}
                          className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all border shadow-sm
                            ${teachersPage === p
                              ? "bg-blue-600 border-blue-600 text-white shadow-blue-500/20"
                              : dm ? "bg-slate-800 border-slate-750 hover:bg-slate-700 text-slate-400" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-500"
                            }`}
                        >{p}</button>
                      ))}
                    <button
                      onClick={() => setTeachersPage(p => Math.min(totalTeacherPages, p + 1))}
                      disabled={teachersPage >= totalTeacherPages}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all disabled:opacity-30 border shadow-sm
                        ${dm ? "bg-slate-800 border-slate-750 hover:bg-slate-700 text-slate-300" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"}`}
                    >›</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Announcements */}
        {tab === "announcements" && (
          <AnnouncementPanel
            announcements={announcements}
            teachers={teachers}
            isDarkMode={dm}
            onPost={postAnnouncement}
            onDelete={deleteAnnouncement}
            onTogglePin={togglePin}
          />
        )}

        {/* Reports — shows all sections/subjects across all teachers */}
        {tab === "reports" && (
          <div className={`rounded-2xl sm:rounded-3xl border overflow-hidden ${surface} ${border} relative`}>
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-500 via-purple-500 to-pink-400" />
            <div className={`px-5 sm:px-6 py-4 border-b mt-[3px] ${border}`}>
              <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${sub}`}>School-Wide Attendance Reports</p>
              <p className={`text-sm font-black mt-0.5 ${txt}`}>All sections · {schoolYear}</p>
            </div>
            <div className="p-4 sm:p-6">
              <AdminAllSectionsReport isDarkMode={dm} schoolYear={schoolYear} />
            </div>
          </div>
        )}

        {/* Calendar — read-only view of academic calendar */}
        {tab === "calendar" && (
          <AcademicCalendarTab dm={dm} schoolYear={schoolYear} />
        )}
      </div>

      <TeacherFormDialog open={formOpen} editing={editing} isDarkMode={dm} onSave={handleSave} onClose={() => setFormOpen(false)} />
      <TeacherDetailDrawer teacher={viewingTeacher} isDarkMode={dm} onClose={() => setViewing(null)} onEdit={openEdit} onDelete={deleteTeacher} onToggle={handleToggle} />
    </div>
    </TooltipProvider>
  )
}