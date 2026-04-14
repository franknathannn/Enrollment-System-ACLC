"use client"

import { useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  Loader2, Trash2, Zap, CheckCircle2, XCircle,
  AlertTriangle, Database, Users, RefreshCw, Terminal,
} from "lucide-react"
import { clearMockData } from "./actions"

import { generateStudent } from "@/lib/mock-utils"

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 20   // rows per Supabase insert call
const DELAY_MS   = 300  // ms between chunks — gentle on the DB

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type LogEntry = {
  type: "info" | "success" | "error" | "warn"
  msg:  string
  ts:   number
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const BATCH_OPTIONS = [100, 200, 300, 400, 500, 600, 700]

export default function MockPage() {
  const [selectedCount, setSelectedCount] = useState(100)
  const [isGenerating,  setIsGenerating]  = useState(false)
  const [isClearing,    setIsClearing]    = useState(false)
  const [logs,          setLogs]          = useState<LogEntry[]>([])
  const [progress,      setProgress]      = useState<{ done: number; total: number } | null>(null)
  const activeSYRef = useRef<string>("")

  const log = useCallback((type: LogEntry["type"], msg: string) => {
    setLogs(prev => [{ type, msg, ts: Date.now() }, ...prev].slice(0, 300))
  }, [])

  /** Fetch and cache the active school year from system_config */
  const getSY = useCallback(async (): Promise<string> => {
    if (activeSYRef.current) return activeSYRef.current
    const { data } = await supabase.from("system_config").select("school_year").single()
    const sy = data?.school_year
      || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
    activeSYRef.current = sy
    return sy
  }, [])

  // ── GENERATE ───────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (isGenerating || isClearing) return
    setIsGenerating(true)
    setLogs([])
    setProgress({ done: 0, total: selectedCount })

    try {
      const sy      = await getSY()
      const batchId = Date.now().toString().slice(-6)
      log("info", `Batch ${batchId} · SY ${sy} · ${selectedCount} students`)

      // Generate all rows
      const students = Array.from({ length: selectedCount }, (_, i) =>
        generateStudent(i + 1, batchId, sy)
      )

      // Remove intra-batch LRN duplicates (very unlikely but safe)
      const seen: Set<string> = new Set()
      const deduped = students.filter(s => {
        if (seen.has(s.lrn)) return false
        seen.add(s.lrn)
        return true
      })
      if (deduped.length < students.length)
        log("warn", `Removed ${students.length - deduped.length} duplicate LRNs from batch`)

      // Split into chunks
      const chunks: typeof deduped[] = []
      for (let i = 0; i < deduped.length; i += CHUNK_SIZE)
        chunks.push(deduped.slice(i, i + CHUNK_SIZE))

      let inserted = 0
      let skipped  = 0

      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci]
        const { data, error } = await supabase
          .from("students")
          .insert(chunk)
          .select("id")

        if (error) {
          // Retry individually to rescue non-conflicting rows from the chunk
          log("warn", `Chunk ${ci + 1}/${chunks.length} conflict — retrying one-by-one...`)
          for (const student of chunk) {
            const { error: sErr } = await supabase.from("students").insert(student)
            if (sErr) {
              skipped++
              log("error", `Skip LRN ${student.lrn}: ${sErr.message.slice(0, 70)}`)
            } else {
              inserted++
            }
          }
        } else {
          inserted += data?.length ?? chunk.length
          log("success", `Chunk ${ci + 1}/${chunks.length} · +${chunk.length}`)
        }

        setProgress({ done: inserted + skipped, total: deduped.length })
        await sleep(DELAY_MS)
      }

      log("info", "─────────────────────────────────")
      log("success", `Done · Inserted: ${inserted}   Skipped: ${skipped}`)
    } catch (err: any) {
      log("error", `Fatal: ${err.message}`)
    } finally {
      setIsGenerating(false)
      setProgress(null)
    }
  }, [isGenerating, isClearing, selectedCount, getSY, log])

  // ── CLEAR — strictly targets mock = true rows only ─────────────────────────
  const handleClear = useCallback(async () => {
    if (isGenerating || isClearing) return
    const ok = window.confirm(
      "⚠️ This will permanently DELETE all rows where mock = true.\n\nReal students are NEVER affected.\n\nContinue?"
    )
    if (!ok) return

    setIsClearing(true)
    setLogs([])
    log("warn", "Targeting rows where mock = true...")

    try {
      let total = 0
      let round = 0

      while (true) {
        // 1. Fetch a batch of mock student IDs
        const { data: batch, error: fetchErr } = await supabase
          .from("students")
          .select("id")
          .eq("mock", true)
          .limit(200)

        if (fetchErr) { log("error", `Fetch: ${fetchErr.message}`); break }
        if (!batch || batch.length === 0) break

        const ids = batch.map(r => r.id)

        // 2. Use Server Action with Service Role Key to bypass RLS securely
        const deletedCount = await clearMockData(ids)

        total += deletedCount
        round++
        log("info", `Round ${round} · removed ${ids.length} (total: ${total})`)
        await sleep(200)

        if (ids.length < 200) break
      }

      log("success", `✓ Cleared ${total} mock rows (mock = true only)`)
    } catch (err: any) {
      log("error", `Fatal: ${err.message}`)
    } finally {
      setIsClearing(false)
    }
  }, [isGenerating, isClearing, log])

  const isBusy      = isGenerating || isClearing
  const progressPct = progress
    ? Math.round((progress.done / progress.total) * 100)
    : 0

  return (
    <div className="min-h-screen bg-slate-950 text-white font-mono">

      {/* GRID BACKGROUND */}
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59,130,246,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* HEADER */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Database size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold uppercase tracking-[0.25em] text-white">
                Mock Data Generator
              </h1>
              <p className="text-[9px] text-slate-600 uppercase tracking-[0.4em]">
                Enrollment System · Dev Tool · mock = true
              </p>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-blue-500/40 via-blue-500/10 to-transparent" />
        </div>

        {/* WARNING */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
              Dev Environment Only
            </p>
            <p className="text-[10px] text-amber-300/60 leading-relaxed">
              All generated rows are tagged{" "}
              <span className="text-amber-300 font-bold">mock = true</span>.
              Clear only removes those rows — real student data is never touched.
              2×2 photos are real human portraits from{" "}
              <span className="text-amber-300">randomuser.me</span>.
            </p>
          </div>
        </div>

        {/* BATCH SIZE SELECTOR */}
        <div className="space-y-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-slate-600">
            Batch Size
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {BATCH_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => !isBusy && setSelectedCount(n)}
                disabled={isBusy}
                className={cn(
                  "h-12 rounded-xl border-2 font-bold text-sm",
                  "transition-all duration-150 active:scale-[0.97]",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  selectedCount === n
                    ? "border-blue-500 bg-blue-600/20 text-blue-300 shadow-[0_0_18px_rgba(59,130,246,0.25)]"
                    : "border-white/8 bg-white/[0.03] text-slate-500 hover:border-white/20 hover:text-slate-300"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Records",   value: selectedCount.toLocaleString(),                                    icon: <Users      size={13} /> },
            { label: "Chunks",    value: `${Math.ceil(selectedCount / CHUNK_SIZE)} × ${CHUNK_SIZE}`,        icon: <Database   size={13} /> },
            { label: "Est. Time", value: `~${Math.ceil((selectedCount / CHUNK_SIZE) * DELAY_MS / 1000)}s`, icon: <RefreshCw  size={13} /> },
          ].map(item => (
            <div key={item.label} className="p-3 rounded-xl border border-white/8 bg-white/[0.03]">
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                {item.icon}
                <span className="text-[8px] uppercase tracking-widest">{item.label}</span>
              </div>
              <p className="text-sm font-bold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        {/* PROGRESS BAR */}
        {progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-600 uppercase tracking-widest">Inserting</span>
              <span className="font-bold text-blue-400">
                {progress.done} / {progress.total} ({progressPct}%)
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleGenerate}
            disabled={isBusy}
            className={cn(
              "flex-1 h-14 rounded-xl border-2 flex items-center justify-center gap-3",
              "font-bold text-sm uppercase tracking-[0.15em]",
              "transition-all duration-200 active:scale-[0.98]",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "border-blue-500 bg-blue-600/15 text-blue-300",
              "hover:bg-blue-600/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]"
            )}
          >
            {isGenerating
              ? <><Loader2 size={17} className="animate-spin" /> Generating...</>
              : <><Zap size={17} /> Generate {selectedCount} Students</>
            }
          </button>

          <button
            onClick={handleClear}
            disabled={isBusy}
            className={cn(
              "sm:w-44 h-14 rounded-xl border-2 flex items-center justify-center gap-3",
              "font-bold text-sm uppercase tracking-[0.15em]",
              "transition-all duration-200 active:scale-[0.98]",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "border-red-500/30 bg-red-500/5 text-red-400",
              "hover:bg-red-500/10 hover:border-red-500/50"
            )}
          >
            {isClearing
              ? <><Loader2 size={17} className="animate-spin" /> Clearing...</>
              : <><Trash2 size={17} /> Clear Mock</>
            }
          </button>
        </div>

        {/* TERMINAL LOG */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-600">
              <Terminal size={11} />
              <span className="text-[9px] uppercase tracking-widest">Output</span>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/50 overflow-hidden">
              <div className="p-4 space-y-1 max-h-64 overflow-y-auto text-[11px] leading-relaxed">
                {logs.map((entry, i) => (
                  <div key={`${entry.ts}-${i}`} className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">
                      {entry.type === "success" && <CheckCircle2  size={10} className="text-green-400" />}
                      {entry.type === "error"   && <XCircle       size={10} className="text-red-400"   />}
                      {entry.type === "warn"    && <AlertTriangle size={10} className="text-amber-400" />}
                      {entry.type === "info"    && <span className="text-blue-500 font-bold">›</span>}
                    </span>
                    <span className={cn(
                      entry.type === "success" ? "text-green-400" : "",
                      entry.type === "error"   ? "text-red-400"   : "",
                      entry.type === "warn"    ? "text-amber-400" : "",
                      entry.type === "info"    ? "text-slate-400" : "",
                    )}>
                      {entry.msg}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <p className="text-[8px] text-slate-700 text-center uppercase tracking-widest pb-4">
          Chunk: {CHUNK_SIZE} rows · Delay: {DELAY_MS}ms · Filter: mock = true
        </p>

      </div>
    </div>
  )
}