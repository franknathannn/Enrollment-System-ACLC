"use client"

import { useState } from "react"
import { BookMarked, AlertTriangle, CheckCircle2, Loader2, ArrowRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { recordYearlySnapshot } from "@/lib/actions/history"

interface ArchiveYearSnapshotProps {
  isDarkMode: boolean
  schoolYear: string
}

export function ArchiveYearSnapshot({ isDarkMode, schoolYear }: ArchiveYearSnapshotProps) {
  const [isArchiving, setIsArchiving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState<{ male: number; female: number } | null>(null)

  const handleArchive = async () => {
    if (!schoolYear) {
      toast.error("No school year configured.")
      return
    }
    setIsArchiving(true)
    const toastId = toast.loading("Archiving current school year...")
    try {
      // Count male and female accepted/approved students for this school year
      const [maleRes, femaleRes] = await Promise.all([
        supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("school_year", schoolYear)
          .in("status", ["Accepted", "Approved"])
          .eq("gender", "Male")
          .neq("mock", true),
        supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("school_year", schoolYear)
          .in("status", ["Accepted", "Approved"])
          .eq("gender", "Female")
          .neq("mock", true),
      ])

      const maleCount = maleRes.count || 0
      const femaleCount = femaleRes.count || 0

      const res = await recordYearlySnapshot(schoolYear, maleCount, femaleCount)
      if (!res.success) {
        toast.error(res.error || "Archive failed.", { id: toastId })
        return
      }

      setResult({ male: maleCount, female: femaleCount })
      toast.success(
        `S.Y. ${schoolYear} archived — ${maleCount + femaleCount} student(s) recorded.`,
        { id: toastId, duration: 6000 }
      )
    } catch (err) {
      toast.error("Archive failed. Please try again.", { id: toastId })
    } finally {
      setIsArchiving(false)
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
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
          <BookMarked className="text-white w-6 h-6" />
        </div>
        <div>
          <h3
            className={`font-black text-sm uppercase tracking-widest ${
              isDarkMode ? "text-white" : "text-slate-800"
            }`}
          >
            Archive School Year
          </h3>
          <p
            className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5 ${
              isDarkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Save a snapshot of the current year's enrolled students
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
          <ArrowRight size={12} className="text-blue-500 mt-0.5 shrink-0" />
          Records the count of all accepted/approved students for S.Y.{" "}
          <span className={`font-black ml-1 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
            {schoolYear || "—"}
          </span>
          .
        </p>
        <p className="flex items-start gap-2">
          <ArrowRight size={12} className="text-blue-500 mt-0.5 shrink-0" />
          The snapshot will appear in the Dashboard Archive and the Archive page.
        </p>
        <p className="flex items-start gap-2">
          <Calendar size={12} className="text-amber-500 mt-0.5 shrink-0" />
          You can re-run this at any time — it will update the existing snapshot for this year.
        </p>
      </div>

      {/* Last Result */}
      {result && (
        <div
          className={`rounded-2xl p-4 flex items-center gap-3 ${
            isDarkMode ? "bg-blue-900/20 border border-blue-800/30" : "bg-blue-50 border border-blue-200"
          }`}
        >
          <CheckCircle2 size={18} className="text-blue-500 shrink-0" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
              Last Archive Result
            </p>
            <p className={`text-[10px] font-bold mt-0.5 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              {result.male + result.female} total — {result.male} Male, {result.female} Female.
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
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                <BookMarked className="text-white w-6 h-6" />
              </div>
              <div>
                <h4
                  className={`font-black text-sm uppercase tracking-widest ${
                    isDarkMode ? "text-white" : "text-slate-800"
                  }`}
                >
                  Confirm Archive
                </h4>
                <p className={`text-[10px] mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  S.Y. {schoolYear}
                </p>
              </div>
            </div>

            <p
              className={`text-[11px] font-bold leading-relaxed ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              This will save a snapshot of all{" "}
              <span className="text-blue-400">Accepted / Approved</span> students for{" "}
              <span className="text-white">S.Y. {schoolYear}</span> into the institutional archives.
              If a snapshot for this year already exists, it will be updated.
            </p>

            <div className="flex gap-3">
              <Button
                onClick={() => setConfirmOpen(false)}
                disabled={isArchiving}
                variant="outline"
                className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest"
              >
                Cancel
              </Button>
              <Button
                onClick={handleArchive}
                disabled={isArchiving}
                className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                {isArchiving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <BookMarked size={14} />
                    Confirm Archive
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
        disabled={isArchiving || !schoolYear}
        className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center gap-2"
      >
        <BookMarked size={14} />
        Record / Archive S.Y. {schoolYear || "—"}
      </Button>
    </div>
  )
}
