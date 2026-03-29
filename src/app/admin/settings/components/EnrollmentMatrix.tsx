"use client"

import { CalendarDays, Eraser, Lock, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemedCard } from "@/components/ThemedCard"
import { ThemedText } from "@/components/ThemedText"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { themeColors } from "@/lib/themeColors"

interface EnrollmentMatrixProps {
  schoolYear: string
  startDate: string
  endDate: string
  controlMode: "automatic" | "manual"
  isDarkMode: boolean
  isCommitting: boolean
  onSchoolYearChange: (value: string) => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onClearFields: () => void
  onCommit: () => void
}

export function EnrollmentMatrix({
  schoolYear,
  startDate,
  endDate,
  controlMode,
  isDarkMode,
  isCommitting,
  onSchoolYearChange,
  onStartDateChange,
  onEndDateChange,
  onClearFields,
  onCommit,
}: EnrollmentMatrixProps) {
  const datesLocked = controlMode !== 'automatic'

  return (
    <ThemedCard
      className="p-10 rounded-[48px] space-y-8 transition-colors duration-300 border border-blue-400"
      style={{
        backgroundColor: isDarkMode ? themeColors.dark.surface : '#ffffff',
        borderColor: 'rgb(96 165 250)'
      }}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500 text-white rounded-xl shrink-0">
            <CalendarDays size={20} />
          </div>
          <ThemedText variant="h3" className="text-xs font-bold uppercase tracking-wide" isDarkMode={isDarkMode}>
            Enrollment Matrix
          </ThemedText>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFields}
                disabled={isCommitting}
                className="text-[9px] font-bold uppercase text-slate-400 hover:text-red-600 transition-colors"
              >
                <Eraser size={14} className="mr-2" /> Clear
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white border-slate-800">
              <p>Reset date and year fields</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                onClick={onCommit}
                disabled={isCommitting || !schoolYear}
                className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 transition-all"
              >
                {isCommitting ? (
                  <><Loader2 size={12} className="animate-spin" /> Saving...</>
                ) : (
                  <><Save size={12} /> Commit</>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white border-slate-800">
              <p>Save school year &amp; enrollment dates</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="space-y-6">
        {/* School year — always editable */}
        <div className="space-y-2">
          <ThemedText variant="label" className="text-[10px] font-bold uppercase tracking-wide" isDarkMode={isDarkMode}>
            Target School Year
          </ThemedText>
          <Input
            value={schoolYear}
            onChange={(e) => onSchoolYearChange(e.target.value)}
            disabled={isCommitting}
            className="h-14 rounded-2xl border-slate-200 dark:border-slate-800 font-bold text-base uppercase focus-visible:ring-blue-500 transition-all duration-300"
            placeholder="2025-2026"
            style={{ backgroundColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(241 245 249)', color: isDarkMode ? '#ffffff' : '#000000' }}
          />
        </div>

        {/* Date fields — locked when system logic is manual */}
        <div className="space-y-3">
          {datesLocked && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
              <Lock size={10} />
              Dates locked — switch to Automatic mode to edit
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <ThemedText variant="label" className={`text-[10px] font-bold uppercase tracking-wide transition-opacity duration-300 ${datesLocked ? 'opacity-40' : ''}`} isDarkMode={isDarkMode}>
                Enrollment Launch
              </ThemedText>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                disabled={datesLocked || isCommitting}
                className={`h-12 rounded-xl border-none font-bold text-xs transition-all duration-300 ${datesLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                style={{ backgroundColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(241 245 249)', color: isDarkMode ? '#ffffff' : '#000000' }}
              />
            </div>
            <div className="space-y-2">
              <ThemedText variant="label" className={`text-[10px] font-bold uppercase tracking-wide transition-opacity duration-300 ${datesLocked ? 'opacity-40' : ''}`} isDarkMode={isDarkMode}>
                Enrollment Expiration
              </ThemedText>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                disabled={datesLocked || isCommitting}
                className={`h-12 rounded-xl border-none font-bold text-xs transition-all duration-300 ${datesLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                style={{ backgroundColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(241 245 249)', color: isDarkMode ? '#ffffff' : '#000000' }}
              />
            </div>
          </div>
        </div>
      </div>

    </ThemedCard>
  )
}

