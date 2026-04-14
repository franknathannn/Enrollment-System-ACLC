"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Settings, X, DatabaseBackup, Zap, Eraser, Loader2, ShieldAlert, Users, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { supabase } from "@/lib/supabase/admin-client"
import { toast } from "sonner"
import { generateStudent } from "@/lib/mock-utils"
import { clearMockData } from "@/app/mock/actions"

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
  const [position, setPosition] = useState<'bottom-right' | 'top-center'>('bottom-right')

  // Initialization: check local storage to stay unlocked across refreshes
  useEffect(() => {
    setMounted(true)
    const isUnlocked = localStorage.getItem("demo_tools_unlocked") === "true"
    const isO = localStorage.getItem("demo_tools_open") === "true"
    const pos = localStorage.getItem("demo_tools_pos") as 'bottom-right' | 'top-center' | null
    if (isUnlocked) setUnlocked(true)
    if (isO) setIsOpen(true)
    if (pos) setPosition(pos)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'z') {
        if (e.target instanceof HTMLElement) {
          const tag = e.target.tagName
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        }
        e.preventDefault()
        setIsOpen((prev) => {
          const next = !prev
          localStorage.setItem("demo_tools_open", String(next))
          return next
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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

  const togglePosition = () => {
    const nextPos = position === 'bottom-right' ? 'top-center' : 'bottom-right'
    setPosition(nextPos)
    localStorage.setItem("demo_tools_pos", nextPos)
  }

  // ── Autofill Engine ────────────────────────────────────────────────────────
  
  const getAutoFillDependencies = () => {
    const p = { f: "Andres", l: "Bonifacio", m: "Castro", n: "Andres", g: "Male" }
    const dobStr = "2005-08-15"
    const dob = new Date(dobStr)
    const today = new Date()
    let calcAge = 20 // Fixed age per screenshot

    const typeReactValue = async (name: string, value: string | number) => {
      const el = document.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      if (!el) return

      el.scrollIntoView({ behavior: "smooth", block: "center" })
      await new Promise(r => setTimeout(r, 200))

      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
      const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set

      const strVal = String(value)

      if (el.tagName === "SELECT") {
        if (nativeSelectValueSetter) nativeSelectValueSetter.call(el, value) 
        else el.value = strVal
        el.dispatchEvent(new Event("input", { bubbles: true }))
        el.dispatchEvent(new Event("change", { bubbles: true }))
        await new Promise(r => setTimeout(r, 100))
        return
      }

      if (nativeInputValueSetter || nativeTextAreaValueSetter) {
        if (el.tagName === "INPUT" && nativeInputValueSetter) {
          nativeInputValueSetter.call(el, "")
        } else if (el.tagName === "TEXTAREA" && nativeTextAreaValueSetter) {
          nativeTextAreaValueSetter.call(el, "")
        } else {
          el.value = ""
        }
        
        el.dispatchEvent(new Event("input", { bubbles: true }))
        
        for (let i = 0; i < strVal.length; i++) {
          const currentVal = strVal.slice(0, i + 1)
          if (el.tagName === "INPUT" && nativeInputValueSetter) {
            nativeInputValueSetter.call(el, currentVal)
          } else if (el.tagName === "TEXTAREA" && nativeTextAreaValueSetter) {
            nativeTextAreaValueSetter.call(el, currentVal)
          } else {
            el.value = currentVal
          }
          el.dispatchEvent(new Event("input", { bubbles: true }))
          el.dispatchEvent(new Event("change", { bubbles: true }))
          await new Promise(r => setTimeout(r, 15 + Math.random() * 25))
        }
        await new Promise(r => setTimeout(r, 50))
      }
    }

    const advanceStep = () => {
      const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement
      if (submitBtn) submitBtn.click()
    }

    return { p, dobStr, calcAge, typeReactValue, advanceStep }
  }

  const fillStep1 = async (deps: any) => {
    const { p, dobStr, calcAge, typeReactValue } = deps
    await typeReactValue("first_name", p.f)
    await typeReactValue("middle_name", p.m)
    await typeReactValue("last_name", p.l)
    await typeReactValue("nationality", "Filipino")
    await typeReactValue("gender", p.g)
    await typeReactValue("birth_date", dobStr)
    await typeReactValue("religion", "Catholic")
    await typeReactValue("age", calcAge)
    await typeReactValue("civil_status", "Single")
    await typeReactValue("address", "123 Mabini St., Brgy. San Juan, Manila")
    await typeReactValue("email", "andres.bonifacio@demo.com")
    await typeReactValue("phone", "09171234567")
  }

  const fillStep2 = async (deps: any) => {
    const { typeReactValue } = deps
    await typeReactValue("lrn", "100398849319")

    const clickFirstOption = (containerId: string) => {
      const container = document.getElementById(containerId)
      if (container) {
        const firstCard = container.querySelector('button, [role="button"], .cursor-pointer, .border') as HTMLElement
        if (firstCard) firstCard.click()
      }
    }

    await typeReactValue("grade_level", "11")
    clickFirstOption("grade_level_container")
    
    await typeReactValue("student_category", "JHS Graduate")
    clickFirstOption("student_category_container")

    await typeReactValue("school_type", "Public")
    clickFirstOption("school_type_container")

    await typeReactValue("year_completed_jhs", "2023-2024")

    await typeReactValue("strand", "ICT")
    clickFirstOption("strand_container")

    await typeReactValue("gwa_grade_10", "88.50")

    await typeReactValue("last_school_attended", "Manila Science High School")
    await typeReactValue("last_school_address", "Taft Ave, Ermita, Manila")
    
    await typeReactValue("facebook_user", "Juan Dela Cruz")
    await typeReactValue("facebook_link", "https://www.facebook.com/juandelacruz")

    await typeReactValue("preferred_modality", "Face to Face")
    clickFirstOption("preferred_modality_container")
    
    await new Promise(r => setTimeout(r, 100))
    await typeReactValue("preferred_shift", "AM")
    clickFirstOption("preferred_shift_container")
  }

  const fillStep3 = async (deps: any) => {
    const { p, typeReactValue } = deps
    await typeReactValue("guardian_first_name", p.f)
    await typeReactValue("guardian_middle_name", p.m)
    await typeReactValue("guardian_last_name", p.l)
    await typeReactValue("guardian_phone", "0918" + Math.floor(1000000 + Math.random() * 9000000))
    await typeReactValue("guardian_email", `parent.${p.l.toLowerCase().replace(" ", "")}@demo.com`)
    await typeReactValue("guardian_relationship", "Parent")
  }

  const triggerAutoFillStep = async () => {
    if (!pathname.includes("/enroll")) {
      toast.warning("Navigate to /enroll to use Auto-fill")
      return
    }

    try {
      const deps = getAutoFillDependencies()
      const { advanceStep } = deps

      // Detect active step
      if (document.querySelector('[name="first_name"]')) {
        await fillStep1(deps)
        setTimeout(() => advanceStep(), 600)
        toast.success(`Physically typed ${deps.p.f}'s Step 1! Proceeding...`)
      } else if (document.querySelector('[name="lrn"]')) {
        await fillStep2(deps)
        setTimeout(() => advanceStep(), 600)
        toast.success(`Physically typed ${deps.p.f}'s Step 2! Proceeding...`)
      } else if (document.querySelector('[name="guardian_first_name"]')) {
        await fillStep3(deps)
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
        await fillStep1(deps)
        await sleep(600)
        advanceStep()
        await sleep(1000) 
      }
      
      if (document.querySelector('[name="lrn"]')) {
        await fillStep2(deps)
        await sleep(600)
        advanceStep()
        await sleep(1000)
      }

      if (document.querySelector('[name="guardian_first_name"]')) {
        await fillStep3(deps)
        await sleep(600)
        advanceStep()
      }

      toast.success("Fast forward complete!")
      
    } catch (e) {
      toast.error("Automated sequence interrupted")
      console.error(e)
    }
  }

  // ── Mock Students Engine ───────────────────────────────────────────────────
  const handleGenerateMock = async () => {
    setLoading("mock-gen")
    try {
      const syReq = await supabase.from("system_config").select("school_year").single()
      const sy = syReq.data?.school_year || "2025-2026"
      const batchId = Date.now().toString().slice(-6)
      const students = Array.from({ length: 20 }, (_, i) => generateStudent(i + 1, batchId, sy))
      
      const { error } = await supabase.from("students").insert(students)
      if (error) throw error
      toast.success("Generated 20 mock students successfully.")
    } catch (e: any) {
      toast.error(`Mock error: ${e.message}`)
    } finally {
      setLoading(null)
    }
  }

  const handleClearMock = async () => {
    if (!confirm("Delete all mock students?")) return
    setLoading("mock-clear")
    try {
      const { data } = await supabase.from("students").select("id").eq("mock", true).limit(500)
      if (data && data.length > 0) {
        const ids = data.map((d: any) => d.id)
        await clearMockData(ids)
        toast.success(`Cleared ${ids.length} mock rows.`)
      } else {
        toast.info("No mock students found.")
      }
    } catch (e: any) {
      toast.error(`Clear error: ${e.message}`)
    } finally {
      setLoading(null)
    }
  }

  // ── Purgative Actions ────────────────────────────────────────────────────────
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

  const wipeChats = async () => {
    if (!confirm("Are you sure you want to securely wipe ALL chat messages?")) return
    setLoading("wipe-chats")
    try {
      await Promise.all([
        supabase.from("admin_dm_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("admin_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("teacher_chat_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("teacher_dm_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("teacher_global_chat_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("teacher_message_reactions").delete().neq("id", 0),
        supabase.from("message_reactions").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      ])
      toast.success("Successfully cleared all chat records.")
    } catch (e) {
      toast.error("Failed to wipe chats")
    } finally {
      setLoading(null)
    }
  }

  // ── Snapshot & Reset ───────────────────────────────────────────────────────
  const createSnapshot = async () => {
    setLoading("backup")
    try {
      const [{ data: stud }, { data: sect }, { data: cfg }, { data: tea }, { data: sch }, { data: att }, 
             { data: admDm }, { data: admMsg }, { data: teaChat }, { data: teaDm }, { data: teaGlob }, { data: teaReac }, { data: msgReac }] = await Promise.all([
        supabase.from("students").select("*"),
        supabase.from("sections").select("*"),
        supabase.from("system_config").select("*"),
        supabase.from("teachers").select("*"),
        supabase.from("schedules").select("*"),
        supabase.from("attendance").select("*"),
        supabase.from("admin_dm_messages").select("*"),
        supabase.from("admin_messages").select("*"),
        supabase.from("teacher_chat_messages").select("*"),
        supabase.from("teacher_dm_messages").select("*"),
        supabase.from("teacher_global_chat_messages").select("*"),
        supabase.from("teacher_message_reactions").select("*"),
        supabase.from("message_reactions").select("*"),
      ])

      const chat_data = { admDm, admMsg, teaChat, teaDm, teaGlob, teaReac, msgReac }

      const { error } = await supabase.from("demo_snapshots").insert({
        snapshot_name: `Snapshot ${new Date().toLocaleString()}`,
        students_data: stud || [],
        sections_data: sect || [],
        system_config_data: cfg || [],
        teachers_data: tea || [],
        schedules_data: sch || [],
        attendance_data: att || [],
        chat_data: chat_data // assuming this column gets added properly (jsonb variant)
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
        supabase.from("admin_dm_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("admin_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("teacher_chat_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("teacher_dm_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("teacher_global_chat_messages").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        supabase.from("teacher_message_reactions").delete().neq("id", 0),
        supabase.from("message_reactions").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
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

      if (snap.chat_data) {
        const cd = snap.chat_data
        await Promise.all([
          inject("admin_dm_messages", cd.admDm),
          inject("admin_messages", cd.admMsg),
          inject("teacher_chat_messages", cd.teaChat),
          inject("teacher_dm_messages", cd.teaDm),
          inject("teacher_global_chat_messages", cd.teaGlob),
          inject("teacher_message_reactions", cd.teaReac),
          inject("message_reactions", cd.msgReac),
        ])
      }

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

  const positionClasses = position === 'bottom-right'
    ? 'bottom-[5.5rem] right-6 items-end'
    : 'top-6 left-1/2 -translate-x-1/2 items-center'

  return (
    <>
      <div className={`fixed z-[9999] flex flex-col gap-3 pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${positionClasses}`}>
        {/* Panel */}
        {isOpen && (
        <div 
          className={`bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden pointer-events-auto transform translate-y-0 opacity-100 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            position === 'bottom-right'
              ? 'w-80 rounded-3xl'
              : 'w-max max-w-[90vw] rounded-[2rem] flex flex-row items-center p-3 gap-6 no-scrollbar overflow-x-auto'
          }`}
        >
          {position === 'bottom-right' ? (
            <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col w-full h-full">
              <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-black tracking-widest uppercase text-white">Demonstrator Tools</span>
              </div>
              <div className="flex gap-4 items-center">
                <button onClick={togglePosition} className="text-slate-500 hover:text-white transition-colors" title="Move panel">
                  {position === 'bottom-right' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                </button>
                <button onClick={toggleOpen} className="text-slate-500 hover:text-white transition-colors" title="Close Panel">
                  <X size={16} />
                </button>
              </div>
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

                  {/* Mock Engine */}
                  <div className="space-y-2.5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">2. Mock Generator</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleGenerateMock}
                        disabled={loading !== null}
                        className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 rounded-xl px-4 py-2.5 text-[10px] font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        {loading === "mock-gen" ? <Loader2 size={12} className="animate-spin" /> : <><Users size={12} /> Add 20</>}
                      </button>
                      <button
                        onClick={handleClearMock}
                        disabled={loading !== null}
                        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-xl px-4 py-2.5 text-[10px] font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        {loading === "mock-clear" ? <Loader2 size={12} className="animate-spin" /> : <><Trash2 size={12} /> Clear Mock</>}
                      </button>
                    </div>
                  </div>

                  {/* DB Wipe */}
                  <div className="space-y-2.5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">3. Data Purge</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => wipeAttendance("today")}
                        disabled={loading !== null}
                        className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 rounded-xl px-4 py-2.5 text-[10px] font-bold transition-colors"
                      >
                        {loading === "wipe-today" ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Wipe Attend"}
                      </button>
                      <button
                        onClick={wipeChats}
                        disabled={loading !== null}
                        className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-xl px-4 py-2.5 text-[10px] font-bold transition-colors"
                      >
                        {loading === "wipe-chats" ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Wipe Chats"}
                      </button>
                    </div>
                  </div>

                  {/* Snapshots */}
                  <div className="space-y-2.5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">4. State Restoration</span>
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
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-500 flex items-center gap-6 w-full h-full shrink-0">
              <div className="flex flex-col gap-1 items-start shrink-0 px-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-black tracking-widest uppercase text-white">Demonstrator Tools</span>
              </div>
              <div className="flex gap-4 items-center mt-2">
                <button onClick={togglePosition} className="text-slate-500 hover:text-white transition-colors" title="Move panel">
                  <ArrowDownRight size={14} />
                </button>
                <button onClick={toggleOpen} className="text-slate-500 hover:text-white transition-colors" title="Close Panel">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="w-px h-10 bg-slate-800 shrink-0"></div>

            {!unlocked ? (
              <form onSubmit={handleUnlock} className="flex gap-3 items-center shrink-0">
                <input
                  type="password"
                  placeholder="Master Key..."
                  value={pwd}
                  onChange={e => setPwd(e.target.value)}
                  className="w-40 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  Unlock
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-6 shrink-0">
                
                {/* Autofill */}
                <div className="flex flex-col gap-1.5 items-start">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Registration</span>
                  <div className="flex gap-2">
                    <button
                      onClick={triggerAutoFillStep}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors flex items-center gap-1 group"
                    >
                      Fill Step 
                      <Zap size={10} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={triggerAutoFillCascade}
                      className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors flex items-center gap-1"
                    >
                      Fast Forward
                    </button>
                  </div>
                </div>

                <div className="w-px h-8 bg-slate-800 shrink-0"></div>

                {/* Mock Engine */}
                <div className="flex flex-col gap-1.5 items-start">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Mock Gen</span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerateMock}
                      disabled={loading !== null}
                      className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors flex items-center gap-1"
                    >
                      {loading === "mock-gen" ? <Loader2 size={10} className="animate-spin" /> : <Users size={10} />} Add 20
                    </button>
                    <button
                      onClick={handleClearMock}
                      disabled={loading !== null}
                      className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors flex items-center gap-1"
                    >
                      {loading === "mock-clear" ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />} Clear
                    </button>
                  </div>
                </div>

                <div className="w-px h-8 bg-slate-800 shrink-0"></div>

                {/* DB Wipe */}
                <div className="flex flex-col gap-1.5 items-start">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Purge DB</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => wipeAttendance("today")}
                      disabled={loading !== null}
                      className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors flex items-center gap-1"
                    >
                      {loading === "wipe-today" ? <Loader2 size={10} className="animate-spin" /> : "Attend"}
                    </button>
                    <button
                      onClick={wipeChats}
                      disabled={loading !== null}
                      className="bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors flex items-center gap-1"
                    >
                      {loading === "wipe-chats" ? <Loader2 size={10} className="animate-spin" /> : "Chats"}
                    </button>
                  </div>
                </div>

                <div className="w-px h-8 bg-slate-800 shrink-0"></div>

                {/* Snapshots */}
                <div className="flex flex-col gap-1.5 items-start pr-2">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Restoration</span>
                  <div className="flex gap-2">
                    <button
                      onClick={createSnapshot}
                      disabled={loading !== null}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      <span className="text-[10px] font-bold">Backup</span>
                      {loading === "backup" ? <Loader2 size={10} className="animate-spin" /> : <DatabaseBackup size={10} />}
                    </button>
                    
                    <button
                      onClick={performReset}
                      disabled={loading !== null}
                      className="flex items-center gap-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg px-4 py-1.5 shadow-lg shadow-rose-500/25 transition-colors group"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">Return</span>
                      {loading === "reset" ? <Loader2 size={10} className="animate-spin" /> : <Eraser size={10} className="group-hover:-rotate-12 transition-transform" />}
                    </button>
                  </div>
                </div>

              </div>
            )}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Trigger Button */}
      <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none flex flex-col items-end gap-3">
        <button 
          onClick={toggleOpen}
          className={`pointer-events-auto flex items-center justify-center w-12 h-12 rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 border
            ${isOpen ? "bg-slate-800 border-slate-700 text-white" : "bg-blue-600 border-blue-500 text-white"}`}
        >
          <Settings size={20} className={unlocked && !isOpen ? "animate-[spin_10s_linear_infinite] text-amber-300" : ""} />
        </button>
      </div>

    </>
  )
}
