// app/teacher/dashboard/components/AnnouncementsTab.tsx

import { Bell, Pin } from "lucide-react"
import { Announcement, timeAgo } from "../types"

interface AnnouncementsTabProps {
  announcements: Announcement[]
  dm: boolean
}

export function AnnouncementsTab({ announcements, dm }: AnnouncementsTabProps) {
  const card = dm ? "bg-slate-900/60 border-slate-700/50" : "bg-white border-slate-200"
  const sub  = dm ? "text-slate-400" : "text-slate-500"
  const head = dm ? "text-white"     : "text-slate-900"

  if (announcements.length === 0) {
    return (
      <div className={`rounded-2xl md:rounded-3xl border p-12 flex flex-col items-center gap-4 ${card} animate-in fade-in duration-300`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${dm ? "bg-slate-800" : "bg-slate-100"}`}>
          <Bell size={24} className={dm ? "text-slate-600" : "text-slate-400"} />
        </div>
        <div className="text-center">
          <p className={`text-sm font-black ${head}`}>No announcements</p>
          <p className={`text-xs mt-0.5 ${sub}`}>Nothing new at this time</p>
        </div>
      </div>
    )
  }

  const pinned = announcements.filter(a => a.is_pinned)
  const regular = announcements.filter(a => !a.is_pinned)

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Pinned section */}
      {pinned.length > 0 && (
        <div className="space-y-2">
          <p className={`text-[9px] font-black uppercase tracking-[0.2em] px-1 flex items-center gap-1.5 ${dm ? "text-amber-400/70" : "text-amber-600/70"}`}>
            <Pin size={9} className="rotate-45" /> Pinned
          </p>
          {pinned.map(a => (
            <div
              key={a.id}
              className={`rounded-2xl border overflow-hidden transition-all
                ${dm ? "border-amber-500/30 bg-amber-500/5" : "border-amber-200 bg-amber-50/60 shadow-sm"}`}
            >
              {/* Left accent */}
              <div className="flex">
                <div className="w-1 shrink-0 bg-amber-500 rounded-l-2xl" />
                <div className="flex-1 p-5">
                  <div className="flex items-start gap-2.5">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${dm ? "bg-amber-500/15" : "bg-amber-100"}`}>
                      <Pin size={11} className="text-amber-500 rotate-45" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black ${head}`}>{a.title}</p>
                      <p className={`text-xs mt-1.5 leading-relaxed ${dm ? "text-slate-300" : "text-slate-600"}`}>{a.body}</p>
                      <div className={`flex items-center gap-2 mt-2.5 text-[9px] font-bold uppercase tracking-wider ${sub}`}>
                        <span>{a.posted_by}</span><span>·</span><span>{timeAgo(a.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Regular announcements */}
      {regular.length > 0 && (
        <div className="space-y-2">
          {pinned.length > 0 && (
            <p className={`text-[9px] font-black uppercase tracking-[0.2em] px-1 ${sub}`}>Recent</p>
          )}
          {regular.map(a => (
            <div
              key={a.id}
              className={`rounded-2xl border p-5 transition-all shadow-sm ${card}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${dm ? "bg-slate-800" : "bg-slate-100"}`}>
                  <Bell size={11} className={sub} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-black ${head}`}>{a.title}</p>
                  <p className={`text-xs mt-1.5 leading-relaxed ${dm ? "text-slate-300" : "text-slate-600"}`}>{a.body}</p>
                  <div className={`flex items-center gap-2 mt-2.5 text-[9px] font-bold uppercase tracking-wider ${sub}`}>
                    <span>{a.posted_by}</span><span>·</span><span>{timeAgo(a.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}