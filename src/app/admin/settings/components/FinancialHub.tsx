"use client"

import { Banknote, Landmark } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ThemedCard } from "@/components/ThemedCard"
import { ThemedText } from "@/components/ThemedText"
import { themeColors } from "@/lib/themeColors"

interface FinancialHubProps {
  voucherValue: string | number
  isDarkMode: boolean
  onVoucherValueChange: (value: string | number) => void
}

export function FinancialHub({
  voucherValue,
  isDarkMode,
  onVoucherValueChange
}: FinancialHubProps) {
  return (
    <ThemedCard
      className="p-10 rounded-[48px] space-y-8 border transition-all duration-500"
      style={{
        backgroundColor: isDarkMode ? themeColors.dark.surface : '#ffffff',
        borderColor: isDarkMode ? themeColors.dark.border : 'rgb(226 232 240)'
      }}
    >
      <div className="flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 pb-6">
        <div className="p-2 rounded-xl" style={{ backgroundColor: '#16a34a', color: 'white' }}>
          <Banknote size={20} />
        </div>
        <ThemedText variant="h3" className="text-xs font-bold uppercase tracking-wide" isDarkMode={isDarkMode}>
          Financial Calculator
        </ThemedText>
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <ThemedText variant="label" className="text-[10px] font-bold uppercase tracking-wide" isDarkMode={isDarkMode}>
            Global Voucher Value (PHP)
          </ThemedText>
          <div className="relative">
            <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <Input
              type="text"
              value={voucherValue === 0 || voucherValue === null ? "" : voucherValue}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || val === " ") {
                  onVoucherValueChange("");
                } else {
                  const parsed = parseInt(val);
                  if (!isNaN(parsed)) onVoucherValueChange(parsed);
                }
              }}
              className="h-14 rounded-2xl border-none font-bold text-lg pl-12 focus-visible:ring-emerald-500 transition-all duration-500"
              style={{ backgroundColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(241 245 249)', color: isDarkMode ? '#ffffff' : '#000000' }}
            />
          </div>
          <p className="text-[9px] text-slate-400 font-medium italic mt-2 px-2">
            Used for real-time revenue calculations on the Dashboard.
          </p>
        </div>
      </div>
    </ThemedCard>
  )
}

