"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { studentSupabase } from "@/lib/supabase/student-client"
import {
  Loader2, LogOut, GraduationCap, QrCode, CalendarDays,
  BookOpen, Copy, Check, ClipboardList, Sun, Moon, User,
  LayoutGrid, List, Download, CheckCircle2,
} from "lucide-react"
import { toPng } from "html-to-image"
import { saveAs } from "file-saver"
import { Button } from "@/components/ui/button"
import { StudentQRCard } from "@/app/status/components/StudentQRCard"
import { ScheduleView } from "@/app/status/components/ScheduleView"
import { AttendanceCalendar } from "./AttendanceCalendar"
import { StudentInfoTab } from "./StudentInfoTab"
import { useThemeStore } from "@/store/useThemeStore"
import { toast } from "sonner"

interface StudentData {
  id: string
  first_name: string
  last_name: string
  middle_name: string | null
  lrn: string
  section: string | null
  strand: string | null
  school_year: string | null
  status: string
  grade_level?: string | null
  two_by_two_url?: string | null
  // personal
  gender?: string | null
  age?: number | null
  birth_date?: string | null
  civil_status?: string | null
  nationality?: string | null
  religion?: string | null
  // contact
  address?: string | null
  email?: string | null
  phone?: string | null
  contact_no?: string | null
  // guardian
  guardian_name?: string | null
  guardian_first_name?: string | null
  guardian_middle_name?: string | null
  guardian_last_name?: string | null
  guardian_contact?: string | null
  guardian_phone?: string | null
  guardian_email?: string | null
  // academic
  student_category?: string | null
  last_school_attended?: string | null
  last_school_address?: string | null
  school_type?: string | null
  year_completed_jhs?: string | null
  gwa_grade_10?: number | null
  preferred_modality?: string | null
  preferred_shift?: string | null
}

