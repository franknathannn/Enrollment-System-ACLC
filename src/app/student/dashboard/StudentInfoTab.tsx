"use client"

import { useState, useEffect, useCallback } from "react"
import { studentSupabase } from "@/lib/supabase/student-client"
import {
  User, Phone, GraduationCap, BookOpen,
  Loader2, Heart, Laptop, Eye, EyeOff, Copy,
  Pencil, X, Check
} from "lucide-react"
import { toast } from "sonner"

// ── Types ─────────────────────────────────────────────────────────────────────
export interface StudentFullInfo {
  id: string
  first_name: string
  last_name: string
  middle_name?: string | null
  lrn: string
  section?: string | null
  strand?: string | null
  school_year?: string | null
  status: string
  grade_level?: string | null
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
  oed_usn?: string | null
  oed_password?: string | null
  // social
  facebook_user?: string | null
  facebook_link?: string | null
}

interface Props {
  student: StudentFullInfo
  dm: boolean
  onStudentUpdate?: (updated: StudentFullInfo) => void
}

// ── Editable Field Component ──────────────────────────────────────────────────
function EditableField({
  label, value, fieldKey, editState, onChange, dm, type = "text", options,
}: {
  label: string
  value?: string | number | null
  fieldKey: string
  editState: Record<string, any> | null
  onChange?: (key: string, val: string) => void
  dm: boolean
  type?: "text" | "select" | "date" | "number" | "textarea"
  options?: { value: string; label: string }[]
}) {
  const fieldBg = dm ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-100"
  const labelCls = dm ? "text-slate-600" : "text-slate-400"
  const textPri = dm ? "text-white" : "text-slate-900"
  const textMuted = dm ? "text-slate-700" : "text-slate-300"
  const inputCls = dm
    ? "bg-white/5 border-white/10 text-white placeholder-slate-600 focus:border-blue-500"
    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"

  const isEditing = editState !== null
  const editValue = editState?.[fieldKey] ?? ""

  if (isEditing && onChange) {
    return (
      <div className={`rounded-[16px] border px-3.5 py-2.5 ${fieldBg}`}>
        <p className={`text-[7px] font-black uppercase tracking-[0.3em] mb-1.5 ${labelCls}`}>{label}</p>
        {type === "select" && options ? (
          <select
            value={editValue}
            onChange={e => onChange(fieldKey, e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-xs font-bold outline-none transition-colors ${inputCls}`}
          >
            <option value="">—</option>
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : type === "textarea" ? (
          <textarea
            value={editValue}
            onChange={e => onChange(fieldKey, e.target.value)}
            rows={2}
            className={`w-full rounded-lg border px-3 py-2 text-xs font-bold outline-none transition-colors resize-none ${inputCls}`}
          />
        ) : (
          <input
            type={type === "number" ? "text" : type}
            inputMode={type === "number" ? "numeric" : undefined}
            value={editValue}
            onChange={e => onChange(fieldKey, e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-xs font-bold outline-none transition-colors ${inputCls}`}
          />
        )}
      </div>
    )
  }

  return (
    <div className={`rounded-[16px] border px-3.5 py-3 ${fieldBg}`}>
      <p className={`text-[7px] font-black uppercase tracking-[0.3em] mb-1 ${labelCls}`}>{label}</p>
      <p className={`text-sm font-black truncate ${value ? textPri : textMuted}`}>{value || "—"}</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function StudentInfoTab({ student, dm, onStudentUpdate }: Props) {
  const [showOedBanner, setShowOedBanner] = useState(false)
  const [showOedPwd, setShowOedPwd] = useState(false)
  const [allowEdit, setAllowEdit] = useState(false)
  const [loadingConfig, setLoadingConfig] = useState(true)

  // Per-group edit state: null = read-only, object = editing with draft values
  const [editPersonal, setEditPersonal] = useState<Record<string, any> | null>(null)
  const [editAcademic, setEditAcademic] = useState<Record<string, any> | null>(null)
  const [editGuardian, setEditGuardian] = useState<Record<string, any> | null>(null)
  const [editContact, setEditContact] = useState<Record<string, any> | null>(null)
  const [savingGroup, setSavingGroup] = useState<string | null>(null)

  // The "live" student data (updated after saves)
  const [liveStudent, setLiveStudent] = useState<StudentFullInfo>(student)

  useEffect(() => {
    setLiveStudent(student)
  }, [student])

  useEffect(() => {
    const checkConfig = async () => {
      const { data } = await studentSupabase.from("system_config").select("show_oed_credentials, allow_student_edit").limit(1).maybeSingle()
      if (data?.show_oed_credentials) setShowOedBanner(true)
      setAllowEdit(data?.allow_student_edit ?? false)
      setLoadingConfig(false)
    }
    checkConfig()

    // Realtime: update allow_student_edit instantly when admin toggles it
    const channel = studentSupabase.channel("student_info_config_rt")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "system_config" }, (payload) => {
        if (payload.new && "allow_student_edit" in payload.new) {
          setAllowEdit(payload.new.allow_student_edit ?? false)
        }
        if (payload.new && "show_oed_credentials" in payload.new) {
          setShowOedBanner(payload.new.show_oed_credentials ?? false)
        }
      })
      .subscribe()

    return () => { studentSupabase.removeChannel(channel) }
  }, [])

  // Theme tokens
  const textPri   = dm ? "text-white"          : "text-slate-900"
  const textSub   = dm ? "text-slate-500"       : "text-slate-400"
  const textMuted = dm ? "text-slate-700"       : "text-slate-300"
  const sectionBg = dm
    ? "bg-white/[0.02] border-white/8"
    : "bg-slate-50 border-slate-200"

  // ── Start editing a group ───────────────────────────────────────────────────
  const startEdit = useCallback((group: string) => {
    const s = liveStudent
    switch (group) {
      case "personal":
        setEditPersonal({
          first_name: s.first_name || "",
          middle_name: s.middle_name || "",
          last_name: s.last_name || "",
          gender: s.gender || "",
          birth_date: s.birth_date || "",
          age: s.age != null ? String(s.age) : "",
          civil_status: s.civil_status || "",
          nationality: s.nationality || "",
          religion: s.religion || "",
          address: s.address || "",
          email: s.email || "",
        })
        break
      case "academic":
        setEditAcademic({
          lrn: s.lrn || "",
          student_category: s.student_category || "",
          school_type: s.school_type || "",
          last_school_attended: s.last_school_attended || "",
          last_school_address: s.last_school_address || "",
          gwa_grade_10: s.gwa_grade_10 != null ? String(s.gwa_grade_10) : "",
          year_completed_jhs: s.year_completed_jhs || "",
          preferred_modality: s.preferred_modality || "",
          preferred_shift: s.preferred_shift || "",
          facebook_user: (s as any).facebook_user || "",
          facebook_link: (s as any).facebook_link || "",
        })
        break
      case "guardian":
        setEditGuardian({
          guardian_first_name: s.guardian_first_name || "",
          guardian_middle_name: s.guardian_middle_name || "",
          guardian_last_name: s.guardian_last_name || "",
          guardian_phone: s.guardian_phone || "",
          guardian_email: s.guardian_email || "",
        })
        break
      case "contact":
        setEditContact({
          phone: s.phone || "",
          email: s.email || "",
          address: s.address || "",
        })
        break
    }
  }, [liveStudent])

  const cancelEdit = useCallback((group: string) => {
    switch (group) {
      case "personal": setEditPersonal(null); break
      case "academic": setEditAcademic(null); break
      case "guardian": setEditGuardian(null); break
      case "contact":  setEditContact(null);  break
    }
  }, [])

  const handleFieldChange = useCallback((group: string, key: string, val: string) => {
    const setter = group === "personal" ? setEditPersonal
      : group === "academic" ? setEditAcademic
      : group === "guardian" ? setEditGuardian
      : setEditContact
    setter(prev => prev ? { ...prev, [key]: val } : prev)
  }, [])

  const saveGroup = useCallback(async (group: string) => {
    const state = group === "personal" ? editPersonal
      : group === "academic" ? editAcademic
      : group === "guardian" ? editGuardian
      : editContact

    if (!state) return

    setSavingGroup(group)
    try {
      // Build the update payload
      const payload: Record<string, any> = {}
      for (const [k, v] of Object.entries(state)) {
        if (k === "age" || k === "gwa_grade_10") {
          payload[k] = v === "" ? null : Number(v)
        } else {
          payload[k] = v === "" ? null : v
        }
      }

      const { error } = await studentSupabase
        .from("students")
        .update(payload)
        .eq("id", liveStudent.id)

      if (error) throw error

      // Update live state
      const updated = { ...liveStudent, ...payload }
      setLiveStudent(updated)
      onStudentUpdate?.(updated)
      cancelEdit(group)
      toast.success("Information updated successfully")
    } catch (err: any) {
      console.error("Save error:", err)
      toast.error(err?.message || "Failed to save changes")
    } finally {
      setSavingGroup(null)
    }
  }, [editPersonal, editAcademic, editGuardian, editContact, liveStudent, onStudentUpdate, cancelEdit])

  // ── Section wrapper with edit button ────────────────────────────────────────
  const Group = ({ icon, title, children, group, editState, onStartEdit, onCancel, onSave }: {
    icon: React.ReactNode; title: string; children: React.ReactNode
    group: string; editState: Record<string, any> | null
    onStartEdit: () => void; onCancel: () => void; onSave: () => void
  }) => {
    const isEditing = editState !== null
    const isSaving = savingGroup === group

    return (
      <div className={`rounded-[24px] border p-5 space-y-3 transition-all duration-300 ${sectionBg} ${
        isEditing ? (dm ? "ring-1 ring-blue-500/30" : "ring-1 ring-blue-300") : ""
      }`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="text-blue-500 shrink-0">{icon}</div>
            <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${textSub}`}>{title}</p>
          </div>
          {allowEdit && !loadingConfig && (
            <div className="flex items-center gap-1.5">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); onCancel() }}
                    disabled={isSaving}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                      dm ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <X size={10} /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); onSave() }}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                  >
                    {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                    {isSaving ? "Saving…" : "Save"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); onStartEdit() }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                    dm ? "text-blue-400 hover:bg-blue-500/10" : "text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  <Pencil size={10} /> Edit
                </button>
              )}
            </div>
          )}
        </div>
        {children}
      </div>
    )
  }

  // ── Read-only Field (fallback when not editing) ─────────────────────────────
  const Field = ({ label, value }: { label: string; value?: string | number | null }) => {
    const fieldBg = dm ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-100"
    const labelCls = dm ? "text-slate-600" : "text-slate-400"
    return (
      <div className={`rounded-[16px] border px-3.5 py-3 ${fieldBg}`}>
        <p className={`text-[7px] font-black uppercase tracking-[0.3em] mb-1 ${labelCls}`}>{label}</p>
        <p className={`text-sm font-black truncate ${value ? textPri : textMuted}`}>{value || "—"}</p>
      </div>
    )
  }

  const s = liveStudent
  const fullName = `${s.last_name}, ${s.first_name}${s.middle_name ? " " + s.middle_name : ""}`
  const birthDateFmt = s.birth_date
    ? new Date(s.birth_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null
  const guardianFullName = s.guardian_name
    || ([s.guardian_first_name, s.guardian_middle_name, s.guardian_last_name]
        .filter(Boolean).join(" ") || null)
  const isEnrolled = s.status === "Approved" || s.status === "Accepted"

  return (
    <div className="space-y-4">

      {/* ── Enrollment status badge ── */}
      <div className={`rounded-[20px] border px-5 py-4 flex items-center justify-between gap-3 ${
        isEnrolled ? "border-green-500/20 bg-green-500/5" : "border-amber-500/20 bg-amber-500/5"
      }`}>
        <div>
          <p className={`text-[8px] font-black uppercase tracking-[0.3em] ${textSub}`}>Enrollment Status</p>
          <p className={`text-base font-black uppercase mt-0.5 ${isEnrolled ? "text-green-400" : "text-amber-400"}`}>
            {s.status === "Approved" ? "Enrolled" : s.status}
          </p>
          {s.grade_level && (
            <p className={`text-[9px] font-bold mt-0.5 ${textSub}`}>
              Grade {s.grade_level} · {s.school_year}
            </p>
          )}
        </div>
        <GraduationCap size={22} className={isEnrolled ? "text-green-500" : "text-amber-500"} />
      </div>

      {/* ── OED Credentials module ── */}
      {showOedBanner && (s.oed_usn || s.oed_password) && (
        <div className={`rounded-[20px] border px-5 py-4 flex items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-500 ${
           dm ? "border-blue-500/30 bg-blue-500/10" : "border-blue-300 bg-blue-50"
        }`}>
          <div className="flex-1 w-full">
            <p className={`text-[8px] font-black uppercase tracking-[0.3em] ${textSub}`}>OED Exam Credentials</p>
            
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <div className="flex items-center justify-between">
                   <p className={`text-[7px] font-bold uppercase tracking-widest ${dm ? "text-blue-400" : "text-blue-700"}`}>USN / Username</p>
                   {s.oed_usn && (
                     <button
                       onClick={() => { navigator.clipboard.writeText(s.oed_usn!); toast.success("USN copied to clipboard", { duration: 1500 }) }}
                       className={`p-0.5 rounded-md transition-colors ${dm ? "text-blue-400 hover:bg-blue-500/20" : "text-blue-600 hover:bg-blue-200"}`}
                     >
                       <Copy size={11} />
                     </button>
                   )}
                 </div>
                 <div className={`px-4 py-2.5 rounded-xl font-mono text-sm font-bold tracking-widest shadow-inner ${dm ? "bg-slate-950 border border-blue-900/50 text-blue-100" : "bg-white border border-blue-200 text-slate-800"}`}>
                   {s.oed_usn || "NOT YET ASSIGNED"}
                 </div>
               </div>

               <div className="space-y-1.5 group">
                 <div className="flex items-center justify-between">
                   <p className={`text-[7px] font-bold uppercase tracking-widest ${dm ? "text-blue-400" : "text-blue-700"}`}>OED Password</p>
                   <div className="flex items-center gap-1.5">
                     {s.oed_password && (
                       <button
                         onClick={() => { navigator.clipboard.writeText(s.oed_password!); toast.success("Password copied to clipboard", { duration: 1500 }) }}
                         className={`p-0.5 rounded-md transition-colors ${dm ? "text-blue-400 hover:bg-blue-500/20" : "text-blue-600 hover:bg-blue-200"}`}
                       >
                         <Copy size={11} />
                       </button>
                     )}
                     <button onClick={() => setShowOedPwd(!showOedPwd)} className={`p-0.5 rounded-md transition-colors ${dm ? "text-blue-400 hover:bg-blue-500/20" : "text-blue-600 hover:bg-blue-200"}`}>
                        {showOedPwd ? <EyeOff size={11} /> : <Eye size={11} />}
                     </button>
                   </div>
                 </div>
                 <div className={`px-4 py-2.5 rounded-xl font-mono text-sm font-bold tracking-widest shadow-inner relative flex items-center ${dm ? "bg-slate-950 border border-blue-900/50 text-blue-100" : "bg-white border border-blue-200 text-slate-800"}`}>
                   {s.oed_password ? (showOedPwd ? s.oed_password : "••••••••••••") : "NOT YET ASSIGNED"}
                 </div>
               </div>
            </div>
          </div>
          <div className={`w-12 h-12 rounded-full hidden sm:flex shrink-0 items-center justify-center ${dm ? "bg-blue-500/20" : "bg-blue-200"}`}>
             <Laptop size={20} className={dm ? "text-blue-400" : "text-blue-700"} />
          </div>
        </div>
      )}

      {/* ── Personal Information ── */}
      <Group
        icon={<User size={14} />}
        title="Personal Information"
        group="personal"
        editState={editPersonal}
        onStartEdit={() => startEdit("personal")}
        onCancel={() => cancelEdit("personal")}
        onSave={() => saveGroup("personal")}
      >
        {editPersonal ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <EditableField label="First Name" value={s.first_name} fieldKey="first_name" editState={editPersonal} onChange={(k, v) => handleFieldChange("personal", k, v)} dm={dm} />
              <EditableField label="Middle Name" value={s.middle_name} fieldKey="middle_name" editState={editPersonal} onChange={(k, v) => handleFieldChange("personal", k, v)} dm={dm} />
              <EditableField label="Last Name" value={s.last_name} fieldKey="last_name" editState={editPersonal} onChange={(k, v) => handleFieldChange("personal", k, v)} dm={dm} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <EditableField label="Gender" value={s.gender} fieldKey="gender" editState={editPersonal} onChange={(k, v) => handleFieldChange("personal", k, v)} dm={dm} type="select" options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} />
              <EditableField label="Age" value={s.age} fieldKey="age" editState={editPersonal} onChange={(k, v) => handleFieldChange("personal", k, v)} dm={dm} type="number" />
              <EditableField label="Birthdate" value={birthDateFmt} fieldKey="birth_date" editState={editPersonal} onChange={(k, v) => handleFieldChange("personal", k, v)} dm={dm} type="date" />
              <EditableField label="Civil Status" value={s.civil_status} fieldKey="civil_status" editState={editPersonal} onChange={(k, v) => handleFieldChange("personal", k, v)} dm={dm} type="select" options={[{ value: "Single", label: "Single" }, { value: "Married", label: "Married" }]} />
              <EditableField label="Nationality" value={s.nationality} fieldKey="nationality" editState={editPersonal} onChange={(k, v) => handleFieldChange("personal", k, v)} dm={dm} />
              <EditableField label="Religion" value={s.religion} fieldKey="religion" editState={editPersonal} onChange={(k, v) => handleFieldChange("personal", k, v)} dm={dm} />
            </div>
            <EditableField label="Address" value={s.address} fieldKey="address" editState={editPersonal} onChange={(k, v) => handleFieldChange("personal", k, v)} dm={dm} type="textarea" />
            <EditableField label="Email" value={s.email} fieldKey="email" editState={editPersonal} onChange={(k, v) => handleFieldChange("personal", k, v)} dm={dm} />
          </>
        ) : (
          <>
            <Field label="Full Name" value={fullName} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Gender" value={s.gender} />
              <Field label="Age" value={s.age} />
              <Field label="Birthdate" value={birthDateFmt} />
              <Field label="Civil Status" value={s.civil_status} />
              <Field label="Nationality" value={s.nationality} />
              <Field label="Religion" value={s.religion} />
            </div>
          </>
        )}
      </Group>

      {/* ── Contact Information ── */}
      <Group
        icon={<Phone size={14} />}
        title="Contact Information"
        group="contact"
        editState={editContact}
        onStartEdit={() => startEdit("contact")}
        onCancel={() => cancelEdit("contact")}
        onSave={() => saveGroup("contact")}
      >
        {editContact ? (
          <>
            <EditableField label="Address" value={s.address} fieldKey="address" editState={editContact} onChange={(k, v) => handleFieldChange("contact", k, v)} dm={dm} type="textarea" />
            <div className="grid grid-cols-2 gap-2">
              <EditableField label="Phone No." value={s.phone} fieldKey="phone" editState={editContact} onChange={(k, v) => handleFieldChange("contact", k, v)} dm={dm} />
              <EditableField label="Email" value={s.email} fieldKey="email" editState={editContact} onChange={(k, v) => handleFieldChange("contact", k, v)} dm={dm} />
            </div>
          </>
        ) : (
          <>
            <Field label="Address" value={s.address} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Phone No." value={s.phone} />
              <Field label="Email" value={s.email} />
            </div>
          </>
        )}
      </Group>

      {/* ── Guardian Information ── */}
      <Group
        icon={<Heart size={14} />}
        title="Guardian / Parent"
        group="guardian"
        editState={editGuardian}
        onStartEdit={() => startEdit("guardian")}
        onCancel={() => cancelEdit("guardian")}
        onSave={() => saveGroup("guardian")}
      >
        {editGuardian ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <EditableField label="First Name" value={s.guardian_first_name} fieldKey="guardian_first_name" editState={editGuardian} onChange={(k, v) => handleFieldChange("guardian", k, v)} dm={dm} />
              <EditableField label="Middle Name" value={s.guardian_middle_name} fieldKey="guardian_middle_name" editState={editGuardian} onChange={(k, v) => handleFieldChange("guardian", k, v)} dm={dm} />
              <EditableField label="Last Name" value={s.guardian_last_name} fieldKey="guardian_last_name" editState={editGuardian} onChange={(k, v) => handleFieldChange("guardian", k, v)} dm={dm} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <EditableField label="Contact No." value={s.guardian_phone} fieldKey="guardian_phone" editState={editGuardian} onChange={(k, v) => handleFieldChange("guardian", k, v)} dm={dm} />
              <EditableField label="Email" value={s.guardian_email} fieldKey="guardian_email" editState={editGuardian} onChange={(k, v) => handleFieldChange("guardian", k, v)} dm={dm} />
            </div>
          </>
        ) : (
          <>
            <Field label="Guardian Name" value={guardianFullName} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Contact No." value={s.guardian_phone} />
              <Field label="Email" value={s.guardian_email} />
            </div>
          </>
        )}
      </Group>

      {/* ── Academic Information ── */}
      <Group
        icon={<BookOpen size={14} />}
        title="Academic Information"
        group="academic"
        editState={editAcademic}
        onStartEdit={() => startEdit("academic")}
        onCancel={() => cancelEdit("academic")}
        onSave={() => saveGroup("academic")}
      >
        {editAcademic ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <EditableField label="LRN" value={s.lrn} fieldKey="lrn" editState={editAcademic} onChange={(k, v) => handleFieldChange("academic", k, v)} dm={dm} />
              <Field label="Grade Level" value={s.grade_level ? `Grade ${s.grade_level}` : null} />
              <Field label="Strand" value={s.strand} />
              <Field label="Section" value={s.section || "Unassigned"} />
              <EditableField label="Student Type" value={s.student_category} fieldKey="student_category" editState={editAcademic} onChange={(k, v) => handleFieldChange("academic", k, v)} dm={dm} type="select" options={[{ value: "JHS Graduate", label: "JHS Graduate" }, { value: "ALS Passer", label: "ALS Passer" }, { value: "Transferee", label: "Transferee" }]} />
              <EditableField label="School Type" value={s.school_type} fieldKey="school_type" editState={editAcademic} onChange={(k, v) => handleFieldChange("academic", k, v)} dm={dm} type="select" options={[{ value: "Public", label: "Public" }, { value: "Private", label: "Private" }]} />
              <EditableField label="Preferred Shift" value={s.preferred_shift} fieldKey="preferred_shift" editState={editAcademic} onChange={(k, v) => handleFieldChange("academic", k, v)} dm={dm} type="select" options={[{ value: "Morning", label: "Morning" }, { value: "Afternoon", label: "Afternoon" }]} />
              <EditableField label="Preferred Mode" value={s.preferred_modality} fieldKey="preferred_modality" editState={editAcademic} onChange={(k, v) => handleFieldChange("academic", k, v)} dm={dm} type="select" options={[{ value: "Face-to-Face", label: "Face-to-Face" }, { value: "Online", label: "Online" }, { value: "Blended", label: "Blended" }]} />
              <EditableField label="GWA (Grade 10)" value={s.gwa_grade_10} fieldKey="gwa_grade_10" editState={editAcademic} onChange={(k, v) => handleFieldChange("academic", k, v)} dm={dm} type="number" />
              <EditableField label="JHS Completed" value={s.year_completed_jhs} fieldKey="year_completed_jhs" editState={editAcademic} onChange={(k, v) => handleFieldChange("academic", k, v)} dm={dm} />
            </div>
            <EditableField label="Last School Attended" value={s.last_school_attended} fieldKey="last_school_attended" editState={editAcademic} onChange={(k, v) => handleFieldChange("academic", k, v)} dm={dm} />
            <EditableField label="Last School Address" value={s.last_school_address} fieldKey="last_school_address" editState={editAcademic} onChange={(k, v) => handleFieldChange("academic", k, v)} dm={dm} />
            <div className="grid grid-cols-2 gap-2">
              <EditableField label="Facebook Username" value={(s as any).facebook_user} fieldKey="facebook_user" editState={editAcademic} onChange={(k, v) => handleFieldChange("academic", k, v)} dm={dm} />
              <EditableField label="Facebook Link" value={(s as any).facebook_link} fieldKey="facebook_link" editState={editAcademic} onChange={(k, v) => handleFieldChange("academic", k, v)} dm={dm} />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="LRN" value={s.lrn} />
              <Field label="Grade Level" value={s.grade_level ? `Grade ${s.grade_level}` : null} />
              <Field label="Strand" value={s.strand} />
              <Field label="Section" value={s.section || "Unassigned"} />
              <Field label="Student Type" value={s.student_category} />
              <Field label="School Type" value={s.school_type} />
              <Field label="Preferred Shift" value={s.preferred_shift} />
              <Field label="Preferred Mode" value={s.preferred_modality} />
              {(s.gwa_grade_10 != null && s.gwa_grade_10 !== 0) && (
                <Field label="GWA (Grade 10)" value={String(s.gwa_grade_10)} />
              )}
              {s.year_completed_jhs && (
                <Field label="JHS Completed" value={s.year_completed_jhs} />
              )}
            </div>
            {s.last_school_attended && (
              <Field label="Last School Attended" value={s.last_school_attended} />
            )}
            {s.last_school_address && (
              <Field label="Last School Address" value={s.last_school_address} />
            )}
          </>
        )}
      </Group>

    </div>
  )
}
