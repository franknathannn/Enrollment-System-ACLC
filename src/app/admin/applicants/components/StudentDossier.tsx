// src/app/admin/applicants/components/StudentDossier.tsx

import { memo, useState, useRef, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/admin-client"

import { DossierHeader }   from "./DossierHeader.tsx"
import { DossierSections } from "./DossierSections"
import { DossierDocuments } from "./DossierDocuments"

// ── Fields that trigger hasChanges detection ───────────────────────────────
const WATCHED_FIELDS = [
  "first_name", "middle_name", "last_name", "gender", "religion", "nationality",
  "school_year", "civil_status", "age", "birth_date", "email", "phone", "address",
  "guardian_first_name", "guardian_middle_name", "guardian_last_name", "guardian_phone", "guardian_email",
  "last_school_attended", "gwa_grade_10", "strand", "section",
  "school_type", "year_completed_jhs", "last_school_address",
  "facebook_user", "facebook_link", "preferred_modality", "preferred_shift",
] as const




export const StudentDossier = memo(function StudentDossier({
  student,
  onOpenFile,
  isDarkMode,
  onClose,
  onUpdate,
  sections = [],
  onStatusChange,
  onDecline
}: {
  student: any
  onOpenFile: (url: string, label: string, allDocs?: { url: string; label: string }[]) => void
  isDarkMode: boolean
  onClose?: () => void
  onUpdate?: (id: string, data: any) => Promise<void | boolean>
  sections?: any[]
  onStatusChange?: (id: string, status: string) => void
  onDecline?: (student: any) => void
}) {
  const [formData, setFormData]       = useState(student)
  const [isEditing, setIsEditing]     = useState(false)
  const [isSaving, setIsSaving]       = useState(false)
  const [genderOpen, setGenderOpen]   = useState(false)
  const [strandOpen, setStrandOpen]   = useState(false)
  const [sectionOpen, setSectionOpen] = useState(false)
  const [modalityOpen, setModalityOpen]     = useState(false)
  const [shiftOpen, setShiftOpen]           = useState(false)
  const [schoolTypeOpen, setSchoolTypeOpen] = useState(false)

  const fileInputRef    = useRef<HTMLInputElement>(null)
  const docInputRef     = useRef<HTMLInputElement>(null)
  const [activeDocField, setActiveDocField] = useState<string | null>(null)

  useEffect(() => { setFormData(student) }, [student])

  const isJHS = student.student_category?.toLowerCase().includes("jhs") ||
                student.student_category === "Standard" ||
                student.student_category === "JHS Graduate"

  const hasChanges = useMemo(() => {
    if (!student || !formData) return false
    if (formData._file) return true
    return WATCHED_FIELDS.some((f) => (student[f] ?? "") !== (formData[f] ?? ""))
  }, [formData, student])

  const isValid = useMemo(() => {
    if (!formData) return false
    if (!formData.first_name?.trim() || !formData.last_name?.trim()) return false
    if (!formData.gender || !formData.strand) return false
    if (!formData.profile_picture && !formData.two_by_two_url && !formData.profile_2x2_url && !formData._file) return false
    return true
  }, [formData])

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => {
      const next = { ...prev, [field]: value }
      if (field === "strand") {
        next.section    = value !== student.strand ? "Unassigned" : student.section
        next.section_id = value !== student.strand ? null         : student.section_id
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!onUpdate) return
    setIsSaving(true)
    try {
      await onUpdate(student.id, formData)
      setIsEditing(false)
      toast.success("Profile Updated Successfully")
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageClick = () => {
    if (isEditing) {
      fileInputRef.current?.click()
    } else {
      const url = student.profile_picture || student.two_by_two_url || student.profile_2x2_url
      if (url) onOpenFile(url, `${student.last_name}_2X2_PICTURE`.toUpperCase(), getAllDocs())
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev: any) => ({ ...prev, profile_picture: URL.createObjectURL(file), _file: file }))
      toast.info("Image selected. Save to apply changes.")
    }
  }

  const handleDocClick = (field: string) => {
    if (isEditing && docInputRef.current) {
      setActiveDocField(field)
      docInputRef.current.click()
    }
  }

  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeDocField) return
    const toastId = toast.loading("Uploading document...")
    try {
      const ext      = file.name.split(".").pop()
      const fileName = `${student.lrn}_${activeDocField}_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from("enrollment-docs").upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from("enrollment-docs").getPublicUrl(fileName)
      setFormData((prev: any) => ({ ...prev, [activeDocField]: publicUrl }))
      toast.success("Document updated. Save to apply.", { id: toastId })
    } catch (err: any) {
      toast.error("Upload failed: " + err.message, { id: toastId })
    }
  }

  const getAllDocs = (): { url: string; label: string }[] => {
    const docs: { url: string; label: string }[] = []
    const img = student.profile_picture || student.two_by_two_url || student.profile_2x2_url
    if (img) docs.push({ url: img, label: `${student.last_name}_2X2_PICTURE`.toUpperCase() })
    if (student.birth_certificate_url) docs.push({ url: student.birth_certificate_url, label: `${student.last_name}_BIRTH_CERT`.toUpperCase() })
    if (isJHS) {
      if (student.form_138_url)   docs.push({ url: student.form_138_url,   label: `${student.last_name}_FORM_138`.toUpperCase() })
      if (student.good_moral_url) docs.push({ url: student.good_moral_url, label: `${student.last_name}_GOOD_MORAL`.toUpperCase() })
    } else {
      if (student.cor_url)     docs.push({ url: student.cor_url,     label: `${student.last_name}_ALS_RATING`.toUpperCase() })
      if (student.diploma_url) docs.push({ url: student.diploma_url, label: `${student.last_name}_DIPLOMA`.toUpperCase() })
      if (student.af5_url)     docs.push({ url: student.af5_url,     label: `${student.last_name}_AF5`.toUpperCase() })
    }
    return docs
  }

  // ── Download registration form (unchanged logic) ───────────────────────
   // ── VERIFIED RECTANGLE MAPPING (confirmed by visual render of the template) ──
//
// TEXT FIELDS:
//   Rectangle 9   = Facebook Account
//   Rectangle 10  = First Name
//   Rectangle 12  = Last Name
//   Rectangle 13  = Middle Name
//   Rectangle 14  = Home Address
//   Rectangle 16  = Guardian Full Name
//   Rectangle 23  = Date Filed
//   Rectangle 24  = Date of Birth
//   Rectangle 25  = Student Mobile Number
//   Rectangle 26  = Guardian Phone
//   Rectangle 28  = Student's Signature over Printed Name  ← name ONLY, nothing else
//   Rectangle 45  = LRN
//   Rectangle 47  = Citizenship / Nationality
//   Rectangle 50  = Age
//   Rectangle 53  = Email
//   Rectangle 54  = Previous School Name
//   Rectangle 55  = Previous School Address
//   Rectangle 229 = Year Completed Junior High
//
// CHECKBOXES (visually verified by rendering the template):
//   Rectangle 2   = Grade 11 (Enrolling For)
//   Rectangle 3   = Grade 10 Completer     ← LEFT on Grade10/ALS row
//   Rectangle 4   = GAS strand
//   Rectangle 5   = ICT strand
//   Rectangle 15  = ALS Completer          ← RIGHT on Grade10/ALS row
//   Rectangle 17  = Public School          ← RIGHT on Private/Public row
//   Rectangle 18  = Private School         ← LEFT on Private/Public row
//   Rectangle 21  = Male
//   Rectangle 29  = Female
//   Rectangle 30  = Single
//   Rectangle 31  = Married
//
// Rectangle 8  = Face to Face (modality checkbox)
// Rectangle 6  = Online       (modality checkbox)
// Rectangle 11 = AM Shift     (shift checkbox)
// Rectangle 7  = PM Shift     (shift checkbox)
// Rectangle 28 = Student's Signature over Printed Name ← name ONLY

const handleDownloadForm = async () => {
  const toastId = toast.loading("Preparing Registration Form...")
  try {
    const JSZip     = (await import("jszip")).default
    const fileSaver = await import("file-saver")
    const saveAs    = fileSaver.saveAs || (fileSaver as any).default

    const response = await fetch("/REGISTRATION - GAS & ICT.docx")
    if (!response.ok) throw new Error("Template not found in /public folder")

    const content = await response.arrayBuffer()
    const zip     = await JSZip.loadAsync(content)
    let docXml    = await zip.file("word/document.xml")?.async("string")
    if (!docXml) throw new Error("Invalid .docx: missing document.xml")

    // For Grade 12 students, swap every "Grade 11" label to "Grade 12"
    if (student.grade_level === "12") docXml = docXml.replaceAll("Grade 11", "Grade 12")

    const x = (str: string) =>
      (str || "").replace(/[<>&'"]/g, (c) =>
        (({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" } as any)[c] ?? c))

    const expandPara = (xml: string, pStart: number, innerXml: string) => {
      const tagEnd = xml.indexOf(">", pStart)
      const isSC   = xml[tagEnd - 1] === "/"
      if (isSC) {
        return xml.slice(0, pStart) + xml.slice(pStart, tagEnd - 1) + ">" + innerXml + "</w:p>" + xml.slice(tagEnd + 1)
      }
      const pEnd    = xml.indexOf("</w:p>", pStart) + 6
      const para    = xml.slice(pStart, pEnd)
      const pPr     = para.match(/<w:pPr[\s\S]*?<\/w:pPr>/)?.[0] ?? ""
      const openTag = para.match(/^<w:p\b[^>]*>/)?.[0] ?? "<w:p>"
      return xml.slice(0, pStart) + openTag + pPr + innerXml + "</w:p>" + xml.slice(pEnd)
    }

    const fillRectByName = (xml: string, name: string, text: string) => {
      if (!text) return xml
      const mi = xml.indexOf(`name="${name}"`)
      if (mi === -1) return xml
      const wspEnd = xml.indexOf("</wps:wsp>", mi)
      let tx = xml.indexOf("<w:txbxContent>", mi); if (wspEnd !== -1 && tx > wspEnd) tx = -1
      let bp = xml.indexOf("<wps:bodyPr",     mi); if (wspEnd !== -1 && bp > wspEnd) bp = -1
      const run = `<w:r><w:t xml:space="preserve">${text}</w:t></w:r>`
      if (tx !== -1 && (bp === -1 || tx < bp)) {
        const ps = xml.indexOf("<w:p", tx); if (ps === -1 || (wspEnd !== -1 && ps > wspEnd)) return xml
        return expandPara(xml, ps, run)
      }
      if (bp !== -1) return xml.slice(0, bp) + `<wps:txbx><w:txbxContent><w:p>${run}</w:p></w:txbxContent></wps:txbx>` + xml.slice(bp)
      return xml
    }

    const checkRect = (xml: string, name: string) => {
      const mi = xml.indexOf(`name="${name}"`)
      if (mi === -1) return xml
      const wspEnd = xml.indexOf("</wps:wsp>", mi)
      let tx = xml.indexOf("<w:txbxContent>", mi); if (wspEnd !== -1 && tx > wspEnd) tx = -1
      let bp = xml.indexOf("<wps:bodyPr",     mi); if (wspEnd !== -1 && bp > wspEnd) bp = -1
      const cr  = `<w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>\u2713</w:t></w:r>`
      const ppr = `<w:pPr><w:jc w:val="center"/></w:pPr>`
      if (tx !== -1 && (bp === -1 || tx < bp)) {
        const ps = xml.indexOf("<w:p", tx); if (ps === -1 || (wspEnd !== -1 && ps > wspEnd)) return xml
        return expandPara(xml, ps, ppr + cr)
      }
      if (bp !== -1) return xml.slice(0, bp) + `<wps:txbx><w:txbxContent><w:p>${ppr}${cr}</w:p></w:txbxContent></wps:txbx>` + xml.slice(bp)
      return xml
    }

    // ── Derived values ──────────────────────────────────────────────────
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    })
    const fullGuardian = [student.guardian_first_name, student.guardian_last_name]
      .filter(Boolean).join(" ")
    const fullName = [student.first_name, student.middle_name, student.last_name]
      .filter(Boolean).join(" ")

    const isALS    = student.student_category?.toLowerCase().includes("als")
    const isJHS    = !isALS
    // Defaults to Public — never assume Private when school_type is null/undefined
    const isPublic = !student.school_type || student.school_type.toLowerCase().includes("public")

    // ── Text field fills ────────────────────────────────────────────────
    const fields: [string, string][] = [
      ["Rectangle 10",  x(student.first_name  || "")],
      ["Rectangle 13",  x(student.middle_name || "")],
      ["Rectangle 12",  x(student.last_name   || "")],
      ["Rectangle 14",  x(student.address     || "")],
      ["Rectangle 16",  x(fullGuardian)],
      ["Rectangle 45",  x(student.lrn         || "")],
      ["Rectangle 23",  x(today)],
      ["Rectangle 47",  x(student.nationality || student.citizenship || "Filipino")],
      ["Rectangle 24",  x(student.birth_date  || "")],
      ["Rectangle 50",  x(String(student.age  || ""))],
      ["Rectangle 25",  x(student.phone       || student.contact_no || "")],
      ["Rectangle 26",  x(student.guardian_phone || "")],
      ["Rectangle 53",  x(student.email       || "")],
      ["Rectangle 9",   x(student.facebook_user || student.fb_account || student.facebook || "")],
      ["Rectangle 54",  x(student.last_school_attended || "")],
      ["Rectangle 55",  x(student.last_school_address  || student.school_address || "")],
      // Printed name ONLY — no shift suffix, no extra text
      ["Rectangle 28",  x(fullName)],
      // Year Completed JHS — filled only for JHS graduates, blank for ALS passers
      ["Rectangle 229", isJHS ? x(student.year_completed_jhs || "") : ""],
    ]

    for (const [n, v] of fields) {
      if (v) docXml = fillRectByName(docXml, n, v)
    }

    // ── Checkboxes ───────────────────────────────────────────────────────

    // Enrolling For: Grade 11 (always)
    docXml = checkRect(docXml, "Rectangle 2")

    // JHS Completer Category
    // Rectangle 3  = Grade 10 Completer (left checkbox)
    // Rectangle 15 = ALS Completer      (right checkbox)
    docXml = checkRect(docXml, isJHS ? "Rectangle 3" : "Rectangle 15")

    // School Type (defaults to Public when school_type is null)
    // Rectangle 18 = Private School (left checkbox)
    // Rectangle 17 = Public School  (right checkbox)
    docXml = checkRect(docXml, isPublic ? "Rectangle 17" : "Rectangle 18")

    // Gender
    docXml = checkRect(docXml, student.gender === "Female" ? "Rectangle 29" : "Rectangle 21")

    // Civil Status
    docXml = checkRect(docXml, student.civil_status === "Married" ? "Rectangle 31" : "Rectangle 30")

    // Strand
    docXml = checkRect(docXml, student.strand?.toUpperCase() === "GAS" ? "Rectangle 4" : "Rectangle 5")

    // Modality: Face to Face (R8) or Online (R6)
    if (student.preferred_modality === "Face to Face") docXml = checkRect(docXml, "Rectangle 8")
    else if (student.preferred_modality === "Online")  docXml = checkRect(docXml, "Rectangle 6")

    // Shift: AM (R11) or PM (R7)
    if (student.preferred_shift === "AM")      docXml = checkRect(docXml, "Rectangle 11")
    else if (student.preferred_shift === "PM") docXml = checkRect(docXml, "Rectangle 7")

    // ── Generate and save ────────────────────────────────────────────────
    zip.file("word/document.xml", docXml)
    const out = await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })
    saveAs(out, `REGISTRATION_${(student.last_name || "STUDENT").toUpperCase()}_${(student.first_name || "").toUpperCase()}.docx`)
    toast.success("Registration Form Downloaded!", { id: toastId })
  } catch (err: any) {
    toast.error("Failed to generate form: " + (err.message || "Unknown error"), { id: toastId })
  }
}


  

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col h-full transition-colors duration-500 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*"              onChange={handleFileChange} />
      <input type="file" ref={docInputRef}  className="hidden" accept="image/*,application/pdf" onChange={handleDocChange} />

      <DossierHeader
        student={student}
        formData={formData}
        isDarkMode={isDarkMode}
        isEditing={isEditing}
        isSaving={isSaving}
        hasChanges={hasChanges}
        isValid={isValid}
        showEditButton={!!onUpdate}
        onClose={onClose}
        onEditToggle={() => setIsEditing(true)}
        onCancelEdit={() => { setIsEditing(false); setFormData(student) }}
        onSave={handleSave}
        onImageClick={handleImageClick}
        onDownloadForm={handleDownloadForm}
        onStatusChange={onStatusChange}
        onDecline={onDecline}
      />

      <div className={`p-6 md:p-12 space-y-12 md:space-y-20 text-sm flex-1 overflow-y-auto no-scrollbar transition-colors duration-500 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
        <DossierSections
          student={student}
          formData={formData}
          setFormData={setFormData}
          isEditing={isEditing}
          isDarkMode={isDarkMode}
          sections={sections}
          onChange={handleChange}
          dropdowns={{
            genderOpen,   setGenderOpen,
            strandOpen,   setStrandOpen,
            sectionOpen,  setSectionOpen,
            modalityOpen, setModalityOpen,
            shiftOpen,    setShiftOpen,
            schoolTypeOpen, setSchoolTypeOpen,
          }}
        />

        <DossierDocuments
          student={student}
          formData={formData}
          isEditing={isEditing}
          isDarkMode={isDarkMode}
          isJHS={isJHS}
          onOpenFile={onOpenFile}
          onDocClick={handleDocClick}
          getAllDocs={getAllDocs}
          
        />
        
      </div>
      
    </div>
    
  )
  
})

