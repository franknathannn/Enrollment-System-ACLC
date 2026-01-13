// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\enrolled\components\EnrolledDossier.tsx
import { memo, useState, useRef, useMemo, useEffect } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  User, Mail, Phone, MapPin, ShieldCheck, 
  GraduationCap, ScrollText, FileText, ZoomIn, Upload,
  X, Globe, Heart, Calendar, Fingerprint, Undo2,
  Copy, Check, Save, Edit2, Camera, ChevronDown
} from "lucide-react"
import { toast } from "sonner"
import { OptimizedImage } from "./OptimizedImage"
import { ThemedText } from "@/components/ThemedText"
import { AnimatedNumber, AnimatedText } from "../../dashboard/components/primitives"

// ===== STATUS BADGE =====
const StatusBadge = memo(function StatusBadge({ status, isDarkMode }: { status: string, isDarkMode: boolean }) {
  const styles: any = { 
    Pending: isDarkMode ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-600 border-amber-200", 
    Accepted: isDarkMode ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-green-50 text-green-700 border-green-200", 
    Approved: isDarkMode ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-green-50 text-green-600 border-green-200", 
    Rejected: isDarkMode ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-red-50 text-red-600 border-red-200" 
  }
  
  return (
    <div className={`mt-4 md:mt-6 px-4 md:px-6 py-2 rounded-full border text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] w-fit shadow-sm transition-all duration-500 ${styles[status]}`}>
      {status === 'Approved' ? 'Accepted' : status}
    </div>
  )
})

