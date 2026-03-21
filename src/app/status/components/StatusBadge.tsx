// app/status/components/StatusBadge.tsx

import { cn } from "@/lib/utils"

const STYLES: Record<string, { badge: string; dot: string }> = {
  Pending:  { badge: "bg-amber-900/30 text-amber-400 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.25)]", dot: "bg-amber-400" },
  Accepted: { badge: "bg-green-900/30 text-green-400 border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.25)]",  dot: "bg-green-400" },
  Approved: { badge: "bg-green-900/30 text-green-400 border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.25)]",  dot: "bg-green-400" },
  Rejected: { badge: "bg-red-900/30 text-red-500 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.25)]",        dot: "bg-red-500" },
}

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? STYLES.Pending
  const label = status === "Approved" || status === "Accepted" ? "Accepted" : status

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest backdrop-blur-md",
      style.badge
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", style.dot,
        status === "Pending" ? "animate-pulse" : ""
      )} />
      {label}
    </div>
  )
}