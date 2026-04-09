"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Search, MapPin, Users, MonitorPlay, Clock, CheckCircle2, AlertCircle, Settings2, User } from "lucide-react"
import { ScheduleRow } from "./types"
import { useRooms } from "../../sections/hooks/useRooms"
import { formatAMPM } from "../../sections/components/schedule/autoScheduler"
import { RoomManagerModal } from "./RoomManagerModal"
import { supabase } from "@/lib/supabase/admin-client"

interface RoomMonitoringTabProps {
  schedules: ScheduleRow[]
  isDarkMode: boolean
  schoolYear: string
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

// Helper to get current day name
function getCurrentDay() {
  const d = new Date().getDay()
  return DAYS[d === 0 ? 6 : d - 1] // JS getDay: 0=Sun, 1=Mon...
}

// Convert "HH:MM:SS" or "HH:MM" to minutes for comparison
function parseTime(timeStr: string) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(":")
  return parseInt(h, 10) * 60 + parseInt(m, 10)
}

function getCurrentTimeMins() {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function getLocalDateStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function LiveClassAttendance({ schedule, date, isDarkMode, text, muted }: { schedule: ScheduleRow; date: string; isDarkMode: boolean; text: string; muted: string }) {
  const [present, setPresent] = useState<number | null>(null)
  const [late, setLate] = useState<number | null>(null)
  const [total, setTotal] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    const fetchStats = async () => {
      const { count: pCount } = await supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("section", schedule.section)
        .eq("subject", schedule.subject)
        .eq("date", date)
        .eq("status", "Present")
        
      const { count: lCount } = await supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("section", schedule.section)
        .eq("subject", schedule.subject)
        .eq("date", date)
        .eq("status", "Late")
      
      const { count: tCount } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("section", schedule.section)
        .not("status", "eq", "Pending")

      if (active) {
        setPresent(pCount || 0)
        setLate(lCount || 0)
        setTotal(tCount || 0)
      }
    }
    fetchStats()
    
    const handleFocus = () => fetchStats()
    window.addEventListener("focus", handleFocus)
    
    const timer = setInterval(() => {
      if (document.hasFocus()) fetchStats()
    }, 3000)
    
    return () => { 
      active = false
      clearInterval(timer)
      window.removeEventListener("focus", handleFocus)
    }
  }, [schedule, date])

  if (present === null) return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-black/5 dark:border-white/5 opacity-50">
       <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin border-emerald-500"></div>
       <span className="text-[10px] font-bold">Loading...</span>
    </div>
  )
  
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-black/5 dark:border-white/5">
       <span className="text-[11px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded tracking-wide">{present} Present</span>
       <span className="text-[11px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded tracking-wide">{late} Late</span>
       <span className="text-[11px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded tracking-wide shadow-sm shadow-emerald-500/20">{(present || 0) + (late || 0)} Total Present</span>
    </div>
  )
}

