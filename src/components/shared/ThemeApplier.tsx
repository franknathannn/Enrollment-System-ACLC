"use client"

// components/shared/ThemeApplier.tsx
//
// Tiny client component that lives inside the server RootLayout.
// Calls useThemeApplier() to write data-theme to <html> whenever
// the Zustand theme store changes — zero re-renders in any other component.

import { useThemeApplier } from "@/hooks/useThemeApplier"

export function ThemeApplier() {
  useThemeApplier()
  return null // renders nothing, side-effect only
}