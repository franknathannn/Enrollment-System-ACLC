// src/app/admin/applicants/components/DossierSections.tsx

import { memo, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  User, Mail, Phone, MapPin, ShieldCheck, GraduationCap, Fingerprint,
  Check, ChevronDown, Facebook, Monitor, Clock, Calendar, School, AlertTriangle,
} from "lucide-react"
import { AnimatedNumber } from "../../dashboard/components/primitives"
import { InfoBlock, FieldRow, DropdownField, SectionTitle, getInputClass, getLabelClass, SchoolSearchPicker } from "./DossierPrimitives"

// ── Inline validators (mirrors enrollmentValidators) ──────────────────────
function validateGWA(val: string): string | undefined {
  if (!val || val.trim() === "") return undefined
  const str = val.trim()
  if (!/^\d{1,3}(\.\d{0,2})?$/.test(str)) return "Format: NN.NN (max 2 decimals)"
  const num = parseFloat(str)
  if (isNaN(num)) return "Invalid GWA"
  if (num < 65)   return "Min 65.00"
  if (num > 100)  return "Max 100.00"
  return undefined
}

function validateSchoolYear(val: string): string | undefined {
  if (!val) return undefined
  if (!/^\d{4}-\d{4}$/.test(val)) return "Format: YYYY-YYYY"
  const [start, end] = val.split("-").map(Number)
  if (end !== start + 1) return "End year must be start + 1"
  return undefined
}

function validateEmail(val: string): string | undefined {
  if (!val) return undefined
  if (val.length > 50) return "Max 50 characters"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Invalid email format"
  return undefined
}

function validatePhone(val: string): string | undefined {
  if (!val) return undefined
  if (!/^09\d{9}$/.test(val)) return "Must start with 09, 11 digits"
  return undefined
}

function validateFacebookLink(val: string): string | undefined {
  if (!val) return undefined
  if (!/^https?:\/\/(www\.)?facebook\.com\/.+/i.test(val)) return "Must be a valid facebook.com URL"
  return undefined
}

// ── Inline error pill ─────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 mt-1">
      <AlertTriangle size={9} /> {msg}
    </p>
  )
}

interface DropdownState {
  genderOpen: boolean;      setGenderOpen:     (v: boolean) => void
  strandOpen: boolean;      setStrandOpen:     (v: boolean) => void
  sectionOpen: boolean;     setSectionOpen:    (v: boolean) => void
  modalityOpen: boolean;    setModalityOpen:   (v: boolean) => void
  shiftOpen: boolean;       setShiftOpen:      (v: boolean) => void
  schoolTypeOpen: boolean;  setSchoolTypeOpen: (v: boolean) => void
}

interface DossierSectionsProps {
  student: any
  formData: any
  setFormData: (fn: (prev: any) => any) => void
  isEditing: boolean
  isDarkMode: boolean
  sections: any[]
  onChange: (field: string, value: string) => void
  dropdowns: DropdownState
}

