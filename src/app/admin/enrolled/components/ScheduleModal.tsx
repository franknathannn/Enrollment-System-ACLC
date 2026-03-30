"use client"

import { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { Loader2, X, CalendarDays } from "lucide-react"
import { supabase } from "@/lib/supabase/admin-client"

const ALL_DAYS  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] as const
const DAY_SHORT = { Monday:"MON", Tuesday:"TUE", Wednesday:"WED", Thursday:"THU", Friday:"FRI", Saturday:"SAT" }
type DayName = typeof ALL_DAYS[number]

const LIGHT_PAL = [
  { fill:"#dbeafe", text:"#1d4ed8", sub:"#3b82f6", border:"#bfdbfe" },
  { fill:"#ede9fe", text:"#6d28d9", sub:"#7c3aed", border:"#ddd6fe" },
  { fill:"#d1fae5", text:"#065f46", sub:"#059669", border:"#a7f3d0" },
  { fill:"#fef3c7", text:"#92400e", sub:"#d97706", border:"#fde68a" },
  { fill:"#fce7f3", text:"#9d174d", sub:"#db2777", border:"#fbcfe8" },
  { fill:"#cffafe", text:"#164e63", sub:"#0891b2", border:"#a5f3fc" },
  { fill:"#f3e8ff", text:"#6b21a8", sub:"#9333ea", border:"#e9d5ff" },
  { fill:"#ffedd5", text:"#9a3412", sub:"#ea580c", border:"#fed7aa" },
]
const DARK_PAL = [
  { fill:"#1e3a5f", text:"#93c5fd", sub:"#60a5fa", border:"#1d4ed8" },
  { fill:"#2e1065", text:"#c4b5fd", sub:"#a78bfa", border:"#5b21b6" },
  { fill:"#064e3b", text:"#6ee7b7", sub:"#34d399", border:"#065f46" },
  { fill:"#451a03", text:"#fcd34d", sub:"#f59e0b", border:"#92400e" },
  { fill:"#500724", text:"#fbcfe8", sub:"#f472b6", border:"#9d174d" },
  { fill:"#083344", text:"#67e8f9", sub:"#22d3ee", border:"#164e63" },
  { fill:"#3b0764", text:"#e9d5ff", sub:"#c084fc", border:"#6b21a8" },
  { fill:"#431407", text:"#fed7aa", sub:"#fb923c", border:"#9a3412" },
]

