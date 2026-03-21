import { AlertTriangle, Lock } from "lucide-react"

interface CapacityAlertProps {
  strandStats: Record<string, boolean>
}

export function CapacityAlert({ strandStats }: CapacityAlertProps) {
  if (!strandStats.ICT && !strandStats.GAS) return null

  const both = strandStats.ICT && strandStats.GAS
  const which = both ? "All Sections" : (strandStats.ICT ? "ICT Strand" : "GAS Strand")

  return (
    <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 bg-amber-500/8">
      {/* Animated top bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 animate-pulse" />

      <div className="px-5 py-3.5 flex items-center gap-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
          <Lock size={16} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400 flex items-center gap-2">
            <AlertTriangle size={11} className="shrink-0" />
            Capacity Limit Reached — {which}
          </p>
          <p className="text-[10px] font-semibold text-amber-500/70 mt-0.5">
            No new approvals until a slot opens. Existing pending applicants are queued.
          </p>
        </div>
        <div className="shrink-0 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-[9px] font-black uppercase tracking-widest text-amber-400">
          Full
        </div>
      </div>
    </div>
  )
}