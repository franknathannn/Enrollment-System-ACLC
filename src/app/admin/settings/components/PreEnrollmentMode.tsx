"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface PreEnrollmentModeProps {
  isPreEnrollment: boolean
  isDarkMode: boolean
  updating: boolean
  disabled?: boolean
  onToggle: (checked: boolean) => void
}

export function PreEnrollmentMode({
  isPreEnrollment,
  isDarkMode,
  updating,
  disabled,
  onToggle
}: PreEnrollmentModeProps) {
  return (
    <Card className={cn(
      "p-6 rounded-[32px] border transition-all duration-500",
      isDarkMode ? "bg-slate-950/50 border-white/10" : "bg-white/50 border-slate-200",
      disabled && "opacity-50 pointer-events-none grayscale"
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl transition-colors",
              isPreEnrollment ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
            )}>
              <Sparkles size={20} />
            </div>
            <Label className={cn(
              "text-lg font-bold uppercase tracking-tight",
              isDarkMode ? "text-white" : "text-slate-900"
            )}>
              Pre-Enrollment Mode
            </Label>
          </div>
          <p className={cn(
            "text-[10px] font-bold uppercase tracking-[0.2em] ml-1",
            isDarkMode ? "text-slate-500" : "text-slate-400"
          )}>
            Overrides status label to "Pre-Enrollment"
          </p>
        </div>

        <Switch
          checked={isPreEnrollment}
          onCheckedChange={onToggle}
          disabled={updating || disabled}
          className={cn(
            "data-[state=checked]:bg-purple-600",
            isDarkMode ? "data-[state=unchecked]:bg-slate-800" : "data-[state=unchecked]:bg-slate-200"
          )}
        />
      </div>
    </Card>
  )
}
