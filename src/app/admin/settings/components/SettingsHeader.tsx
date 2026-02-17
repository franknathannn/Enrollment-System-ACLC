"use client"

import { Settings2 } from "lucide-react"
import { ThemedText } from "@/components/ThemedText"

interface SettingsHeaderProps {
  isDarkMode: boolean
}

export function SettingsHeader({ isDarkMode }: SettingsHeaderProps) {
  return (
    <div className="text-center space-y-4">
      <div className="inline-flex p-6 bg-slate-900 text-white rounded-[32px] mb-2 shadow-2xl">
        <Settings2 size={40} />
      </div>
      <ThemedText variant="h1" className="text-4xl font-bold tracking-tight" isDarkMode={isDarkMode}>
        Configuration
      </ThemedText>
      <ThemedText variant="body" className="italic text-sm" isDarkMode={isDarkMode}>
        AMA ACLC Northbay Enrollment Customization
      </ThemedText>
    </div>
  )
}

