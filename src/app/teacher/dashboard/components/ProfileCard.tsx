// app/teacher/dashboard/components/ProfileCard.tsx
"use client"

import { useRef, useState } from "react"
import { BookOpen, Users, CalendarDays, Camera, Loader2 } from "lucide-react"
import { Avatar } from "./Avatar"
import { supabase } from "@/lib/supabase/teacher-client"
import { toast } from "sonner"

import { TeacherSession, ScheduleRow, ALL_DAYS, fmt } from "../types"

interface ProfileCardProps {
  session: TeacherSession
  schedules: ScheduleRow[]
  colorMap: Record<string, typeof import("../types").COLORS[number]>
  dm: boolean
  onAvatarUpdate?: (url: string) => void
}

export function ProfileCard({ session, schedules, colorMap, dm, onAvatarUpdate }: ProfileCardProps) {
  const card  = dm ? "bg-slate-900/60 border-slate-700/50" : "bg-white border-slate-200"
  const sub   = dm ? "text-slate-400" : "text-slate-500"
  const head  = dm ? "text-white"     : "text-slate-900"
  const divB  = dm ? "border-slate-700/50" : "border-slate-100"

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    (session as any).avatar_url ?? null
  )

  const handleAvatarClick = () => { if (!uploading) fileInputRef.current?.click() }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error("Image too large — maximum 5 MB."); return }
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return }

    setUploading(true)
    const toastId = toast.loading("Uploading photo…")
    try {
      const ext = file.name.split(".").pop() ?? "jpg"
      const filePath = `teacher-avatars/${session.id}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type })
      if (uploadErr) throw uploadErr

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath)

      const { error: updateErr } = await supabase
        .from("teachers")
        .update({ avatar_url: publicUrl })
        .eq("id", session.id)
      if (updateErr) throw updateErr

      setAvatarUrl(publicUrl)
      onAvatarUpdate?.(publicUrl)
      toast.success("Profile photo updated!", { id: toastId })
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed.", { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  const byDay: Record<string, ScheduleRow[]> = {}
  for (const d of ALL_DAYS) {
    byDay[d] = schedules.filter(s => s.day === d).sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  const today = ALL_DAYS[[0,1,2,3,4,5,6][new Date().getDay()]] ?? "Monday"
  const todayPeriods = byDay[today] ?? []
  const uniqSubjects = [...new Set(schedules.map(s => s.subject))]
  const uniqSections = [...new Set(schedules.map(s => s.section))]
  const activeDays   = ALL_DAYS.filter(d => byDay[d].length > 0)

  return (
    <div className={`rounded-2xl md:rounded-3xl border overflow-hidden ${card}`}>
      {/* Top accent gradient bar */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-violet-500 to-blue-400" />

      <div className="p-5 md:p-7">
        <div className="flex items-start gap-4">

          {/* Clickable avatar */}
          <div
            className="relative group cursor-pointer shrink-0"
            onClick={handleAvatarClick}
            title="Click to change profile photo"
          >
            <div className={`p-0.5 rounded-full bg-gradient-to-br from-blue-500 to-violet-500`}>
              <div className={`rounded-full p-0.5 ${dm ? "bg-slate-900" : "bg-white"}`}>
                <Avatar name={session.full_name} size={50} img={avatarUrl} />
              </div>
            </div>
            <div className={`absolute inset-0 rounded-full flex items-center justify-center transition-opacity
              ${uploading ? "opacity-100 bg-black/50" : "opacity-0 group-hover:opacity-100 bg-black/40"}`}>
              {uploading ? <Loader2 size={16} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent mb-0.5">Welcome back</p>
            <h1 className={`text-xl md:text-2xl font-black tracking-tight leading-tight ${head}`}>{session.full_name}</h1>
            <p className={`text-xs mt-0.5 ${sub}`}>{session.email}</p>
          </div>

          {/* Desktop stats */}
          <div className="hidden md:flex items-center gap-2">
            {[
              { icon: BookOpen,     label: "Subjects", val: uniqSubjects.length, color: "text-blue-500",    ring: "ring-blue-500/20",    bg: dm ? "bg-blue-500/5" : "bg-blue-50/80"    },
              { icon: Users,        label: "Sections", val: uniqSections.length, color: "text-violet-500",  ring: "ring-violet-500/20",  bg: dm ? "bg-violet-500/5" : "bg-violet-50/80"  },
              { icon: CalendarDays, label: "Days",     val: activeDays.length,   color: "text-emerald-500", ring: "ring-emerald-500/20", bg: dm ? "bg-emerald-500/5" : "bg-emerald-50/80" },
            ].map(s => (
              <div key={s.label} className={`text-center px-3 py-2.5 rounded-2xl border min-w-[68px] ring-1 ${s.ring} ${s.bg} ${dm ? "border-slate-700/40" : "border-slate-200/60"}`}>
                <s.icon size={12} className={`mx-auto mb-1 ${s.color}`} />
                <p className={`text-lg font-black leading-none ${s.color}`}>{s.val}</p>
                <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${sub}`}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile stats */}
        <div className="flex md:hidden gap-2 mt-4">
          {[
            { label: "Subjects", val: uniqSubjects.length, color: "text-blue-500",    bg: dm ? "bg-blue-500/8"    : "bg-blue-50",    border: dm ? "border-blue-500/20"    : "border-blue-100"    },
            { label: "Sections", val: uniqSections.length, color: "text-violet-500",  bg: dm ? "bg-violet-500/8"  : "bg-violet-50",  border: dm ? "border-violet-500/20"  : "border-violet-100"  },
            { label: "Days",     val: activeDays.length,   color: "text-emerald-500", bg: dm ? "bg-emerald-500/8" : "bg-emerald-50", border: dm ? "border-emerald-500/20" : "border-emerald-100" },
          ].map(s => (
            <div key={s.label} className={`flex-1 text-center py-2.5 rounded-xl border ${s.bg} ${s.border}`}>
              <p className={`text-xl font-black leading-none ${s.color}`}>{s.val}</p>
              <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${sub}`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Today's schedule strip */}
        {todayPeriods.length > 0 && (
          <div className={`mt-4 pt-4 border-t ${divB}`}>
            <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-2.5 flex items-center gap-2 ${sub}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Today · {today} · {todayPeriods.length} period{todayPeriods.length !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-2 flex-wrap">
              {todayPeriods.map(p => {
                const col = colorMap[p.subject] ?? { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-500", dot: "bg-blue-500" }
                return (
                  <div key={p.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-opacity hover:opacity-80 ${col.bg} ${col.border} ${col.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${col.dot}`} />
                    {p.subject} · {fmt(p.start_time)}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
