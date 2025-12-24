"use client"

import { useState, Suspense, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"
import { useEnrollmentStore } from "@/store/useEnrollmentStore"
import { useRouter } from "next/navigation"
import { 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  MapPin, 
  Clock,
  ArrowLeft,
  FileEdit,
  ShieldCheck
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

function StatusContent() {
  const [lrn, setLrn] = useState("")
  const [lastName, setLastName] = useState("") 
  const [result, setResult] = useState<any>(null)
  const [activeSY, setActiveSY] = useState("...")
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const { updateFormData, setStep } = useEnrollmentStore()
  const router = useRouter()

  const isLrnComplete = lrn.length === 12;

  useEffect(() => {
    async function getSY() {
      const { data } = await supabase.from('system_config').select('school_year').single()
      if (data) setActiveSY(data.school_year)
    }
    getSY()
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLrnComplete || !lastName) {
      toast.error("Please provide both LRN and Surname.")
      return
    }

    setLoading(true)
    try {
      // Handshake: Match LRN and Last Name
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          sections ( section_name )
        `)
        .eq('lrn', lrn)
        .ilike('last_name', lastName)
        .single()

      if (error || !data) {
        setResult(null)
        toast.error("Record not found. Verify your details.")
      } else {
        setResult(data)
        toast.success("Application localized.")
      }
    } catch (error) {
      setResult(null)
    } finally {
      setHasSearched(true)
      setLoading(false)
    }
  }

  const handleFixApplication = () => {
    const toastId = toast.loading("Restoring your data...")
    
    updateFormData({
      ...result,
      id: result.id,
      profile_2x2_url: result.two_by_two_url,
      phone: result.phone || result.contact_no
    })

    setStep(1)
    
    setTimeout(() => {
      toast.success("Editor ready.", { id: toastId })
      router.push('/enroll')
    }, 800)
  }

  return (
    <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-start">
        <Link href="/">
          <Button variant="ghost" className="rounded-xl font-bold text-slate-500 hover:text-blue-600 transition-all">
            <ArrowLeft className="mr-2 w-4 h-4" /> Return Home
          </Button>
        </Link>
      </div>

      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-slate-900 rounded-[24px] shadow-xl flex items-center justify-center mx-auto text-white">
          <ShieldCheck size={32} />
        </div>
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase leading-none">Portal Status</h1>
          <p className="text-slate-500 font-medium italic text-sm">Verify your enrollment for S.Y. {activeSY}</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-4 mt-10">
        <div className="relative">
          <Input 
            placeholder="12-Digit LRN" 
            value={lrn}
            onChange={(e) => setLrn(e.target.value.replace(/\D/g, ''))}
            maxLength={12}
            className="h-16 pl-14 rounded-[24px] border-slate-200 shadow-sm text-lg font-mono font-bold tracking-[0.2em] focus:ring-blue-100 transition-all bg-white"
          />
          <Search className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 ${isLrnComplete ? 'text-blue-600' : 'text-slate-300'}`} />
        </div>

        <Input 
          placeholder="Surname (Last Name)" 
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="h-16 px-6 rounded-[24px] border-slate-200 shadow-sm text-md font-bold uppercase focus:ring-blue-100 transition-all bg-white"
        />
        
        <Button 
          disabled={!isLrnComplete || !lastName || loading}
          className="w-full h-16 rounded-[24px] bg-slate-900 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl transition-all active:scale-95"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : "Verify Identity"}
        </Button>
      </form>

      <div className="space-y-4">
        {hasSearched && result && (
          <Card className="p-10 rounded-[48px] border-none shadow-2xl bg-white animate-in zoom-in-95 duration-500 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-2 ${
              result.status === 'Approved' || result.status === 'Accepted' ? 'bg-green-500' : 
              result.status === 'Rejected' ? 'bg-red-500' : 'bg-amber-500'
            }`} />

            <div className="space-y-8">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tighter truncate max-w-[180px]">
                    {result.first_name} {result.last_name}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    {result.strand} • LRN: {result.lrn}
                  </p>
                </div>
                <StatusBadge status={result.status} />
              </div>

              {/* ACTION REQUIRED VIEW - UPDATED WITH DYNAMIC FEEDBACK */}
              {result.status === 'Rejected' && (
                <div className="space-y-6">
                  <div className="p-6 bg-red-50 rounded-[32px] border border-red-100 space-y-2">
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertCircle size={14} />
                      <p className="text-[10px] font-black uppercase tracking-widest">Registrar Feedback</p>
                    </div>
                    {/* UPDATED FIELD: Using registrar_feedback from DB */}
                    <p className="text-sm font-bold text-red-700 leading-relaxed italic">
                      "{result.registrar_feedback || "Correction needed. Please re-verify requirements."}"
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleFixApplication}
                    className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-blue-100 flex items-center gap-3 transition-all"
                  >
                    <FileEdit size={16} /> Fix Application
                  </Button>
                </div>
              )}

              {/* APPROVED VIEW */}
              {(result.status === 'Approved' || result.status === 'Accepted') && (
                <div className="space-y-6">
                  <div className="p-6 bg-blue-50 rounded-[32px] border border-blue-100 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Official Section</p>
                      <p className="text-2xl font-black text-blue-800 tracking-tighter uppercase">
                        {result.sections?.section_name || "Assigning..."}
                      </p>
                    </div>
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md">
                      <MapPin className="text-blue-600 w-7 h-7" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <p className="text-[10px] text-emerald-700 font-black uppercase tracking-widest">Matriculation Confirmed</p>
                  </div>
                </div>
              )}

              {/* PENDING VIEW */}
              {result.status === 'Pending' && (
                <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Clock className="text-amber-500 w-8 h-8 animate-pulse" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">Under Review</p>
                    <p className="text-[11px] font-medium text-slate-500 italic max-w-[200px] leading-relaxed">
                      We are validating your documents. Status will be updated within 48 hours.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {hasSearched && !result && (
          <div className="text-center py-16 px-10 border-2 border-dashed border-slate-200 rounded-[48px] bg-white/50 animate-in fade-in duration-700">
            <XCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <div className="space-y-1">
              <p className="text-slate-900 font-black uppercase tracking-tighter">No record localized</p>
              <p className="text-slate-400 text-xs font-medium italic">Verify your LRN and Surname spelling.</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
          ACLC Northbay Systems • {activeSY}
        </p>
      </div>
    </div>
  )
}

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 pt-16">
      <Suspense fallback={<Loader2 className="animate-spin text-blue-600 mt-32" size={40} />}>
        <StatusContent />
      </Suspense>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    Pending: "bg-amber-100 text-amber-700 border-amber-200",
    Accepted: "bg-green-100 text-green-700 border-green-200",
    Approved: "bg-green-100 text-green-700 border-green-200",
    Rejected: "bg-red-100 text-red-700 border-red-200",
  }
  return (
    <div className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest shadow-sm shrink-0 ${styles[status] || styles.Pending}`}>
      {status === 'Approved' || status === 'Accepted' ? 'Accepted' : status}
    </div>
  )
}