// ===== INFO BLOCK =====
const InfoBlock = memo(function InfoBlock({ label, value, icon, isDarkMode, animate = true }: { label: string, value: string, icon?: React.ReactNode, isDarkMode: boolean, animate?: boolean }) {
  return (
    <div className="group transition-all duration-300">
      <p className={`text-[9px] md:text-[10px] uppercase font-black tracking-[0.2em] mb-1.5 transition-colors ${isDarkMode ? 'text-slate-500 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-700'}`}>{label}</p>
      <div className="flex items-center gap-2.5">
        {icon && <span className={`shrink-0 ${isDarkMode ? 'text-blue-400/30' : 'text-blue-500/40'}`}>{icon}</span>}
        <p className={`font-bold text-sm md:text-base break-words leading-tight transition-colors duration-500 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
          {animate ? <AnimatedText text={value || "—"} /> : (value || "—")}
        </p>
      </div>
    </div>
  )
})

// ===== CREDENTIAL CARD =====
const CredentialCard = memo(function CredentialCard({ label, url, onOpen, isDarkMode }: { label: string, url: string, onOpen?: (url: string, label: string) => void, isDarkMode: boolean }) {
  if (!url) return (
    <div 
      className={`p-4 md:p-6 rounded-[24px] border border-dashed opacity-40 flex flex-col items-center justify-center text-slate-400 h-32 md:h-40 transition-colors duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
    >
      <FileText size={20} className="mb-2 opacity-50" />
      <p className="text-[8px] font-black uppercase tracking-widest text-center leading-none">{label}</p>
    </div>
  )
  
  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onOpen && onOpen(url, label); }} 
      className="cursor-pointer group relative"
    >
      <div 
        className={`p-2 rounded-[24px] border hover:border-blue-400 hover:shadow-2xl transition-all h-full relative overflow-hidden duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} 
      >
        <div className={`h-28 md:h-32 rounded-[18px] overflow-hidden relative transition-colors duration-500 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
          {url.toLowerCase().endsWith('.pdf') ? (
            <div className={`w-full h-full flex flex-col items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <FileText size={32} className="text-slate-400" />
              <p className="text-[8px] font-black uppercase text-slate-500 mt-2">PDF Document</p>
            </div>
          ) : (
            <img 
              src={url} 
              alt={label} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
            />
          )}
          <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
            <ZoomIn className="text-white drop-shadow-md" size={24} />
          </div>
        </div>
        <p className={`text-[10px] font-black text-center mt-3 uppercase tracking-widest leading-tight px-1 truncate transition-colors duration-500 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
          {label}
        </p>
      </div>
    </div>
  )
})

export const EnrolledDossier = memo(function EnrolledDossier({
  student, 
  onOpenFile, 
  isDarkMode,
  onClose,
  onUpdate,
  sections = []
}: { 
  student: any, 
  onOpenFile: (url: string, label: string, allDocs?: {url: string, label: string}[]) => void, 
  isDarkMode: boolean,
  onClose?: () => void,
  onUpdate?: (id: string, data: any) => Promise<void | boolean>,
  sections?: any[]
}) {
  // This effect ensures that when the student prop changes (i.e., you open a new dossier),
  // the form data resets to that new student's data.
  useEffect(() => {
    setFormData(student);
  }, [student]);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(student)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [strandDropdownOpen, setStrandDropdownOpen] = useState(false)
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false)
  const [genderDropdownOpen, setGenderDropdownOpen] = useState(false)

  const hasChanges = useMemo(() => {
    if (!student || !formData) return false;
    if (formData._file) return true; // A new file was selected

    const fieldsToCompare = [
        'first_name', 'middle_name', 'last_name', 'gender', 'religion', 
        'civil_status', 'age', 'birth_date', 'email', 'phone', 'address',
        'guardian_first_name', 'guardian_last_name', 'guardian_phone',
        'last_school_attended', 'gwa_grade_10', 'strand', 'section', 'section_id'
    ];

    for (const field of fieldsToCompare) {
        const originalValue = student[field] ?? '';
        const currentValue = formData[field] ?? '';
        if (originalValue !== currentValue) {
            return true;
        }
    }

    return false;
  }, [formData, student]);

  const isValid = useMemo(() => {
    if (!formData) return false;
    if (!formData.first_name?.trim() || !formData.last_name?.trim()) return false;
    if (!formData.gender || !formData.strand) return false;
    // Photo check: either an existing URL or a new file must be present.
    if (!formData.profile_picture && !formData.two_by_two_url && !formData.profile_2x2_url && !formData._file) return false;
    return true;
  }, [formData]);

  const isJHS = student.student_category?.toLowerCase().includes("jhs") || student.student_category === "Standard" || student.student_category === "JHS Graduate"
  const isALS = student.student_category?.toLowerCase().includes("als")
  const badgeColor = isALS ? "bg-orange-500" : "bg-blue-600"

  const filteredSections = useMemo(() => {
    if (!formData.strand) return []
    return sections.filter((sec: any) => sec.strand === formData.strand)
  }, [formData.strand, sections])

  const handleSave = async () => {
    if (!onUpdate) return
    setIsSaving(true)
    try {
      await onUpdate(student.id, formData)
      setIsEditing(false)
      toast.success("Profile Updated Successfully")
    } catch (error) {
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => {
      const newData = { ...prev, [field]: value }
      
      if (field === 'strand') {
        if (value !== student.strand) {
          newData.section = "Unassigned"
          newData.section_id = null
        } else {
          newData.section = student.section
          newData.section_id = student.section_id
        }
      }
      return newData
    })
  }

  const handleImageClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click()
    } else {
      const imgUrl = student.profile_picture || student.two_by_two_url || student.profile_2x2_url;
      if (imgUrl) onOpenFile(imgUrl, `${student.last_name}_2X2_PICTURE`.toUpperCase(), getAllDocs());
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Create a local preview URL
      const previewUrl = URL.createObjectURL(file)
      setFormData((prev: any) => ({ ...prev, profile_picture: previewUrl, _file: file }))
      toast.info("Image selected. Save to apply changes.")
    }
  }

  const handleCopyInfo = async () => {
    const infoText = `
STUDENT RECORD:

Name: ${student.last_name}, ${student.first_name}${student.middle_name ? `, ${student.middle_name[0]}.` : ''}
LRN: ${student.lrn}
Age: ${student.age || ''}
Gender: ${student.gender}
Section: ${student.section || ''}
Email: ${student.email}
Phone Number: ${student.phone || student.contact_no}
Strand: ${student.strand}
Address: ${student.address}
    `.trim();

    try {
      await navigator.clipboard.writeText(infoText);
      setCopied(true);
      toast.success("Student Information Copied", {
        style: { fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy information");
    }
  };

  const getAllDocs = () => {
    const docs: {url: string, label: string}[] = [];
    const imgUrl = student.profile_picture || student.two_by_two_url || student.profile_2x2_url;
    if (imgUrl) docs.push({ url: imgUrl, label: `${student.last_name}_2X2_PICTURE`.toUpperCase() });

    if (isJHS) {
      if (student.form_138_url) docs.push({ url: student.form_138_url, label: `${student.last_name}_FORM_138`.toUpperCase() });
      if (student.good_moral_url) docs.push({ url: student.good_moral_url, label: `${student.last_name}_GOOD_MORAL`.toUpperCase() });
    } else {
      if (student.cor_url) docs.push({ url: student.cor_url, label: `${student.last_name}_ALS_RATING`.toUpperCase() });
      if (student.diploma_url) docs.push({ url: student.diploma_url, label: `${student.last_name}_DIPLOMA`.toUpperCase() });
      if (student.af5_url) docs.push({ url: student.af5_url, label: `${student.last_name}_AF5`.toUpperCase() });
    }
    return docs;
  };

  const inputClass = `h-9 text-sm font-bold transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'}`;
  const selectClass = `${inputClass} appearance-none cursor-pointer`;
  const labelClass = `text-[9px] uppercase font-black tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`;
  
  return (
    <div className={`flex flex-col h-full transition-colors duration-500 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      
      {/* 🟢 HEADER SECTION: Darker Greyish Theme */}
      <div className={`p-6 md:p-12 flex flex-col items-center text-center relative overflow-hidden shrink-0 transition-all duration-500 ${
          isDarkMode 
          ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800' 
          : 'bg-white border-b border-slate-200 shadow-sm'
        }`}>
        
        {/* Decorative Background Pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 dark:opacity-10" />

        {/* ❌ EXIT & COPY BUTTONS */}
        <div className="absolute top-4 left-4 z-30 flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className={`rounded-full transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
          >
            <X size={20} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleCopyInfo} 
            title="Copy Student Information"
            className={`rounded-full transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
          >
            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
          </Button>
        </div>

        {/* EDIT BUTTON */}
        <div className="absolute top-4 right-4 z-30 flex gap-2">
           {onUpdate && (
             <>
               {isEditing ? (
                 <>
                   <Button 
                     onClick={() => { setIsEditing(false); setFormData(student); }}
                     className={`rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg bg-red-500 hover:bg-red-600 text-white`}
                     disabled={isSaving}
                   >
                     <Undo2 size={14} className="mr-2" /> Cancel
                   </Button>
                   {hasChanges && (
                     <Button 
                       onClick={handleSave}
                       className={`rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg bg-green-600 hover:bg-green-700 text-white disabled:bg-slate-400 disabled:cursor-not-allowed`}
                       disabled={isSaving || !isValid}
                     >
                       <Save size={14} className="mr-2" /> {isSaving ? 'Saving...' : 'Save Changes'}
                     </Button>
                   )}
                 </>
                 ) : (
                   <Button onClick={() => setIsEditing(true)} className={`rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
                     <Edit2 size={14} className="mr-2" /> Edit Profile
                   </Button>
                 )}
             </>
           )}
        </div>

        {/* 🟢 PROFILE IMAGE */}
        <div className="relative z-10 mb-4 md:mb-8 scale-90 md:scale-100 mt-8">
          <div 
            className={`w-36 h-36 md:w-48 md:h-48 rounded-[40px] md:rounded-[56px] border-[6px] overflow-hidden shadow-2xl flex items-center justify-center cursor-zoom-in group transition-all duration-500 hover:rotate-2 ${
                isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-white ring-1 ring-slate-200'
            }`}
            onClick={handleImageClick}
          >
            {formData.profile_picture || student.profile_picture || student.two_by_two_url || student.profile_2x2_url ? (
              <OptimizedImage
                src={formData.profile_picture || student.profile_picture || student.two_by_two_url || student.profile_2x2_url}
                alt={`${student.last_name}, ${student.first_name}`}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                fallback={`https://api.dicebear.com/7.x/initials/svg?seed=${student.last_name}`}
              />
            ) : (
              <div className={`flex flex-col items-center ${isDarkMode ? 'text-slate-600' : 'text-slate-500'}`}>
                <User size={64} strokeWidth={1} />
                <p className="text-[10px] font-black uppercase mt-3">Identity Missing</p>
              </div>
            )}
            {isEditing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white" size={32} />
              </div>
            )}
          </div>
        </div>

        <h2 className={`relative z-10 text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none italic transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          <AnimatedText text={`${formData.first_name} ${formData.last_name}`} />
        </h2>
        
        <div className="flex flex-col items-center gap-2 mt-4 md:mt-6 relative z-10">
            <p className={`font-bold uppercase tracking-[0.4em] text-[10px] md:text-[11px] px-4 py-1.5 rounded-full border backdrop-blur-sm transition-all duration-500 ${isDarkMode ? 'text-slate-300 bg-white/5 border-white/5' : 'text-slate-500 bg-slate-100 border-slate-200'}`}>
              MATRIX ID: {student.lrn}
            </p>
            <StatusBadge status={student.status} isDarkMode={isDarkMode} />
        </div>
      </div>
      
      {/* 🟢 DATA MATRIX */}
      <div className={`p-6 md:p-12 space-y-12 md:space-y-20 text-sm flex-1 overflow-y-auto no-scrollbar transition-colors duration-500 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50/50'}`}>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-20">
          {/* I. PERSONAL IDENTITY */}
          <div className="space-y-8 md:space-y-10">
            <h3 className={`flex items-center gap-3 font-black text-[11px] uppercase tracking-[0.3em] border-b pb-4 transition-colors duration-500 ${isDarkMode ? 'text-blue-400 border-slate-800' : 'text-blue-600 border-slate-200'}`}>
              <User size={16} /> I. Identity Matrix
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-6">
              {['first_name', 'middle_name', 'last_name', 'gender', 'religion', 'civil_status', 'age', 'birth_date'].map(field => (
                <div key={field} className="space-y-1.5">
                  {isEditing ? (
                    <>
                      <p className={labelClass}>{field.replace('_', ' ')}</p>
                      {field === 'gender' ? (
                        <div className="relative">
                          <Button
                            onClick={() => setGenderDropdownOpen(!genderDropdownOpen)}
                            className={`w-full justify-between ${inputClass} px-3`}
                            variant="ghost"
                          >
                            {formData.gender || "Select Gender"}
                            <ChevronDown size={14} className={`transition-transform duration-300 ${genderDropdownOpen ? 'rotate-180' : ''}`} />
                          </Button>
                          {genderDropdownOpen && (
                            <div className={`absolute top-full left-0 w-full mt-2 rounded-xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                              <div className="p-1 space-y-1">
                                {['Male', 'Female'].map((opt) => (
                                  <button
                                    key={opt}
                                    onClick={() => { handleChange('gender', opt); setGenderDropdownOpen(false); }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors text-left ${formData.gender === opt ? (isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}`}
                                  >
                                    {opt}
                                    {formData.gender === opt && <Check size={12} />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Input 
                          value={formData[field] || ""} 
                          onChange={(e) => {
                            const newFormData = { ...formData, [field]: e.target.value };
                            setFormData(newFormData);
                          }}
                          className={inputClass}
                        />
                      )}
                    </>
                  ) : (field === 'gender' ? <InfoBlock label={field.replace('_', ' ')} value={formData[field] || '—'} isDarkMode={isDarkMode} animate={false} /> :
                    <InfoBlock label={field.replace('_', ' ')} value={formData[field] || '—'} isDarkMode={isDarkMode} />
                  )}
                </div>
              ))}
              <div className="sm:col-span-2">
                <InfoBlock label="Full Legal Registry Name" value={`${formData.first_name} ${formData.middle_name || ''} ${formData.last_name}`} isDarkMode={isDarkMode} />
              </div>
            </div>
          </div>
          
          {/* II. CONNECTIVITY MATRIX */}
          <div className="space-y-8 md:space-y-10">
            <h3 className={`flex items-center gap-3 font-black text-[11px] uppercase tracking-[0.3em] border-b pb-4 transition-colors duration-500 ${isDarkMode ? 'text-indigo-400 border-slate-800' : 'text-indigo-600 border-slate-200'}`}>
              <Mail size={16} /> II. Connectivity Matrix
            </h3>
            <div className="space-y-8">
              {['email', 'phone'].map(field => (
                <div key={field} className="space-y-1.5">
                  {isEditing ? (
                    <>
                      <p className={labelClass}>{field === 'phone' ? 'Primary Contact' : 'Digital Address'}</p>
                      <Input value={formData[field] || ""} onChange={(e) => {
                          const newFormData = { ...formData, [field]: e.target.value };
                          setFormData(newFormData);
                        }} className={inputClass} />
                    </>
                  ) : (
                    <InfoBlock label={field === 'phone' ? 'Primary Contact' : 'Digital Address'} value={formData[field] || '—'} icon={field === 'email' ? <Mail size={12}/> : <Phone size={12}/>} isDarkMode={isDarkMode} />
                  )}
                </div>
              ))}
              <div className="sm:col-span-2">
                {isEditing ? (
                  <div className="space-y-1.5"><p className={labelClass}>Home Residency</p><Input value={formData.address || ""} onChange={(e) => {
                    const newFormData = { ...formData, address: e.target.value };
                    setFormData(newFormData);
                  }} className={inputClass} /></div>
                ) : (
                  <InfoBlock label="Home Residency" value={formData.address || '—'} icon={<MapPin size={12} />} isDarkMode={isDarkMode} />
                )}
              </div>
              <div className={`p-5 rounded-[24px] border shadow-sm transition-colors duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-inner' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                   <Fingerprint size={12} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} />
                   <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Registry Node ID</p>
                </div>
                <p className={`text-[11px] font-bold truncate transition-colors duration-500 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{student.id}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* III. GUARDIAN & ACADEMIC STANDING */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-20">
           <div className="space-y-8 md:space-y-10">
             <h3 className={`flex items-center gap-3 font-black text-[11px] uppercase tracking-[0.3em] border-b pb-4 transition-colors duration-500 ${isDarkMode ? 'text-emerald-400 border-slate-800' : 'text-emerald-600 border-slate-200'}`}>
               <ShieldCheck size={16} /> III. Guardian Matrix
             </h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
               {['guardian_first_name', 'guardian_last_name', 'guardian_phone'].map(field => (
                 <div key={field} className="space-y-1.5">
                   {isEditing ? (
                     <><p className={labelClass}>{field.replace(/_/g, ' ')}</p><Input value={formData[field] || ""} onChange={(e) => {
                      const newFormData = { ...formData, [field]: e.target.value };
                      setFormData(newFormData);
                    }} className={inputClass} /></>
                   ) : <InfoBlock label={field.replace(/_/g, ' ')} value={formData[field] || '—'} isDarkMode={isDarkMode} />}
                 </div>
               ))}
             </div>
           </div>
           
          <div className="space-y-8 md:space-y-10">
            <h3 className={`flex items-center gap-3 font-black text-[11px] uppercase tracking-[0.3em] border-b pb-4 transition-colors duration-500 ${isDarkMode ? 'text-orange-400 border-slate-800' : 'text-orange-600 border-slate-200'}`}>
              <GraduationCap size={16} /> IV. Academic Standing
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className={`col-span-1 sm:col-span-2 p-6 rounded-[32px] border shadow-sm transition-colors duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 italic ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Origin Institution</p>
                {isEditing ? (
                   <Input 
                    value={formData.last_school_attended || ""} 
                    onChange={(e) => {
                      const newFormData = { ...formData, last_school_attended: e.target.value };
                      setFormData(newFormData);
                    }}
                    className={inputClass}
                  />
                ) : (
                  <p className={`font-black uppercase text-sm md:text-base leading-tight truncate transition-colors duration-500 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    {formData.last_school_attended || "Not Disclosed"}
                  </p>
                )}
              </div>
              <div className={`p-6 rounded-[32px] border text-center shadow-sm transition-colors duration-500 ${isDarkMode ? 'bg-blue-900/10 border-blue-900/40' : 'bg-white border-slate-200'}`}>
                <p className={`text-[10px] font-black uppercase mb-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>GWA Index</p>
                {isEditing ? (
                   <Input 
                    value={formData.gwa_grade_10 || ""} 
                    onChange={(e) => {
                      const newFormData = { ...formData, gwa_grade_10: e.target.value };
                      setFormData(newFormData);
                    }}
                    className={`${inputClass} text-center`}
                  />
                ) : (
                  <p className={`text-3xl font-black italic leading-none transition-colors duration-500 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>{formData.gwa_grade_10 ? <AnimatedNumber value={parseFloat(formData.gwa_grade_10)} /> : "0.00"}</p>
                )}
              </div>
              <div className={`p-6 rounded-[32px] border text-center shadow-sm transition-colors duration-500 ${isDarkMode ? 'bg-orange-900/10 border-orange-900/40' : 'bg-white border-slate-200'}`}>
                <p className={`text-[10px] font-black uppercase mb-2 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>Program Strand</p>
                {isEditing ? (
                   <div className="relative">
                     <Button
                       onClick={() => setStrandDropdownOpen(!strandDropdownOpen)}
                       className={`w-full justify-between ${inputClass} px-3`}
                       variant="ghost"
                     >
                       {formData.strand || "Select Strand"}
                       <ChevronDown size={14} className={`transition-transform duration-300 ${strandDropdownOpen ? 'rotate-180' : ''}`} />
                     </Button>
                     {strandDropdownOpen && (
                       <div className={`absolute top-full left-0 w-full mt-2 rounded-xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                         <div className="p-1 space-y-1">
                           {['ICT', 'GAS'].map((opt) => (
                             <button
                               key={opt}
                               onClick={() => { handleChange('strand', opt); setStrandDropdownOpen(false); }}
                               className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors text-left ${formData.strand === opt ? (isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}`}
                             >
                               {opt}
                               {formData.strand === opt && <Check size={12} />}
                             </button>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                ) : (
                  <p className={`text-2xl md:text-3xl font-black leading-none transition-colors duration-500 ${isDarkMode ? 'text-orange-400' : 'text-orange-700'}`}>{formData.strand}</p>
                )}
              </div>
              <div className={`col-span-1 sm:col-span-2 p-6 rounded-[32px] border text-center shadow-sm transition-colors duration-500 ${isDarkMode ? 'bg-purple-900/10 border-purple-900/40' : 'bg-white border-slate-200'}`}>
                <p className={`text-[10px] font-black uppercase mb-2 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Assigned Section</p>
                {isEditing ? (
                   <div className="relative">
                     <Button
                       onClick={() => setSectionDropdownOpen(!sectionDropdownOpen)}
                       className={`w-full justify-between ${inputClass} px-3`}
                       variant="ghost"
                     >
                       {formData.section || "Unassigned"}
                       <ChevronDown size={14} className={`transition-transform duration-300 ${sectionDropdownOpen ? 'rotate-180' : ''}`} />
                     </Button>
                     {sectionDropdownOpen && (
                       <div className={`absolute top-full left-0 w-full mt-2 rounded-xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 max-h-[200px] overflow-y-auto custom-scrollbar ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                         <div className="p-1 space-y-1">
                           <button
                               onClick={() => {
                                   setFormData((prev: any) => ({ ...prev, section: "Unassigned", section_id: null }));
                                   setSectionDropdownOpen(false);
                               }}
                               className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors text-left ${formData.section === "Unassigned" || !formData.section ? (isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}`}
                           >
                               Unassigned
                               {(formData.section === "Unassigned" || !formData.section) && <Check size={12} />}
                           </button>
                           {filteredSections.map((sec: any) => (
                             <button
                               key={sec.id}
                               onClick={() => {
                                   setFormData((prev: any) => ({ ...prev, section: sec.section_name, section_id: sec.id }));
                                   setSectionDropdownOpen(false);
                               }}
                               className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors text-left ${formData.section === sec.section_name ? (isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}`}
                             >
                               {sec.section_name}
                               {formData.section === sec.section_name && <Check size={12} />}
                             </button>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                ) : (
                  <p className={`text-xl md:text-2xl font-black leading-none transition-colors duration-500 ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>{formData.section || "Unassigned"}</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* V. CREDENTIAL VAULT */}
        <div className="space-y-8 pb-12">
          <h3 className={`flex items-center gap-3 font-black text-[11px] uppercase tracking-[0.3em] border-b pb-4 transition-colors duration-500 ${isDarkMode ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'}`}>
            <ScrollText size={16} /> V. Registrar Vault
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {isJHS ? (
              <>
                <CredentialCard label="Form 138" url={student.form_138_url} onOpen={(url) => onOpenFile(url, `${student.last_name}_FORM_138`.toUpperCase(), getAllDocs())} isDarkMode={isDarkMode} />
                <CredentialCard label="Good Moral" url={student.good_moral_url} onOpen={(url) => onOpenFile(url, `${student.last_name}_GOOD_MORAL`.toUpperCase(), getAllDocs())} isDarkMode={isDarkMode} />
              </>
            ) : (
              <>
                <CredentialCard label="ALS Rating" url={student.cor_url} onOpen={(url) => onOpenFile(url, `${student.last_name}_ALS_RATING`.toUpperCase(), getAllDocs())} isDarkMode={isDarkMode} />
                <CredentialCard label="Diploma" url={student.diploma_url} onOpen={(url) => onOpenFile(url, `${student.last_name}_DIPLOMA`.toUpperCase(), getAllDocs())} isDarkMode={isDarkMode} />
                <CredentialCard label="AF5 Form" url={student.af5_url} onOpen={(url) => onOpenFile(url, `${student.last_name}_AF5`.toUpperCase(), getAllDocs())} isDarkMode={isDarkMode} />
              </>
            )}
          </div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center italic mt-6 opacity-60">Institutional Matrix Verification System v2.0</p>
        </div>
      </div>
    </div>
  )
})
