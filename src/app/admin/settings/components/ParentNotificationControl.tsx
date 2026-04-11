import React from "react"
import { BellRing, ShieldCheck, FileCheck, MailCheck } from "lucide-react"

interface Props {
  isDarkMode: boolean;
  updating: boolean;
  notifyStatus: boolean;
  notifyAttendance: boolean;
  notifySummary: boolean;
  onToggleStatus: (checked: boolean) => void;
  onToggleAttendance: (checked: boolean) => void;
  onToggleSummary: (checked: boolean) => void;
}

export function ParentNotificationControl({
  isDarkMode,
  updating,
  notifyStatus,
  notifyAttendance,
  notifySummary,
  onToggleStatus,
  onToggleAttendance,
  onToggleSummary,
}: Props) {
  const containerClass = `p-6 rounded-[32px] border transition-all duration-500 ${
    isDarkMode ? "bg-slate-900 border-slate-700/60" : "bg-white border-slate-200"
  }`;

  const ToggleRow = ({
    title,
    description,
    isEnabled,
    onToggle,
    Icon,
    accent
  }: {
    title: string;
    description: string;
    isEnabled: boolean;
    onToggle: (checked: boolean) => void;
    Icon: React.FC<any>;
    accent: string;
  }) => (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 border-b last:border-0 border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${isEnabled ? accent : isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
          <Icon className={isEnabled ? "text-white" : "text-slate-400"} size={20} strokeWidth={2.5} />
        </div>
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.2em] ${isDarkMode ? "text-white" : "text-slate-900"}`}>{title}</p>
          <p className={`text-[9px] mt-0.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={updating}
        onClick={() => onToggle(!isEnabled)}
        role="switch"
        aria-checked={isEnabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0 disabled:opacity-50
          ${isEnabled ? "bg-blue-500" : isDarkMode ? "bg-slate-600" : "bg-slate-300"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
          ${isEnabled ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );

  return (
    <div className={containerClass}>
      <div className="flex items-start gap-3 mb-6">
        <div className="shrink-0 p-3 bg-blue-500/10 rounded-2xl">
          <BellRing className="text-blue-500" size={24} />
        </div>
        <div>
          <h3 className={`text-base font-black italic uppercase tracking-tighter ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            Parent Notification Protocols
          </h3>
          <p className={`text-[10px] uppercase font-bold tracking-widest mt-1 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            Manage guardian communication visibility
          </p>
        </div>
      </div>

      <div className="flex flex-col">
        <ToggleRow
          title="Enrollment Status"
          description="Emails Guardians regarding Approval, Rejection, and Section Transfers (includes QR & Schedules)"
          isEnabled={notifyStatus}
          onToggle={onToggleStatus}
          Icon={MailCheck}
          accent="bg-emerald-500"
        />
        <ToggleRow
          title="Attendance Arrival"
          description="Alerts Guardians on the First Scan of the day (Anti-Spam constrained)"
          isEnabled={notifyAttendance}
          onToggle={onToggleAttendance}
          Icon={ShieldCheck}
          accent="bg-amber-500"
        />
        <ToggleRow
          title="Daily Summary Checklist"
          description="Sends an end-of-day discrepancy checklist to Guardians emphasizing cutting/anomaly sequences"
          isEnabled={notifySummary}
          onToggle={onToggleSummary}
          Icon={FileCheck}
          accent="bg-rose-500"
        />
      </div>
    </div>
  );
}
