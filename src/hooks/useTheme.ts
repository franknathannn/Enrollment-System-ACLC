"use client"

import { useState, useEffect, useCallback } from 'react'
import { useThemeStore } from '@/store/useThemeStore'

// ─── Bridged to useThemeStore ────────────────────────────────────────────────
// This hook was historically a standalone theme manager with module-level state.
// To avoid conflicts and FOUC, it has been bridged to wrap `useThemeStore`.
// It is recommended to use `useThemeStore` directly for new components.

export function useTheme() {
  const { isDark, toggleTheme: toggleStoreTheme, setDark } = useThemeStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const toggleTheme = useCallback((mode?: 'light' | 'dark') => {
    if (mode === 'dark') setDark(true)
    else if (mode === 'light') setDark(false)
    else toggleStoreTheme()
  }, [setDark, toggleStoreTheme])

  return { isDarkMode: isDark, toggleTheme, mounted }
}