"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Inbox, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronUp, Loader2, Ticket,
  AlertCircle, RefreshCw, History, ShieldAlert,
  CircleCheck, CircleX
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { OptimizedImage } from "./OptimizedImage"

const MAX_TRIES = 3

interface EditRequest {
  id: string
  student_id: string
  reason: string
  status: "Pending" | "Approved" | "Rejected"
  created_at: string
  updated_at?: string | null
  student?: {
    id: string
    first_name: string
    last_name: string
    lrn: string
    strand: string
    profile_picture?: string
    two_by_two_url?: string
    section?: string
  }
}

// student_id → total requests made (Pending + Approved + Rejected = tries consumed)
// Rule:
//   - Approved  → try is CONSUMED  (student got to re-enroll)
//   - Rejected  → try is CONSUMED  (admin said no, still used up)
//   - Pending   → NOT yet consumed (not reviewed yet)
type TryMap = Record<string, number>

interface Props {
  isDarkMode: boolean
  onApprove: (student: any, requestId: string) => Promise<void>
  onDeny:    (student: any, requestId: string) => Promise<void>
}

type Tab = "pending" | "history"

export function EditRequestsPanel({ isDarkMode, onApprove, onDeny }: Props) {
  const [pending,      setPending]    = useState<EditRequest[]>([])
  const [history,      setHistory]    = useState<EditRequest[]>([])
  const [tryMap,       setTryMap]     = useState<TryMap>({})
  const [loading,      setLoading]    = useState(true)
  const [tableError,   setTableError] = useState(false)
  const [tab,          setTab]        = useState<Tab>("pending")
  const [expanded, setExpanded] = useState(() => {
    try { const v = sessionStorage.getItem("admin_queue_expanded"); return v === null ? true : v === "true" } catch { return true }
  })
  const [processingId, setProcessing] = useState<string | null>(null)

  // Persist collapsed state
  const toggleExpanded = () => setExpanded(v => {
    const next = !v
    try { sessionStorage.setItem("admin_queue_expanded", String(next)) } catch {}
    return next
  })

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setTableError(false)
    try {
      const [pendingRes, historyRes, consumedRes] = await Promise.all([
        // Pending tickets
        supabase
          .from("edit_requests")
          .select("*, student:students(id,first_name,last_name,lrn,strand,profile_picture,two_by_two_url,section)")
          .eq("status", "Pending")
          .order("created_at", { ascending: false }),

        // History: Approved + Rejected
        supabase
          .from("edit_requests")
          .select("*, student:students(id,first_name,last_name,lrn,strand,profile_picture,two_by_two_url,section)")
          .in("status", ["Approved", "Rejected"])
          .order("updated_at", { ascending: false })
          .limit(60),

        // ── TRY COUNT: Approved OR Rejected = consumed ──────────────────────
        // A try is consumed once the admin has REVIEWED it (approved or rejected).
        // Pending requests are NOT yet consumed.
        supabase
          .from("edit_requests")
          .select("student_id")
          .in("status", ["Approved", "Rejected"]),
      ])

      if (pendingRes.error) {
        if (pendingRes.error.code === "42P01") { setTableError(true); return }
        throw pendingRes.error
      }

      setPending(pendingRes.data || [])
      setHistory(historyRes.data || [])

      // Build try map: count reviewed (consumed) requests per student
      const map: TryMap = {}
      for (const row of consumedRes.data || []) {
        map[row.student_id] = (map[row.student_id] ?? 0) + 1
      }
      setTryMap(map)
    } catch (err: any) {
      console.error("EditRequestsPanel:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const ch = supabase
      .channel("edit_requests_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "edit_requests" }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchAll])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleApprove = async (req: EditRequest) => {
    if (!req.student) return
    const triesConsumed = tryMap[req.student_id] ?? 0
    if (triesConsumed >= MAX_TRIES) return   // UI guard (server also checks)
    setProcessing(req.id)
    try {
      await onApprove({ ...req.student, id: req.student_id }, req.id)
      await fetchAll()
    } finally { setProcessing(null) }
  }

  const handleDeny = async (req: EditRequest) => {
    if (!req.student) return
    setProcessing(req.id)
    try {
      await onDeny({ ...req.student, id: req.student_id }, req.id)
      await fetchAll()
    } finally { setProcessing(null) }
  }

  // ── Theme ────────────────────────────────────────────────────────────────────
  const bg       = isDarkMode ? "bg-slate-900/80"    : "bg-white"
  const border   = isDarkMode ? "border-slate-800"    : "border-slate-200"
  const textMain = isDarkMode ? "text-white"          : "text-slate-900"
  const textSub  = isDarkMode ? "text-slate-400"      : "text-slate-500"
  const innerBg  = isDarkMode ? "bg-slate-800/50"     : "bg-slate-50"
  const divider  = isDarkMode ? "divide-slate-800/70" : "divide-slate-100"

  const hasPending = pending.length > 0

  // ── Try dots: filled = consumed, empty = remaining ────────────────────────
  const TryDots = ({ studentId }: { studentId: string }) => {
    const consumed  = tryMap[studentId] ?? 0
    const remaining = MAX_TRIES - consumed
    return (
      <div className="flex items-center gap-1" title={`${consumed} consumed, ${remaining} remaining`}>
        {Array.from({ length: MAX_TRIES }).map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full transition-all ${
            i < consumed
              ? "bg-amber-500 ring-2 ring-amber-500/20"
              : isDarkMode ? "bg-slate-700" : "bg-slate-200"
          }`} />
        ))}
      </div>
    )
  }

  // ── Try badge ─────────────────────────────────────────────────────────────
  const TryBadge = ({ studentId }: { studentId: string }) => {
    const consumed  = tryMap[studentId] ?? 0
    const remaining = MAX_TRIES - consumed
    const exhausted = remaining <= 0
    return (
      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[8px] font-black uppercase tracking-wider ${
        exhausted
          ? "bg-red-500/10 border-red-500/25 text-red-500"
          : remaining === 1
            ? "bg-amber-500/10 border-amber-500/25 text-amber-600"
            : isDarkMode
              ? "bg-slate-700 border-slate-600 text-slate-300"
              : "bg-slate-100 border-slate-200 text-slate-500"
      }`}>
        {exhausted && <ShieldAlert size={9} />}
        {exhausted ? "No tries left" : `${remaining} tr${remaining === 1 ? "y" : "ies"} left`}
        <span className="opacity-40">/{MAX_TRIES}</span>
      </div>
    )
  }

  return (
    <div
      className={`rounded-[28px] border overflow-hidden transition-all duration-500 ${bg} ${border}`}
      style={{ boxShadow: isDarkMode ? "0 8px 40px rgba(0,0,0,0.5)" : "0 4px 28px rgba(0,0,0,0.07)" }}
    >
      {/* ── Collapsible Header (div, not button — avoids nested button error) ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleExpanded}
        onKeyDown={e => e.key === "Enter" && toggleExpanded()}
        className="w-full flex items-center justify-between px-5 sm:px-6 py-4 cursor-pointer hover:opacity-80 transition-opacity select-none"
      >
        <div className="flex items-center gap-3">
          {/* Pulsing ticket icon */}
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center relative shrink-0 ${hasPending ? "bg-amber-500/20" : isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
            <Ticket size={18} className={hasPending ? "text-amber-500" : textSub} />
            {hasPending && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
            )}
          </div>

          <div className="text-left min-w-0">
            <p className={`text-[9px] font-black uppercase tracking-[0.25em] ${textSub}`}>Admin Queue</p>
            <p className={`text-base font-black uppercase leading-none mt-0.5 ${textMain}`}>Re-Enrollment Requests</p>
          </div>

          {hasPending && (
            <span className="flex items-center justify-center min-w-[26px] h-6 px-2 rounded-full bg-amber-500 text-white text-[10px] font-black shadow-sm shadow-amber-500/30">
              {pending.length}
            </span>
          )}

          {loading && <Loader2 size={13} className="animate-spin text-amber-500 ml-1" />}
        </div>

        {/* Right controls — divs to avoid nesting */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); fetchAll() }}
            onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); fetchAll() } }}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:rotate-180 duration-500 cursor-pointer ${isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
          >
            <RefreshCw size={13} className={textSub} />
          </div>
          {expanded ? <ChevronUp size={16} className={textSub} /> : <ChevronDown size={16} className={textSub} />}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      {expanded && (
        <div className={`border-t ${border}`}>

          {/* Table missing */}
          {tableError ? (
            <div className="flex flex-col items-center gap-4 py-10 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <AlertCircle size={20} className="text-rose-500" />
              </div>
              <p className={`text-[11px] font-black uppercase tracking-widest ${textMain}`}>Table Not Found</p>
              <p className={`text-[10px] leading-relaxed max-w-xs ${textSub}`}>
                The <code className="font-mono bg-rose-500/10 text-rose-400 px-1 py-0.5 rounded text-[9px]">edit_requests</code> table doesn't exist in Supabase yet.
              </p>
            </div>

          ) : (
            <>
              {/* ── Tab bar ── */}
              <div className="flex gap-1.5 px-5 sm:px-6 pt-3 pb-1">
                {(["pending", "history"] as Tab[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                      tab === t
                        ? "bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/25"
                        : isDarkMode
                          ? "border-slate-700 text-slate-400 hover:bg-slate-800"
                          : "border-slate-200 text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    {t === "pending" ? (
                      <>
                        <Ticket size={10} /> Pending
                        {hasPending && (
                          <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[7px] font-black ${tab === "pending" ? "bg-white/25 text-white" : "bg-amber-500 text-white"}`}>
                            {pending.length}
                          </span>
                        )}
                      </>
                    ) : (
                      <><History size={10} /> History</>
                    )}
                  </button>
                ))}
              </div>

              {/* ═══ PENDING TAB ═══ */}
              {tab === "pending" && (
                loading ? (
                  <div className={`divide-y ${divider} mt-2`}>
                    {[1,2].map(i => (
                      <div key={i} className="px-6 py-5 flex items-center gap-4 animate-pulse">
                        <div className={`w-11 h-11 rounded-2xl shrink-0 ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`} />
                        <div className="flex-1 space-y-2">
                          <div className={`h-3 rounded-full w-36 ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`} />
                          <div className={`h-2 rounded-full w-24 ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pending.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
                    <div className={`w-14 h-14 rounded-3xl flex items-center justify-center ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                      <Inbox size={26} className={textSub} />
                    </div>
                    <div className="text-center">
                      <p className={`text-[11px] font-black uppercase tracking-widest ${textMain}`}>All Clear</p>
                      <p className={`text-[10px] mt-1 ${textSub}`}>No pending re-enrollment requests</p>
                    </div>
                    <p className={`text-[9px] text-center max-w-sm leading-relaxed ${textSub} opacity-60`}>
                      Students submit requests from the <strong>Status page</strong>. Each student gets{" "}
                      <strong className="text-amber-500">{MAX_TRIES} tries</strong> total — each approval or rejection consumes one try.
                    </p>
                  </div>
                ) : (
                  <div className={`divide-y ${divider} mt-2`}>
                    {pending.map(req => {
                      const consumed  = tryMap[req.student_id] ?? 0
                      const exhausted = consumed >= MAX_TRIES
                      return (
                        <div key={req.id} className="px-5 sm:px-6 py-5">

                          {/* Student row */}
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-amber-500/25 shrink-0">
                              <OptimizedImage
                                src={req.student?.two_by_two_url || req.student?.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${req.student?.last_name ?? "student"}`}
                                alt="Student"
                                className="w-full h-full object-cover"
                                fallback={`https://api.dicebear.com/7.x/initials/svg?seed=${req.student?.last_name ?? "student"}`}
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div className="min-w-0">
                                  <p className={`text-sm font-black uppercase leading-tight truncate ${textMain}`}>
                                    {req.student?.last_name}, {req.student?.first_name}
                                  </p>
                                  <p className={`text-[9px] font-mono font-bold tracking-widest mt-0.5 ${textSub}`}>
                                    LRN: {req.student?.lrn}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Clock size={9} className="text-amber-500" />
                                  <p className="text-[8px] font-bold text-amber-500">
                                    {new Date(req.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
                                  </p>
                                </div>
                              </div>

                              {/* Badges row */}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider ${isDarkMode ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                                  {req.student?.strand}
                                </span>
                                {req.student?.section && (
                                  <span className={`text-[8px] font-bold ${textSub}`}>· {req.student.section}</span>
                                )}
                                <TryDots studentId={req.student_id} />
                                <TryBadge studentId={req.student_id} />
                              </div>
                            </div>
                          </div>

                          {/* Reason */}
                          <div className={`mt-3 px-4 py-3 rounded-2xl border ${innerBg} ${border}`}>
                            <p className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1.5 ${textSub}`}>Student's Reason</p>
                            <p className={`text-[11px] sm:text-xs font-medium leading-relaxed ${textMain}`}>"{req.reason}"</p>
                          </div>

                          {/* Exhausted warning */}
                          {exhausted && (
                            <div className="mt-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                              <ShieldAlert size={14} className="text-red-500 shrink-0" />
                              <p className="text-[10px] font-bold text-red-500 leading-snug">
                                This student has used all {MAX_TRIES} tries (approvals + rejections combined). No further approvals allowed.
                              </p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 mt-3">
                            <button
                              type="button"
                              onClick={() => handleApprove(req)}
                              disabled={processingId === req.id || exhausted}
                              className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed border ${
                                exhausted
                                  ? "bg-slate-500/10 border-slate-500/20 text-slate-500"
                                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/20"
                              }`}
                            >
                              {processingId === req.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                              Approve Re-enrollment
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeny(req)}
                              disabled={processingId === req.id}
                              className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-50 border border-rose-500/20"
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </div>

                          {!exhausted && (
                            <p className={`text-[8px] mt-2 text-center leading-relaxed ${textSub} opacity-50`}>
                              Both approvals and rejections consume a try.{" "}
                              <span className="text-amber-500 font-bold">{MAX_TRIES - (tryMap[req.student_id] ?? 0)} remaining.</span>
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              )}

              {/* ═══ HISTORY TAB ═══ */}
              {tab === "history" && (
                loading ? (
                  <div className={`divide-y ${divider} mt-2`}>
                    {[1,2,3].map(i => (
                      <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                        <div className={`w-9 h-9 rounded-xl shrink-0 ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`} />
                        <div className="flex-1 space-y-1.5">
                          <div className={`h-2.5 rounded-full w-28 ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`} />
                          <div className={`h-2 rounded-full w-20 ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 px-6">
                    <div className={`w-14 h-14 rounded-3xl flex items-center justify-center ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                      <History size={26} className={textSub} />
                    </div>
                    <p className={`text-[11px] font-black uppercase tracking-widest ${textMain}`}>No History Yet</p>
                    <p className={`text-[10px] ${textSub}`}>Reviewed requests will show up here</p>
                  </div>
                ) : (
                  <div className={`divide-y ${divider} mt-2`}>
                    {history.map(req => {
                      const isApproved = req.status === "Approved"
                      return (
                        <div key={req.id} className="px-5 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-xl overflow-hidden border-2 shrink-0 ${isApproved ? "border-emerald-500/25" : "border-rose-500/25"}`}>
                              <OptimizedImage
                                src={req.student?.two_by_two_url || req.student?.profile_picture || `https://api.dicebear.com/7.x/initials/svg?seed=${req.student?.last_name ?? "student"}`}
                                alt="Student"
                                className="w-full h-full object-cover"
                                fallback={`https://api.dicebear.com/7.x/initials/svg?seed=${req.student?.last_name ?? "student"}`}
                              />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] font-black uppercase leading-tight truncate ${textMain}`}>
                                {req.student?.last_name}, {req.student?.first_name}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={`text-[8px] font-mono font-bold tracking-widest ${textSub}`}>
                                  LRN: {req.student?.lrn}
                                </span>
                                <TryDots studentId={req.student_id} />
                              </div>
                            </div>

                            {/* Status + date */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[8px] font-black uppercase tracking-wider border ${
                                isApproved
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                                  : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                              }`}>
                                {isApproved ? <CircleCheck size={9} /> : <CircleX size={9} />}
                                {req.status}
                              </div>
                              <p className={`text-[8px] font-bold ${textSub}`}>
                                {new Date(req.updated_at || req.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
                              </p>
                            </div>
                          </div>

                          {/* Reason excerpt */}
                          <p className={`mt-2 text-[9px] font-medium leading-relaxed ${textSub} line-clamp-2 pl-[52px]`}>
                            "{req.reason}"
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}