// ── Welcome modal ─────────────────────────────────────────────────────────────
function WelcomeModal({ studentId, lrn, onClose, dm }: {
  studentId: string; lrn: string; onClose: () => void; dm: boolean
}) {
  const trackingPrefix = studentId.split("-")[0]
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(20px)" }}
    >
      <div className={`w-full max-w-sm rounded-[40px] p-8 space-y-6 animate-in zoom-in-95 duration-300 shadow-2xl border ${
        dm ? "bg-slate-950 border-white/10" : "bg-white border-slate-200"
      }`}>
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-green-400" />
          </div>
          <h2 className={`text-xl font-black uppercase tracking-tight ${dm ? "text-white" : "text-slate-900"}`}>
            Welcome!
          </h2>
          <p className={`text-[10px] font-bold uppercase tracking-[0.3em] ${dm ? "text-slate-500" : "text-slate-400"}`}>
            Save your login credentials
          </p>
        </div>

        <div className="space-y-3">
          {[
            { label: "Username (Tracking ID)", value: trackingPrefix },
            { label: "LRN", value: lrn },
          ].map(({ label, value }) => (
            <div key={label} className={`rounded-2xl border p-4 ${dm ? "border-white/8 bg-white/[0.03]" : "border-slate-200 bg-slate-50"}`}>
              <p className={`text-[8px] font-black uppercase tracking-[0.3em] mb-1.5 ${dm ? "text-slate-600" : "text-slate-400"}`}>{label}</p>
              <div className="flex items-center justify-between gap-3">
                <p className={`text-base font-black font-mono tracking-widest ${dm ? "text-white" : "text-slate-900"}`}>{value}</p>
                <button onClick={() => copy(value, label)} className="text-slate-400 hover:text-blue-500 transition-colors shrink-0">
                  {copied === label ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-amber-500/5 border border-amber-500/15 p-4">
          <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest leading-relaxed">
            Keep these safe — your username and LRN are required to sign in next time.
          </p>
        </div>

        <Button
          onClick={onClose}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-[18px] text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-95"
        >
          Got it, show my dashboard
        </Button>
      </div>
    </div>
  )
}

// ── Student avatar ─────────────────────────────────────────────────────────────
function StudentAvatar({ url, name, size, dm }: {
  url?: string | null; name: string; size: "sm" | "lg"; dm: boolean
}) {
  const sz = size === "lg" ? "w-20 h-20" : "w-[52px] h-[52px]"
  const iconSz = size === "lg" ? 28 : 20
  const ring = size === "lg"
    ? `ring-[3px] ring-offset-[3px] ${dm ? "ring-blue-500/50 ring-offset-[#07111f]" : "ring-blue-400/60 ring-offset-white"}`
    : `ring-2 ring-offset-2 ${dm ? "ring-blue-500/40 ring-offset-[#07111f]" : "ring-blue-300/50 ring-offset-white"}`

  return (
    <div className={`${sz} rounded-2xl overflow-hidden shrink-0 ${ring}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full flex items-center justify-center ${dm ? "bg-blue-600/25" : "bg-blue-100"}`}>
          <GraduationCap size={iconSz} className="text-blue-500" />
        </div>
      )}
    </div>
  )
}

// ── Dashboard content ──────────────────────────────────────────────────────────
function DashboardContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const isWelcome    = searchParams.get("welcome") === "true"

  const { isDark, toggleTheme } = useThemeStore()
  const dm = isDark

  const [student,              setStudent]              = useState<StudentData | null>(null)
  const [loading,              setLoading]              = useState(true)
  const [showWelcome,          setShowWelcome]          = useState(false)
  const [activeTab,            setActiveTab]            = useState<"info" | "schedule" | "qr" | "attendance" | "announcements">("info")
  const [copied,               setCopied]               = useState<string | null>(null)
  const [viewMode,             setViewMode]             = useState<"list" | "grid">("list")
  const [gridSchedules,        setGridSchedules]        = useState<any[]>([])
  const [gridLoading,          setGridLoading]          = useState(false)
  const [downloadingGrid,      setDownloadingGrid]      = useState(false)

  useEffect(() => {
    let channel: ReturnType<typeof studentSupabase.channel> | null = null

    async function load() {
      const { data: { user } } = await studentSupabase.auth.getUser()
      if (!user) { router.replace("/student/login"); return }

      const { data } = await studentSupabase
        .from("students")
        .select("*")
        .eq("id", user.id)
        .single()

      if (!data) { router.replace("/student/login"); return }

      if (data.account_status === "Deactivated") {
        await studentSupabase.auth.signOut()
        toast.error("Deactivated Account, Contact Admin.")
        router.replace("/student/login")
        return
      }

      setStudent(data as StudentData)
      setLoading(false)

      if (isWelcome) {
        setShowWelcome(true)
        const url = new URL(window.location.href)
        url.searchParams.delete("welcome")
        window.history.replaceState({}, "", url.toString())
      }

      // Realtime: filter to this student's row only so changes reflect instantly
      channel = studentSupabase
        .channel(`student_data_rt_${user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "students", filter: `id=eq.${user.id}` },
          async (payload) => {
            if (payload.new.account_status === "Deactivated") {
              toast.error("Deactivated Account, Contact Admin.")
              await studentSupabase.auth.signOut()
              router.replace("/student/login")
            } else {
              setStudent(payload.new as StudentData)
            }
          }
        )
        .subscribe()
    }
    load()

    return () => {
      if (channel) studentSupabase.removeChannel(channel)
    }
  }, [router, isWelcome])

  const handleSignOut = async () => {
    await studentSupabase.auth.signOut()
    toast.success("Signed out.")
    router.replace("/student/login")
  }

  const copyVal = (val: string, key: string) => {
    navigator.clipboard.writeText(val).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const fetchGridSchedules = async (sec: string, sy: string) => {
    setGridLoading(true)
    const { data } = await studentSupabase
      .from("schedules")
      .select("*")
      .eq("section", sec)
      .eq("school_year", sy)
      .order("day").order("start_time")
    setGridSchedules(data ?? [])
    setGridLoading(false)
  }

  const downloadScheduleGrid = async () => {
    if (!gridSchedules.length || !student?.section) return
    setDownloadingGrid(true)
    try {
      const DAYS_LIST = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
      const COLORS = [
        { bg:"#eff6ff", text:"#3b82f6", border:"#bfdbfe" },
        { bg:"#f5f3ff", text:"#8b5cf6", border:"#ddd6fe" },
        { bg:"#ecfdf5", text:"#10b981", border:"#a7f3d0" },
        { bg:"#fffbeb", text:"#f59e0b", border:"#fde68a" },
        { bg:"#fef2f2", text:"#ef4444", border:"#fecaca" },
        { bg:"#ecfeff", text:"#06b6d4", border:"#a5f3fc" },
        { bg:"#fdf4ff", text:"#d946ef", border:"#f0abfc" },
        { bg:"#f0fdfa", text:"#14b8a6", border:"#99f6e4" },
        { bg:"#fff7ed", text:"#f97316", border:"#fed7aa" },
        { bg:"#f7fee7", text:"#84cc16", border:"#bef264" },
      ]
      const toM  = (t: string) => { const [h,m] = t.split(":").map(Number); return h*60+m }
      const fmtT = (t: string) => { const [h,m] = t.split(":").map(Number); return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}` }
      const fmtM = (m: number) => { const h=Math.floor(m/60); return `${h%12||12}:${String(m%60).padStart(2,"0")} ${h>=12?"PM":"AM"}` }

      let min=24*60,max=0
      gridSchedules.forEach((s:any) => {
        const st=toM(s.start_time),en=toM(s.end_time)
        if(st<min)min=st; if(en>max)max=en
      })
      const minMins=Math.floor(min/30)*30, maxMins=Math.ceil(max/30)*30
      const timeLabels:number[]=[]
      for(let m=minMins;m<=maxMins;m+=30) timeLabels.push(m)
      const gridH=(timeLabels.length-1)*44+20

      const uniqSubs=[...new Set(gridSchedules.map((s:any)=>s.subject as string))]
      const colorMap:Record<string,typeof COLORS[0]>={}
      uniqSubs.forEach((s,i)=>{colorMap[s]=COLORS[i%COLORS.length]})

      const byDay:Record<string,any[]>={}
      for(const d of DAYS_LIST) byDay[d]=gridSchedules.filter((s:any)=>s.day===d).sort((a:any,b:any)=>a.start_time.localeCompare(b.start_time))

      const bc="rgba(226,232,240,1)", hbc="rgba(241,245,249,1)"

      const wrap=document.createElement("div")
      wrap.style.cssText="position:absolute;left:0;top:0;z-index:-1;pointer-events:none;background:#fff;padding:24px;font-family:Inter,'Helvetica Neue',Helvetica,Arial,sans-serif;width:880px;"
      document.body.appendChild(wrap)

      // Header
      const hdr=document.createElement("div")
      hdr.style.cssText="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;"
      hdr.innerHTML=`<div style="display:flex;align-items:center;gap:8px;"><div style="width:8px;height:8px;border-radius:50%;background:#3b82f6;"></div><span style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.15em;color:#1e293b;">${student.section}</span></div><span style="font-size:10px;color:#94a3b8;font-weight:700;">${student.school_year||""}</span>`
      wrap.appendChild(hdr)

      // Grid outer
      const go=document.createElement("div")
      go.style.cssText=`border:1px solid ${bc};border-radius:16px;overflow:hidden;`

      // Day header
      const dh=document.createElement("div")
      dh.style.cssText=`display:flex;border-bottom:1px solid ${bc};background:#f8fafc;`
      dh.innerHTML=`<div style="width:70px;min-width:70px;border-right:1px solid ${bc};"></div>`+
        DAYS_LIST.map((d,i)=>`<div style="flex:1;padding:10px 6px;text-align:center;${i<DAYS_LIST.length-1?`border-right:1px solid ${bc};`:""}"><p style="font-size:11px;font-weight:900;text-transform:uppercase;color:${byDay[d].length>0?"#3b82f6":"#cbd5e1"};margin:0;">${d}</p><p style="font-size:7.5px;font-weight:600;color:#94a3b8;margin:2px 0 0;">${byDay[d].length} period${byDay[d].length!==1?"s":""}</p></div>`).join("")
      go.appendChild(dh)

      // Body
      const body=document.createElement("div")
      body.style.cssText=`display:flex;position:relative;height:${gridH}px;`

      // Time axis
      const ta=document.createElement("div")
      ta.style.cssText=`width:70px;min-width:70px;position:relative;border-right:1px solid ${bc};background:#f8fafc;`
      timeLabels.forEach((m,i)=>{
        const isH=m%60===0
        const t=document.createElement("div")
        t.style.cssText=`position:absolute;top:${i*44}px;left:0;right:0;height:20px;display:flex;align-items:center;justify-content:flex-end;padding-right:10px;`
        t.innerHTML=`<span style="font-size:${isH?9.5:7.5}px;font-weight:${isH?900:600};color:${isH?"#475569":"#94a3b8"};font-family:monospace;">${fmtM(m)}</span>`
        ta.appendChild(t)
      })
      body.appendChild(ta)

      DAYS_LIST.forEach((day,dIdx)=>{
        const col=document.createElement("div")
        col.style.cssText=`flex:1;position:relative;overflow:hidden;${dIdx<DAYS_LIST.length-1?`border-right:1px solid ${bc}`:""}`
        timeLabels.slice(0,-1).forEach((m,i)=>{
          const isH=m%60===0
          const line=document.createElement("div")
          line.style.cssText=`position:absolute;top:${i*44+10}px;left:0;right:0;height:44px;border-bottom:1px solid ${isH?bc:hbc};pointer-events:none;`
          col.appendChild(line)
        })
        byDay[day].forEach((s:any)=>{
          const c=colorMap[s.subject]||COLORS[0]
          const st=toM(s.start_time),en=toM(s.end_time)
          const top=((st-minMins)/30)*44, h=((en-st)/30)*44
          const compact=h<=50
          const card=document.createElement("div")
          card.style.cssText=`position:absolute;left:4px;right:4px;top:${top+11.5}px;height:${h-3}px;border-radius:12px;background:${c.bg};border:1px solid ${c.border};padding:${compact?6:8}px;overflow:hidden;z-index:10;`
          card.innerHTML=`<p style="font-size:${compact?8:9}px;font-weight:900;text-transform:uppercase;color:${c.text};margin:0 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.subject}</p>${!compact?`<p style="font-size:8px;color:#64748b;font-weight:600;margin:0;">${fmtT(s.start_time)} – ${fmtT(s.end_time)}</p>`:""}${!compact&&s.teacher?`<p style="font-size:7.5px;color:#94a3b8;margin:1px 0 0;">${s.teacher}</p>`:""}${!compact&&s.room?`<p style="font-size:7.5px;color:#94a3b8;margin:0;">${s.room}</p>`:""}`
          col.appendChild(card)
        })
        body.appendChild(col)
      })
      go.appendChild(body)

      // Legend
      const leg=document.createElement("div")
      leg.style.cssText=`display:flex;flex-wrap:wrap;gap:8px;padding:12px 16px;border-top:1px solid ${hbc};background:#fafafa;`
      uniqSubs.forEach(sub=>{
        const c=colorMap[sub]
        const tag=document.createElement("span")
        tag.style.cssText=`font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;padding:4px 10px;border-radius:999px;background:${c.bg};border:1px solid ${c.border};color:${c.text};`
        tag.textContent=sub
        leg.appendChild(tag)
      })
      go.appendChild(leg)
      wrap.appendChild(go)

      const dataUrl = await toPng(wrap, { quality:1, backgroundColor:"#ffffff", pixelRatio:2 })
      saveAs(dataUrl, `Schedule_${student.section}.png`)
      document.body.removeChild(wrap)
    } catch(err) {
      console.error("Schedule download failed:", err)
      toast.error("Download failed. Please try again.")
    } finally {
      setTimeout(()=>setDownloadingGrid(false), 800)
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center gap-4 ${dm ? "bg-slate-950" : "bg-slate-50"}`}>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-aclc.png" alt="ACLC" className="w-12 h-12 object-contain opacity-40" />
        <Loader2 className="animate-spin text-blue-500 w-6 h-6 absolute -bottom-2 -right-2" />
      </div>
      <p className="text-[9px] font-black uppercase tracking-[0.5em] text-blue-500 animate-pulse mt-2">
        Loading dashboard…
      </p>
    </div>
  )

  if (!student) return null

  const fullName       = `${student.last_name}, ${student.first_name}${student.middle_name ? " " + student.middle_name : ""}`
  const trackingPrefix = student.id.split("-")[0]
  const isEnrolled     = student.status === "Approved" || student.status === "Accepted"
  const gradeLabel     = student.grade_level ? `Grade ${student.grade_level}` : "Grade 11"

  // ── Theme tokens ─────────────────────────────────────────────────────────────
  const pageBg      = dm ? "bg-slate-950"              : "bg-slate-50"
  const textPri     = dm ? "text-white"                : "text-slate-900"
  const textSub     = dm ? "text-slate-500"            : "text-slate-500"
  const textMuted   = dm ? "text-slate-700"            : "text-slate-300"
  const emptyCard   = dm
    ? "border border-white/[0.06] rounded-[28px] bg-white/[0.02]"
    : "border border-slate-200 rounded-[28px] bg-white"

  const tabBtn = (active: boolean) =>
    `flex items-center justify-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest py-2.5 rounded-2xl transition-all duration-200 w-full relative
     ${active
       ? "text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/25"
       : (dm ? "text-slate-500 hover:text-slate-200 hover:bg-slate-700/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/60")}`

  // ── Shared tab content ───────────────────────────────────────────────────────
  const TabContent = () => (
    <div className="animate-in fade-in duration-200 pt-2">
      {activeTab === "info" && (
        <StudentInfoTab student={student} dm={dm} onStudentUpdate={(updated) => setStudent(updated as StudentData)} />
      )}

      {activeTab === "schedule" && !student.section && (
        <div className={`text-center py-20 ${emptyCard}`}>
          <CalendarDays className={`w-8 h-8 mx-auto mb-3 ${textMuted}`} />
          <p className={`text-[11px] font-black uppercase tracking-widest ${textSub}`}>No section assigned yet</p>
          <p className={`text-[9px] mt-1 ${textMuted}`}>Check back once your section is set</p>
        </div>
      )}
      {activeTab === "schedule" && student.section && student.school_year && (
        <div className="space-y-4">
          {/* View toggle + Download */}
          <div className="flex items-center justify-between gap-3">
            <div className={`inline-flex items-center gap-0.5 p-1 rounded-2xl border ${dm ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200 bg-slate-100/60"}`}>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  viewMode === "list"
                    ? "bg-blue-600 text-white shadow-sm"
                    : dm ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <List size={11} /> Day View
              </button>
              <button
                onClick={() => {
                  setViewMode("grid")
                  if (gridSchedules.length === 0 && !gridLoading) {
                    fetchGridSchedules(student.section!, student.school_year!)
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  viewMode === "grid"
                    ? "bg-blue-600 text-white shadow-sm"
                    : dm ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                <LayoutGrid size={11} /> Weekly Grid
              </button>
            </div>

            {viewMode === "grid" && !gridLoading && gridSchedules.length > 0 && (
              <button
                onClick={downloadScheduleGrid}
                disabled={downloadingGrid}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 disabled:opacity-50 ${
                  downloadingGrid
                    ? "border-green-500/30 bg-green-500/10 text-green-400"
                    : dm
                      ? "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]"
                      : "border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                {downloadingGrid ? <><CheckCircle2 size={11} /> Saved!</> : <><Download size={11} /> Download</>}
              </button>
            )}
          </div>

          {viewMode === "list" ? (
            <ScheduleView section={student.section} schoolYear={student.school_year} dm={dm} />
          ) : gridLoading ? (
            <div className="flex items-center justify-center gap-3 py-16">
              <Loader2 className="animate-spin text-blue-500 w-5 h-5" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Loading grid…</p>
            </div>
          ) : (
            <ReadOnlyScheduleGrid schedules={gridSchedules} dm={dm} />
          )}
        </div>
      )}

      {activeTab === "qr" && (
        <StudentQRCard
          studentId={student.id}
          studentName={fullName}
          lrn={student.lrn}
          section={student.section}
          dm={dm}
        />
      )}

      {activeTab === "attendance" && student.school_year && (
        <AttendanceCalendar studentId={student.id} schoolYear={student.school_year} dm={dm} />
      )}

      {activeTab === "announcements" && (
        <StudentAnnouncements studentGrade={student.grade_level || "11"} dm={dm} />
      )}
    </div>
  )

  return (
    <>
      <style jsx global>{`body{overflow-y:auto}::-webkit-scrollbar{display:none}*{-ms-overflow-style:none;scrollbar-width:none}`}</style>

      {showWelcome && (
        <WelcomeModal
          studentId={student.id}
          lrn={student.lrn}
          dm={dm}
          onClose={() => setShowWelcome(false)}
        />
      )}

      <div className={`min-h-screen transition-colors duration-300 ${pageBg}`}>
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-5 md:py-8 space-y-5 pb-24">

          {/* Nav */}
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl border overflow-hidden flex items-center justify-center shrink-0 shadow-sm ${dm ? "bg-slate-800 border-slate-700/80" : "bg-white border-slate-200"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-aclc.png" alt="AMA ACLC" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent">Student Portal</p>
                <p className={`text-[8px] font-bold uppercase tracking-widest ${textSub}`}>AMA ACLC NORTHBAY</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className={`flex items-center gap-1.5 h-9 w-9 md:w-auto md:px-3 justify-center rounded-2xl border transition-all duration-200
                  ${dm ? "bg-slate-800 border-slate-700/80 text-amber-400 hover:bg-slate-700 hover:border-slate-600" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"}`}
              >
                {dm ? <Sun size={13} /> : <Moon size={13} />}
                <span className="hidden md:inline text-[9px] font-black uppercase tracking-widest">{dm ? "Light" : "Dark"}</span>
              </button>

              <button
                onClick={handleSignOut}
                className={`flex items-center gap-1.5 h-9 px-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all duration-200
                  ${dm ? "text-slate-400 border-transparent hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20" : "text-slate-500 border-transparent hover:text-red-600 hover:bg-red-50 hover:border-red-200"}`}
              >
                <LogOut size={11} /><span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          </nav>

          {/* Profile Card */}
          <div className={`rounded-2xl md:rounded-3xl border overflow-hidden ${dm ? "bg-slate-900/60 border-slate-700/50" : "bg-white border-slate-200"}`}>
            <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-violet-500 to-blue-400" />
            <div className="p-5 md:p-7">
              <div className="flex items-start gap-4">
                <StudentAvatar url={student.two_by_two_url} name={student.first_name} size="lg" dm={dm} />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent mb-0.5">Welcome back</p>
                  <h1 className={`text-xl md:text-2xl font-black uppercase tracking-tight leading-tight ${textPri}`}>
                    {student.first_name} {student.last_name}
                  </h1>
                  <p className={`text-xs mt-0.5 ${textSub}`}>{student.strand} · {gradeLabel}</p>
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
                {[
                  { label: "Tracking ID", value: trackingPrefix, copy: true },
                  { label: "LRN",         value: student.lrn, copy: true },
                  { label: "Section",     value: student.section || "TBA", copy: false },
                  { label: "Status",      value: student.status === "Approved" ? "Enrolled" : student.status, copy: false },
                ].map(({ label, value, copy }) => (
                  <div key={label} className={`rounded-2xl border p-3 md:py-2.5 text-center flex flex-col justify-center relative group ${dm ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50 border-slate-200"}`}>
                    {copy && (
                       <button onClick={() => copyVal(value, label)} className={`absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${dm ? "hover:bg-slate-700" : "hover:bg-slate-200"}`}>
                         {copied === label ? <Check size={11} className="text-green-500" /> : <Copy size={11} className={textSub} />}
                       </button>
                    )}
                    <p className={`text-[12px] font-black mt-0.5 ${textPri}`}>{value}</p>
                    <p className={`text-[7px] font-black uppercase tracking-widest mt-1 ${textSub}`}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs array for mapping */}
          <div className={`grid gap-1 p-1.5 rounded-[20px] md:rounded-2xl border backdrop-blur-sm w-full ${dm ? "border-slate-700/60 bg-slate-800/50" : "border-slate-200/80 bg-white/70 shadow-sm"}`} style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
            <button className={tabBtn(activeTab === "info")} onClick={() => setActiveTab("info")}>
              <User size={13} /><span className="hidden md:inline">Info</span>
            </button>
            <button className={tabBtn(activeTab === "schedule")} onClick={() => setActiveTab("schedule")}>
              <CalendarDays size={13} /><span className="hidden md:inline">Schedule</span>
            </button>
            <button className={tabBtn(activeTab === "qr")} onClick={() => setActiveTab("qr")}>
              <QrCode size={13} /><span className="hidden md:inline">My QR</span>
            </button>
            <button className={tabBtn(activeTab === "attendance")} onClick={() => setActiveTab("attendance")}>
              <ClipboardList size={13} /><span className="hidden md:inline">Attendance</span>
            </button>
            <button className={tabBtn(activeTab === "announcements")} onClick={() => setActiveTab("announcements")}>
              <BookOpen size={13} /><span className="hidden md:inline">News</span>
            </button>
          </div>

          {/* Tab Content */}
          <TabContent />
        </div>
      </div>
    </>
  )
}

// ── Page shell ─────────────────────────────────────────────────────────────────
export default function StudentDashboardPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}

// ── Read-only weekly schedule grid ────────────────────────────────────────────
const GRID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const

const GRID_COLORS = [
  { bg: "bg-blue-500/10",    border: "border-blue-500/25",    text: "text-blue-400"    },
  { bg: "bg-violet-500/10",  border: "border-violet-500/25",  text: "text-violet-400"  },
  { bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-400" },
  { bg: "bg-amber-500/10",   border: "border-amber-500/25",   text: "text-amber-400"   },
  { bg: "bg-rose-500/10",    border: "border-rose-500/25",    text: "text-rose-400"    },
  { bg: "bg-cyan-500/10",    border: "border-cyan-500/25",    text: "text-cyan-400"    },
  { bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/25", text: "text-fuchsia-400" },
  { bg: "bg-teal-500/10",    border: "border-teal-500/25",    text: "text-teal-400"    },
  { bg: "bg-orange-500/10",  border: "border-orange-500/25",  text: "text-orange-400"  },
  { bg: "bg-sky-500/10",     border: "border-sky-500/25",     text: "text-sky-400"     },
]

function fmtMins(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  const ampm = h >= 12 ? "PM" : "AM"
  const hr = h % 12 || 12
  return `${hr}:${String(min).padStart(2, "0")} ${ampm}`
}

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hr = h % 12 || 12
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`
}

function ReadOnlyScheduleGrid({ schedules, dm }: { schedules: any[], dm: boolean }) {
  const subjectColorMap = (() => {
    const unique = [...new Set(schedules.map((s: any) => s.subject as string))]
    return Object.fromEntries(unique.map((sub, i) => [sub, GRID_COLORS[i % GRID_COLORS.length]]))
  })()

  const byDay = (() => {
    const map: Record<string, any[]> = {}
    for (const day of GRID_DAYS) {
      map[day] = schedules.filter((s: any) => s.day === day).sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))
    }
    return map
  })()

  const toM = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m }

  const { minMins, maxMins, timeLabels, gridH } = (() => {
    if (schedules.length === 0) return { minMins: 420, maxMins: 1020, timeLabels: [] as number[], gridH: 0 }
    let min = 24 * 60, max = 0
    schedules.forEach((s: any) => {
      const st = toM(s.start_time), en = toM(s.end_time)
      if (st < min) min = st
      if (en > max) max = en
    })
    const minMins = Math.floor(min / 30) * 30
    const maxMins = Math.ceil(max / 30) * 30
    const labels: number[] = []
    for (let m = minMins; m <= maxMins; m += 30) labels.push(m)
    return { minMins, maxMins, timeLabels: labels, gridH: (labels.length - 1) * 44 + 20 }
  })()

  if (schedules.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-24 rounded-[28px] border-2 border-dashed ${dm ? "border-slate-800 text-slate-600" : "border-slate-200 text-slate-400"}`}>
        <CalendarDays size={40} strokeWidth={1} className="mb-3 opacity-30" />
        <p className="font-black uppercase tracking-[0.3em] text-xs opacity-40">No Schedule Configured</p>
      </div>
    )
  }

  const border = dm ? "rgba(148,163,184,0.12)" : "rgba(100,116,139,0.14)"
  const headerBg = dm ? "rgba(15,23,42,0.97)" : "rgba(255,255,255,0.97)"
  const activeDays = GRID_DAYS.filter(d => byDay[d].length > 0)

  return (
    <div className="space-y-5">
      {/* ── MOBILE: stacked cards ── */}
      <div className="md:hidden space-y-3">
        {activeDays.map(day => (
          <div key={day} className={`rounded-2xl border overflow-hidden ${dm ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className={`px-4 py-2 flex items-center gap-2 ${dm ? "bg-slate-800/80" : "bg-slate-50"}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">{day}</span>
            </div>
            <div className={`divide-y ${dm ? "divide-slate-800" : "divide-slate-100"}`}>
              {byDay[day].map((s: any) => {
                const color = subjectColorMap[s.subject] ?? GRID_COLORS[0]
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`flex-shrink-0 rounded-lg border px-2 py-1 ${color.bg} ${color.border}`}>
                      <CalendarDays size={10} className={color.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black uppercase truncate ${dm ? "text-white" : "text-slate-900"}`}>{s.subject}</p>
                      <p className={`text-[10px] font-bold ${dm ? "text-slate-400" : "text-slate-500"}`}>
                        {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
                        {s.room && <span className="ml-2 opacity-60">{s.room}</span>}
                      </p>
                      {s.teacher && <p className={`text-[9px] font-bold mt-0.5 ${dm ? "text-slate-500" : "text-slate-400"}`}>{s.teacher}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── DESKTOP: timetable canvas ── */}
      <div className="hidden md:block overflow-x-auto">
        <div className={`rounded-[24px] border overflow-hidden ${dm ? "bg-slate-900/40 border-slate-800/80" : "bg-white border-slate-200 shadow-sm"}`}
          style={{ width: "fit-content", minWidth: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", width: "100%", minWidth: 800 }}>

            {/* Header row */}
            <div style={{ display: "flex", borderBottom: `1px solid ${border}`, background: headerBg, position: "sticky", top: 0, zIndex: 30 }}>
              <div style={{ width: 70, minWidth: 70, borderRight: `1px solid ${border}` }} />
              {GRID_DAYS.map((day, i) => (
                <div key={day} style={{ flex: 1, padding: "12px 8px", textAlign: "center", borderRight: i < GRID_DAYS.length - 1 ? `1px solid ${border}` : "none" }}>
                  <p className={`text-[11px] font-black uppercase tracking-[0.05em] ${byDay[day].length > 0 ? "text-blue-400" : (dm ? "text-slate-600" : "text-slate-400")}`}>{day}</p>
                  <p className={`text-[7.5px] font-bold mt-1 ${dm ? "text-slate-500" : "text-slate-400"}`}>{byDay[day].length} period{byDay[day].length !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>

            {/* Body */}
            <div style={{ display: "flex", position: "relative", height: gridH }}>
              {/* Time axis */}
              <div style={{ width: 70, minWidth: 70, position: "relative", zIndex: 15, borderRight: `1px solid ${border}`, background: headerBg }}>
                {timeLabels.map((m, i) => {
                  const isHour = m % 60 === 0
                  return (
                    <div key={m} style={{ position: "absolute", top: i * 44, left: 0, right: 0, height: 20, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 10, pointerEvents: "none" }}>
                      <span className={`tabular-nums tracking-wide ${isHour ? "font-black text-[9.5px]" : "font-semibold text-[7.5px]"} ${dm ? (isHour ? "text-slate-300" : "text-slate-600") : (isHour ? "text-slate-600" : "text-slate-400")}`}>
                        {fmtMins(m)}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Day columns */}
              {GRID_DAYS.map((day, dIdx) => (
                <div key={day} style={{ flex: 1, position: "relative", overflow: "hidden", borderRight: dIdx < GRID_DAYS.length - 1 ? `1px solid ${border}` : "none" }}>
                  {/* Horizontal grid lines */}
                  {timeLabels.slice(0, -1).map((m, i) => {
                    const isHour = m % 60 === 0
                    return (
                      <div key={m} style={{ position: "absolute", top: i * 44 + 10, left: 0, right: 0, height: 44, pointerEvents: "none", borderBottom: `1px solid ${dm ? (isHour ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.025)") : (isHour ? "rgba(0,0,0,0.07)" : "rgba(0,0,0,0.03)")}` }} />
                    )
                  })}

                  {/* Subject cards */}
                  {byDay[day].map((s: any) => {
                    const color = subjectColorMap[s.subject] ?? GRID_COLORS[0]
                    const startMins = toM(s.start_time)
                    const endMins   = toM(s.end_time)
                    const top    = ((startMins - minMins) / 30) * 44
                    const height = ((endMins - startMins) / 30) * 44
                    const compact = height <= 50
                    return (
                      <div key={s.id}
                        className={`absolute left-1.5 right-1.5 rounded-[14px] border ${compact ? "p-1.5" : "p-2.5"} flex flex-col overflow-hidden ${color.bg} ${color.border}`}
                        style={{ top: top + 11.5, height: height - 3, zIndex: 10, backdropFilter: "blur(4px)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-1">
                            <p className={`${compact ? "text-[8.5px]" : "text-[10px]"} font-black uppercase leading-[1.2] tracking-[0.05em] ${color.text} truncate`}>{s.subject}</p>
                            {compact && <p className={`text-[7px] font-bold opacity-70 flex-shrink-0 leading-none ${dm ? "text-white" : "text-slate-900"}`}>{fmtTime(s.start_time)}</p>}
                          </div>
                          {!compact && (
                            <p className={`text-[8.5px] mt-1 font-bold opacity-80 truncate ${dm ? "text-white" : "text-slate-900"}`}>
                              {fmtTime(s.start_time)} <span className="opacity-50 mx-0.5">–</span> {fmtTime(s.end_time)}
                            </p>
                          )}
                        </div>
                        <div className={`${compact ? "mt-0 flex justify-between items-baseline gap-2" : "mt-auto space-y-0.5"}`} style={{ opacity: 0.6 }}>
                          {s.teacher && <p className={`text-[7.5px] font-bold truncate ${dm ? "text-slate-200" : "text-slate-600"}`}>{s.teacher}</p>}
                          {s.room    && <p className={`text-[7.5px] truncate ${dm ? "text-slate-400" : "text-slate-500"}`}>{s.room}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Subject legend */}
      <div className="flex flex-wrap gap-2 px-1">
        {Object.entries(subjectColorMap).map(([subject, color]) => (
          <div key={subject} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${color.bg} ${color.border}`}>
            <BookOpen size={9} className={color.text} />
            <span className={`text-[9px] font-black uppercase tracking-wider ${color.text}`}>{subject}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StudentAnnouncements({ studentGrade, dm }: { studentGrade: string, dm: boolean }) {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const itemsPerPage = 5
  const totalPages = Math.max(1, Math.ceil(announcements.length / itemsPerPage))
  const currentAnnouncements = announcements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => {
    const fetchNews = async () => {
      const { data, error } = await studentSupabase
        .from('student_announcements')
        .select('*')
        .in('target_audience', ['ALL', `GRADE ${studentGrade}`])
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (!error && data) {
        setAnnouncements(data)
      }
      setLoading(false)
    }
    fetchNews()

    // Optionally set up realtime channel here later!
  }, [studentGrade])

  const emptyCard = dm
    ? "border border-white/[0.06] rounded-[28px] bg-white/[0.02]"
    : "border border-slate-200 rounded-[28px] bg-white"
  const textPri   = dm ? "text-white" : "text-slate-900"
  const textSub   = dm ? "text-slate-500" : "text-slate-500"

  if (loading) {
    return (
      <div className={`h-64 flex flex-col items-center justify-center text-center fade-in ${emptyCard}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (announcements.length === 0) {
    return (
      <div className={`h-64 flex flex-col items-center justify-center text-center fade-in ${emptyCard}`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${dm ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <BookOpen className="text-slate-400 w-8 h-8" />
        </div>
        <h3 className={`text-[13px] font-black uppercase tracking-widest ${textPri}`}>No News Available</h3>
        <p className={`text-[11px] font-bold uppercase tracking-widest mt-2 ${textSub}`}>Check back later for school updates.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 fade-in pb-12">
      {currentAnnouncements.map((ann) => (
        <div key={ann.id} className={`p-6 md:p-8 rounded-[32px] border ${
          ann.is_pinned 
            ? (dm ? "bg-blue-900/10 border-blue-900/50" : "bg-blue-50 border-blue-200") 
            : (dm ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200")
        } shadow-sm relative overflow-hidden group`}>
          {ann.is_pinned && <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full shrink-0 ${dm ? "bg-blue-500/20" : "bg-blue-500/10"}`} />}
          
          <div className="relative z-10 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              {ann.is_pinned && (
                <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${dm ? "text-blue-400 bg-blue-900/30" : "text-blue-600 bg-blue-100"}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg> 
                  Pinned
                </span>
              )}
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {new Date(ann.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h3 className={`text-xl md:text-2xl font-black tracking-tight uppercase mb-3 ${textPri}`}>{ann.title}</h3>
            <p className={`text-sm font-medium whitespace-pre-wrap leading-relaxed ${dm ? "text-slate-400" : "text-slate-600"}`}>{ann.content}</p>
          </div>
        </div>
      ))}
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${textSub}`}>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-xl font-black uppercase tracking-widest text-[9px] border transition-colors disabled:opacity-30 ${dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-xl font-black uppercase tracking-widest text-[9px] border transition-colors disabled:opacity-30 ${dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
