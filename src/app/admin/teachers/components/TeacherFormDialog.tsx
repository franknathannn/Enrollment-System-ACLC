// app/admin/teachers/components/TeacherFormDialog.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { X, Save, Eye, EyeOff, User, Mail, Phone, BookOpen, KeyRound, Loader2, Camera } from "lucide-react"
import { supabase } from "@/lib/supabase/admin-client"
import { toast } from "sonner"
import type { Teacher } from "../types"

interface TeacherFormDialogProps {
  open:       boolean
  editing:    Teacher | null
  isDarkMode: boolean
  onSave:     (data: any) => Promise<void>
  onClose:    () => void
}

const EMPTY = {
  full_name: "", email: "", password: "", phone: "", subject_specialization: "", is_active: true as boolean,
}

export function TeacherFormDialog({ open, editing, isDarkMode, onSave, onClose }: TeacherFormDialogProps) {
  const [form,        setForm]        = useState({ ...EMPTY })
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [saving,      setSaving]      = useState(false)
  const [showPass,    setShowPass]    = useState(false)
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(null)
  const [uploading,   setUploading]   = useState(false)
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setForm({
        full_name:              editing.full_name,
        email:                  editing.email,
        password:               "",
        phone:                  editing.phone ?? "",
        subject_specialization: editing.subject_specialization ?? "",
        is_active:              editing.is_active,
      })
      setAvatarUrl(editing.avatar_url ?? null)
    } else {
      setForm({ ...EMPTY })
      setAvatarUrl(null)
    }
    setErrors({})
    setShowPass(false)
  }, [editing, open])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !editing) return
    if (file.size > 5 * 1024 * 1024) { toast.error("Image too large — max 5 MB"); return }
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return }
    setUploading(true)
    const toastId = toast.loading("Uploading photo…")
    try {
      const ext = file.name.split(".").pop() ?? "jpg"
      const filePath = `teacher-avatars/${editing.id}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from("avatars").upload(filePath, file, { upsert: true, contentType: file.type })
      if (uploadErr) throw uploadErr
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath)
      const { error: updateErr } = await supabase.from("teachers").update({ avatar_url: publicUrl }).eq("id", editing.id)
      if (updateErr) throw updateErr
      setAvatarUrl(publicUrl)
      toast.success("Photo updated!", { id: toastId })
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed", { id: toastId })
    } finally {
      setUploading(false)
    }
  }

  const set = (k: string, v: string | boolean) => {
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
      await onSave({ ...form, password: form.password || undefined, is_active: form.is_active })
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
          <div className="flex items-center gap-3 min-w-0">
            {editing ? (
              /* Clickable avatar with camera overlay — only when editing */
              <div className="relative flex-shrink-0 group cursor-pointer" onClick={() => !uploading && fileInputRef.current?.click()}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={editing.full_name}
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500/30" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-sm select-none"
                    style={{ background: `hsl(${editing.full_name.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360},65%,45%)` }}>
                    {editing.full_name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? <Loader2 size={14} className="animate-spin text-white" /> : <Camera size={14} className="text-white" />}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
            ) : (
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isDarkMode ? "bg-blue-500/10" : "bg-blue-50"}`}>
                <User size={20} className="text-blue-400" />
              </div>
            )}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                {editing ? "Edit Teacher" : "New Teacher Account"}
              </p>
              <p className={`text-[9px] mt-0.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                {editing ? (uploading ? "Uploading photo…" : "Click photo to change") : "Create login credentials for this teacher"}
              </p>
            </div>
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

          {/* Status toggle — always visible */}
          <div className="sm:col-span-2">
            <label className={label}>Status</label>
            <div className={`flex items-center justify-between rounded-xl border px-4 py-3
              ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
              <div>
                <p className={`text-sm font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  {form.is_active ? "Active" : "Inactive"}
                </p>
                <p className={`text-[9px] mt-0.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                  {form.is_active ? "Teacher can log in and is visible to students" : "Teacher is deactivated and cannot log in"}
                </p>
              </div>
              <button type="button"
                onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                role="switch" aria-checked={form.is_active}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0
                  ${form.is_active ? "bg-emerald-500" : isDarkMode ? "bg-slate-600" : "bg-slate-300"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
                  ${form.is_active ? "translate-x-6" : "translate-x-1"}`} />
              </button>
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