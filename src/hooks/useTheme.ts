"use client"

import { useSyncExternalStore, useCallback, useEffect, useState } from 'react'

// ─── Module-level single source of truth ──────────────────────────────────────
// One value, one subscriber set, one DOM observer — shared across ALL hook
// instances. When notifyAll() fires, React's useSyncExternalStore schedules
// every subscriber in a single synchronized pass (same as Zustand).

let _isDark = false
const _subscribers = new Set<() => void>()

function _notifyAll() {
  _subscribers.forEach(cb => cb())
}

function _resolveIsDark(): boolean {
  if (typeof globalThis === 'undefined') return false
  if (typeof localStorage === 'undefined') return false
  const saved = localStorage.getItem('theme')
  if (saved === 'dark')  return true
  if (saved === 'light') return false
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function _applyClass(isDark: boolean) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(isDark ? 'dark' : 'light')
}

// ─── One-time module-level initialisation (browser only) ──────────────────────
if (typeof window !== 'undefined') {
  _isDark = _resolveIsDark()
  _applyClass(_isDark)

  // Cross-tab sync
  globalThis.addEventListener('storage', (e: StorageEvent) => {
    if (e.key !== 'theme') return
    _isDark = _resolveIsDark()
    _applyClass(_isDark)
    _notifyAll()
  })

  // Single MutationObserver for the whole app — catches external class changes
  new MutationObserver(() => {
    const isDark = document.documentElement.classList.contains('dark')
    if (isDark !== _isDark) {
      _isDark = isDark
      _notifyAll()
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
}

// ─── useSyncExternalStore wiring ──────────────────────────────────────────────
function _subscribe(cb: () => void) {
  _subscribers.add(cb)
  return () => _subscribers.delete(cb)
}
const _getSnapshot       = () => _isDark
const _getServerSnapshot = () => false   // SSR always light; client corrects on hydration

// ─── Public hook ──────────────────────────────────────────────────────────────
export function useTheme() {
  // useSyncExternalStore: ALL subscribers re-render in one atomic React pass.
  // No per-component useState, no staggered updates, no lag.
  const isDarkMode = useSyncExternalStore(_subscribe, _getSnapshot, _getServerSnapshot)

  // `mounted` retained for components that gate render on it (layout, pages)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const toggleTheme = useCallback((mode: 'light' | 'dark') => {
    _isDark = mode === 'dark'
    _applyClass(_isDark)
    try { localStorage.setItem('theme', mode) } catch {}
    _notifyAll()
  }, [])

  return { isDarkMode, toggleTheme, mounted }
}