export const DossierSections = memo(function DossierSections({
  student, formData, setFormData, isEditing, isDarkMode, sections, onChange, dropdowns,
}: DossierSectionsProps) {
  const {
    genderOpen, setGenderOpen,
    strandOpen, setStrandOpen,
    sectionOpen, setSectionOpen,
    modalityOpen, setModalityOpen,
    shiftOpen, setShiftOpen,
    schoolTypeOpen, setSchoolTypeOpen,
  } = dropdowns

  const inputClass = getInputClass(isDarkMode)
  const labelClass = getLabelClass(isDarkMode)

  // live per-field validation errors only shown while editing
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({})

  const handleValidatedChange = (
    field: string,
    value: string,
    validator?: (v: string) => string | undefined
  ) => {
    onChange(field, value)
    if (validator) setFieldErrors((prev) => ({ ...prev, [field]: validator(value) }))
  }

  const filteredSections = useMemo(
    () => sections.filter((s: any) => {
      if (s.strand !== formData.strand) return false
      // Only show sections that match the student's grade level
      const studentGrade = formData.grade_level || "11"
      if (s.grade_level && s.grade_level !== studentGrade) return false
      return true
    }),
    [sections, formData.strand, formData.grade_level]
  )
  const canAssignSection = student.status === "Accepted" || student.status === "Approved"
  const isFaceToFace     = formData.preferred_modality === "Face to Face"

  return (
    <>
      {/* ── GRID ROW 1: Personal + Connectivity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-20">

        {/* I. STUDENT INFORMATION */}
        <div className="space-y-8 md:space-y-10 min-w-0">
          <SectionTitle icon={<User size={16} />} title="I. Student Information" isDarkMode={isDarkMode}
            colorClass={isDarkMode ? "text-blue-400" : "text-blue-600"} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-6 min-w-0">

            {/* Name fields — max 30 chars, title-case, no numbers */}
            {(["first_name", "middle_name", "last_name"] as const).map((field) => (
              <div key={field} className="space-y-1.5 min-w-0 overflow-hidden">
                {isEditing ? (
                  <>
                    <div className="flex justify-between items-center">
                      <p className={labelClass}>{field.replace(/_/g, " ")}</p>
                      <span className="text-[9px] text-slate-500">{(formData[field] || "").length}/30</span>
                    </div>
                    <Input
                      value={formData[field] || ""}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[0-9]/g, "")
                        if (val.length > 0) val = val.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
                        onChange(field, val)
                      }}
                      maxLength={30}
                      className={inputClass}
                    />
                  </>
                ) : (
                  <InfoBlock label={field.replace(/_/g, " ")} value={formData[field] || "—"} isDarkMode={isDarkMode} />
                )}
              </div>
            ))}

            {/* Other plain text fields */}
            {(["religion", "nationality", "civil_status", "age", "birth_date", "school_year"] as const).map((field) => (
              <div key={field} className="space-y-1.5 min-w-0 overflow-hidden">
                {isEditing ? (
                  <><p className={labelClass}>{field.replace(/_/g, " ")}</p>
                  <Input value={formData[field] || ""} onChange={(e) => onChange(field, e.target.value)} className={inputClass} /></>
                ) : (
                  <InfoBlock
                    label={field.replace(/_/g, " ")}
                    value={field === "birth_date" && formData[field]
                      ? `${formData[field]}\n${new Date(formData[field]).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                      : formData[field] || "—"}
                    isDarkMode={isDarkMode}
                  />
                )}
              </div>
            ))}

            {/* Gender dropdown */}
            <div className="space-y-1.5 min-w-0">
              {isEditing ? (
                <DropdownField label="Gender" field="gender" options={["Male", "Female"]}
                  formData={formData} isDarkMode={isDarkMode}
                  isOpen={genderOpen} onToggle={() => setGenderOpen(!genderOpen)}
                  onSelect={(v) => { onChange("gender", v); setGenderOpen(false) }} />
              ) : (
                <InfoBlock label="Gender" value={formData.gender || "—"} isDarkMode={isDarkMode} animate={false} />
              )}
            </div>

            <div className="sm:col-span-2 min-w-0 overflow-hidden">
              <InfoBlock label="Full Legal Name"
                value={`${formData.first_name || ""} ${formData.middle_name || ""} ${formData.last_name || ""}`.trim()}
                isDarkMode={isDarkMode} />
            </div>
          </div>
        </div>

        {/* II. STUDENT HOTLINES */}
        <div className="space-y-8 md:space-y-10 min-w-0">
          <SectionTitle icon={<Mail size={16} />} title="II. Student Hotlines" isDarkMode={isDarkMode}
            colorClass={isDarkMode ? "text-indigo-400" : "text-indigo-600"} />
          <div className="space-y-8 min-w-0">

            {/* Email — max 50, validated */}
            <div className="space-y-1.5 min-w-0 overflow-hidden">
              {isEditing ? (
                <>
                  <div className="flex justify-between items-center">
                    <p className={labelClass}>Student Email</p>
                    <span className="text-[9px] text-slate-500">{(formData.email || "").length}/50</span>
                  </div>
                  <Input
                    value={formData.email || ""}
                    onChange={(e) => handleValidatedChange("email", e.target.value, validateEmail)}
                    className={inputClass}
                    maxLength={50}
                    type="email"
                    placeholder="student@gmail.com"
                  />
                  <FieldError msg={fieldErrors.email} />
                </>
              ) : (
                <InfoBlock label="Student Email" value={formData.email || "—"} icon={<Mail size={12} />} isDarkMode={isDarkMode} />
              )}
            </div>

            {/* Phone — digits only, validated */}
            <div className="space-y-1.5 min-w-0 overflow-hidden">
              {isEditing ? (
                <>
                  <p className={labelClass}>Contact Number</p>
                  <Input
                    value={formData.phone || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 11)
                      handleValidatedChange("phone", val, validatePhone)
                    }}
                    className={inputClass}
                    maxLength={11}
                    inputMode="numeric"
                    placeholder="09XX XXX XXXX"
                  />
                  <FieldError msg={fieldErrors.phone} />
                </>
              ) : (
                <InfoBlock label="Contact Number" value={formData.phone || "—"} icon={<Phone size={12} />} isDarkMode={isDarkMode} />
              )}
            </div>

            {/* Home Address — max 100, char counter */}
            <div className="space-y-1.5 min-w-0 overflow-hidden">
              {isEditing ? (
                <>
                  <div className="flex justify-between items-center">
                    <p className={labelClass}>Home Address</p>
                    <span className="text-[9px] text-slate-500">{(formData.address || "").length}/100</span>
                  </div>
                  <Input
                    value={formData.address || ""}
                    onChange={(e) => onChange("address", e.target.value)}
                    className={inputClass}
                    maxLength={100}
                  />
                </>
              ) : (
                <InfoBlock label="Home Address" value={formData.address || "—"} icon={<MapPin size={12} />} isDarkMode={isDarkMode} />
              )}
            </div>

            <div className={`p-5 rounded-[24px] border shadow-inner transition-colors duration-500 min-w-0 overflow-hidden ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <Fingerprint size={12} className={isDarkMode ? "text-slate-500" : "text-slate-400"} />
                <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Database ID</p>
              </div>
              <p className={`text-[11px] font-bold truncate ${isDarkMode ? "text-slate-300" : "text-slate-900"}`}>{student.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── GRID ROW 2: Guardian + Academic ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-20">

        {/* III. GUARDIAN */}
        <div className="space-y-8 md:space-y-10 min-w-0">
          <SectionTitle icon={<ShieldCheck size={16} />} title="III. Guardian Information" isDarkMode={isDarkMode}
            colorClass={isDarkMode ? "text-emerald-400" : "text-emerald-600"} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 min-w-0">

            {/* Guardian names — max 30, title-case */}
            {(["guardian_first_name", "guardian_middle_name", "guardian_last_name"] as const).map((field) => (
              <div key={field} className="space-y-1.5 min-w-0 overflow-hidden">
                {isEditing ? (
                  <>
                    <div className="flex justify-between items-center">
                      <p className={labelClass}>{field.replace(/_/g, " ")}</p>
                      <span className="text-[9px] text-slate-500">{(formData[field] || "").length}/30</span>
                    </div>
                    <Input
                      value={formData[field] || ""}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[0-9]/g, "")
                        if (val.length > 0) val = val.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
                        onChange(field, val)
                      }}
                      maxLength={30}
                      className={inputClass}
                    />
                  </>
                ) : (
                  <InfoBlock label={field.replace(/_/g, " ")} value={formData[field] || "—"} isDarkMode={isDarkMode} />
                )}
              </div>
            ))}

            {/* Guardian phone — digits only, validated */}
            <div className="space-y-1.5 min-w-0 overflow-hidden">
              {isEditing ? (
                <>
                  <p className={labelClass}>Guardian Contact Number</p>
                  <Input
                    value={formData.guardian_phone || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 11)
                      handleValidatedChange("guardian_phone", val, validatePhone)
                    }}
                    className={inputClass}
                    maxLength={11}
                    inputMode="numeric"
                    placeholder="09XX XXX XXXX"
                  />
                  <FieldError msg={fieldErrors.guardian_phone} />
                </>
              ) : (
                <InfoBlock label="Guardian Contact Number" value={formData.guardian_phone || "—"} isDarkMode={isDarkMode} />
              )}
            </div>
          </div>
        </div>

        {/* IV. ACADEMIC BACKGROUND */}
        <div className="space-y-8 md:space-y-10 min-w-0">
          <SectionTitle icon={<GraduationCap size={16} />} title="IV. Academic Background" isDarkMode={isDarkMode}
            colorClass={isDarkMode ? "text-orange-400" : "text-orange-600"} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0">

            {/* Previous school name */}
            <div className={`col-span-1 sm:col-span-2 p-6 rounded-[32px] border shadow-sm transition-colors duration-500 min-w-0 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 italic ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Previous School</p>
              {isEditing
                ? <SchoolSearchPicker
                    value={formData.last_school_attended || ""}
                    onChange={(val) => onChange("last_school_attended", val)}
                    isDarkMode={isDarkMode}
                  />
                : <p className={`font-black uppercase text-sm md:text-base leading-tight break-words w-full min-w-0 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>{formData.last_school_attended || "Not Disclosed"}</p>
              }
            </div>

            {/* GWA — validated 65–100, max 2 decimals, digit-stripper on input */}
            <div className={`p-6 rounded-[32px] border text-center shadow-sm transition-colors duration-500 min-w-0 overflow-hidden ${isDarkMode ? "bg-blue-900/10 border-blue-900/40" : "bg-blue-50 border-blue-200"}`}>
              <p className={`text-[10px] font-black uppercase mb-2 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>GWA</p>
              {isEditing ? (
                <>
                  <Input
                    value={formData.gwa_grade_10 || ""}
                    onChange={(e) => {
                      let v = e.target.value.replace(/[^0-9.]/g, "")
                      const dot = v.indexOf(".")
                      if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "").slice(0, 2)
                      handleValidatedChange("gwa_grade_10", v, validateGWA)
                    }}
                    className={`${inputClass} text-center`}
                    inputMode="decimal"
                    maxLength={6}
                    placeholder="88.50"
                  />
                  <FieldError msg={fieldErrors.gwa_grade_10} />
                  <p className={`text-[9px] mt-1 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>65.00 – 100.00</p>
                </>
              ) : (
                <p className={`text-3xl font-black italic leading-none ${isDarkMode ? "text-blue-400" : "text-blue-700"}`}>
                  {formData.gwa_grade_10 ? <AnimatedNumber value={parseFloat(formData.gwa_grade_10)} /> : "—"}
                </p>
              )}
            </div>

            {/* Strand */}
            <div className={`p-6 rounded-[32px] border text-center shadow-sm transition-colors duration-500 min-w-0 ${isDarkMode ? "bg-orange-900/10 border-orange-900/40" : "bg-orange-50 border-orange-200"}`}>
              <p className={`text-[10px] font-black uppercase mb-2 ${isDarkMode ? "text-orange-400" : "text-orange-600"}`}>Strand</p>
              {isEditing ? (
                <DropdownField label="Strand" field="strand" options={["ICT", "GAS"]}
                  formData={formData} isDarkMode={isDarkMode}
                  isOpen={strandOpen} onToggle={() => setStrandOpen(!strandOpen)}
                  onSelect={(v) => { onChange("strand", v); setStrandOpen(false) }} />
              ) : (
                <p className={`text-2xl md:text-3xl font-black leading-none ${isDarkMode ? "text-orange-400" : "text-orange-700"}`}>{formData.strand}</p>
              )}
            </div>

            {/* Assigned Section */}
            <div className={`col-span-1 sm:col-span-2 p-6 rounded-[32px] border text-center shadow-sm transition-colors duration-500 min-w-0 ${isDarkMode ? "bg-purple-900/10 border-purple-900/40" : "bg-purple-50 border-purple-200"}`}>
              <p className={`text-[10px] font-black uppercase mb-2 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`}>Assigned Section</p>
              {isEditing && canAssignSection ? (
                <div className="relative">
                  <Button onClick={() => setSectionOpen(!sectionOpen)} className={`w-full justify-between ${inputClass} px-3`} variant="ghost">
                    {formData.section || "Unassigned"}
                    <ChevronDown size={14} className={`transition-transform duration-300 ${sectionOpen ? "rotate-180" : ""}`} />
                  </Button>
                  {sectionOpen && (
                    <div className={`absolute top-full left-0 w-full mt-2 rounded-xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 max-h-[200px] overflow-y-auto ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-100"}`}>
                      <div className="p-1 space-y-1">
                        <button onClick={() => { setFormData((p: any) => ({ ...p, section: "Unassigned", section_id: null })); setSectionOpen(false) }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors text-left ${!formData.section || formData.section === "Unassigned" ? isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600" : isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
                          Unassigned {(!formData.section || formData.section === "Unassigned") && <Check size={12} />}
                        </button>
                        {filteredSections.map((sec: any) => (
                          <button key={sec.id} onClick={() => { setFormData((p: any) => ({ ...p, section: sec.section_name, section_id: sec.id })); setSectionOpen(false) }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors text-left ${formData.section === sec.section_name ? isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600" : isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
                            {sec.section_name} {formData.section === sec.section_name && <Check size={12} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className={`text-xl md:text-2xl font-black leading-none ${isDarkMode ? "text-purple-400" : "text-purple-700"}`}>{formData.section || "Unassigned"}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── V. ENROLLMENT PREFERENCES ── */}
      <div className="space-y-8 md:space-y-10 min-w-0">
        <SectionTitle icon={<Monitor size={16} />} title="V. Enrollment Preferences" isDarkMode={isDarkMode}
          colorClass={isDarkMode ? "text-cyan-400" : "text-cyan-600"} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-6 min-w-0">

          {/* School Type */}
          <div className="space-y-1.5 min-w-0">
            {isEditing ? (
              <DropdownField label="School Type" field="school_type" options={["Public", "Private"]}
                formData={formData} isDarkMode={isDarkMode}
                isOpen={schoolTypeOpen} onToggle={() => setSchoolTypeOpen(!schoolTypeOpen)}
                onSelect={(v) => { onChange("school_type", v); setSchoolTypeOpen(false) }} />
            ) : (
              <InfoBlock label="School Type" value={formData.school_type || "—"} isDarkMode={isDarkMode} icon={<School size={12} />} />
            )}
          </div>

          {/* Year Completed JHS — YYYY-YYYY validated */}
          <div className="space-y-1.5 min-w-0 overflow-hidden">
            {isEditing ? (
              <>
                <p className={labelClass}>Year Completed JHS</p>
                <Input
                  value={formData.year_completed_jhs || ""}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9-]/g, "")
                    if (val.length === 4 && !val.includes("-")) val += "-"
                    handleValidatedChange("year_completed_jhs", val, validateSchoolYear)
                  }}
                  placeholder="YYYY-YYYY" maxLength={9} className={inputClass}
                />
                <FieldError msg={fieldErrors.year_completed_jhs} />
              </>
            ) : (
              <InfoBlock label="Year Completed JHS" value={formData.year_completed_jhs || "—"} isDarkMode={isDarkMode} icon={<Calendar size={12} />} />
            )}
          </div>

          {/* Preferred Modality */}
          <div className="space-y-1.5 min-w-0">
            {isEditing ? (
              <DropdownField label="Preferred Modality" field="preferred_modality" options={["Face to Face", "Online"]}
                formData={formData} isDarkMode={isDarkMode}
                isOpen={modalityOpen} onToggle={() => setModalityOpen(!modalityOpen)}
                onSelect={(v) => { onChange("preferred_modality", v); setModalityOpen(false) }} />
            ) : (
              <InfoBlock label="Preferred Modality" value={formData.preferred_modality || "—"} isDarkMode={isDarkMode} icon={<Monitor size={12} />} />
            )}
          </div>

          {/* Preferred Shift — only when Face to Face */}
          {(isFaceToFace || formData.preferred_shift) && (
            <div className="space-y-1.5 min-w-0">
              {isEditing && isFaceToFace ? (
                <DropdownField label="Preferred Shift" field="preferred_shift" options={["AM", "PM"]}
                  formData={formData} isDarkMode={isDarkMode}
                  isOpen={shiftOpen} onToggle={() => setShiftOpen(!shiftOpen)}
                  onSelect={(v) => { onChange("preferred_shift", v); setShiftOpen(false) }} />
              ) : (
                <InfoBlock label="Preferred Shift" value={formData.preferred_shift || "—"} isDarkMode={isDarkMode} icon={<Clock size={12} />} />
              )}
            </div>
          )}

          {/* Previous School Address — max 100, char counter, full width */}
          <div className="sm:col-span-2 space-y-1.5 min-w-0 overflow-hidden">
            {isEditing ? (
              <>
                <div className="flex justify-between items-center">
                  <p className={labelClass}>Previous School Address</p>
                  <span className="text-[9px] text-slate-500">{(formData.last_school_address || "").length}/100</span>
                </div>
                <Input value={formData.last_school_address || ""} onChange={(e) => onChange("last_school_address", e.target.value)}
                  maxLength={100} placeholder="Street, Barangay, City, Province" className={inputClass} />
              </>
            ) : (
              <InfoBlock label="Previous School Address" value={formData.last_school_address || "—"} isDarkMode={isDarkMode} icon={<MapPin size={12} />} />
            )}
          </div>

          {/* Facebook Username — max 50, CHANGED */}
          <div className="space-y-1.5 min-w-0 overflow-hidden">
            {isEditing ? (
              <>
                <div className="flex justify-between items-center">
                  <p className={labelClass}>Facebook Username</p>
                  <span className="text-[9px] text-slate-500">{(formData.facebook_user || "").length}/50</span>
                </div>
                <Input value={formData.facebook_user || ""} onChange={(e) => onChange("facebook_user", e.target.value)}
                  placeholder="Juan Dela Cruz" className={inputClass} maxLength={50} />
              </>
            ) : (
              <InfoBlock label="Facebook Username" value={formData.facebook_user || "—"} isDarkMode={isDarkMode} icon={<Facebook size={12} />} />
            )}
          </div>

          {/* Facebook Link — max 80, validated, CHANGED */}
          <div className="space-y-1.5 min-w-0 overflow-hidden">
            {isEditing ? (
              <>
                <div className="flex justify-between items-center">
                  <p className={labelClass}>Facebook Profile Link</p>
                  <span className="text-[9px] text-slate-500">{(formData.facebook_link || "").length}/80</span>
                </div>
                <Input
                  value={formData.facebook_link || ""}
                  onChange={(e) => handleValidatedChange("facebook_link", e.target.value, validateFacebookLink)}
                  placeholder="https://facebook.com/yourprofile"
                  className={inputClass}
                  maxLength={80}
                />
                <FieldError msg={fieldErrors.facebook_link} />
              </>
            ) : (
              <InfoBlock label="Facebook Profile Link" value={formData.facebook_link || "—"} isDarkMode={isDarkMode} icon={<Facebook size={12} />} />
            )}
          </div>

        </div>
      </div>
    </>
  )
})
