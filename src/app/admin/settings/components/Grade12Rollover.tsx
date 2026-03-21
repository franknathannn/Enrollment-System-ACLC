"use client"

import { useState } from "react"
import { GraduationCap, AlertTriangle, CheckCircle2, Loader2, Users, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { rolloverToGrade12 } from "@/lib/actions/settings"
import { toast } from "sonner"

interface Grade12RolloverProps {
  isDarkMode: boolean
  schoolYear: string
}

export function Grade12Rollover({ isDarkMode, schoolYear }: Grade12RolloverProps) {
  const [isRolling, setIsRolling] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState<{ promoted: number; overAge: number } | null>(null)

  const handleRollover = async () => {
    setIsRolling(true)
    const toastId = toast.loading("Processing rollover...")
    try {
      const res = await rolloverToGrade12()
      if (!res.success) {
        toast.error(res.error || "Rollover failed.", { id: toastId })
        return
      }
      setResult({ promoted: res.promoted, overAge: res.overAge })
      toast.success(
        `Rollover complete. ${res.promoted} student(s) promoted to G12. ${res.overAge > 0 ? `${res.overAge} student(s) flagged as overage (Grade 13+).` : ""}`,
        { id: toastId, duration: 6000 }
      )
    } catch (err) {
      toast.error("Rollover failed. Please try again.", { id: toastId })
    } finally {
      setIsRolling(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div
      className={`rounded-[32px] border p-6 md:p-8 space-y-5 transition-colors duration-500 ${
        isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-100 shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
          <GraduationCap className="text-white w-6 h-6" />
        </div>
        <div>
          <h3
            className={`font-black text-sm uppercase tracking-widest ${
              isDarkMode ? "text-white" : "text-slate-800"
            }`}
          >
            Grade 12 Rollover
          </h3>
          <p
            className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5 ${
              isDarkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Promote all current G11 accepted students to Grade 12
          </p>
        </div>
      </div>

      {/* Info */}
      <div
        className={`rounded-2xl p-4 space-y-2 text-[10px] font-bold uppercase tracking-wider leading-relaxed ${
          isDarkMode
            ? "bg-slate-800/50 text-slate-400 border border-slate-700"
            : "bg-slate-50 text-slate-500 border border-slate-200"
        }`}
      >
        <p className="flex items-start gap-2">
          <ArrowRight size={12} className="text-emerald-500 mt-0.5 shrink-0" />
          All Approved / Accepted Grade 11 students will be promoted to Grade 12.
        </p>
        <p className="flex items-start gap-2">
          <ArrowRight size={12} className="text-emerald-500 mt-0.5 shrink-0" />
          Their sections will be cleared — reassign them to G12 sections manually.
        </p>
        <p className="flex items-start gap-2">
          <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
          Students enrolled 2+ years ago (Grade 13+) will NOT be promoted and will remain in archives only.
        </p>
        <p className="flex items-start gap-2">
          <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
          Current school year: <span className="text-blue-400 ml-1">S.Y. {schoolYear || "—"}</span>
        </p>
      </div>

      {/* Last Result */}
      {result && (
        <div
          className={`rounded-2xl p-4 flex items-center gap-3 ${
            isDarkMode ? "bg-emerald-900/20 border border-emerald-800/30" : "bg-emerald-50 border border-emerald-200"
          }`}
        >
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
              Last Rollover Result
            </p>
            <p className={`text-[10px] font-bold mt-0.5 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              {result.promoted} student(s) promoted to G12.
              {result.overAge > 0 && ` ${result.overAge} flagged as Grade 13+ (archived only).`}
            </p>
          </div>
        </div>
      )}

      {/* Confirm Dialog Overlay */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className={`rounded-[32px] p-8 max-w-md w-full mx-4 shadow-2xl border space-y-6 ${
              isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle className="text-white w-6 h-6" />
              </div>
              <div>
                <h4
                  className={`font-black text-sm uppercase tracking-widest ${
                    isDarkMode ? "text-white" : "text-slate-800"
                  }`}
                >
                  Confirm Rollover
                </h4>
                <p className={`text-[10px] mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p
              className={`text-[11px] font-bold leading-relaxed ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              All <span className="text-emerald-400">Approved / Accepted</span> Grade 11 students will be
              promoted to Grade 12 and their sections cleared. Students enrolled{" "}
              <span className="text-amber-400">2+ years ago</span> will be flagged as over age and excluded.
            </p>

            <div className="flex gap-3">
              <Button
                onClick={() => setConfirmOpen(false)}
                disabled={isRolling}
                variant="outline"
                className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRollover}
                disabled={isRolling}
                className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {isRolling ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <GraduationCap size={14} />
                    Confirm Rollover
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Button */}
      <Button
        onClick={() => setConfirmOpen(true)}
        disabled={isRolling}
        className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center gap-2"
      >
        <Users size={14} />
        Promote G11 → G12
      </Button>
    </div>
  )
}
