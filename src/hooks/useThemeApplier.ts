/**
 * useThemeApplier  —  call this ONCE at the top of your layout/root component.
 *
 * It writes `data-theme` to <html> whenever the store value changes.
 * Because it's a DOM attribute change (not a React state change), no component
 * re-renders. CSS custom properties cascade from the attribute automatically.
 *
 * Every other component that previously called useThemeStore() for styling
 * can now just use CSS variables (var(--t-*)) or the .t-* utility classes
 * from theme.css — zero re-renders on theme toggle.
 */

"use client"

import { useEffect } from "react"
import { useThemeStore } from "@/store/useThemeStore"

export function useThemeApplier() {
  const { isDark } = useThemeStore()

  useEffect(() => {
    // Single DOM write — no React re-renders triggered anywhere
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light")
  }, [isDark])
}

/**
 * useIsDark  —  only use this when you genuinely need the boolean in JS
 * (e.g. canvas color logic). Do NOT use it for styling — use CSS vars instead.
 */
export function useIsDark() {
  return useThemeStore(s => s.isDark)
}