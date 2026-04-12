// app/admin/teachers/components/AnnouncementPanel.tsx
"use client"

import { useState } from "react"
import { Megaphone, Pin, Trash2, Plus, X, Loader2, Clock } from "lucide-react"
import type { Teacher, TeacherAnnouncement } from "../types"

interface AnnouncementPanelProps {
  announcements: TeacherAnnouncement[]
  teachers:      Teacher[]
  isDarkMode:    boolean
  onPost:        (form: { title: string; body: string; target: string; is_pinned: boolean }) => Promise<void>
  onDelete:      (id: string) => void
  onTogglePin:   (id: string, pinned: boolean) => void
}

const EMPTY = { title: "", body: "", target: "ALL", is_pinned: false }

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return "just now"
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function AnnouncementPanel({
  announcements, teachers, isDarkMode, onPost, onDelete, onTogglePin,
}: AnnouncementPanelProps) {
  const [composing, setComposing] = useState(false)
  const [form,      setForm]      = useState({ ...EMPTY })
  const [saving,    setSaving]    = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const itemsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(announcements.length / itemsPerPage));
  const currentAnnouncements = announcements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  const dm = isDarkMode
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const handlePost = async () => {
    if (!form.title.trim() || !form.body.trim()) return
    setSaving(true)
    try { await onPost(form); setForm({ ...EMPTY }); setComposing(false) }
    finally { setSaving(false) }
  }

  const border = dm ? "border-slate-700/60" : "border-slate-200"
  const cardBg = dm ? "bg-slate-800/50"     : "bg-slate-50"
  const input  = `w-full rounded-xl border px-3 py-2.5 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500
    ${dm ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"}`

  return (
    <div className={`rounded-3xl border ${dm ? "bg-slate-900/50 border-slate-700" : "bg-white border-slate-200"} overflow-hidden`}>

      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${border}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${dm ? "bg-amber-500/10" : "bg-amber-50"}`}>
            <Megaphone size={16} className="text-amber-400" />
          </div>
          <div>
            <p className={`text-xs font-black uppercase tracking-[0.15em] ${dm ? "text-white" : "text-slate-800"}`}>Announcements</p>
            <p className={`text-[9px] ${dm ? "text-slate-500" : "text-slate-400"}`}>{announcements.length} total</p>
          </div>
        </div>
        <button
          onClick={() => setComposing(v => !v)}
          className={`flex items-center gap-2 h-9 px-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all
            ${composing
              ? (dm ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600")
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg"}`}>
          {composing ? <><X size={12}/> Cancel</> : <><Plus size={12}/> Post</>}
        </button>
      </div>

      {/* Compose form */}
      {composing && (
        <div className={`p-5 border-b ${border} space-y-3 animate-in slide-in-from-top-2 duration-200`}>
          <input className={input} placeholder="Announcement title…"
            value={form.title} onChange={e => set("title", e.target.value)} />
          <textarea className={`${input} resize-none`} rows={3} placeholder="Write your message here…"
            value={form.body} onChange={e => set("body", e.target.value)} />
          <div className="flex items-center gap-3 flex-wrap">
            <select className={`${input} w-auto`} value={form.target} onChange={e => set("target", e.target.value)}>
              <option value="ALL">All Teachers</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_pinned}
                onChange={e => set("is_pinned", e.target.checked)}
                className="w-4 h-4 accent-blue-500 rounded" />
              <span className={`text-[10px] font-bold ${dm ? "text-slate-400" : "text-slate-600"}`}>Pin this</span>
            </label>
            <button onClick={handlePost} disabled={saving || !form.title.trim() || !form.body.trim()}
              className="ml-auto h-9 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40 transition-all">
              {saving ? <Loader2 size={12} className="animate-spin" /> : null}
              Post
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="divide-y" style={{ borderColor: dm ? "rgba(71,85,105,0.3)" : "rgba(226,232,240,1)" }}>
        {announcements.length === 0 && (
          <div className="px-6 py-10 text-center">
            <Megaphone size={24} className={`mx-auto mb-2 ${dm ? "text-slate-700" : "text-slate-300"}`} />
            <p className={`text-xs ${dm ? "text-slate-500" : "text-slate-400"}`}>No announcements yet</p>
          </div>
        )}
        {currentAnnouncements.map(a => (
          <div key={a.id} className={`flex gap-4 px-6 py-4 transition-colors ${dm ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}>
            {/* Pin indicator */}
            {a.is_pinned && (
              <div className="flex-shrink-0 pt-0.5">
                <Pin size={13} className="text-amber-400 rotate-45" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-bold leading-snug ${dm ? "text-white" : "text-slate-800"}`}>{a.title}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => onTogglePin(a.id, a.is_pinned)}
                    className={`p-1.5 rounded-lg transition-colors ${a.is_pinned ? "text-amber-400" : (dm ? "text-slate-600 hover:text-slate-400" : "text-slate-300 hover:text-slate-500")}`}>
                    <Pin size={12} />
                  </button>
                  <button onClick={() => onDelete(a.id)}
                    className={`p-1.5 rounded-lg transition-colors ${dm ? "text-slate-600 hover:text-red-400" : "text-slate-300 hover:text-red-400"}`}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <p className={`text-xs mt-1 leading-relaxed ${dm ? "text-slate-400" : "text-slate-600"}`}>{a.body}</p>
              <div className={`flex items-center gap-3 mt-2 text-[9px] font-bold uppercase tracking-wider ${dm ? "text-slate-600" : "text-slate-400"}`}>
                <span className="flex items-center gap-1">
                  <Clock size={9} /> {timeAgo(a.created_at)}
                </span>
                <span>
                  To: {a.target === "ALL" ? "All Teachers" : "Individual"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-between px-6 py-4 border-t ${border}`}>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${dm ? "text-slate-400" : "text-slate-500"}`}>
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