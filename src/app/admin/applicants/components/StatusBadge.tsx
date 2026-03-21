// src/app/admin/applicants/components/StatusBadge.tsx

import { memo } from "react"

const CONFIG: Record<string, { dot: string; badge: string; label: string }> = {
  Pending:  { dot: 'bg-amber-400 animate-pulse',   badge: 'bg-amber-500/12 text-amber-500 border-amber-400/30',   label: 'Pending'  },
  Accepted: { dot: 'bg-emerald-400',                badge: 'bg-emerald-500/12 text-emerald-500 border-emerald-400/30', label: 'Accepted' },
  Approved: { dot: 'bg-emerald-400',                badge: 'bg-emerald-500/12 text-emerald-500 border-emerald-400/30', label: 'Accepted' },
  Rejected: { dot: 'bg-red-400',                   badge: 'bg-red-500/12 text-red-500 border-red-400/30',         label: 'Rejected' },
}

export const StatusBadge = memo(({ status }: { status: string, isDarkMode?: boolean }) => {
  const cfg = CONFIG[status] ?? CONFIG.Pending
  return (
    <div className={`mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.25em] ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </div>
  )
})

StatusBadge.displayName = "StatusBadge"
