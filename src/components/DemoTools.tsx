"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Settings, X, DatabaseBackup, Zap, Eraser, Loader2, ShieldAlert } from "lucide-react"
import { supabase } from "@/lib/supabase/admin-client"
import { toast } from "sonner"

const SYSTEM_PASSWORD = "bdbestforyou03"

const FILIPINO_PERSONAS = [
  { f: "Juan", l: "Dela Cruz", m: "Perez", n: "Juan",   g: "Male" },
  { f: "Maria", l: "Clara",   m: "Santos", n: "Maria",  g: "Female" },
  { f: "Jose", l: "Rizal",    m: "Mercado", n: "Pepe",  g: "Male" },
  { f: "Andres", l: "Bonifacio", m: "Castro", n: "Andres", g: "Male" },
  { f: "Gabriela", l: "Silang", m: "Cariño", n: "Gabi", g: "Female" }
]

export function DemoTools() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [pwd, setPwd] = useState("")

  const [loading, setLoading] = useState<string | null>(null)
  const [showRestoreEffect, setShowRestoreEffect] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Initialization: check local storage to stay unlocked across refreshes
  useEffect(() => {
    setMounted(true)
    const isUnlocked = localStorage.getItem("demo_tools_unlocked") === "true"
    const isO = localStorage.getItem("demo_tools_open") === "true"
    if (isUnlocked) setUnlocked(true)
    if (isO) setIsOpen(true)
  }, [])

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (pwd === SYSTEM_PASSWORD) {
      setUnlocked(true)
      localStorage.setItem("demo_tools_unlocked", "true")
      toast.success("Demonstration Tools Unlocked")
    } else {
      toast.error("Invalid password")
    }
  }

  const toggleOpen = () => {
    const next = !isOpen
    setIsOpen(next)
    localStorage.setItem("demo_tools_open", String(next))
  }

  // ── Autofill Engine ────────────────────────────────────────────────────────
  
  const getAutoFillDependencies = () => {
    const p = FILIPINO_PERSONAS[Math.floor(Math.random() * FILIPINO_PERSONAS.length)]
    const dobStr = "2005-08-15"
    const dob = new Date(dobStr)
    const today = new Date()
    let calcAge = today.getFullYear() - dob.getFullYear()
    if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) {
      calcAge--
    }

    const setReactValue = (name: string, value: string | number) => {
      const el = document.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      if (!el) return

      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set

      if (el.tagName === "INPUT" && nativeInputValueSetter) {
        nativeInputValueSetter.call(el, value)
      } else if (el.tagName === "SELECT" && nativeSelectValueSetter) {
        nativeSelectValueSetter.call(el, value) 
      } else if (el.tagName === "TEXTAREA" && nativeTextAreaValueSetter) {
        nativeTextAreaValueSetter.call(el, value)
      } else {
        el.value = String(value)
      }

      el.dispatchEvent(new Event("input", { bubbles: true }))
      el.dispatchEvent(new Event("change", { bubbles: true }))
    }

    const advanceStep = () => {
      const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement
      if (submitBtn) submitBtn.click()
    }

    return { p, dobStr, calcAge, setReactValue, advanceStep }
  }

  const fillStep1 = (deps: any) => {
    const { p, dobStr, calcAge, setReactValue } = deps
    setReactValue("first_name", p.f)
    setReactValue("middle_name", p.m)
    setReactValue("last_name", p.l)
    setReactValue("age", calcAge)
    setReactValue("email", `${p.f.toLowerCase()}.${p.l.toLowerCase().replace(" ", "")}@demo.com`)
    setReactValue("address", "123 Mabini St., Brgy. San Juan, Manila")
    setReactValue("phone", "0917" + Math.floor(1000000 + Math.random() * 9000000))
    setReactValue("gender", p.g)
    setReactValue("nationality", "Filipino")
    setReactValue("religion", "Catholic")
    setReactValue("civil_status", "Single")
    setReactValue("birth_date", dobStr)
  }

  const fillStep2 = (deps: any) => {
    const { p, setReactValue } = deps
    setReactValue("lrn", "100" + Math.floor(100000000 + Math.random() * 900000000))
    setReactValue("last_school_attended", "Manila Science High School")
    setReactValue("last_school_address", "Taft Ave, Ermita, Manila")
    setReactValue("gwa_grade_10", "88.50")
    setReactValue("year_completed_jhs", "2023-2024")
    setReactValue("facebook_user", `${p.f} ${p.l}`)
    setReactValue("facebook_link", `https://www.facebook.com/${p.f.toLowerCase()}${p.l.toLowerCase().replace(" ", "")}`)

    // For custom React CheckCards, we must physically click them to trigger their internal onChange/setValue
    const clickFirstOption = (containerId: string) => {
      const container = document.getElementById(containerId)
      if (container) {
        // Find the first clickable card. Adjust selector if it's a div vs button.
        const firstCard = container.querySelector('button, [role="button"], .cursor-pointer, .border') as HTMLElement
        if (firstCard) firstCard.click()
      }
    }

    // Attempt to set standard hidden input just in case, but rely on click
    setReactValue("grade_level", "11")
    clickFirstOption("grade_level_container") // if it exists
    
    setReactValue("student_category", "JHS Graduate")
    clickFirstOption("student_category_container")

    setReactValue("strand", "ICT")
    clickFirstOption("strand_container")

    setReactValue("school_type", "Public")
    clickFirstOption("school_type_container")

    setReactValue("preferred_modality", "Face to Face")
    clickFirstOption("preferred_modality_container")
    
    // Slight delay to allow Modality click state to render Shift options if they are conditional
    setTimeout(() => {
      setReactValue("preferred_shift", "AM")
      clickFirstOption("preferred_shift_container")
    }, 100)
  }

  const fillStep3 = (deps: any) => {
    const { p, setReactValue } = deps
    setReactValue("guardian_first_name", p.f)
    setReactValue("guardian_middle_name", p.m)
    setReactValue("guardian_last_name", p.l)
    setReactValue("guardian_phone", "0918" + Math.floor(1000000 + Math.random() * 9000000))
    setReactValue("guardian_email", `parent.${p.l.toLowerCase().replace(" ", "")}@demo.com`)
    setReactValue("guardian_relationship", "Parent")
  }

  const triggerAutoFillStep = () => {
    if (!pathname.includes("/enroll")) {
      toast.warning("Navigate to /enroll to use Auto-fill")
      return
    }

    try {
      const deps = getAutoFillDependencies()
      const { advanceStep } = deps

      // Detect active step
      if (document.querySelector('[name="first_name"]')) {
        fillStep1(deps)
        setTimeout(() => advanceStep(), 600)
        toast.success(`Physically typed ${deps.p.f}'s Step 1! Proceeding...`)
      } else if (document.querySelector('[name="lrn"]')) {
        fillStep2(deps)
        setTimeout(() => advanceStep(), 600)
        toast.success(`Physically typed ${deps.p.f}'s Step 2! Proceeding...`)
      } else if (document.querySelector('[name="guardian_first_name"]')) {
        fillStep3(deps)
        setTimeout(() => advanceStep(), 600)
        toast.success(`Physically typed ${deps.p.f}'s Step 3! Proceeding...`)
      } else {
        toast.info("No supported auto-fill fields found on screen.")
      }
    } catch (e) {
      toast.error("Auto-fill step failed")
      console.error(e)
    }
  }

  const triggerAutoFillCascade = async () => {
    if (!pathname.includes("/enroll")) {
      toast.warning("Navigate to /enroll to use Auto-fill")
      return
    }
    
    try {
      const deps = getAutoFillDependencies()
      const { advanceStep } = deps
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

      toast.success("Initiating rapid fast-forward bot...")
      setIsOpen(false) // Hide the panel so they can watch the show
      
      if (document.querySelector('[name="first_name"]')) {
        fillStep1(deps)
        await sleep(600)
        advanceStep()
        await sleep(1000) 
      }
      
      if (document.querySelector('[name="lrn"]')) {
        fillStep2(deps)
        await sleep(600)
        advanceStep()
        await sleep(1000)
      }

      if (document.querySelector('[name="guardian_first_name"]')) {
        fillStep3(deps)
        await sleep(600)
        advanceStep()
      }

      toast.success("Fast forward complete!")
      
    } catch (e) {
      toast.error("Automated sequence interrupted")
      console.error(e)
    }
  }

  // ── Attendance Wipe ────────────────────────────────────────────────────────
  const wipeAttendance = async (scope: "today" | "all") => {
    if (!confirm(`Are you sure you want to securely wipe ${scope} attendance logs?`)) return
    
    setLoading(`wipe-${scope}`)
    try {
      if (scope === "today") {
        const todayStr = new Date().toISOString().split("T")[0] // e.g. "2026-04-12"
        await supabase.from("attendance").delete().eq("date", todayStr)
      } else {
        // Must delete explicitly per Row Level Security or just match > 0
        await supabase.from("attendance").delete().neq("id", "00000000-0000-0000-0000-000000000000") // forces a delete for all
      }
      toast.success(`Successfully cleared ${scope} attendance.`)
    } catch (e) {
      toast.error("Failed to wipe data")
    } finally {
      setLoading(null)
    }
  }

  // ── Snapshot & Reset ───────────────────────────────────────────────────────
  const createSnapshot = async () => {
    setLoading("backup")
    try {
      const [{ data: stud }, { data: sect }, { data: cfg }, { data: tea }, { data: sch }, { data: att }] = await Promise.all([
        supabase.from("students").select("*"),
        supabase.from("sections").select("*"),
        supabase.from("system_config").select("*"),
        supabase.from("teachers").select("*"),
        supabase.from("schedules").select("*"),
        supabase.from("attendance").select("*"),
      ])

      const { error } = await supabase.from("demo_snapshots").insert({
        snapshot_name: `Snapshot ${new Date().toLocaleString()}`,
        students_data: stud || [],
        sections_data: sect || [],
        system_config_data: cfg || [],
        teachers_data: tea || [],
        schedules_data: sch || [],
        attendance_data: att || [],
      })

      if (error) throw error
      toast.success("System Snapshot Created!")
    } catch (e: any) {
      toast.error("Failed to create snapshot. Ensure 'demo_snapshots' table exists.", { duration: 5000 })
      console.error(e)
    } finally {
      setLoading(null)
    }
  }

  const performReset = async () => {
    if (!confirm("RESTORE TO PREVIOUS STATE: Are you sure? This will delete all live entries and revert the system identically back to the most recent snapshot.")) return

    setLoading("reset")
    try {
      // 1. Fetch latest snapshot
      const { data: snaps, error: snapErr } = await supabase
        .from("demo_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        
      if (snapErr || !snaps || snaps.length === 0) throw new Error("No snapshot found")
      
      const snap = snaps[0]
      setShowRestoreEffect(true)

      // Allow visual effect to hit full screen
      await new Promise(r => setTimeout(r, 1000))

      // 2. Clear all tables safely
      // In Production Supabase, doing .delete().neq('id', null) wipes all rows accessible.
      await Promise.all([
        supabase.from("students").delete().neq("id", "0"),
        supabase.from("sections").delete().neq("id", "0"),
        supabase.from("system_config").delete().neq("id", "0"),
        supabase.from("teachers").delete().neq("id", "0"),
        supabase.from("schedules").delete().neq("id", "0"),
        supabase.from("attendance").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      ])

      // 3. Re-inject data
      const inject = async (table: string, data: any[]) => {
        if (data && data.length > 0) await supabase.from(table).insert(data)
      }

      await Promise.all([
        inject("system_config", snap.system_config_data),
        inject("teachers", snap.teachers_data),
        inject("sections", snap.sections_data),
        inject("schedules", snap.schedules_data),
        inject("students", snap.students_data),
        inject("attendance", snap.attendance_data),
      ])

      // Ensure visual effect lingers for wow factor
      await new Promise(r => setTimeout(r, 2000))

      toast.success("System Successfully Reverted!")
      window.location.reload()
      
    } catch (e: any) {
      toast.error(`Restore failed: ${e.message}`)
      setShowRestoreEffect(false)
    } finally {
      setLoading(null)
    }
  }

  // Effect Override
  if (showRestoreEffect) {
    return (
      <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl transition-all duration-700">
        <div className="w-96 relative">
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 animate-[pulse_1.5s_infinite] w-full" />
          </div>
          <p className="mt-8 text-center text-blue-400 font-black uppercase tracking-[0.5em] animate-pulse">
            System Reset Initiated
          </p>
          <div className="mt-6 text-center text-xs font-mono text-slate-500 space-y-2 opacity-50">
            <p>» Wiping non-persistent entities...</p>
            <p>» Restoring [students, teachers, sections, attendance] schemas...</p>
            <p>» Re-aligning global chronos (school_year)...</p>
            <p>» Verification signatures authorized...</p>
          </div>
        </div>
      </div>
    )
  }

  // Prevents Hydration Mismatch
  if (!mounted) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none">
      
      {/* Panel */}
      {isOpen && (
        <div className="w-80 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto transform translate-y-0 opacity-100 transition-all duration-300">
          <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-black tracking-widest uppercase text-white">Demonstrator Tools</span>
            </div>
            <button onClick={toggleOpen} className="text-slate-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="p-5">
            {!unlocked ? (
              <form onSubmit={handleUnlock} className="space-y-4">
                <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                  These tools modify raw production structures. Authentication required.
                </p>
                <input
                  type="password"
                  placeholder="Master Key..."
                  value={pwd}
                  onChange={e => setPwd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  Unlock Overrides
                </button>
              </form>
            ) : (
              <div className="space-y-6">
                
                {/* Autofill */}
                <div className="space-y-2.5">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">1. Registration Engine</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={triggerAutoFillStep}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-xl px-4 py-2.5 text-[10px] font-bold transition-colors flex items-center justify-center gap-2 group"
                    >
                      Fill Step 
                      <Zap size={12} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={triggerAutoFillCascade}
                      className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-xl px-4 py-2.5 text-[10px] font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      Fast Forward
                    </button>
                  </div>
                </div>

                {/* Attendance */}
                <div className="space-y-2.5">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">2. Attendance Purge</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => wipeAttendance("today")}
                      disabled={loading !== null}
                      className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 rounded-xl px-4 py-2.5 text-[10px] font-bold transition-colors"
                    >
                      {loading === "wipe-today" ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Wipe Today"}
                    </button>
                    <button
                      onClick={() => wipeAttendance("all")}
                      disabled={loading !== null}
                      className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-xl px-4 py-2.5 text-[10px] font-bold transition-colors"
                    >
                      {loading === "wipe-all" ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Wipe All"}
                    </button>
                  </div>
                </div>

                {/* Snapshots */}
                <div className="space-y-2.5">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">3. State Restoration</span>
                  <button
                    onClick={createSnapshot}
                    disabled={loading !== null}
                    className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl px-4 py-2.5 transition-colors mb-2"
                  >
                    <span className="text-xs font-bold">Create Restore Point</span>
                    {loading === "backup" ? <Loader2 size={14} className="animate-spin" /> : <DatabaseBackup size={14} />}
                  </button>
                  
                  <button
                    onClick={performReset}
                    disabled={loading !== null}
                    className="w-full flex items-center justify-between bg-rose-600 hover:bg-rose-500 text-white rounded-xl px-4 py-3 shadow-lg shadow-rose-500/25 transition-colors group"
                  >
                    <span className="text-xs font-black uppercase tracking-widest">Return to Previous State</span>
                    {loading === "reset" ? <Loader2 size={14} className="animate-spin" /> : <Eraser size={14} className="group-hover:-rotate-12 transition-transform" />}
                  </button>
                </div>
                
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trigger Button */}
      <button 
        onClick={toggleOpen}
        className={`pointer-events-auto flex items-center justify-center w-12 h-12 rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 border
          ${isOpen ? "bg-slate-800 border-slate-700 text-white" : "bg-blue-600 border-blue-500 text-white"}`}
      >
        <Settings size={20} className={unlocked && !isOpen ? "animate-[spin_10s_linear_infinite] text-amber-300" : ""} />
      </button>

    </div>
  )
}
