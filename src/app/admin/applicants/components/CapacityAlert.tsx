import { AlertTriangle } from "lucide-react"

interface CapacityAlertProps {
  strandStats: Record<string, boolean>
}

export function CapacityAlert({ strandStats }: CapacityAlertProps) {
  if (!strandStats.ICT && !strandStats.GAS) return null

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 text-amber-500 mb-2 animate-pulse">
      <AlertTriangle size={20} className="shrink-0" />
      <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
        SYSTEM ALERT: {strandStats.ICT && strandStats.GAS ? "ALL SECTIONS" : (strandStats.ICT ? "ICT STRAND" : "GAS STRAND")} AT FULL CAPACITY. 
        <span className="opacity-70 block mt-1 font-bold">New applicants cannot be approved until space is available.</span>
      </p>
    </div>
  )
}