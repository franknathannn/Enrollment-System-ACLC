// app/status/page.tsx
"use client"

import { useState, useEffect, Suspense } from "react"
import { ArrowLeft, Loader2, XCircle, Orbit } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ParticleCanvas }   from "./components/ParticleCanvas"
import { PortalHero }       from "./components/PortalHero"
import { VerifyForm }       from "./components/VerifyForm"
import { ResultCard }       from "./components/ResultCard"
import { EditRequestForm }  from "./components/EditRequestForm"
import type { StudentRecord } from "./types"

// ── Main content (split out so Suspense works) ──────────────────────────────
function StatusContent() {
  const [lrn,        setLrn]        = useState("")
  const [lastName,   setLastName]   = useState("")
  const [trackingId, setTrackingId] = useState("")
  const [result,     setResult]     = useState<StudentRecord | null>(null)
  const [activeSY,   setActiveSY]   = useState("...")
  const [loading,    setLoading]    = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const { updateFormData, setStep } = useEnrollmentStore()
  const router = useRouter()

  // Persist search across reloads
  useEffect(() => {
    const l = sessionStorage.getItem("matrix_search_lrn")
    const n = sessionStorage.getItem("matrix_search_name")
    const i = sessionStorage.getItem("matrix_search_id")
    if (l && n && i) {
      setLrn(l); setLastName(n); setTrackingId(i)
      setTimeout(() => performSearch(l, n, i), 100)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Active school year
  useEffect(() => {
    supabase.from("system_config").select("school_year").single()
      .then(({ data }) => { if (data) setActiveSY(data.school_year) })
  }, [])

  // Realtime status sync
  useEffect(() => {
    if (!result?.id) return
    const ch = supabase
      .channel(`status_watch_${result.id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "students",
        filter: `id=eq.${result.id}`,
      }, async () => {
        const { data } = await supabase
          .from("students")
          .select(`
            id, lrn, first_name, last_name, middle_name,
            strand, status, section, school_year,
            registrar_feedback, decline_reason, is_locked,
            sections(section_name)
          `)
          .eq("id", result.id)
          .single()
        if (data) {
          setResult(data as unknown as StudentRecord)
          toast.success("Status updated live!", { icon: <Orbit className="animate-spin text-blue-500 w-4 h-4" /> })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [result?.id])

  const performSearch = async (searchLrn: string, searchName: string, searchId: string) => {
    setLoading(true)
    try {
      // Pull URL + anon key directly from the already-configured supabase client
      // so it works on localhost and in production without any extra env wiring.
      const supabaseUrl  = (supabase as any).supabaseUrl  as string
      const supabaseKey  = (supabase as any).supabaseKey  as string

      const res = await fetch(
        `${supabaseUrl}/functions/v1/check-status`,
        {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "apikey":        supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ lrn: searchLrn, lastName: searchName, trackingId: searchId }),
        }
      )

      if (res.status === 429) {
        toast.error("Too many attempts. Please wait 1 hour before trying again.", { duration: 6000 })
        setResult(null)
        return
      }

      const json = await res.json()

      if (!json.data) {
        setResult(null)
        if (hasSearched) toast.error("Record not found. Check your LRN, surname, and tracking ID.")
      } else {
        setResult(json.data as StudentRecord)
        sessionStorage.setItem("matrix_search_lrn",  searchLrn)
        sessionStorage.setItem("matrix_search_name", searchName)
        sessionStorage.setItem("matrix_search_id",   searchId)
      }
    } catch {
      setResult(null)
      toast.error("Could not reach the server. Please try again.")
    } finally {
      setHasSearched(true)
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(lrn, lastName, trackingId)
  }

  const handleFixApplication = () => {
    const toastId = toast.loading("Restoring your enrollment data…")
    updateFormData({
      ...result,
      id: result!.id,
      middle_name: result!.middle_name || undefined,
      gender: result!.gender || undefined,
      profile_2x2_url: result!.two_by_two_url || undefined,
      phone: result!.phone || result!.contact_no || undefined,
    })
    setStep(1)
    setTimeout(() => {
      toast.success("Editor ready.", { id: toastId })
      router.push("/enroll")
    }, 800)
  }

  const showRequestForm =
    result &&
    result.status !== "Rejected" &&
    !result.is_locked

  return (
    <div className="max-w-md md:max-w-xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 relative z-10">

      {/* Back link */}
      <div className="flex justify-start">
        <Link href="/">
          <Button variant="ghost" className="rounded-xl font-black uppercase text-[10px] tracking-[0.2em] text-slate-500 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all group">
            <ArrowLeft className="mr-2 w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Go Back to Homepage
          </Button>
        </Link>
      </div>

      {/* Hero */}
      <PortalHero schoolYear={activeSY} />

      {/* Verify form */}
      <VerifyForm
        lrn={lrn}
        lastName={lastName}
        trackingId={trackingId}
        loading={loading}
        onLrnChange={setLrn}
        onLastNameChange={setLastName}
        onTrackingIdChange={setTrackingId}
        onSubmit={handleSearch}
      />

      {/* Results */}
      <div className="space-y-4 relative z-10">

        {hasSearched && result && (
          <ResultCard result={result} onFixApplication={handleFixApplication} />
        )}

        {/* Edit request ticket form (for non-rejected, non-locked enrolled students) */}
        {hasSearched && result && showRequestForm && (
          <EditRequestForm studentId={result.id} studentLrn={result.lrn} />
        )}

        {hasSearched && !result && (
          <div className="text-center py-20 px-10 border border-white/8 rounded-[56px] bg-white/[0.02] animate-in fade-in zoom-in-95 duration-700 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-red-900/5 to-transparent pointer-events-none rounded-[56px]" />
            <div className="relative w-16 h-16 mx-auto mb-6">
              <span className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="relative w-16 h-16 rounded-full bg-slate-900 border border-red-500/20 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500/50" />
              </div>
            </div>
            <div className="space-y-2 relative z-10">
              <p className="text-white font-black uppercase tracking-[0.2em] text-lg">No Records Found</p>
              <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em] italic">
                Verify your LRN, surname, and tracking ID.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pt-10">
        <div className="inline-flex items-center gap-2">
          <span className="w-4 h-px bg-slate-800" />
          <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.6em]">
            NORTHBAY TERMINAL · {activeSY}
          </p>
          <span className="w-4 h-px bg-slate-800" />
        </div>
      </div>
    </div>
  )
}

// ── Page wrapper ─────────────────────────────────────────────────────────────
export default function StatusPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-6 pt-16 relative overflow-hidden">
      <ParticleCanvas />

      {/* Ambient glow blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-900/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/10 rounded-full blur-[160px] pointer-events-none" />

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center gap-6 mt-32 relative z-10">
          <Loader2 className="animate-spin text-blue-500 w-12 h-12" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400 animate-pulse">
            Synchronizing Node…
          </p>
        </div>
      }>
        <StatusContent />
      </Suspense>
    </div>
  )
}