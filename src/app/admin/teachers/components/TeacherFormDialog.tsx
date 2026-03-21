// app/admin/teachers/components/TeacherFormDialog.tsx
"use client"

import { useState, useEffect } from "react"
import { X, Save, Eye, EyeOff, User, Mail, Phone, BookOpen, KeyRound, Loader2 } from "lucide-react"
import type { Teacher } from "../types"

interface TeacherFormDialogProps {
  open:       boolean
  editing:    Teacher | null
  isDarkMode: boolean
  onSave:     (data: any) => Promise<void>
  onClose:    () => void
}

const EMPTY = {
  full_name: "", email: "", password: "", phone: "", subject_specialization: ""
}

export function TeacherFormDialog({ open, editing, isDarkMode, onSave, onClose }: TeacherFormDialogProps) {
  const [form,        setForm]        = useState({ ...EMPTY })
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [saving,      setSaving]      = useState(false)
  const [showPass,    setShowPass]    = useState(false)

  useEffect(() => {
    if (editing) {
      setForm({
        full_name:              editing.full_name,
        email:                  editing.email,
        password:               "",
        phone:                  editing.phone ?? "",
        subject_specialization: editing.subject_specialization ?? "",
      })
    } else {
      setForm({ ...EMPTY })
    }
    setErrors({})
    setShowPass(false)
  }, [editing, open])

  const set = (k: string, v: string) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: "" }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.full_name.trim())  e.full_name = "Full name is required"
    if (!form.email.trim())      e.email     = "Email is required"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email format"
    if (!editing && !form.password.trim()) e.password = "Password is required for new accounts"
    if (form.password && form.password.length < 6) e.password = "Password must be at least 6 characters"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await onSave({ ...form, password: form.password || undefined })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const bg     = isDarkMode ? "bg-slate-900"   : "bg-white"
  const border = isDarkMode ? "border-slate-700" : "border-slate-200"
  const label  = `block text-[9px] font-black uppercase tracking-widest mb-1.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`
  const input  = `w-full rounded-xl border px-3 py-2.5 text-sm font-medium outline-none transition-all
    focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500
    ${isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-lg rounded-3xl border shadow-2xl ${bg} ${border} animate-in zoom-in-95 duration-200`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${border}`}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
              {editing ? "Edit Teacher" : "New Teacher Account"}
            </p>
            <p className={`text-[9px] mt-0.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
              {editing ? "Update teacher information" : "Create login credentials for this teacher"}
            </p>
          </div>
          <button onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${isDarkMode ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Full Name */}
          <div className="sm:col-span-2">
            <label className={label}>Full Name *</label>
            <div className="relative">
              <User size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
              <input className={`${input} pl-9`} placeholder="e.g. John Cruz"
                value={form.full_name} onChange={e => set("full_name", e.target.value)} />
            </div>
            {errors.full_name && <p className="text-[9px] text-red-400 mt-1 font-bold">{errors.full_name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className={label}>Email Address *</label>
            <div className="relative">
              <Mail size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
              <input className={`${input} pl-9`} type="email" placeholder="teacher@school.edu"
                value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            {errors.email && <p className="text-[9px] text-red-400 mt-1 font-bold">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className={label}>
              {editing ? "New Password" : "Password *"}
              {editing && <span className="opacity-40 normal-case ml-1">(leave blank to keep)</span>}
            </label>
            <div className="relative">
              <KeyRound size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
              <input
                className={`${input} pl-9 pr-10`}
                type={showPass ? "text" : "password"}
                placeholder={editing ? "••••••••" : "Min. 6 characters"}
                value={form.password}
                onChange={e => set("password", e.target.value)}
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"}`}>
                {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            {errors.password && <p className="text-[9px] text-red-400 mt-1 font-bold">{errors.password}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className={label}>Phone <span className="opacity-40 normal-case font-bold">(optional)</span></label>
            <div className="relative">
              <Phone size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
              <input className={`${input} pl-9`} placeholder="09XX-XXX-XXXX"
                value={form.phone} onChange={e => set("phone", e.target.value)} />
            </div>
          </div>

          {/* Subject Specialization */}
          <div>
            <label className={label}>Specialization <span className="opacity-40 normal-case font-bold">(optional)</span></label>
            <div className="relative">
              <BookOpen size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
              <input className={`${input} pl-9`} placeholder="e.g. Mathematics, Science"
                value={form.subject_specialization} onChange={e => set("subject_specialization", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${border}`}>
          <button onClick={onClose}
            className={`h-10 px-5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-colors
              ${isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="h-10 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? "Saving…" : editing ? "Save Changes" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  )
}