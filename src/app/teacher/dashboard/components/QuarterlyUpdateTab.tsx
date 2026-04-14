"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, FileSpreadsheet, Send, MessageSquare, CheckCircle, XCircle, Calendar, Clock, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase/teacher-client"
import { toast } from "sonner"
import type { TeacherSession } from "../types"

interface QuarterlyUpdateTabProps {
  dm: boolean
  session: TeacherSession
}

export function QuarterlyUpdateTab({ dm, session }: QuarterlyUpdateTabProps) {
  const [requirements, setRequirements] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Submit state per requirement ID
  const [activeReqId, setActiveReqId] = useState<string | null>(null)
  const [url, setUrl] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [schoolYear, setSchoolYear] = useState("")
  const [semesterFilter, setSemesterFilter] = useState("Semester 1")

  const fetchData = async () => {
    setLoading(true)

    // Get latest active school year if empty
    let activeSY = schoolYear
    if (!activeSY) {
      const { data: sysData } = await supabase.from('system_config').select('school_year').single()
      if (sysData?.school_year) {
        activeSY = sysData.school_year
        setSchoolYear(activeSY)
      }
    }

    // Promise.all for fast parallel fetching
    const [rRes, sRes] = await Promise.all([
      supabase.from('quarterly_requirements').select('*').eq('school_year', activeSY).eq('semester', semesterFilter).order('deadline', { ascending: true }),
      supabase.from('quarterly_submissions').select('*').eq('teacher_id', session.id)
    ])

    setRequirements(rRes.data || [])
    setSubmissions(sRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()

    // Unique channel name per teacher/semester/year to avoid duplicate channel conflicts
    const channelKey = `teacher-quarterly-${session.id}-${semesterFilter}-${schoolYear || 'init'}`
    const channel = supabase.channel(channelKey)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quarterly_requirements' }, () => {
        if (schoolYear) {
          supabase.from('quarterly_requirements')
            .select('*').eq('school_year', schoolYear).eq('semester', semesterFilter).order('deadline', { ascending: true })
            .then(({ data }) => setRequirements(data || []))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quarterly_submissions', filter: `teacher_id=eq.${session.id}` }, () => {
        supabase.from('quarterly_submissions').select('*').eq('teacher_id', session.id)
          .then(({ data }) => setSubmissions(data || []))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [semesterFilter, schoolYear])

  const handleSubmit = async (reqId: string) => {
    if (!url.trim() && !file) return toast.error("Please enter a link or upload a file")
    setSubmitting(true)

    // Check if there is already a submission that isn't invalidated
    const existing = submissions.find(s => s.requirement_id === reqId && s.status !== 'Invalidated')
    if (existing) {
      setSubmitting(false)
      return toast.error("You already have an active submission for this requirement.")
    }

    let finalUrl = url.trim()

    if (file) {
      const toastId = toast.loading("Uploading file...")
      // Keep original name but add timestamp to prevent collision
      const safeOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `${session.id}-${Date.now()}-${safeOriginalName}`
      const filePath = `submissions/${fileName}`
      const { error: uploadError } = await supabase.storage.from('submissions').upload(filePath, file)
      if (uploadError) {
        toast.error("File upload failed: " + uploadError.message, { id: toastId })
        setSubmitting(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('submissions').getPublicUrl(filePath)
      finalUrl = publicUrl
      toast.dismiss(toastId)
    }

    const { error } = await supabase.from('quarterly_submissions').insert([{
      teacher_id: session.id,
      requirement_id: reqId,
      submission_url: finalUrl,
      status: 'Pending'
    }])

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Submitted successfully!")
      setActiveReqId(null)
      setUrl("")
      setFile(null)
      fetchData()
    }
    setSubmitting(false)
  }

  const head = dm ? "text-white" : "text-slate-900"
  const sub = dm ? "text-slate-400" : "text-slate-500"
  const card = dm ? "border-slate-700/60 bg-slate-900/50" : "border-slate-200 bg-white"

  // Checking "Near Deadline" globally for this teacher
  // Requirements that don't have a valid submission, and whose deadline is within 3 days.
  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000))
  const urgentRequirements = requirements.filter(req => {
    const subm = submissions.find(s => s.requirement_id === req.id && s.status !== 'Invalidated')
    if (subm) return false // They handled it
    const dl = new Date(req.deadline)
    return dl > now && dl <= threeDaysFromNow && req.is_required
  })

  return (
    <div className="animate-in fade-in duration-300 space-y-6">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[32px] p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-blue-500/20 gap-4">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 blur-2xl rounded-full" />
        <div className="relative z-10 w-full sm:w-auto">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">Academic Requirements</h2>
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-blue-200 mt-1">Submission of Requirements</p>
        </div>
        <div className="relative z-10 shrink-0 w-full sm:w-auto">
          <select value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)}
            className="w-full sm:w-auto h-12 px-4 rounded-xl bg-white/10 text-white font-black uppercase tracking-widest text-[10px] outline-none backdrop-blur-sm border border-white/20 transition-colors focus:bg-white/20">
            <option value="Semester 1" className="text-slate-900">Semester 1</option>
            <option value="Semester 2" className="text-slate-900">Semester 2</option>
          </select>
        </div>
      </div>

      {urgentRequirements.length > 0 && (
        <div className="p-5 sm:p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 shadow-sm animate-in zoom-in-95">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="text-amber-500 w-5 h-5" />
            </div>
            <div>
              <h3 className="text-amber-500 font-black uppercase tracking-tight text-sm">Action Required: Deadlines Approaching</h3>
              <p className={`text-xs font-medium mt-1 ${dm ? "text-amber-200/70" : "text-amber-700/80"}`}>
                You have {urgentRequirements.length} required submission(s) due within the next 3 days. Please fulfill them below.
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
      ) : requirements.length === 0 ? (
        <div className={`p-16 rounded-[32px] border text-center ${card}`}>
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 ${dm ? "bg-slate-800" : "bg-slate-100"}`}>
            <FileSpreadsheet size={28} className={`opacity-40 ${sub}`} />
          </div>
          <p className={`text-sm font-black uppercase tracking-widest ${head}`}>No Requirements Assigned</p>
          <p className={`text-xs mt-1 ${sub}`}>Admins have not scheduled any requirements for {semesterFilter}.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requirements.map(req => {
            const subm = submissions.find(s => s.requirement_id === req.id && s.status !== 'Invalidated') || submissions.find(s => s.requirement_id === req.id)
            const dl = new Date(req.deadline)
            const isPastDl = now > dl

            let statusMarkup = null
            let canSubmit = false

            if (subm) {
              // They submitted!
              const isLate = new Date(subm.created_at) > dl
              canSubmit = subm.status === 'Invalidated'
              statusMarkup = (
                <div className="flex flex-col md:items-end gap-2 text-right">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${subm.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      subm.status === 'Invalidated' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                        'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                      }`}>{subm.status}</span>

                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${isLate ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      }`}>{isLate ? "LATE" : "ON-TIME"}</span>
                  </div>
                  {subm.admin_feedback && (
                    <div className={`text-[10px] font-medium flex items-center gap-1.5 ${dm ? "text-slate-400" : "text-slate-500"}`}>
                      <MessageSquare size={10} /> Admins: "{subm.admin_feedback}"
                    </div>
                  )}
                </div>
              )
            } else {
              // Missing
              canSubmit = true
              statusMarkup = (
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${isPastDl ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : dm ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                    }`}>{isPastDl ? "OVERDUE" : "AWAITING SUBMISSION"}</span>
                </div>
              )
            }

            const isActiveForm = activeReqId === req.id

            return (
              <div key={req.id} className={`rounded-[32px] border overflow-hidden ${card} transition-all`}>
                <div className={`p-5 md:p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between`}>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className={`text-lg font-black tracking-tight ${head}`}>{req.title}</h3>
                      {!req.is_required && <span className="bg-slate-500/10 text-slate-500 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Optional</span>}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-rose-500">
                      <Calendar size={12} /> Due: {dl.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-col md:items-end gap-3 shrink-0 rounded-2xl md:rounded-none p-4 md:p-0 bg-slate-50 md:bg-transparent dark:bg-slate-800/30 dark:md:bg-transparent">
                    {statusMarkup}
                    {canSubmit && (
                      <button onClick={() => { setActiveReqId(isActiveForm ? null : req.id); setUrl(""); setFile(null) }}
                        className={`h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                           ${isActiveForm ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20"}`}>
                        {isActiveForm ? "Cancel" : (subm?.status === 'Invalidated' ? "Re-Submit" : "Submit File")}
                      </button>
                    )}
                  </div>
                </div>

                {/* Upload Form Expansion */}
                {isActiveForm && (
                  <div className={`p-6 border-t ${dm ? "border-slate-700/50 bg-slate-900/40" : "border-slate-200 bg-slate-50"} animate-in slide-in-from-top-4`}>
                    <div className="max-w-2xl">
                      <h4 className={`text-xs font-black uppercase mb-4 ${head}`}>Complete Requirement</h4>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className={`text-[9px] font-black uppercase tracking-[0.2em] ${sub}`}>Submission Link (Google Drive, Forms)</label>
                          <input value={url} onChange={e => setUrl(e.target.value)} disabled={!!file} placeholder={file ? "Disabled—using file upload" : "https://docs.google.com/..."}
                            className={`w-full h-11 px-4 rounded-xl text-sm font-bold border transition-colors outline-none focus:border-blue-500 ${dm ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"} disabled:opacity-50`} />
                        </div>

                        <div className="flex items-center gap-4">
                          <div className={`h-px flex-1 ${dm ? "bg-slate-800" : "bg-slate-200"}`} />
                          <span className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>OR UPLOAD FILE</span>
                          <div className={`h-px flex-1 ${dm ? "bg-slate-800" : "bg-slate-200"}`} />
                        </div>

                        <div className="space-y-1.5 relative">
                          <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} disabled={!!url.trim()}
                            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, .pdf"
                            className={`w-full p-2.5 rounded-xl text-sm font-bold border transition-colors outline-none focus:border-blue-500 disabled:opacity-50
                            file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:uppercase file:tracking-[0.2em] file:bg-blue-500/10 file:text-blue-500 hover:file:bg-blue-500/20
                            ${dm ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"}`} />
                        </div>

                        <button onClick={() => handleSubmit(req.id)} disabled={submitting || (!url.trim() && !file)}
                          className="h-11 w-full mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                          {submitting ? <Loader2 size={16} className="animate-spin" /> : <><Send size={14} /> Submit Final</>}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