export function RoomMonitoringTab({ schedules, isDarkMode, schoolYear }: RoomMonitoringTabProps) {
  const roomsList = useRooms()
  const [search, setSearch] = useState("")
  const [selectedDay, setSelectedDay] = useState(getCurrentDay())
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  
  // Update current time every minute
  const [currentMins, setCurrentMins] = useState(getCurrentTimeMins())
  useEffect(() => {
    const timer = setInterval(() => setCurrentMins(getCurrentTimeMins()), 60000)
    return () => clearInterval(timer)
  }, [])

  const isToday = selectedDay === getCurrentDay()

  // Filter schedules by school year and selected day
  const daySchedules = useMemo(() => {
    return schedules.filter(s => s.school_year === schoolYear && s.day === selectedDay)
  }, [schedules, schoolYear, selectedDay])

  // Map each room to its schedules and compute live status
  const roomStatuses = useMemo(() => {
    return roomsList.map(room => {
      const roomScheds = daySchedules.filter(s => 
        (s.room_id && s.room_id === room.id) || (!s.room_id && s.room === room.name)
      ).sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time))

      let currentClass = null
      let nextClass = null
      let isOccupied = false

      for (const sched of roomScheds) {
        const start = parseTime(sched.start_time)
        const end = parseTime(sched.end_time)
        
        if (isToday && currentMins >= start && currentMins < end) {
          currentClass = sched
          isOccupied = true
        } else if (start >= currentMins && !nextClass) {
          nextClass = sched
        }
      }

      // If it's not today and it's past the last class, we might just want to show the first class of that day as "next" 
      // if currentMins > all classes. But to be consistent with "at this time", we'll just say no more classes.
      // However, if the user picks tomorrow and it's 8PM now, they see "no more classes".
      // Let's modify: if it's NOT today, we just show the first class of the day if it hasn't happened yet relative to time,
      // OR if we want to show the whole day's overview, let's keep the time-relative check.
      // But if there's no current class and no next class after currentMins, it just shows empty.

      return {
        room,
        schedules: roomScheds,
        currentClass,
        nextClass,
        isOccupied
      }
    })
  }, [roomsList, daySchedules, currentMins])

  const filteredRooms = roomStatuses.filter(r => 
    r.room.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.room.type || "").toLowerCase().includes(search.toLowerCase())
  )

  const occupiedCount = roomStatuses.filter(r => r.isOccupied).length
  const availableCount = roomsList.length - occupiedCount

  const surface = isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
  const muted = isDarkMode ? "text-slate-400" : "text-slate-500"
  const text = isDarkMode ? "text-white" : "text-slate-900"
  const cardBg = isDarkMode ? "bg-slate-800/40 border-slate-700/60" : "bg-slate-50 border-slate-200"

  return (
    <div className="space-y-6">
      
      {/* Overview Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-6 rounded-3xl border-2 ${surface} shadow-sm relative overflow-hidden transition-all hover:shadow-md group`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-blue-500/20 transition-all duration-500"></div>
          <div className="absolute bottom-0 right-0 bg-blue-500/5 w-24 h-24 rounded-tl-full blur-2xl pointer-events-none"></div>
          <div className="flex flex-col gap-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-inner">
              <MapPin size={18} />
            </div>
            <div>
              <p className={`text-4xl font-black ${text} mb-1 tracking-tight`}>{roomsList.length}</p>
              <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${muted}`}>Total Rooms Mapped</h3>
            </div>
          </div>
        </div>
        
        <div className={`p-6 rounded-3xl border-2 ${surface} shadow-sm relative overflow-hidden transition-all hover:shadow-md group`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-red-500/20 transition-all duration-500"></div>
          <div className="absolute bottom-0 right-0 bg-red-500/5 w-24 h-24 rounded-tl-full blur-2xl pointer-events-none"></div>
          <div className="flex flex-col gap-4">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-inner relative">
              <div className="w-2 h-2 rounded-full bg-red-500 absolute top-0 right-0 -mt-0.5 -mr-0.5 animate-ping"></div>
              <div className="w-2 h-2 rounded-full bg-red-500 absolute top-0 right-0 -mt-0.5 -mr-0.5"></div>
              <AlertCircle size={18} />
            </div>
            <div>
              <p className={`text-4xl font-black ${text} mb-1 tracking-tight`}>{occupiedCount}</p>
              <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${muted}`}>Occupied at exactly {formatAMPM(`${Math.floor(currentMins / 60)}:${String(currentMins % 60).padStart(2, "0")}`)}</h3>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-3xl border-2 ${surface} shadow-sm relative overflow-hidden transition-all hover:shadow-md group`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-500"></div>
          <div className="absolute bottom-0 right-0 bg-emerald-500/5 w-24 h-24 rounded-tl-full blur-2xl pointer-events-none"></div>
          <div className="flex flex-col gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-inner">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className={`text-4xl font-black ${text} mb-1 tracking-tight`}>{availableCount}</p>
              <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${muted}`}>Available to Use Now</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={`p-2 rounded-3xl border-2 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 shadow-sm ${surface}`}>
        {/* Day Selector */}
        <div className="flex items-center gap-1 w-full md:w-auto overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {DAYS.slice(0, 6).map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap
                ${selectedDay === day 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                  : isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}
            >
              {day} {day === getCurrentDay() && <span className="ml-1 opacity-70">(Today)</span>}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
            <input 
              type="text"
              placeholder="Search rooms..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm font-medium outline-none border-2 transition-all
                ${isDarkMode 
                  ? "bg-slate-800/50 border-slate-700/50 text-white focus:border-blue-500 focus:bg-slate-800" 
                  : "bg-slate-50/50 border-slate-200 text-slate-900 focus:border-blue-400 focus:bg-white"}`}
            />
          </div>

          <button
            onClick={() => setIsManageModalOpen(true)}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-2xl border-2 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 shadow-sm hover:shadow-md
              ${isDarkMode 
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white" 
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
          >
            <Settings2 size={16} /> Manage Rooms
          </button>
        </div>
      </div>

      {/* Grid of Rooms */}
      {filteredRooms.length === 0 ? (
        <div className={`p-16 text-center rounded-3xl border-2 border-dashed ${surface}`}>
          <MonitorPlay size={40} className={`mx-auto mb-4 opacity-20 ${muted}`} />
          <p className={`text-sm font-bold ${muted}`}>No rooms found matching your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredRooms.map(({ room, schedules, currentClass, nextClass, isOccupied }) => (
            <div key={room.id} className={`rounded-3xl border-2 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${cardBg} ${isOccupied ? (isDarkMode ? "border-red-900/30" : "border-red-200/60") : (isDarkMode ? "border-emerald-900/30" : "border-emerald-200/60")}`}>
              
              {/* Card Header */}
              <div className={`px-5 py-4 border-b flex items-start justify-between relative overflow-hidden ${isDarkMode ? "border-slate-700/50 bg-slate-800/90" : "border-slate-100 bg-white"}`}>
                <div className="relative z-10">
                  <h3 className={`text-lg font-black tracking-tight ${text}`}>{room.name}</h3>
                  <div className={`text-[9px] font-black uppercase tracking-widest mt-1 truncate ${muted}`}>
                    {room.type || "General Room"} • Cap: {room.capacity || "N/A"}
                  </div>
                </div>
                <div className="relative z-10">
                  <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm
                    ${isOccupied 
                      ? isDarkMode ? "bg-red-500/20 text-red-400 border border-red-500/30 shadow-red-500/10" : "bg-red-50 text-red-600 border border-red-200 shadow-red-500/5"
                      : isDarkMode ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/10" : "bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-emerald-500/5"
                    }`}
                  >
                    <div className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOccupied ? "bg-red-500" : "bg-emerald-500"}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isOccupied ? "bg-red-500" : "bg-emerald-500"}`}></span>
                    </div>
                    {isOccupied ? "Occupied" : "Available"}
                  </div>
                </div>
                
                {/* Background glow for header */}
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none opacity-40
                  ${isOccupied ? "bg-red-500" : "bg-emerald-500"}`}></div>
              </div>

              {/* Status Content */}
              <div className="p-5 flex-1 flex flex-col relative z-10">
                {isOccupied && currentClass ? (
                  <div className="mb-5 bg-black/5 dark:bg-black/20 p-4 rounded-2xl border border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-1.5 h-6 rounded-full ${isDarkMode ? "bg-red-500" : "bg-red-500"}`}></div>
                      <p className={`text-[10px] font-black uppercase tracking-widest opacity-80 ${isDarkMode?"text-red-400":"text-red-600"}`}>Current Class</p>
                    </div>
                    <div className="space-y-2 pl-3">
                      <p className={`text-base font-bold ${text} truncate leading-tight`}>{currentClass.subject}</p>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <Users size={13} className={muted} />
                          <span className={muted}>{currentClass.section}</span>
                        </div>
                        {currentClass.teacher && (
                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <User size={13} className={muted} />
                            <span className={muted}>{currentClass.teacher}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <Clock size={13} className={muted} />
                          <span className={muted}>{formatAMPM(currentClass.start_time)} – {formatAMPM(currentClass.end_time)}</span>
                        </div>
                      </div>
                      <LiveClassAttendance 
                        schedule={currentClass} 
                        date={getLocalDateStr()} 
                        isDarkMode={isDarkMode}
                        text={text}
                        muted={muted}
                      />
                    </div>
                  </div>
                ) : (
                  <div className={`mb-5 py-8 flex flex-col items-center justify-center text-center opacity-60 ${muted} rounded-2xl bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5`}>
                    <CheckCircle2 size={28} className="mb-3 opacity-40 text-emerald-500" />
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Room is currently empty</p>
                  </div>
                )}

                {/* Coming up next */}
                {nextClass && (
                  <div className={`pt-4 mt-auto border-t-2 border-dashed ${isDarkMode ? "border-slate-700/50" : "border-slate-200"}`}>
                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2 pl-1 ${muted}`}>Up Next</p>
                    <div className={`p-3 rounded-xl flex items-start justify-between gap-3 ${isDarkMode ? "bg-slate-800/80" : "bg-slate-100/80"}`}>
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-xs font-bold leading-relaxed ${text} break-words`}>{nextClass.subject}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold opacity-70 ${muted}`}>{nextClass.section}</span>
                          {nextClass.teacher && (
                            <>
                              <span className={`text-[10px] font-bold opacity-40 ${muted}`}>•</span>
                              <span className={`text-[10px] font-bold opacity-70 ${muted}`}>{nextClass.teacher}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs font-black tracking-wider whitespace-nowrap px-2 py-1 rounded-md shrink-0 mt-0.5 ${isDarkMode ? "bg-slate-700 text-slate-300" : "bg-white text-slate-600 shadow-sm"}`}>
                        {formatAMPM(nextClass.start_time)}
                      </span>
                    </div>
                  </div>
                )}
                {!nextClass && schedules.length > 0 && !isOccupied && (
                  <div className={`pt-4 mt-auto border-t-2 border-dashed text-xs font-medium italic ${isDarkMode ? "border-slate-700/50" : "border-slate-200"} ${muted}`}>
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-slate-400 opacity-50"></div>
                       No more classes scheduled for the rest of {selectedDay}.
                    </div>
                  </div>
                )}
                {schedules.length === 0 && (
                  <div className={`pt-4 mt-auto border-t-2 border-dashed text-xs font-medium italic opacity-70 ${isDarkMode ? "border-slate-700/50" : "border-slate-200"} ${muted}`}>
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-slate-400 opacity-50"></div>
                       No classes scheduled for {selectedDay}.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {isManageModalOpen && (
        <RoomManagerModal
          rooms={roomsList}
          isDarkMode={isDarkMode}
          onClose={() => setIsManageModalOpen(false)}
        />
      )}
    </div>
  )
}
