// src/store/useThemeStore.ts
// Shared light/dark theme store — persisted in localStorage
// Import this in page.tsx, enroll/page.tsx, and enroll/success/page.tsx

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ThemeStore {
  isDark: boolean
  toggleTheme: () => void
  setDark: (val: boolean) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isDark: true,
      toggleTheme: () => set((s) => ({ isDark: !s.isDark })),
      setDark: (val) => set({ isDark: val }),
    }),
    {
      name: "aclc-theme", // localStorage key
    }
  )
)