function fmt(t: string) {
  if (!t) return ""
  const [h, m] = t.slice(0,5).split(":").map(Number)
  return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`
}
function todayName(): DayName {
  const d = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()]
  return (ALL_DAYS.includes(d as DayName) ? d : "Monday") as DayName
}

interface ScheduleRow {
  id:string; section:string; subject:string; day:string
  start_time:string; end_time:string; school_year:string
  teacher?:string|null; room?:string|null
}
interface Props { isOpen:boolean; onClose:()=>void; student:any; isDarkMode:boolean }

export function ScheduleModal({ isOpen, onClose, student, isDarkMode }: Props) {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [mounted,   setMounted]   = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!isOpen || !student?.section || !student?.school_year) return
    setLoading(true); setSchedules([])
    supabase.from("schedules").select("*")
      .eq("section", student.section)
      .eq("school_year", student.school_year)
      .order("start_time")
      .then(({ data }) => { setSchedules(data ?? []); setLoading(false) })
  }, [isOpen, student?.section, student?.school_year])

  const pal      = isDarkMode ? DARK_PAL : LIGHT_PAL
  const colorMap = useMemo(() => {
    const uniq = [...new Set(schedules.map(s => s.subject))]
    return Object.fromEntries(uniq.map((s,i) => [s, pal[i%pal.length]]))
  }, [schedules, isDarkMode])

  const byDay = useMemo(() => {
    const m: Record<string,ScheduleRow[]> = {}
    for (const d of ALL_DAYS)
      m[d] = schedules.filter(s => s.day===d).sort((a,b) => a.start_time.localeCompare(b.start_time))
    return m
  }, [schedules])

  const timeSlots   = useMemo(() => [...new Set(schedules.map(s => s.start_time))].sort(), [schedules])
  const uniqueSubjs = useMemo(() => [...new Set(schedules.map(s => s.subject))], [schedules])
  const activeDays  = useMemo(() => ALL_DAYS.filter(d => byDay[d]?.length>0), [byDay])

  if (!isOpen || !mounted) return null

  const dm          = isDarkMode
  const modalBg     = dm ? "#0f172a"            : "#ffffff"
  const headerBg    = dm ? "#1e293b"            : "#f8fafc"
  const borderCol   = dm ? "rgba(51,65,85,0.9)" : "#e2e8f0"
  const textPrimary = dm ? "#f1f5f9"            : "#0f172a"
  const textSecond  = dm ? "#94a3b8"            : "#64748b"
  const rowSep      = dm ? "rgba(51,65,85,0.3)" : "#f1f5f9"
  const emptyText   = dm ? "#334155"            : "#cbd5e1"
  const todayAccent = dm ? "#60a5fa"            : "#2563eb"

  const modal = (
    <>
      <style>{`
        @keyframes sched-up {
          from { opacity:0; transform:translateY(20px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        .ss::-webkit-scrollbar { display:none; }
        .ss { -ms-overflow-style:none; scrollbar-width:none; }

        /* ── Backdrop: dark tint, NO blur ── */
        .sched-backdrop {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: rgba(0,0,0,0.75);
          /* centred on all screen sizes */
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          box-sizing: border-box;
          overflow: hidden;
        }

        /* ── Sheet ── */
        .sched-sheet {
          position: relative;
          width: 100%;
          max-width: 920px;
          /* never taller than viewport minus padding */
          height: auto;
          max-height: calc(100dvh - 32px);
          background: ${modalBg};
          border-radius: 20px;
          border: 1px solid ${borderCol};
          box-shadow: 0 24px 96px rgba(0,0,0,0.6);
          animation: sched-up 0.28s cubic-bezier(0.34,1.4,0.64,1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Small phones: slide-up sheet from bottom */
        @media (max-width: 480px) {
          .sched-backdrop {
            align-items: flex-end;
            padding: 0;
          }
          .sched-sheet {
            border-radius: 20px 20px 0 0;
            max-height: calc(92dvh - env(safe-area-inset-bottom, 0px));
            width: 100%;
          }
          .sched-body-pad {
            padding-bottom: max(24px, env(safe-area-inset-bottom, 24px)) !important;
          }
        }
      `}</style>

      <div className="sched-backdrop" onClick={onClose}>
        <div className="sched-sheet ss" onClick={e => e.stopPropagation()}>

          {/* Mobile drag handle */}
          <div style={{ display:"flex", justifyContent:"center", paddingTop:10, paddingBottom:4, backgroundColor:modalBg, flexShrink:0 }}
               className="sm:hidden">
            <div style={{ width:36, height:4, borderRadius:99, backgroundColor:dm?"#334155":"#cbd5e1" }} />
          </div>

          {/* Header */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"14px 20px", backgroundColor:headerBg,
            borderBottom:`1px solid ${borderCol}`, flexShrink:0,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
              <div style={{ width:40, height:40, borderRadius:12, flexShrink:0,
                backgroundColor:dm?"rgba(59,130,246,0.18)":"#eff6ff",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <CalendarDays size={19} color="#3b82f6" />
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ fontSize:9, fontWeight:900, letterSpacing:"0.2em", textTransform:"uppercase", color:textSecond, marginBottom:2 }}>
                  Class Schedule
                </p>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <h2 style={{ fontSize:17, fontWeight:900, letterSpacing:"-0.03em", color:textPrimary, textTransform:"uppercase", lineHeight:1, margin:0 }}>
                    {student?.section || "No Section"}
                  </h2>
                  <span style={{ fontSize:10, fontWeight:700, color:textSecond }}>· S.Y. {student?.school_year}</span>
                </div>
                {!loading && schedules.length>0 && (
                  <p style={{ fontSize:9, fontWeight:700, color:textSecond, marginTop:3 }}>
                    {schedules.length} period{schedules.length!==1?"s":""} · {uniqueSubjs.length} subject{uniqueSubjs.length!==1?"s":""} · {activeDays.length} active day{activeDays.length!==1?"s":""}
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose}
              style={{ width:36, height:36, borderRadius:10, border:"none", cursor:"pointer",
                backgroundColor:dm?"#1e293b":"#f1f5f9", color:textSecond,
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background 0.15s" }}
              onMouseEnter={e=>(e.currentTarget.style.backgroundColor=dm?"#334155":"#e2e8f0")}
              onMouseLeave={e=>(e.currentTarget.style.backgroundColor=dm?"#1e293b":"#f1f5f9")}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="ss" style={{ flex:1, overflowY:"auto", minHeight:0 }}>
            {loading ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, padding:"56px 24px" }}>
                <Loader2 size={26} color="#3b82f6" style={{ animation:"spin 1s linear infinite" }} />
                <p style={{ fontSize:10, fontWeight:900, letterSpacing:"0.2em", textTransform:"uppercase", color:textSecond }}>Loading schedule…</p>
              </div>
            ) : schedules.length===0 ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, padding:"56px 24px" }}>
                <CalendarDays size={32} color={textSecond} />
                <p style={{ fontSize:10, fontWeight:900, letterSpacing:"0.15em", textTransform:"uppercase", color:textSecond }}>
                  No schedules for {student?.section}
                </p>
              </div>
            ) : (
              <div className="sched-body-pad" style={{ padding:"16px 16px 24px" }}>
                <div className="ss" style={{ overflowX:"auto" }}>
                  <div style={{ minWidth:500 }}>

                    {/* Day header row */}
                    <div style={{ display:"grid", gridTemplateColumns:"64px repeat(6,1fr)",
                      backgroundColor:headerBg, borderRadius:"12px 12px 0 0",
                      borderBottom:`1px solid ${borderCol}` }}>
                      <div style={{ padding:"10px 6px" }} />
                      {ALL_DAYS.map(d => {
                        const cnt=byDay[d]?.length??0; const isToday=d===todayName()
                        return (
                          <div key={d} style={{ padding:"10px 4px", textAlign:"center", borderLeft:`1px solid ${borderCol}` }}>
                            <p style={{ fontSize:10, fontWeight:900, letterSpacing:"0.1em", color:isToday?todayAccent:textSecond }}>{DAY_SHORT[d]}</p>
                            <p style={{ fontSize:9, fontWeight:600, color:cnt>0?textSecond:emptyText, marginTop:2 }}>
                              {cnt>0?`${cnt} period${cnt!==1?"s":""}` : "0 periods"}
                            </p>
                            {isToday && <div style={{ width:4, height:4, borderRadius:"50%", backgroundColor:todayAccent, margin:"3px auto 0" }} />}
                          </div>
                        )
                      })}
                    </div>

                    {/* Time rows */}
                    {timeSlots.map((slot,ri) => (
                      <div key={slot} style={{ display:"grid", gridTemplateColumns:"64px repeat(6,1fr)",
                        backgroundColor:modalBg, minHeight:88,
                        borderBottom:ri===timeSlots.length-1?"none":`1px solid ${rowSep}` }}>
                        <div style={{ padding:"12px 8px 12px 0", display:"flex", alignItems:"flex-start", justifyContent:"flex-end" }}>
                          <p style={{ fontSize:10, fontWeight:700, color:textSecond, whiteSpace:"nowrap" }}>{fmt(slot)}</p>
                        </div>
                        {ALL_DAYS.map(d => {
                          const cell=byDay[d]?.find(s=>s.start_time===slot)
                          const col=cell?(colorMap[cell.subject]??pal[0]):null
                          return (
                            <div key={d} style={{ borderLeft:`1px solid ${rowSep}`, padding:5 }}>
                              {cell&&col ? (
                                <div style={{ borderRadius:10, padding:"8px 10px", height:"100%",
                                  backgroundColor:col.fill, border:`1.5px solid ${col.border}`, boxSizing:"border-box" }}>
                                  <p style={{ fontSize:10, fontWeight:900, textTransform:"uppercase", letterSpacing:"-0.01em", color:col.text, lineHeight:1.2, marginBottom:4 }}>
                                    {cell.subject}
                                  </p>
                                  <p style={{ fontSize:8, fontWeight:600, color:col.sub }}>{fmt(cell.start_time)} – {fmt(cell.end_time)}</p>
                                  {cell.teacher && <p style={{ fontSize:8, fontWeight:500, color:col.sub, marginTop:2, opacity:0.85 }}>{cell.teacher}</p>}
                                  {cell.room    && <p style={{ fontSize:8, fontWeight:500, color:col.sub, marginTop:1, opacity:0.7  }}>{cell.room}</p>}
                                </div>
                              ) : (
                                <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                                  <span style={{ color:emptyText, fontSize:13, fontWeight:200 }}>—</span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}

                    <div style={{ height:10, backgroundColor:modalBg, borderRadius:"0 0 12px 12px",
                      border:`1px solid ${borderCol}`, borderTop:"none" }} />
                  </div>
                </div>

                {/* Legend */}
                {uniqueSubjs.length>0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:14 }}>
                    {uniqueSubjs.map(sub => {
                      const col=colorMap[sub]??pal[0]
                      return (
                        <div key={sub} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px",
                          borderRadius:99, backgroundColor:col.fill, border:`1.5px solid ${col.border}`,
                          fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:col.text }}>
                          <span style={{ width:6, height:6, borderRadius:"50%", backgroundColor:col.sub, flexShrink:0 }} />
                          {sub}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(modal, document.body)
}