"use client"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import { Search, Loader2, ChevronDown, Check, X, Shield } from "lucide-react"

interface Teacher {
  id: string
  full_name: string
  email: string
  is_active: boolean
  gender?: string
}

import { formatTeacherName } from "@/lib/utils/formatTeacherName"

interface AdviserPickerProps {
  value: string | null
  onValueChange: (id: string | null) => void
  initialTeachers: Teacher[]
  isDarkMode: boolean
  isICT: boolean
}

export function AdviserPicker({ value, onValueChange, initialTeachers, isDarkMode, isICT }: AdviserPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Teacher[]>(initialTeachers || [])
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync seed list
  useEffect(() => {
    if (!search.trim()) setResults(initialTeachers || [])
  }, [initialTeachers, search])

  // Click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  // Debounced async search
  useEffect(() => {
    if (!search.trim()) {
      setResults(initialTeachers || [])
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from("teachers")
          .select("id, full_name, email, is_active, gender")
          .ilike("full_name", `%${search}%`)
          .limit(10)
        if (data) setResults(data)
      } catch { /* silent */ } 
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [search, initialTeachers])

  // Resolve current adviser name
  const [fetchedAdviser, setFetchedAdviser] = useState<Teacher | null>(null)
  const knownTeacher = results.find(t => t.id === value) || initialTeachers.find(t => t.id === value)
  
  useEffect(() => {
    if (value && !knownTeacher && !fetchedAdviser) {
      supabase.from("teachers").select("id, full_name, email, is_active, gender").eq("id", value).single()
        .then(({ data }) => { if (data) setFetchedAdviser(data) })
    }
  }, [value, knownTeacher, fetchedAdviser])

  const displayTeacher = knownTeacher || fetchedAdviser
  const accent = isICT ? "blue" : "orange"

  function select(id: string | null) {
    onValueChange(id)
    setOpen(false)
    setSearch("")
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`group flex items-center gap-2.5 pl-3.5 pr-3 py-2 rounded-full border transition-all duration-300 ${
          isDarkMode
            ? `bg-slate-900/50 border-white/10 hover:border-${accent}-500/30 hover:bg-slate-800/60`
            : `bg-white/70 border-slate-200 hover:border-${accent}-400/40 hover:bg-white shadow-sm`
        } ${open ? (isDarkMode ? `border-${accent}-500/40 bg-slate-800/70` : `border-${accent}-400/50 bg-white shadow-md`) : ''}`}
      >
        <Shield size={13} className={`text-${accent}-400 transition-transform duration-300 ${open ? 'scale-110' : 'group-hover:scale-105'}`} />
        <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
          Adviser
        </span>
        <span className={`text-[10px] md:text-[11px] font-bold ${isDarkMode ? 'text-white/90' : 'text-slate-700'}`}>
          {displayTeacher ? formatTeacherName(displayTeacher.full_name, displayTeacher.gender) : "—"}
        </span>
        <ChevronDown size={13} className={`opacity-40 transition-transform duration-300 ${open ? 'rotate-180' : ''} ${isDarkMode ? 'text-white' : 'text-slate-500'}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`absolute top-full left-0 mt-2 w-[260px] md:w-[300px] rounded-2xl border overflow-hidden z-50 transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${
          isDarkMode
            ? 'bg-slate-950/95 backdrop-blur-2xl border-white/10 shadow-2xl shadow-black/60 ring-1 ring-white/5'
            : 'bg-white border-slate-200 shadow-2xl shadow-slate-200/60 ring-1 ring-slate-100'
        }`}>
          {/* Search */}
          <div className={`p-2.5 border-b ${isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50/50'}`}>
            <div className="relative">
              <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-white/30' : 'text-slate-400'}`} />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search teachers..."
                className={`w-full h-8 pl-8 pr-8 rounded-lg text-[11px] font-semibold border transition-colors focus:outline-none focus:ring-2 ${
                  isDarkMode
                    ? 'bg-white/5 border-white/10 text-white placeholder-white/25 focus:ring-blue-500/30 focus:border-blue-500/30'
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-blue-500/20 focus:border-blue-400'
                }`}
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-white/30 hover:text-white/60' : 'text-slate-400 hover:text-slate-600'}`}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[220px] overflow-y-auto p-1.5">
            {/* No Adviser */}
            <button
              type="button"
              onClick={() => select(null)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
                isDarkMode ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-50'
              } ${!value ? (isDarkMode ? 'bg-white/[0.04]' : 'bg-slate-50') : ''}`}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: !value ? `var(--check-bg, ${isDarkMode ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)'})` : 'transparent' }}>
                {!value && <Check size={11} className="text-blue-400" strokeWidth={3} />}
              </div>
              <span className={`text-[11px] font-semibold ${isDarkMode ? (!value ? 'text-white' : 'text-white/40') : (!value ? 'text-slate-800' : 'text-slate-400')}`}>
                No Adviser
              </span>
            </button>

            {/* Divider */}
            <div className={`mx-3 my-1 h-px ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6">
                <Loader2 size={14} className="animate-spin text-blue-400" />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-white/30' : 'text-slate-400'}`}>
                  Searching...
                </span>
              </div>
            ) : results.length === 0 ? (
              <div className="py-6 text-center">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-white/25' : 'text-slate-400'}`}>
                  No matches found
                </span>
              </div>
            ) : (
              results.map(t => {
                const isSelected = value === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => select(t.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
                      isDarkMode ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-50'
                    } ${isSelected ? (isDarkMode ? 'bg-white/[0.04]' : 'bg-blue-50/60') : ''}`}
                  >
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors"
                      style={{ background: isSelected ? (isDarkMode ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)') : 'transparent' }}
                    >
                      {isSelected && <Check size={11} className="text-blue-400" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] font-bold truncate ${isDarkMode ? 'text-white/90' : 'text-slate-700'} ${isSelected ? (isDarkMode ? 'text-white' : 'text-blue-700') : ''}`}>
                        {formatTeacherName(t.full_name, t.gender)}
                      </div>
                      <div className={`text-[9px] truncate ${isDarkMode ? 'text-white/20' : 'text-slate-400'}`}>
                        {t.email}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
