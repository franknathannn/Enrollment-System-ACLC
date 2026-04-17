"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import { toast } from "sonner"
import { Search, Loader2, KeyRound, Ban, CheckCircle, ShieldAlert, Mail, User, BookOpen, Clock, Pin, PinOff, Plus, Trash2, Laptop, BellRing, Eye, EyeOff, Copy, Check, CalendarDays, ChevronDown, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useTheme } from "@/hooks/useTheme"

type StudentUser = {
  id: string
  first_name: string
  last_name: string
  lrn: string
  grade_level: string | null
  section: string | null
  strand: string | null
  status: string
  email: string | null
  two_by_two_url: string | null
  oed_usn: string | null
  oed_password: string | null
  account_status: string | null
  created_at: string | null
  last_login_at: string | null
}

type ActivityFilter = "ALL" | "RECENT" | "SUPER_LATE" | "INACTIVE_3M" | "INACTIVE_5M" | "INACTIVE_10M" | "INACTIVE_12M"

type StudentAnnouncement = {
  id: string
  title: string
  content: string
  target_audience: string
  is_pinned: boolean
  created_at: string
}

export default function StudentAccountsPage() {
  const { isDarkMode: dm, mounted } = useTheme()
  const [activeTab, setActiveTab] = useState<"accounts" | "announcements">("accounts")

  // Global System Config
  const [showOedCredentials, setShowOedCredentials] = useState(false)
  const [configId, setConfigId] = useState<string | null>(null)
  const [isNotifierUpdating, setIsNotifierUpdating] = useState(false)
  const [showNotifierModal, setShowNotifierModal] = useState(false)

  // Accounts state
  const [students, setStudents] = useState<StudentUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState<"ALL" | "GRADE 11" | "GRADE 12">("ALL")
  const [oedFilter, setOedFilter] = useState<"ALL" | "WITH_OED" | "WITHOUT_OED">("ALL")
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const [credDropdownOpen, setCredDropdownOpen] = useState(false)
  const [actDropdownOpen, setActDropdownOpen] = useState(false)

  const [selectedStudent, setSelectedStudent] = useState<StudentUser | null>(null)
  const [openPwModal, setOpenPwModal] = useState(false)
  const [newPassword, setNewPassword] = useState("")

  const [openOedModal, setOpenOedModal] = useState(false)
  const [oedUsn, setOedUsn] = useState("")
  const [oedPwd, setOedPwd] = useState("")
  const [showOedPwd, setShowOedPwd] = useState(false)
  const [isOedSaving, setIsOedSaving] = useState(false)

  const [isUpdating, setIsUpdating] = useState(false)

  // Announcements state
  const [announcements, setAnnouncements] = useState<StudentAnnouncement[]>([])
  const [annLoading, setAnnLoading] = useState(true)
  const [showAnnModal, setShowAnnModal] = useState(false)
  const [annForm, setAnnForm] = useState({ title: "", content: "", target: "ALL", is_pinned: false })
  const [annCurrentPage, setAnnCurrentPage] = useState(1)

  const annItemsPerPage = 5
  const annTotalPages = Math.max(1, Math.ceil(announcements.length / annItemsPerPage))
  const currentAnnouncements = announcements.slice((annCurrentPage - 1) * annItemsPerPage, annCurrentPage * annItemsPerPage)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    const { data } = await supabase.from("system_config").select("*").limit(1).single()
    if (data) {
      setShowOedCredentials(data.show_oed_credentials || false)
      setConfigId(data.id)
    } else {
      // If no config exists, create default
      const { data: newData } = await supabase.from("system_config").insert([{ show_oed_credentials: false }]).select().single()
      if (newData) {
        setShowOedCredentials(false)
        setConfigId(newData.id)
      }
    }
  }

  useEffect(() => {
    if (activeTab === "accounts") fetchStudents()
    if (activeTab === "announcements") fetchAnnouncements()
  }, [activeTab])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filter, oedFilter, activityFilter, searchTerm])

  const fetchStudents = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("students")
      .select("id, first_name, last_name, lrn, grade_level, section, strand, status, email, two_by_two_url, oed_usn, oed_password, account_status, created_at, last_login_at")
      .not("status", "eq", "Pending")
      .not("status", "eq", "Rejected")

    if (error) toast.error(error.message)
    else setStudents(data)
    setLoading(false)
  }

  const fetchAnnouncements = async () => {
    setAnnLoading(true)
    const { data, error } = await supabase
      .from("student_announcements")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      if (error.code === "42P01") {
        toast.error("student_announcements table does not exist. Please run the SQL migration.")
      } else {
        toast.error("Failed to load announcements")
      }
    } else {
      setAnnouncements(data || [])
    }
    setAnnLoading(false)
  }

  // ==== ACCOUNTS ACTIONS ====
  const handleDeactivate = async (id: string, currentAccountStatus: string | null) => {
    const newStatus = currentAccountStatus === "Deactivated" ? "Active" : "Deactivated"
    const toastId = toast.loading(`${newStatus === "Deactivated" ? "Deactivating" : "Activating"} account...`)
    const { error } = await supabase.from("students").update({ account_status: newStatus }).eq("id", id)
    if (error) {
      toast.error(error.message, { id: toastId })
    } else {
      toast.success(`Account ${newStatus === "Deactivated" ? "deactivated" : "activated"}.`, { id: toastId })
      setStudents(prev => prev.map(s => s.id === id ? { ...s, account_status: newStatus } : s))
    }
  }

  const handlePasswordModalOpen = (student: StudentUser) => {
    setSelectedStudent(student)
    setNewPassword("")
    setOpenPwModal(true)
  }

  const handleSendResetEmail = async () => {
    if (!selectedStudent?.email) {
      toast.error("This student does not have a registered email.")
      return
    }

    setIsUpdating(true)
    const toastId = toast.loading("Sending password reset email...")
    try {
      const res = await fetch("/api/admin/student-accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password_email", userId: selectedStudent.id, payload: { email: selectedStudent.email } })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send email")
      toast.success("Password reset email sent!", { id: toastId })
      setOpenPwModal(false)
    } catch (e: any) {
      toast.error(e.message, { id: toastId })
    } finally { setIsUpdating(false) }
  }

  const handleForceUpdatePassword = async () => {
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters.")
    setIsUpdating(true)
    const toastId = toast.loading("Forcefully updating password...")
    try {
      const res = await fetch("/api/admin/student-accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "force_reset_password", userId: selectedStudent!.id, payload: { newPassword } })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update password")
      toast.success("Password manually updated!", { id: toastId })
      setOpenPwModal(false)
    } catch (e: any) {
      toast.error(e.message, { id: toastId })
    } finally { setIsUpdating(false) }
  }

  const handleToggleOedNotifier = async () => {
    if (!configId) return toast.error("System config missing. Please check database.")
    setIsNotifierUpdating(true)
    const nextState = !showOedCredentials
    const toastId = toast.loading(`${nextState ? "Publishing" : "Hiding"} OED credentials dashboard module...`)

    const { error } = await supabase.from("system_config").update({ show_oed_credentials: nextState }).eq("id", configId)

    if (error) {
      toast.error(error.message, { id: toastId })
    } else {
      toast.success(`OED Credentials are now ${nextState ? "LIVE" : "HIDDEN"}.`, { id: toastId })
      setShowOedCredentials(nextState)
      setShowNotifierModal(false)
    }
    setIsNotifierUpdating(false)
  }

  const handleOedModalOpen = (student: StudentUser) => {
    setSelectedStudent(student)
    setOedUsn(student.oed_usn || "")
    setOedPwd(student.oed_password || "")
    setShowOedPwd(false)
    setOpenOedModal(true)
  }

  const triggerOedAutoSave = async () => {
    if (selectedStudent && (oedUsn !== selectedStudent.oed_usn || oedPwd !== selectedStudent.oed_password)) {

      // Duplication Validation
      if (oedUsn.trim() !== "") {
        const duplicateStudent = students.find(s => s.oed_usn === oedUsn && s.id !== selectedStudent.id);
        if (duplicateStudent) {
          toast.error(`Duplication Error: USN is already assigned to ${duplicateStudent.first_name} ${duplicateStudent.last_name} (LRN: ${duplicateStudent.lrn}). Please assign a unique USN.`, { duration: 6000 });
          return;
        }
      }

      setIsOedSaving(true)
      const { error } = await supabase.from("students").update({ oed_usn: oedUsn, oed_password: oedPwd }).eq("id", selectedStudent.id)
      if (error) {
        toast.error("Failed to auto-save OED Credentials: " + error.message)
      } else {
        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, oed_usn: oedUsn, oed_password: oedPwd } : s))
      }
      setIsOedSaving(false)
    }
  }

  // ==== ANNOUNCEMENTS ACTIONS ====
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!annForm.title.trim() || !annForm.content.trim()) return toast.error("Please fill all fields")
    setIsUpdating(true)
    const toastId = toast.loading("Posting announcement...")
    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase.from("student_announcements").insert([{
      title: annForm.title,
      content: annForm.content,
      target_audience: annForm.target,
      is_pinned: annForm.is_pinned,
      author_id: userData.user?.id
    }])

    setIsUpdating(false)
    if (error) return toast.error(error.message, { id: toastId })

    toast.success("Announcement posted!", { id: toastId })
    setShowAnnModal(false)
    setAnnForm({ title: "", content: "", target: "ALL", is_pinned: false })
    fetchAnnouncements()
  }

  const handleDeleteAnn = async (id: string) => {
    if (!confirm("Delete this announcement?")) return
    const { error } = await supabase.from("student_announcements").delete().eq("id", id)
    if (error) toast.error(error.message)
    else {
      toast.success("Deleted")
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    }
  }

  const handleTogglePin = async (id: string, current: boolean) => {
    const { error } = await supabase.from("student_announcements").update({ is_pinned: !current }).eq("id", id)
    if (error) toast.error(error.message)
    else {
      toast.success(current ? "Unpinned" : "Pinned")
      fetchAnnouncements()
    }
  }

  // ── Theme Design Tokens ──
  const pageBg = dm ? "bg-slate-950" : "bg-slate-50"
  const surface = dm ? "bg-slate-900/60 backdrop-blur-xl" : "bg-white"
  const border = dm ? "border-slate-700/60" : "border-slate-200"
  const borderActive = dm ? "border-blue-900/50" : "border-blue-200"
  const sub = dm ? "text-slate-400" : "text-slate-500"
  const txt = dm ? "text-white" : "text-slate-900"
  const rowHov = dm ? "hover:bg-slate-800/40" : "hover:bg-slate-50"
  const inputBg = dm ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
  const emptyCrd = dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"

  const filteredStudents = students
    .filter(s => filter === "ALL" ? true : s.grade_level === filter.split(" ")[1])
    .filter(s => {
      if (oedFilter === "WITH_OED") return !!(s.oed_usn || s.oed_password)
      if (oedFilter === "WITHOUT_OED") return !(s.oed_usn || s.oed_password)
      return true
    })
    .filter(s => {
      if (activityFilter === "ALL") return true
      const now = Date.now()
      const login = s.last_login_at ? new Date(s.last_login_at).getTime() : 0
      const diffMs = now - login
      const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30)
      if (activityFilter === "RECENT") return login > 0 && diffMonths <= 1
      if (activityFilter === "SUPER_LATE") return !login || diffMonths >= 2
      if (activityFilter === "INACTIVE_3M") return !login || diffMonths >= 3
      if (activityFilter === "INACTIVE_5M") return !login || diffMonths >= 5
      if (activityFilter === "INACTIVE_10M") return !login || diffMonths >= 10
      if (activityFilter === "INACTIVE_12M") return !login || diffMonths >= 12
      return true
    })
    .filter(s => {
      const q = searchTerm.toLowerCase()
      return s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q) || s.lrn.toLowerCase().includes(q)
    })

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const tabBtn = (active: boolean) =>
    `flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest py-3 rounded-[20px] transition-all duration-300 relative w-1/2
     ${active
      ? "text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-xl shadow-blue-500/25 border border-blue-500/20 scale-[1.02] z-10"
      : `${sub} ${dm ? "bg-slate-800/50 hover:bg-slate-800 border-transparent hover:border-slate-700" : "bg-white/50 hover:bg-white border-transparent hover:border-slate-200"}`}`

  return (
    <div className={`min-h-screen transition-colors duration-500 ${pageBg}`}>
      <div className="space-y-6 max-w-6xl mx-auto pb-24 px-4 sm:px-6 md:px-8 pt-8">

        {/* Header & Main Tabs */}
        <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b ${border}`}>
          <div>
            <h1 className={`text-3xl font-black uppercase tracking-tight ${txt}`}>
              Student Management
            </h1>
            <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-1 ${sub}`}>Administer Accounts & Communications</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <Button
              onClick={() => setShowNotifierModal(true)}
              className={`h-12 px-6 rounded-[24px] font-black uppercase tracking-[0.15em] text-[10px] shadow-sm flex items-center gap-2 border transition-all w-full sm:w-auto ${showOedCredentials
                ? (dm ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100")
                : (dm ? "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20" : "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100")
                }`}
            >
              <BellRing size={16} className={showOedCredentials ? "animate-pulse" : ""} />
              OED Notifier: {showOedCredentials ? "LIVE" : "HIDDEN"}
            </Button>

            <div className={`flex p-1 rounded-[24px] border w-full sm:w-[340px] shrink-0 ${dm ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
              <button className={tabBtn(activeTab === "accounts")} onClick={() => setActiveTab("accounts")}>
                <User size={14} /> Accounts
              </button>
              <button className={tabBtn(activeTab === "announcements")} onClick={() => setActiveTab("announcements")}>
                <BookOpen size={14} /> News
              </button>
            </div>
          </div>
        </div>

        {activeTab === "accounts" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className={`rounded-[32px] p-6 sm:p-8 shadow-sm flex flex-col gap-6 ${surface} ${border} border`}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-[400px] group">
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none group-focus-within:text-blue-500 transition-colors ${sub}`} size={16} />
                  <Input
                    placeholder="Search by Name or LRN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-11 h-11 rounded-[16px] transition-all text-sm font-bold placeholder:font-medium w-full ${inputBg} focus:border-blue-500`}
                  />
                </div>
                {/* Credentials dropdown */}
                <div className="relative">
                  <Button
                    onClick={() => { setCredDropdownOpen(!credDropdownOpen); setActDropdownOpen(false) }}
                    className={`h-11 px-4 rounded-[16px] font-black uppercase text-[9px] tracking-widest border transition-all flex items-center gap-2 shadow-sm ${dm ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <KeyRound size={13} className="text-blue-500" />
                    <span className="hidden sm:inline max-w-[110px] truncate">
                      {oedFilter === 'WITH_OED' ? 'Assigned OED' : oedFilter === 'WITHOUT_OED' ? 'No OED' : 'All Credentials'}
                    </span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${credDropdownOpen ? 'rotate-180' : ''} shrink-0`} />
                  </Button>
                  {credDropdownOpen && (
                    <div className={`absolute top-full left-0 mt-2 w-48 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                      <div className="p-1.5 space-y-0.5">
                        {[
                          { id: 'ALL',          label: 'All Credentials' },
                          { id: 'WITH_OED',     label: 'Assigned OED'   },
                          { id: 'WITHOUT_OED',  label: 'No OED'         },
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => { setOedFilter(opt.id as any); setCredDropdownOpen(false) }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-left ${oedFilter === opt.id ? (dm ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (dm ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}`}
                          >
                            {opt.label}
                            {oedFilter === opt.id && <CheckCircle2 size={11} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Activity dropdown */}
                <div className="relative">
                  <Button
                    onClick={() => { setActDropdownOpen(!actDropdownOpen); setCredDropdownOpen(false) }}
                    className={`h-11 px-4 rounded-[16px] font-black uppercase text-[9px] tracking-widest border transition-all flex items-center gap-2 shadow-sm ${dm ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <Clock size={13} className="text-emerald-500" />
                    <span className="hidden sm:inline max-w-[110px] truncate">
                      {activityFilter === 'RECENT'      ? 'Recent Logins'    :
                       activityFilter === 'SUPER_LATE'  ? 'Super Late'       :
                       activityFilter === 'INACTIVE_3M' ? 'Inactive 3M'      :
                       activityFilter === 'INACTIVE_5M' ? 'Inactive 5M'      :
                       activityFilter === 'INACTIVE_10M'? 'Inactive 10M'     :
                       activityFilter === 'INACTIVE_12M'? 'Inactive 12M'     : 'All Activity'}
                    </span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${actDropdownOpen ? 'rotate-180' : ''} shrink-0`} />
                  </Button>
                  {actDropdownOpen && (
                    <div className={`absolute top-full left-0 mt-2 w-52 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                      <div className="p-1.5 space-y-0.5 max-h-[280px] overflow-y-auto">
                        {[
                          { id: 'ALL',           label: 'All Activity'       },
                          { id: 'RECENT',        label: 'Recent Logins'      },
                          { id: 'SUPER_LATE',    label: 'Super Late Logins'  },
                          { id: 'INACTIVE_3M',   label: 'Inactive 3 Months'  },
                          { id: 'INACTIVE_5M',   label: 'Inactive 5 Months'  },
                          { id: 'INACTIVE_10M',  label: 'Inactive 10 Months' },
                          { id: 'INACTIVE_12M',  label: 'Inactive 12 Months' },
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => { setActivityFilter(opt.id as ActivityFilter); setActDropdownOpen(false) }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors text-left ${activityFilter === opt.id ? (dm ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (dm ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}`}
                          >
                            {opt.label}
                            {activityFilter === opt.id && <CheckCircle2 size={11} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className={`flex gap-2 p-1 rounded-[20px] border ${dm ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
                  {(["ALL", "GRADE 11", "GRADE 12"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 sm:px-5 h-9 sm:h-10 rounded-[16px] font-black uppercase tracking-widest text-[9px] transition-all
                        ${filter === f
                          ? (dm ? "bg-white text-slate-900 shadow-md transform scale-105" : "bg-slate-900 text-white shadow-md transform scale-105")
                          : `${sub} hover:opacity-80`}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
              {loading ? (
                <div className="h-40 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : paginatedStudents.length === 0 ? (
                <div className={`h-40 flex flex-col items-center justify-center border border-dashed rounded-[24px] ${border}`}>
                  <Ban className={`w-8 h-8 mb-2 ${sub}`} />
                  <p className={`text-[11px] font-bold uppercase tracking-widest ${sub}`}>No students found</p>
                </div>
              ) : (
                <>
                  {paginatedStudents.map(student => {
                    const isDeactivated = student.account_status === "Deactivated"
                    return (
                      <div key={student.id} className={`group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-[24px] border ${dm ? "border-slate-800/60 bg-slate-900/30 hover:bg-slate-900 hover:border-blue-900/50" : "border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200"} hover:shadow-md transition-all`}>

                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 shadow-sm ${dm ? "bg-slate-800 border-slate-900" : "bg-slate-200 border-white"}`}>
                            {student.two_by_two_url ? (
                              <img src={student.two_by_two_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${sub}`}><User size={20} /></div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-[13px] font-black uppercase tracking-wider truncate ${txt}`}>
                              {student.last_name}, {student.first_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-md ${dm ? "bg-slate-800 text-slate-400" : "bg-slate-200/50 text-slate-500"}`}>
                                {student.lrn}
                              </span>
                              <span className={`w-1 h-1 rounded-full ${dm ? "bg-slate-700" : "bg-slate-300"}`} />
                              <span className={`text-[9px] font-bold uppercase tracking-widest ${dm ? "text-blue-400" : "text-blue-600"}`}>
                                Grade {student.grade_level}
                              </span>
                              <span className={`w-1 h-1 rounded-full ${dm ? "bg-slate-700" : "bg-slate-300"}`} />
                              <span className={`text-[9px] font-bold uppercase tracking-widest ${sub}`}>
                                {student.section || "No Section"}
                              </span>
                              {student.strand && (
                                <>
                                  <span className={`w-1 h-1 rounded-full ${dm ? "bg-slate-700" : "bg-slate-300"}`} />
                                  <span className={`text-[9px] font-bold uppercase tracking-widest ${sub}`}>{student.strand}</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {student.created_at && (
                                <span className={`flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest ${dm ? "text-slate-500" : "text-slate-400"}`}>
                                  <CalendarDays size={9} /> Created: {new Date(student.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              )}
                              <span className={`flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest ${student.last_login_at ? (dm ? "text-blue-400" : "text-blue-600") : (dm ? "text-slate-600" : "text-slate-400")}`}>
                                <Clock size={9} />
                                {student.last_login_at
                                  ? `Last Login: ${new Date(student.last_login_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${new Date(student.last_login_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`
                                  : "No login yet"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 justify-between sm:justify-end shrink-0 pl-16 sm:pl-0">
                          <button
                            title="OED Credentials"
                            onClick={() => handleOedModalOpen(student)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors shadow-sm ${(student.oed_usn || student.oed_password)
                              ? (dm ? "bg-blue-900/20 border-blue-800 text-blue-400" : "bg-blue-50 border-blue-200 text-blue-600")
                              : (dm ? "bg-slate-800 border-slate-700 hover:text-blue-400 hover:border-blue-900/50 text-slate-400" : "bg-white border-slate-200 hover:text-blue-600 hover:border-blue-200 text-slate-500")
                              }`}
                          >
                            <Laptop size={14} />
                          </button>
                          <button
                            title="Manage Password"
                            onClick={() => handlePasswordModalOpen(student)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors shadow-sm ${dm ? "bg-slate-800 border-slate-700 hover:text-blue-400 hover:border-blue-900/50 text-slate-400" : "bg-white border-slate-200 hover:text-blue-600 hover:border-blue-200 text-slate-500"}`}
                          >
                            <KeyRound size={14} />
                          </button>
                          <button
                            title={isDeactivated ? "Click to Activate" : "Click to Deactivate"}
                            onClick={() => handleDeactivate(student.id, student.account_status)}
                            className={`px-4 h-9 rounded-xl font-black uppercase tracking-widest text-[9px] border transition-colors shadow-sm flex items-center gap-1.5 ${isDeactivated
                              ? (dm ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200")
                              : (dm ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/30" : "bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200")
                              }`}
                          >
                            {isDeactivated ? <><CheckCircle size={10} /> Activate</> : <><Ban size={10} /> Deactivate</>}
                          </button>
                        </div>

                      </div>
                    )
                  })}

                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between pt-4 mt-2 gap-4">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>
                        Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length}
                      </span>
                      <div className="flex gap-1.5 flex-wrap justify-center">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className={`px-3 h-8 rounded-[12px] font-black uppercase tracking-widest text-[9px] border transition-colors disabled:opacity-30 ${dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-white"}`}
                        >
                          Prev
                        </button>

                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`w-8 h-8 rounded-[12px] font-black text-[10px] border transition-all ${currentPage === i + 1 ? (dm ? "bg-blue-600 border-blue-500 text-white" : "bg-blue-600 border-blue-600 text-white shadow-md") : (dm ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-500 hover:bg-white")}`}
                          >
                            {i + 1}
                          </button>
                        ))}

                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className={`px-3 h-8 rounded-[12px] font-black uppercase tracking-widest text-[9px] border transition-colors disabled:opacity-30 ${dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-white"}`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            </div>
          </div>
        )}

        {activeTab === "announcements" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="flex justify-end">
              <Button
                onClick={() => setShowAnnModal(true)}
                className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.15em] text-[10px] shadow-lg shadow-blue-500/20 gap-2"
              >
                <Plus size={16} /> Post Announcement
              </Button>
            </div>

            <div className="grid gap-4">
              {annLoading ? (
                <div className={`h-40 flex items-center justify-center border rounded-[32px] ${emptyCrd}`}>
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : announcements.length === 0 ? (
                <div className={`py-20 flex flex-col items-center justify-center border border-dashed rounded-[32px] ${emptyCrd}`}>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${dm ? "bg-slate-800" : "bg-slate-50"}`}>
                    <BookOpen className={`w-8 h-8 ${sub}`} />
                  </div>
                  <p className={`text-[12px] font-black uppercase tracking-widest ${sub}`}>No Announcements</p>
                  <p className={`text-[10px] uppercase tracking-widest mt-1 ${sub}`}>Click post announcement to create one.</p>
                </div>
              ) : (
                <>
                  {currentAnnouncements.map(ann => (
                    <div key={ann.id} className={`p-6 rounded-[32px] border ${ann.is_pinned ? (dm ? "bg-blue-900/10 border-blue-800/50" : "bg-blue-50/30 border-blue-200") : emptyCrd} shadow-sm relative overflow-hidden group`}>
                      {ann.is_pinned && <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full ${dm ? "bg-blue-500/20" : "bg-blue-500/10"}`} />}

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            {ann.is_pinned && <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${dm ? "text-blue-400 bg-blue-900/30" : "text-blue-600 bg-blue-100"}`}><Pin size={10} /> Pinned</span>}
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${dm ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                              Target: {ann.target_audience}
                            </span>
                            <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest ml-2 ${sub}`}>
                              <Clock size={10} /> {new Date(ann.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className={`text-lg font-black tracking-tight uppercase mb-2 ${txt}`}>{ann.title}</h3>
                          <p className={`text-sm font-medium whitespace-pre-wrap ${sub}`}>{ann.content}</p>
                        </div>

                        <div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleTogglePin(ann.id, ann.is_pinned)} className={`p-2 rounded-xl transition-colors ${dm ? "bg-slate-800 text-slate-400 hover:text-blue-400" : "bg-slate-100 text-slate-500 hover:text-blue-500"}`}>
                            {ann.is_pinned ? <PinOff size={16} /> : <Pin size={16} />}
                          </button>
                          <button onClick={() => handleDeleteAnn(ann.id)} className={`p-2 rounded-xl transition-colors ${dm ? "bg-rose-900/20 text-rose-500 hover:bg-rose-900/40" : "bg-rose-50 text-rose-500 hover:bg-rose-100"}`}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {annTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${sub}`}>
                        Page {annCurrentPage} of {annTotalPages}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAnnCurrentPage(p => Math.max(1, p - 1))}
                          disabled={annCurrentPage === 1}
                          className={`px-3 py-1.5 rounded-xl font-black uppercase tracking-widest text-[9px] border transition-colors disabled:opacity-30 ${dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                        >
                          Prev
                        </button>
                        <button
                          onClick={() => setAnnCurrentPage(p => Math.min(annTotalPages, p + 1))}
                          disabled={annCurrentPage === annTotalPages}
                          className={`px-3 py-1.5 rounded-xl font-black uppercase tracking-widest text-[9px] border transition-colors disabled:opacity-30 ${dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Global OED Notifier Confirmation Modal */}
        <Dialog open={showNotifierModal} onOpenChange={setShowNotifierModal}>
          <DialogContent className={`sm:max-w-[420px] rounded-[36px] p-8 border ${dm ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"}`}>
            <DialogHeader>
              <DialogTitle className={`text-2xl font-black uppercase tracking-tight ${txt}`}>
                {showOedCredentials ? "Hide OED Credentials" : "Broadcast OED Credentials"}
              </DialogTitle>
              <DialogDescription className={`text-[11px] font-medium leading-relaxed mt-2 ${sub}`}>
                {showOedCredentials
                  ? "Are you sure you want to hide the OED Credentials module from all student dashboards?"
                  : "If executed, this will instantly notify and display the OED Credentials module on EVERY student's dashboard. Ensure sensitive data is filled properly before confirming."}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-8 flex gap-3">
              <Button onClick={() => setShowNotifierModal(false)} variant="outline" className={`w-full h-12 rounded-[16px] font-black uppercase tracking-widest text-[10px] ${dm ? "border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white" : ""}`}>
                Cancel
              </Button>
              <Button
                onClick={handleToggleOedNotifier}
                disabled={isNotifierUpdating}
                className={`w-full h-12 rounded-[16px] text-white font-black uppercase tracking-widest text-[10px] shadow-lg ${showOedCredentials
                  ? "bg-slate-700 hover:bg-slate-800 shadow-slate-500/20"
                  : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                  }`}
              >
                {isNotifierUpdating ? <Loader2 className="animate-spin" size={16} /> : "Confirm Action"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Local OED Target Edit Modal */}
        <Dialog
          open={openOedModal}
          onOpenChange={(v) => {
            if (!v) triggerOedAutoSave();
            setOpenOedModal(v);
          }}
        >
          <DialogContent className={`sm:max-w-[400px] rounded-[36px] p-8 border ${dm ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"}`}>
            <DialogHeader>
              <DialogTitle className={`text-2xl font-black uppercase tracking-tight ${txt}`}>OED Credentials</DialogTitle>
              <DialogDescription className={`text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2 ${sub}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Target:  {selectedStudent?.first_name} {selectedStudent?.last_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 mt-6">

              <div className="space-y-5">
                <div className="space-y-2 relative">
                  <div className="flex justify-between items-end">
                    <Label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${sub}`}>USN (Username)</Label>
                    {isOedSaving && <Loader2 className="w-3 h-3 animate-spin text-blue-500 mb-0.5" />}
                  </div>
                  <div className="relative">
                    <Input
                      value={oedUsn}
                      onChange={(e) => setOedUsn(e.target.value.replace(/\D/g, ''))}
                      onBlur={triggerOedAutoSave}
                      maxLength={20}
                      placeholder="Enter USN Credentials"
                      className={`h-14 pr-12 rounded-[20px] font-black tracking-widest text-center transition-colors focus:border-blue-500 ${inputBg}`}
                    />
                    {oedUsn && (
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(oedUsn); toast.success("USN copied to clipboard", { duration: 1500 }) }}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${dm ? "text-slate-500 hover:text-blue-400" : "text-slate-400 hover:text-blue-600"}`}
                      >
                        <Copy size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <div className="flex justify-between items-end">
                    <Label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${sub}`}>OED Password</Label>
                    {isOedSaving && <Loader2 className="w-3 h-3 animate-spin text-blue-500 mb-0.5" />}
                  </div>
                  <div className="relative group">
                    <Input
                      value={oedPwd}
                      type={showOedPwd ? "text" : "password"}
                      onChange={(e) => setOedPwd(e.target.value.replace(/\s/g, ''))}
                      maxLength={30}
                      onBlur={triggerOedAutoSave}
                      placeholder="Assign password..."
                      className={`h-14 pl-12 pr-20 rounded-[20px] font-black tracking-widest text-center transition-colors focus:border-amber-500 ${inputBg}`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {oedPwd && (
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(oedPwd); toast.success("Password copied to clipboard", { duration: 1500 }) }}
                          className={`transition-colors ${dm ? "text-slate-500 hover:text-amber-400" : "text-slate-400 hover:text-amber-600"}`}
                        >
                          <Copy size={15} />
                        </button>
                      )}
                      <button type="button" onClick={() => setShowOedPwd(!showOedPwd)} className={`transition-colors ${dm ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}>
                        {showOedPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <KeyRound size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${dm ? "text-slate-600" : "text-slate-300"}`} />
                  </div>
                </div>

              </div>

              <div className={`p-4 rounded-[20px] border flex gap-3 items-start ${dm ? "bg-blue-900/10 border-blue-900/30" : "bg-blue-50 border-blue-200"}`}>
                <div className={`mt-0.5 ${dm ? "text-blue-400" : "text-blue-600"}`}><Clock size={14} /></div>
                <div>
                  <p className={`text-[11px] font-black uppercase tracking-widest ${dm ? "text-blue-400" : "text-blue-800"}`}>Auto-Save Enabled</p>
                  <p className={`text-[9px] mt-1 leading-relaxed ${dm ? "text-blue-300/60" : "text-blue-600"}`}>Changes made here are saved automatically as you type or close this panel. No save button required.</p>
                </div>
              </div>

            </div>
          </DialogContent>
        </Dialog>

        {/* Password Reset Modal */}
        <Dialog open={openPwModal} onOpenChange={setOpenPwModal}>
          <DialogContent className={`sm:max-w-[440px] rounded-[36px] p-8 border ${dm ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"}`}>
            <DialogHeader>
              <DialogTitle className={`text-2xl font-black uppercase tracking-tight ${txt}`}>Security Action</DialogTitle>
              <DialogDescription className={`text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2 ${sub}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Target: {selectedStudent?.first_name} {selectedStudent?.last_name} ({selectedStudent?.lrn})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-6">

              <div className={`rounded-[24px] border p-5 space-y-4 ${dm ? "border-blue-900 bg-blue-900/10" : "border-blue-200 bg-blue-50/50"}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${dm ? "bg-blue-900/50" : "bg-blue-100"}`}>
                    <Mail className={`w-5 h-5 ${dm ? "text-blue-400" : "text-blue-600"}`} />
                  </div>
                  <div>
                    <h4 className={`text-[11px] font-black uppercase tracking-widest ${dm ? "text-blue-400" : "text-blue-900"}`}>Option 1: Send Recovery Link</h4>
                    <p className={`text-[10px] font-medium mt-1.5 leading-relaxed ${dm ? "text-blue-300/80" : "text-blue-700"}`}>
                      Most secure. A reset link will be sent to the student's email, ensuring the admin never sees the password.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleSendResetEmail}
                  disabled={isUpdating || !selectedStudent?.email}
                  className="w-full h-12 rounded-[16px] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-blue-500/20"
                >
                  {isUpdating ? <Loader2 className="animate-spin" size={16} /> : "Send Password Reset Email"}
                </Button>
              </div>

              <div className="flex items-center gap-4 px-2">
                <div className={`h-px flex-1 ${dm ? "bg-slate-800" : "bg-slate-200"}`} />
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${sub}`}>Manual Override</span>
                <div className={`h-px flex-1 ${dm ? "bg-slate-800" : "bg-slate-200"}`} />
              </div>

              <div className={`rounded-[24px] border p-5 space-y-5 ${dm ? "border-amber-900/50 bg-amber-900/10" : "border-amber-200 bg-amber-50/50"}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${dm ? "bg-amber-900/50" : "bg-amber-100"}`}>
                    <ShieldAlert className={`w-5 h-5 ${dm ? "text-amber-500" : "text-amber-600"}`} />
                  </div>
                  <div>
                    <h4 className={`text-[11px] font-black uppercase tracking-widest ${dm ? "text-amber-500" : "text-amber-900"}`}>Option 2: Physical Override</h4>
                    <p className={`text-[10px] font-medium mt-1.5 leading-relaxed ${dm ? "text-amber-300/80" : "text-amber-800"}`}>
                      Use ONLY if student physically lost email access. Set a generic password like <span className={`font-mono px-1 rounded ${dm ? "bg-amber-950" : "bg-amber-200/50"}`}>aclc2026!</span>
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${sub}`}>New Temporary Password</Label>
                  <Input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="e.g. NorthbayPass!"
                    className={`h-12 rounded-[16px] font-black text-center tracking-wider focus:border-amber-500 transition-colors ${dm ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}`}
                  />
                </div>
                <Button
                  onClick={handleForceUpdatePassword}
                  className="w-full h-12 rounded-[16px] bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-amber-500/20"
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="animate-spin" size={16} /> : "Force Reset Password"}
                </Button>
              </div>

            </div>
          </DialogContent>
        </Dialog>

        {/* Write Announcement Modal */}
        <Dialog open={showAnnModal} onOpenChange={setShowAnnModal}>
          <DialogContent className={`sm:max-w-[500px] rounded-[36px] p-8 border ${dm ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"}`}>
            <DialogHeader>
              <DialogTitle className={`text-2xl font-black uppercase tracking-tight ${txt}`}>New Announcement</DialogTitle>
              <DialogDescription className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${sub}`}>
                Broadcast news locally to student dashboards
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateAnnouncement} className="space-y-5 mt-4">
              <div className="space-y-2">
                <Label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${sub}`}>Headline</Label>
                <Input
                  value={annForm.title} onChange={e => setAnnForm({ ...annForm, title: e.target.value })}
                  placeholder="e.g. Enrollment Period Extended"
                  className={`h-12 rounded-[16px] font-bold ${inputBg}`}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${sub}`}>Content</Label>
                <Textarea
                  value={annForm.content} onChange={e => setAnnForm({ ...annForm, content: e.target.value })}
                  placeholder="Write the full announcement details here..."
                  className={`min-h-[120px] rounded-[20px] resize-none p-4 font-medium ${inputBg}`}
                  required
                />
              </div>

              <div className="flex gap-4">
                <div className="space-y-2 flex-1">
                  <Label className={`text-[9px] font-black uppercase tracking-widest ml-1 ${sub}`}>Target Audience</Label>
                  <select
                    value={annForm.target} onChange={e => setAnnForm({ ...annForm, target: e.target.value })}
                    className={`w-full h-12 px-4 rounded-[16px] border text-sm font-bold uppercase tracking-wider outline-none ${dm ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"}`}
                  >
                    <option value="ALL">All Students</option>
                    <option value="GRADE 11">Grade 11</option>
                    <option value="GRADE 12">Grade 12</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <button type="button" onClick={() => setAnnForm(prev => ({ ...prev, is_pinned: !prev.is_pinned }))} className={`w-12 h-6 rounded-full relative transition-colors ${annForm.is_pinned ? "bg-blue-500" : (dm ? "bg-slate-800" : "bg-slate-200")}`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${annForm.is_pinned ? "left-7" : "left-1"}`} />
                  </button>
                  <Label className={`text-[9px] font-black uppercase tracking-widest cursor-pointer ${sub}`} onClick={() => setAnnForm(prev => ({ ...prev, is_pinned: !prev.is_pinned }))}>
                    Pin to Top
                  </Label>
                </div>
              </div>

              <Button disabled={isUpdating} type="submit" className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 mt-4 transition-all active:scale-95">
                {isUpdating ? <Loader2 className="animate-spin" /> : "Publish Announcement"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

