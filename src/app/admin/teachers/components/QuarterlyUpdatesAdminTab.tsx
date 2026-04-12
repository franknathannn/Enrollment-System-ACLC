"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Loader2, Plus, Calendar, FileSpreadsheet,
  CheckCircle, XCircle, AlertTriangle, Send,
  MessageSquare, ChevronDown, ChevronUp,
  Users, Sparkles, Clock, Trash2, Edit2, RotateCcw,
} from "lucide-react"
import { supabase } from "@/lib/supabase/admin-client"
import { toast } from "sonner"

const MAX_REQS = 5

const getMinDate = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  const p = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T00:00`
}

const isoToLocalInput = (iso: string) => {
  const d = new Date(iso)
  const p = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function QuarterlyUpdatesAdminTab({
  isDarkMode: dm,
  schoolYear,
}: {
  isDarkMode: boolean
  schoolYear: string
}) {
  const [semester, setSemester]           = useState("Semester 1")
  const [requirements, setRequirements]   = useState<any[]>([])
  const [teachers, setTeachers]           = useState<any[]>([])
  const [allSubmissions, setAllSubmissions] = useState<Record<string, any[]>>({})
  const [loading, setLoading]             = useState(true)
  const [view, setView]                   = useState<"list" | "create" | "edit">("list")

  const [newReq, setNewReq] = useState({ title: "", description: "", deadline: "", is_required: true })
  const [creating, setCreating] = useState(false)
  const [editingReq, setEditingReq] = useState<any | null>(null)
  const [deleteReqId, setDeleteReqId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [selectedReqId, setSelectedReqId] = useState<string | null>(null)
  const [submCollapsed, setSubmCollapsed] = useState(false)
  const [missCollapsed, setMissCollapsed] = useState(false)

  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null)
  const [feedbackMsg, setFeedbackMsg]           = useState("")
  const [processing, setProcessing]             = useState<string | null>(null)

  // ── Data ─────────────────────────────────────────────────────────────────

  const fetchAllSubmissions = useCallback(async (reqIds: string[]) => {
    if (!reqIds.length) { setAllSubmissions({}); return }
    const { data } = await supabase.from("quarterly_submissions").select("*").in("requirement_id", reqIds)
    const grouped: Record<string, any[]> = {}
    for (const s of data || []) {
      if (!grouped[s.requirement_id]) grouped[s.requirement_id] = []
      grouped[s.requirement_id].push(s)
    }
    setAllSubmissions(grouped)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [tRes, rRes] = await Promise.all([
      supabase.from("teachers").select("id, full_name, avatar_url").order("full_name"),
      supabase.from("quarterly_requirements").select("*")
        .eq("school_year", schoolYear).eq("semester", semester)
        .order("deadline", { ascending: true }).order("created_at", { ascending: true }),
    ])
    if (tRes.data) setTeachers(tRes.data)
    const reqs = rRes.data || []
    setRequirements(reqs)
    if (reqs.length > 0) {
      await fetchAllSubmissions(reqs.map(r => r.id))
      setSelectedReqId(prev => reqs.find(r => r.id === prev) ? prev : reqs[0].id)
    } else {
      setAllSubmissions({})
      setSelectedReqId(null)
    }
    setLoading(false)
  }, [schoolYear, semester, fetchAllSubmissions])

  useEffect(() => {
    fetchData()
    const key = `admin-quarterly-${schoolYear}-${semester}`
    const ch = supabase.channel(key)
      .on("postgres_changes", { event: "*", schema: "public", table: "quarterly_submissions" }, () => {
        setRequirements(prev => { if (prev.length) fetchAllSubmissions(prev.map(r => r.id)); return prev })
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "quarterly_requirements" }, () => { fetchData() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [schoolYear, semester]) // eslint-disable-line

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleCreateReq = async () => {
    if (!newReq.title || !newReq.deadline) return toast.error("Title and Deadline are required")
    if (requirements.length >= MAX_REQS) return toast.error(`Maximum ${MAX_REQS} requirements per semester.`)
    const deadlineDate = new Date(newReq.deadline)
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0)
    if (deadlineDate < tomorrow) return toast.error("Deadline must be at least tomorrow.")
    setCreating(true)
    const { error } = await supabase.from("quarterly_requirements").insert([{ ...newReq, deadline: deadlineDate.toISOString(), school_year: schoolYear, semester }])
    if (error) { toast.error(error.message) }
    else {
      toast.success("Requirement created!")
      setView("list")
      setNewReq({ title: "", description: "", deadline: "", is_required: true })
      fetchData()
    }
    setCreating(false)
  }

  const handleEditReq = async () => {
    if (!editingReq || !editingReq.title || !editingReq.deadline) return toast.error("Title and Deadline are required")
    const deadlineDate = new Date(editingReq.deadline)
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0)
    if (deadlineDate < tomorrow) return toast.error("Deadline must be at least tomorrow.")
    setCreating(true)
    const { error } = await supabase.from("quarterly_requirements").update({
      title: editingReq.title,
      description: editingReq.description,
      deadline: deadlineDate.toISOString(),
      is_required: editingReq.is_required,
    }).eq("id", editingReq.id)
    if (error) { toast.error(error.message) }
    else {
      toast.success("Requirement updated!")
      setEditingReq(null)
      setView("list")
      fetchData()
    }
    setCreating(false)
  }

  const handleDeleteReq = async () => {
    if (!deleteReqId) return
    setDeleting(true)
    const toastId = toast.loading("Deleting requirement…")
    // Delete all submissions for this requirement first
    await supabase.from("quarterly_submissions").delete().eq("requirement_id", deleteReqId)
    const { error } = await supabase.from("quarterly_requirements").delete().eq("id", deleteReqId)
    if (error) { toast.error("Failed: " + error.message, { id: toastId }) }
    else {
      toast.success("Requirement deleted.", { id: toastId })
      setDeleteReqId(null)
      fetchData()
    }
    setDeleting(false)
  }

  const handleResetSubmission = async (submId: string, teacherId: string, reqTitle: string) => {
    setProcessing(submId)
    const toastId = toast.loading("Resetting submission…")
    const { error } = await supabase.from("quarterly_submissions").delete().eq("id", submId)
    if (error) { toast.error("Failed: " + error.message, { id: toastId }) }
    else {
      const { data: ud } = await supabase.auth.getUser()
      await supabase.from("teacher_announcements").insert([{
        title: "Quarterly Update Reset",
        body: `Your submission for "${reqTitle}" has been reset by an admin. Please resubmit.`,
        target: teacherId,
        is_pinned: false,
        author_id: ud.user?.id,
      }])
      toast.success("Submission reset.", { id: toastId })
      await fetchAllSubmissions(requirements.map(r => r.id))
    }
    setProcessing(null)
  }

  const handleUpdateStatus = async (submId: string, status: string, teacherId: string, reqTitle: string) => {
    if (status === "Invalidated" && !feedbackMsg.trim()) return toast.error("Please provide feedback.")
    setProcessing(submId)
    const toastId = toast.loading(`Marking as ${status}…`)
    const { error } = await supabase.from("quarterly_submissions").update({
      status,
      admin_feedback: status === "Invalidated" ? feedbackMsg : "Looks great, thank you!",
      updated_at: new Date().toISOString(),
    }).eq("id", submId)

    if (error) { toast.error("Failed: " + error.message, { id: toastId }) }
    else {
      const title = status === "Accepted" ? "Quarterly Update Accepted" : "Quarterly Update Needs Revision"
      const body  = status === "Accepted"
        ? `Your submission for "${reqTitle}" has been accepted.`
        : `Your submission for "${reqTitle}" requires revision. Admin says: "${feedbackMsg}"`
      const { data: ud } = await supabase.auth.getUser()
      await supabase.from("teacher_announcements").insert([{ title, body, target: teacherId, is_pinned: false, author_id: ud.user?.id }])
      toast.success(`Submission ${status}`, { id: toastId })
      await fetchAllSubmissions(requirements.map(r => r.id))
      setActiveFeedbackId(null)
      setFeedbackMsg("")
    }
    setProcessing(null)
  }

  // ── Derived stats for header ──────────────────────────────────────────────
  const totalSubmitted = (() => {
    let count = 0
    for (const reqs of Object.values(allSubmissions))
      count += reqs.filter(s => s.status !== "Invalidated").length
    return count
  })()
  const totalExpected = requirements.length * teachers.length

  // ── Theme ─────────────────────────────────────────────────────────────────
  const H  = dm ? "text-white"       : "text-slate-900"
  const S  = dm ? "text-slate-400"   : "text-slate-500"
  const BG = dm ? "bg-slate-900"     : "bg-white"
  const BD = dm ? "border-slate-700/60" : "border-slate-200"

  if (loading) return (
    <div className="py-20 flex flex-col items-center gap-3">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-blue-500/20 animate-pulse" />
        </div>
      </div>
      <p className={`text-[9px] font-black uppercase tracking-[0.3em] animate-pulse ${S}`}>Loading…</p>
    </div>
  )

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* ── Hero Header ────────────────────────────────────────────────────── */}
      <div className="relative rounded-[32px] overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 p-6 sm:p-8 shadow-lg shadow-blue-500/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row gap-5 sm:items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-200 mb-1">
              {schoolYear} · Admin Panel
            </p>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-none">
              Quarterly Updates
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200/80 mt-1">
              Track &amp; manage teacher submissions
            </p>

            {/* Global progress bar — mobile only */}
            {totalExpected > 0 && (
              <div className="mt-4 space-y-1.5 sm:hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/70">
                    Overall Progress
                  </span>
                  <span className="text-[9px] font-black text-white">
                    {totalSubmitted}/{totalExpected}
                  </span>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden w-full">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-700"
                    style={{ width: `${Math.round((totalSubmitted / totalExpected) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:items-end gap-3 shrink-0 w-full sm:w-auto">
            <select
              value={semester}
              onChange={e => setSemester(e.target.value)}
              className="h-11 px-4 rounded-2xl bg-white/10 text-white font-black uppercase tracking-widest text-[10px] outline-none backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors cursor-pointer w-full sm:w-auto"
            >
              <option value="Semester 1" className="text-slate-900 bg-white">Semester 1</option>
              <option value="Semester 2" className="text-slate-900 bg-white">Semester 2</option>
            </select>

            {view === "list" ? (
              <button
                type="button"
                disabled={requirements.length >= MAX_REQS}
                onClick={() => { setEditingReq(null); setView("create") }}
                className="h-11 px-5 rounded-2xl bg-white text-blue-700 font-black uppercase tracking-widest text-[10px] hover:bg-blue-50 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-black/10 w-full sm:w-auto"
              >
                <Plus size={13} />
                New Requirement
                <span className="ml-1 opacity-60">({requirements.length}/{MAX_REQS})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setView("list"); setEditingReq(null) }}
                className="h-11 px-5 rounded-2xl bg-white/15 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/25 active:scale-[0.97] transition-all flex items-center justify-center gap-2 border border-white/20 w-full sm:w-auto"
              >
                <XCircle size={13} /> Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Create / Edit Form ──────────────────────────────────────────────── */}
      {(view === "create" || view === "edit") && (
        <div className={`rounded-[28px] border p-6 sm:p-7 animate-in slide-in-from-top-4 duration-300 ${BG} ${BD}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${view === "edit" ? "bg-amber-500/10" : "bg-blue-500/10"}`}>
              {view === "edit" ? <Edit2 size={16} className="text-amber-500" /> : <Sparkles size={16} className="text-blue-500" />}
            </div>
            <div>
              <p className={`text-xs font-black uppercase tracking-[0.2em] ${H}`}>{view === "edit" ? "Edit Requirement" : "Assign New Requirement"}</p>
              <p className={`text-[9px] font-bold mt-0.5 ${S}`}>{view === "edit" ? "Changes apply immediately to all teachers" : "Will be visible to all teachers immediately"}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className={`text-[9px] font-black uppercase tracking-[0.2em] ${S}`}>Requirement Title</label>
              <input
                value={view === "edit" ? editingReq?.title ?? "" : newReq.title}
                onChange={e => view === "edit" ? setEditingReq((p: any) => ({ ...p, title: e.target.value })) : setNewReq({ ...newReq, title: e.target.value })}
                placeholder="e.g. Q1 Grading Sheet"
                className={`w-full h-12 px-4 rounded-[16px] text-sm font-bold border-2 outline-none transition-colors focus:border-blue-500 ${
                  dm ? "bg-slate-800 border-slate-700 text-white placeholder-slate-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className={`text-[9px] font-black uppercase tracking-[0.2em] ${S}`}>Deadline</label>
              <input
                type="datetime-local"
                value={view === "edit" ? editingReq?.deadline ?? "" : newReq.deadline}
                min={getMinDate()}
                onChange={e => view === "edit" ? setEditingReq((p: any) => ({ ...p, deadline: e.target.value })) : setNewReq({ ...newReq, deadline: e.target.value })}
                className={`w-full h-12 px-4 rounded-[16px] text-sm font-bold border-2 outline-none transition-colors focus:border-blue-500 ${
                  dm ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => view === "edit"
                    ? setEditingReq((p: any) => ({ ...p, is_required: !p.is_required }))
                    : setNewReq(p => ({ ...p, is_required: !p.is_required }))}
                  className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 cursor-pointer ${
                    (view === "edit" ? editingReq?.is_required : newReq.is_required) ? "bg-blue-600" : dm ? "bg-slate-600" : "bg-slate-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${(view === "edit" ? editingReq?.is_required : newReq.is_required) ? "translate-x-5" : "translate-x-0"}`} />
                </div>
                <span className={`text-sm font-bold ${H}`}>Mandatory</span>
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={view === "edit" ? handleEditReq : handleCreateReq}
            disabled={creating || (view === "edit" ? (!editingReq?.title || !editingReq?.deadline) : (!newReq.title || !newReq.deadline))}
            className={`h-12 w-full mt-5 rounded-[16px] text-white font-black uppercase tracking-widest text-[10px] active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg ${
              view === "edit"
                ? "bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 shadow-amber-500/25"
                : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-blue-500/25"
            }`}
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : view === "edit" ? <><Edit2 size={14} /> Save Changes</> : <><Plus size={14} /> Create Assignment</>}
          </button>
        </div>
      )}

      {/* ── Empty State ──────────────────────────────────────────────────────── */}
      {view === "list" && requirements.length === 0 && (
        <div className={`py-16 flex flex-col items-center gap-4 rounded-[28px] border-2 border-dashed ${dm ? "border-slate-700 bg-slate-800/20" : "border-slate-200 bg-slate-50/50"}`}>
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${dm ? "bg-slate-800" : "bg-slate-100"}`}>
            <FileSpreadsheet size={28} className={`opacity-40 ${S}`} />
          </div>
          <div className="text-center">
            <p className={`text-sm font-black uppercase tracking-widest ${H}`}>No Requirements Yet</p>
            <p className={`text-xs mt-1 ${S}`}>Create a requirement above to get started with {semester}.</p>
          </div>
        </div>
      )}

      {/* ── Requirement Tabs + Detail ─────────────────────────────────────────── */}
      {view === "list" && requirements.length > 0 && (() => {
        const req = requirements.find(r => r.id === selectedReqId)
        const reqSubmissions = req ? (allSubmissions[req.id] || []) : []
        const now = new Date()
        const dl = req ? new Date(req.deadline) : new Date()
        const isPastDl = now > dl

        const submittedTeachers = req ? teachers.filter(t => reqSubmissions.some(s => s.teacher_id === t.id && s.status !== "Invalidated")) : []
        const missingTeachers = req ? teachers.filter(t => !reqSubmissions.some(s => s.teacher_id === t.id && s.status !== "Invalidated")) : []
        const pct = teachers.length ? Math.round((submittedTeachers.length / teachers.length) * 100) : 0
        const allDone = submittedTeachers.length === teachers.length && teachers.length > 0
        const noneDone = submittedTeachers.length === 0

        const QUARTER_COLORS = [
          { activeBg: "bg-blue-600 border-blue-600 shadow-blue-500/25",    accent: "border-l-blue-500",    dot: "bg-blue-500"    },
          { activeBg: "bg-violet-600 border-violet-600 shadow-violet-500/25", accent: "border-l-violet-500", dot: "bg-violet-500" },
          { activeBg: "bg-amber-500 border-amber-500 shadow-amber-500/25",  accent: "border-l-amber-500",   dot: "bg-amber-500"   },
          { activeBg: "bg-rose-500 border-rose-500 shadow-rose-500/25",     accent: "border-l-rose-500",    dot: "bg-rose-500"    },
          { activeBg: "bg-emerald-500 border-emerald-500 shadow-emerald-500/25", accent: "border-l-emerald-500", dot: "bg-emerald-500" },
        ]
        const activeIdx = requirements.findIndex(r => r.id === selectedReqId)
        const activeColor = QUARTER_COLORS[activeIdx] ?? QUARTER_COLORS[0]

        return (
        <div className={`rounded-2xl border ${BD} ${dm ? "bg-slate-900/40" : "bg-slate-50/60"} p-4 sm:p-5 space-y-4`}>

          {/* ── Tab Bar ── */}
          <div className="flex flex-wrap gap-2">
            {requirements.map((r, idx) => {
              const rSubms = allSubmissions[r.id] || []
              const rDone = teachers.filter(t => rSubms.some(s => s.teacher_id === t.id && s.status !== "Invalidated")).length
              const rAll = rDone === teachers.length && teachers.length > 0
              const isActive = selectedReqId === r.id
              const color = QUARTER_COLORS[idx] ?? QUARTER_COLORS[0]
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedReqId(r.id)}
                  className={`shrink-0 flex items-center gap-2 h-11 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-md ${
                    isActive
                      ? `${color.activeBg} text-white`
                      : dm
                        ? "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
                        : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-black text-[9px] shrink-0 ${isActive ? "bg-white/20" : dm ? "bg-slate-700" : "bg-slate-100"}`}>
                    {rAll ? <CheckCircle size={11} /> : idx + 1}
                  </span>
                  <span>{r.title}</span>
                  <span className="opacity-60 text-[8px] shrink-0">{rDone}/{teachers.length}</span>
                </button>
              )
            })}
          </div>

          {/* ── Detail Panel ── */}
          {req && (
            <div className={`rounded-2xl border border-l-[3px] overflow-hidden transition-all ${BD} ${activeColor.accent} ${dm ? "bg-slate-800/60 shadow-lg shadow-black/20" : "bg-white shadow-md shadow-slate-200/80"}`}>

              {/* Req info + progress */}
              <div className="px-5 sm:px-6 py-6 sm:py-7">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-base font-black uppercase tracking-tight ${H}`}>{req.title}</p>
                      {!req.is_required && <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${dm ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"}`}>Optional</span>}
                      {allDone && <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 shrink-0">Complete</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-rose-400">
                      {isPastDl ? <AlertTriangle size={10} className="shrink-0" /> : <Clock size={10} className="shrink-0" />}
                      {isPastDl ? "Deadline passed · " : "Due · "}
                      {dl.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" · "}
                      {dl.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button"
                      onClick={() => { setEditingReq({ ...req, deadline: req.deadline ? isoToLocalInput(req.deadline) : "" }); setView("edit") }}
                      className={`h-8 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border ${dm ? "border-slate-700 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10" : "border-slate-200 text-slate-400 hover:text-amber-500 hover:bg-amber-50"}`}>
                      <Edit2 size={12} /> Edit
                    </button>
                    <button type="button" onClick={() => setDeleteReqId(req.id)}
                      className={`h-8 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border ${dm ? "border-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" : "border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50"}`}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${S}`}>{submittedTeachers.length} of {teachers.length} submitted</span>
                    <span className={`text-[10px] font-black ${allDone ? "text-emerald-500" : H}`}>{pct}%</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${dm ? "bg-slate-700" : "bg-slate-100"}`}>
                    <div className={`h-full rounded-full transition-all duration-700 ${allDone ? "bg-emerald-500" : noneDone ? dm ? "bg-slate-600" : "bg-slate-300" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>

              {/* Submitted section */}
              <div className={`border-t ${dm ? "border-slate-700/50" : "border-slate-100"}`}>
                <button type="button" onClick={() => setSubmCollapsed(p => !p)}
                  className={`w-full px-5 sm:px-6 py-3 flex items-center justify-between gap-2 transition-colors ${dm ? "hover:bg-white/[0.03]" : "hover:bg-slate-50/60"}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-emerald-500/15 flex items-center justify-center shrink-0"><CheckCircle size={11} className="text-emerald-500" /></div>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${H}`}>Submitted</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${submittedTeachers.length > 0 ? "bg-emerald-500/10 text-emerald-500" : dm ? "bg-slate-700 text-slate-500" : "bg-slate-100 text-slate-500"}`}>{submittedTeachers.length}</span>
                  </div>
                  {submCollapsed ? <ChevronDown size={13} className={S} /> : <ChevronUp size={13} className={S} />}
                </button>

                {!submCollapsed && (
                  <div className={`overflow-y-auto max-h-[280px] sm:max-h-[320px] divide-y ${dm ? "divide-slate-700/30" : "divide-slate-100"}`}>
                    {submittedTeachers.length === 0 ? (
                      <div className={`px-5 sm:px-6 py-4 sm:py-5 flex items-center gap-2 ${S}`}>
                        <FileSpreadsheet size={13} className="opacity-50" />
                        <p className="text-[9px] sm:text-[10px] font-bold">No submissions yet.</p>
                      </div>
                    ) : submittedTeachers.map(teacher => {
                      const subm = reqSubmissions.find(s => s.teacher_id === teacher.id && s.status !== "Invalidated")
                      if (!subm) return null
                      const isLate = new Date(subm.created_at) > dl
                      return (
                        <div key={teacher.id} className={`px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${dm ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/60"}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700">
                                {teacher.avatar_url
                                  // eslint-disable-next-line @next/next/no-img-element
                                  ? <img src={teacher.avatar_url} className="w-full h-full object-cover" alt="" />
                                  : <div className="w-full h-full flex items-center justify-center"><Users size={14} className={S} /></div>
                                }
                              </div>
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${dm ? "border-slate-800" : "border-white"} ${subm.status === "Accepted" ? "bg-emerald-500" : "bg-blue-500"}`} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-xs sm:text-sm font-bold truncate ${H}`}>{teacher.full_name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className={`text-[8px] sm:text-[9px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-md ${subm.status === "Accepted" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"}`}>{subm.status}</span>
                                <span className={`text-[8px] sm:text-[9px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-md ${isLate ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-500"}`}>{isLate ? "Late" : "On-Time"}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                            {subm.submission_url && (
                              <a href={subm.submission_url} target="_blank" rel="noopener noreferrer"
                                className={`h-8 sm:h-9 px-3 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 rounded-xl border transition-all hover:scale-[1.03] active:scale-[0.97] ${dm ? "border-slate-700 text-blue-400 hover:bg-slate-800" : "border-slate-200 text-blue-600 hover:bg-blue-50"}`}>
                                <FileSpreadsheet size={11} /> View
                              </a>
                            )}
                            {subm.status === "Pending" && activeFeedbackId !== subm.id && (
                              <div className="flex gap-1.5">
                                <button type="button" onClick={() => setActiveFeedbackId(subm.id)}
                                  className="h-8 sm:h-9 px-3 sm:px-4 font-black text-[9px] sm:text-[10px] uppercase tracking-widest rounded-xl text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-all hover:scale-[1.03] active:scale-[0.97]">
                                  Invalidate
                                </button>
                                <button type="button" onClick={() => handleUpdateStatus(subm.id, "Accepted", subm.teacher_id, req.title)} disabled={processing === subm.id}
                                  className="h-8 sm:h-9 px-3 sm:px-4 font-black text-[9px] sm:text-[10px] uppercase tracking-widest rounded-xl text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm shadow-emerald-500/25 transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50">
                                  {processing === subm.id ? <Loader2 size={11} className="animate-spin" /> : "Accept"}
                                </button>
                              </div>
                            )}
                            {subm.status === "Pending" && activeFeedbackId === subm.id && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <input value={feedbackMsg} onChange={e => setFeedbackMsg(e.target.value)} placeholder="Reason for invalidation…"
                                  className={`h-8 sm:h-9 px-3 text-xs sm:text-sm rounded-xl outline-none border-2 transition-colors focus:border-rose-500 min-w-0 w-40 sm:w-52 ${dm ? "bg-slate-900 border-slate-700 text-white placeholder-slate-600" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"}`} />
                                <button type="button" onClick={() => setActiveFeedbackId(null)}
                                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-colors ${dm ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
                                  <XCircle size={15} />
                                </button>
                                <button type="button" onClick={() => handleUpdateStatus(subm.id, "Invalidated", subm.teacher_id, req.title)} disabled={processing === subm.id || !feedbackMsg.trim()}
                                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all disabled:opacity-50">
                                  <Send size={14} />
                                </button>
                              </div>
                            )}
                            {subm.status !== "Pending" && subm.admin_feedback && (
                              <div className={`h-8 sm:h-9 px-3 rounded-xl border text-[9px] sm:text-[10px] flex items-center gap-1.5 max-w-[160px] sm:max-w-[200px] ${dm ? "bg-slate-900/50 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"}`} title={subm.admin_feedback}>
                                <MessageSquare size={9} className="shrink-0" />
                                <span className="truncate">{subm.admin_feedback}</span>
                              </div>
                            )}
                            <button type="button" onClick={() => handleResetSubmission(subm.id, subm.teacher_id, req.title)} disabled={processing === subm.id}
                              className={`h-8 sm:h-9 px-3 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 rounded-xl border transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 ${dm ? "border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white" : "border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}>
                              {processing === subm.id ? <Loader2 size={11} className="animate-spin" /> : <><RotateCcw size={11} /> Reset</>}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Not Yet Submitted section */}
              <div className={`border-t ${dm ? "border-slate-700/50" : "border-slate-100"}`}>
                <button type="button" onClick={() => setMissCollapsed(p => !p)}
                  className={`w-full px-5 sm:px-6 py-3 flex items-center justify-between gap-2 transition-colors ${dm ? "hover:bg-white/[0.03]" : "hover:bg-slate-50/60"}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-amber-500/15 flex items-center justify-center shrink-0"><AlertTriangle size={11} className="text-amber-500" /></div>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${H}`}>Not Yet Submitted</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${missingTeachers.length > 0 ? "bg-amber-500/10 text-amber-500" : dm ? "bg-slate-700 text-slate-500" : "bg-slate-100 text-slate-500"}`}>{missingTeachers.length}</span>
                  </div>
                  {missCollapsed ? <ChevronDown size={13} className={S} /> : <ChevronUp size={13} className={S} />}
                </button>

                {!missCollapsed && (
                  <div className={`overflow-y-auto max-h-[280px] sm:max-h-[320px] divide-y ${dm ? "divide-slate-700/30" : "divide-slate-100"}`}>
                    {missingTeachers.length === 0 ? (
                      <div className="px-5 sm:px-6 py-4 sm:py-5 flex items-center gap-2">
                        <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                        <p className="text-[9px] sm:text-[10px] font-black text-emerald-500">All teachers have submitted!</p>
                      </div>
                    ) : missingTeachers.map(teacher => (
                      <div key={teacher.id} className={`px-4 sm:px-6 py-3.5 sm:py-4 flex items-center gap-3 transition-colors ${dm ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/60"}`}>
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                          {teacher.avatar_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={teacher.avatar_url} className="w-full h-full object-cover" alt="" />
                            : <div className="w-full h-full flex items-center justify-center"><Users size={14} className={S} /></div>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs sm:text-sm font-bold truncate ${H}`}>{teacher.full_name}</p>
                          <span className={`text-[8px] sm:text-[9px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-md mt-0.5 inline-block ${isPastDl && req.is_required ? "bg-rose-500/10 text-rose-400" : dm ? "bg-slate-700/80 text-slate-500" : "bg-slate-100 text-slate-500"}`}>
                            {isPastDl && req.is_required ? "Overdue" : "Waiting for Submission"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
        )
      })()}


      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      {deleteReqId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-[28px] p-6 shadow-2xl border ${dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-rose-500" />
              </div>
              <div>
                <p className={`text-sm font-black uppercase tracking-tight ${H}`}>Delete Requirement?</p>
                <p className={`text-[9px] font-bold mt-0.5 ${S}`}>This also deletes all teacher submissions for it.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setDeleteReqId(null)}
                className={`flex-1 h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors ${dm ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-600"}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteReq}
                disabled={deleting}
                className="flex-1 h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-rose-500 hover:bg-rose-600 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <><Trash2 size={13} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
