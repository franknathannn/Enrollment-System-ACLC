// app/admin/teachers/components/TeacherDetailDrawer.tsx
"use client"

import { X, Mail, Phone, BookOpen, Edit2, Trash2 } from "lucide-react"
import { TeacherSchedulePanel } from "./TeacherSchedulePanel"
import type { Teacher } from "../types"

interface TeacherDetailDrawerProps {
  teacher:      Teacher | null
  isDarkMode:   boolean
  onClose:      () => void
  onEdit:       (t: Teacher) => void
  onDelete:     (id: string, name: string) => void
  onToggle:     (id: string, current: boolean) => void
}

function Avatar({ name, url, size = 48 }: { name: string; url?: string | null; size?: number }) {
  const initials = name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase()
  const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  if (url) {
    return (
      <img src={url} alt={name}
        className="rounded-full object-cover flex-shrink-0 ring-2 ring-white/20"
        style={{ width: size, height: size }}
        onError={e => {
          const t = e.currentTarget; t.style.display = "none"
          const parent = t.parentElement
          if (parent && !parent.querySelector(".av-fb")) {
            const fb = document.createElement("div")
            fb.className = "av-fb rounded-full flex items-center justify-center font-black text-white select-none flex-shrink-0"
            fb.style.cssText = `width:${size}px;height:${size}px;font-size:${size*0.33}px;background:hsl(${hue},65%,45%)`
            fb.textContent = initials; parent.appendChild(fb)
          }
        }} />
    )
  }
  return (
    <div className="rounded-full flex items-center justify-center font-black text-white select-none flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.33, background: `hsl(${hue},65%,45%)` }}>
      {initials}
    </div>
  )
}

function StatusSwitch({ active, onToggle, isDarkMode }: { active: boolean; onToggle: () => void; isDarkMode: boolean }) {
  return (
    <button type="button" onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none
        ${active ? "bg-emerald-500" : isDarkMode ? "bg-slate-600" : "bg-slate-300"}`}
      aria-checked={active} role="switch">
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
        ${active ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  )
}

export function TeacherDetailDrawer({
  teacher, isDarkMode, onClose, onEdit, onDelete, onToggle,
}: TeacherDetailDrawerProps) {
  if (!teacher) return null
  const dm = isDarkMode

  const bg     = dm ? "bg-slate-900"     : "bg-white"
  const border = dm ? "border-slate-700" : "border-slate-200"
  const sub    = dm ? "text-slate-400"   : "text-slate-500"

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className={`w-full max-w-2xl h-full overflow-y-auto border-l shadow-2xl animate-in slide-in-from-right duration-300 ${bg} ${border}`}>

        {/* Top bar */}
        <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b ${border} ${bg}`}>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] text-blue-400`}>Teacher Profile</p>
          <button onClick={onClose}
            className={`p-2 rounded-xl ${dm ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Identity card */}
          <div className={`rounded-2xl border p-5 flex items-start gap-4 ${border} ${dm ? "bg-slate-800/40" : "bg-slate-50"}`}>
            <Avatar name={teacher.full_name} url={teacher.avatar_url} size={56} />
            <div className="flex-1 min-w-0">
              <h2 className={`text-lg font-black leading-tight ${dm ? "text-white" : "text-slate-900"}`}>{teacher.full_name}</h2>
              {teacher.subject_specialization && (
                <p className={`text-xs font-bold mt-0.5 ${sub}`}>{teacher.subject_specialization}</p>
              )}
              <div className="flex items-center gap-3 mt-3">
                <StatusSwitch
                  active={teacher.is_active}
                  onToggle={() => onToggle(teacher.id, teacher.is_active)}
                  isDarkMode={dm}
                />
                <span className={`text-[9px] font-black uppercase tracking-widest
                  ${teacher.is_active ? "text-emerald-400" : dm ? "text-slate-500" : "text-slate-400"}`}>
                  {teacher.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="space-y-2">
            <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${sub}`}>Contact</p>
            <div className={`rounded-2xl border divide-y overflow-hidden ${border}`} style={{ borderColor: dm ? "rgba(71,85,105,0.3)" : "rgba(226,232,240,1)" }}>
              <div className={`flex items-center gap-3 px-4 py-3 ${dm ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}>
                <Mail size={14} className="text-blue-400 flex-shrink-0" />
                <span className={`text-sm font-medium ${dm ? "text-slate-300" : "text-slate-700"}`}>{teacher.email}</span>
              </div>
              {teacher.phone && (
                <div className={`flex items-center gap-3 px-4 py-3 ${dm ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}>
                  <Phone size={14} className="text-blue-400 flex-shrink-0" />
                  <span className={`text-sm font-medium ${dm ? "text-slate-300" : "text-slate-700"}`}>{teacher.phone}</span>
                </div>
              )}
              {teacher.subject_specialization && (
                <div className={`flex items-center gap-3 px-4 py-3 ${dm ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}>
                  <BookOpen size={14} className="text-blue-400 flex-shrink-0" />
                  <span className={`text-sm font-medium ${dm ? "text-slate-300" : "text-slate-700"}`}>{teacher.subject_specialization}</span>
                </div>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${sub}`}>Assigned Schedule</p>
            <TeacherSchedulePanel teacher={teacher} isDarkMode={isDarkMode} />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button onClick={() => onEdit(teacher)}
              className="flex items-center gap-2 h-10 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
              <Edit2 size={12} /> Edit
            </button>
            <button onClick={() => { onDelete(teacher.id, teacher.full_name); onClose() }}
              className="flex items-center gap-2 h-10 px-5 rounded-2xl text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-all">
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}