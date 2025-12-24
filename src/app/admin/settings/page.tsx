"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase/client"
import { 
  toggleEnrollment, 
  forceSyncCapacities,
  updateCapacity 
} from "@/lib/actions/settings"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Loader2, DatabaseZap, Users, Save, AlertCircle,
  CalendarDays, Globe, Settings2, Cpu, Eraser, ShieldAlert,
  Banknote, Landmark, Zap
} from "lucide-react"
import { toast } from "sonner"

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentAccepted, setCurrentAccepted] = useState(0)

  // capacity and voucherValue are string | number to handle blank states
  const [config, setConfig] = useState({
    id: "",
    isOpen: true,
    capacity: 1000 as string | number,
    schoolYear: "",
    startDate: "",
    endDate: "",
    controlMode: "automatic",
    voucherValue: 22500 as string | number
  })

  const loadSettings = useCallback(async () => {
    try {
      const { data: configData } = await supabase.from('system_config').select('*').single()
      
      const { count } = await supabase.from('students')
        .select('*', { count: 'exact', head: true })
        .or('status.eq.Accepted,status.eq.Approved')
      
      if (configData) {
        setConfig({
          id: configData.id,
          isOpen: configData.is_portal_active,
          capacity: configData.capacity ?? 1000,
          schoolYear: configData.school_year || "",
          startDate: configData.enrollment_start || "",
          endDate: configData.enrollment_end || "",
          controlMode: configData.control_mode || "automatic",
          voucherValue: configData.voucher_value ?? 22500
        })
        setCurrentAccepted(count || 0)
      }
    } catch (err) {
      console.error("Fetch Error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  // --- LOGIC A: System Mode Toggle (STRICTLY RETAINED) ---
  const handleModeToggle = async (isManual: boolean) => {
    setUpdating(true)
    const newMode = isManual ? 'manual' : 'automatic'
    try {
      let finalPortalStatus = config.isOpen
      if (newMode === 'automatic') {
        if (!config.startDate || !config.endDate) {
          finalPortalStatus = false
          toast.info("Automatic Mode requires dates. Portal auto-locked.")
        } else {
          const now = new Date()
          const start = new Date(config.startDate)
          const end = new Date(config.endDate)
          now.setHours(0,0,0,0)
          start.setHours(0,0,0,0)
          end.setHours(23,59,59,999)
          finalPortalStatus = now >= start && now <= end
        }
      }
      const { error } = await supabase.from('system_config')
        .update({ 
          control_mode: newMode,
          is_portal_active: finalPortalStatus 
        })
        .eq('id', config.id)
      if (error) throw error
      setConfig(prev => ({ ...prev, controlMode: newMode, isOpen: finalPortalStatus }))
      toast.success(`System logic synchronized to ${newMode.toUpperCase()}`)
    } catch (err) {
      toast.error("Protocol Sync Failed.")
    } finally {
      setUpdating(false)
    }
  }

  // --- LOGIC B: Manual Override (STRICTLY RETAINED) ---
  const handleManualOverride = async (checked: boolean) => {
    setUpdating(true)
    try {
      await toggleEnrollment(checked)
      setConfig(prev => ({ ...prev, isOpen: checked }))
      toast.success(`Override: Portal ${checked ? 'OPEN' : 'CLOSED'}`)
    } catch (err) {
      toast.error("Manual Override Command Failed.")
    } finally {
      setUpdating(false)
    }
  }

  // --- LOGIC C: Capacity Guardian (STRICTLY RETAINED) ---
  const runCapacityGuardian = async () => {
    setUpdating(true)
    try {
      const currentCap = Number(config.capacity)
      if (currentAccepted >= currentCap) {
        const { error } = await supabase.from('system_config').update({ 
          is_portal_active: false,
          control_mode: 'manual' 
        }).eq('id', config.id)
        if (error) throw error
        setConfig(prev => ({ ...prev, isOpen: false, controlMode: 'manual' }))
        toast.warning("Guardian Critical: Limit reached. Portal shutdown complete.")
      } else {
        toast.info(`Integrity verified. ${currentCap - currentAccepted} slots available.`)
      }
    } catch (err) {
      toast.error("Guardian Execution Failed.")
    } finally {
      setUpdating(false)
    }
  }

  // --- GLOBAL SAVE: ENFORCING PROTOCOLS ---
  const handleGlobalSave = async () => {
    // CAPACITY BLANK CHECK
    if (config.capacity === "" || config.capacity === null) {
      return toast.error("Validation Error: Capacity field cannot be blank.")
    }

    // VOUCHER BLANK CHECK (UPDATED REQUEST)
    if (config.voucherValue === "" || config.voucherValue === null) {
      return toast.error("Financial Error: Voucher Value cannot be blank.")
    }
    
    const numericCapacity = Number(config.capacity)
    const numericVoucher = Number(config.voucherValue)

    if (numericCapacity < 50) {
      return toast.error("System Protocol: Minimum capacity is 50.")
    }

    setIsSaving(true)
    try {
      let calculatedStatus = config.isOpen
      if (config.controlMode === 'automatic') {
        if (!config.startDate || !config.endDate) {
          calculatedStatus = false
        } else {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const start = new Date(config.startDate)
          const end = new Date(config.endDate)
          end.setHours(23, 59, 59, 999)
          calculatedStatus = today >= start && today <= end
        }
      }

      const payload: any = {
        school_year: config.schoolYear,
        enrollment_start: config.startDate || null,
        enrollment_end: config.endDate || null,
        capacity: numericCapacity,
        voucher_value: numericVoucher,
        is_portal_active: calculatedStatus
      }

      const { error } = await supabase.from('system_config')
        .update(payload)
        .eq('id', config.id)

      if (error) throw error
      
      await updateCapacity(numericCapacity)
      setConfig(prev => ({ ...prev, isOpen: calculatedStatus }))
      toast.success("Matrix Intelligence Synchronized")
    } catch (err: any) {
      console.error(err)
      toast.error("Schema Mismatch. Please refresh browser and try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // --- REACTIVE SATURATION ENGINE ---
  const capacityPercentage = useMemo(() => {
    const cap = Number(config.capacity)
    if (!cap || cap <= 0) return 0
    return Math.min((currentAccepted / cap) * 100, 100)
  }, [currentAccepted, config.capacity])

  return (
    <div className="max-w-2xl mx-auto py-12 space-y-12 animate-in fade-in duration-700 pb-32">
      
      <div className="text-center space-y-4">
        <div className="inline-flex p-6 bg-slate-900 text-white rounded-[32px] mb-2 shadow-2xl"><Settings2 size={40} /></div>
        <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase leading-none">Configuration</h1>
        <p className="text-slate-400 font-medium italic tracking-wide">AMA ACLC Northbay Enrollment Parameters</p>
      </div>

      <div className="space-y-6">
        
        {/* SYSTEM LOGIC MODE */}
        <Card className="p-8 rounded-[40px] border-none shadow-sm bg-white flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl transition-all duration-500 ${config.controlMode === 'automatic' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}><Cpu size={24} /></div>
            <div>
              <h3 className="font-black uppercase text-xs tracking-widest text-slate-800">System Logic Mode</h3>
              <p className="text-slate-400 text-[10px] italic font-medium">{config.controlMode === 'automatic' ? 'Schedule Automation' : 'Administrative Override'}</p>
            </div>
          </div>
          <Switch checked={config.controlMode === 'manual'} onCheckedChange={handleModeToggle} disabled={updating} className="data-[state=checked]:bg-purple-600 shadow-sm" />
        </Card>

        {/* MANUAL OVERRIDE */}
        <Card className={`p-8 rounded-[40px] border-none shadow-sm bg-white flex items-center justify-between transition-all duration-500 ${config.controlMode !== 'manual' ? 'opacity-30 grayscale pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${config.isOpen ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}><Globe size={24} /></div>
            <div>
              <h3 className="font-black uppercase text-xs tracking-widest text-slate-800">Manual Portal Override</h3>
              <p className="text-slate-400 text-[10px] italic font-medium">Forced Bypass Control</p>
            </div>
          </div>
          <Switch checked={config.isOpen} onCheckedChange={handleManualOverride} disabled={updating} className="data-[state=checked]:bg-green-500 shadow-sm" />
        </Card>

        {/* ENROLLMENT MATRIX */}
        <Card className={`p-10 rounded-[48px] border-none shadow-sm bg-white space-y-8 transition-all duration-500 ${config.controlMode !== 'automatic' ? 'opacity-30 grayscale pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center justify-between border-b border-slate-50 pb-6">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><CalendarDays size={20} /></div>
               <h2 className="font-black text-sm uppercase tracking-widest text-slate-800">Enrollment Matrix</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setConfig({...config, schoolYear: "", startDate: "", endDate: ""})} className="text-[9px] font-black uppercase text-slate-400 hover:text-red-600 transition-colors"><Eraser size={14} className="mr-2"/> Clear Fields</Button>
          </div>

          <div className="space-y-6">
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target School Year</label>
               <Input value={config.schoolYear} onChange={(e) => setConfig({...config, schoolYear: e.target.value})} className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-black text-lg uppercase focus-visible:ring-blue-500" placeholder="2025-2026" />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Matrix Start</label>
                  <Input type="date" value={config.startDate} onChange={(e) => setConfig({...config, startDate: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Matrix End</label>
                  <Input type="date" value={config.endDate} onChange={(e) => setConfig({...config, endDate: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
             </div>
          </div>
        </Card>

        {/* CAPACITY GUARDIAN */}
        <Card className="p-10 rounded-[48px] border-none shadow-sm bg-white space-y-8">
          <div className="flex items-center justify-between border-b border-slate-50 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={20} /></div>
              <h2 className="font-black text-sm uppercase tracking-widest text-slate-800">Capacity Guardian</h2>
            </div>
            <Button onClick={runCapacityGuardian} disabled={updating} variant="outline" className="rounded-full text-[9px] font-black uppercase border-red-100 text-red-600 hover:bg-red-50 shadow-sm transition-all active:scale-95">
                <ShieldAlert size={14} className="mr-2" /> Integrity Scan
            </Button>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Institutional Capacity (MORE THAN 50)</label>
              {/* REACTIVE BLANK INPUT LOGIC */}
              <Input 
                type="text" 
                value={config.capacity === 0 || config.capacity === null ? "" : config.capacity} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || val === " ") {
                    setConfig({...config, capacity: ""});
                  } else {
                    const parsed = parseInt(val);
                    if (!isNaN(parsed)) setConfig({...config, capacity: parsed});
                  }
                }} 
                className="h-16 rounded-3xl bg-slate-50 border-none font-black text-3xl px-8 focus-visible:ring-indigo-500 shadow-inner" 
                placeholder="50+"
              />
            </div>

            <div className="w-full bg-slate-900 p-8 rounded-[36px] text-white relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-10 -mt-10" />
               <div className="flex justify-between items-end mb-4 relative z-10">
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-400 tracking-[0.3em]">Saturation Matrix</span>
                    <p className="text-2xl font-black mt-1">{currentAccepted} <span className="text-slate-500 text-sm">/ {config.capacity || "—"} Seats</span></p>
                  </div>
                  <span className="text-xl font-black text-white">{Math.round(capacityPercentage)}%</span>
               </div>
               <div className="h-3 bg-white/10 rounded-full overflow-hidden shadow-inner relative z-10">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out ${
                      capacityPercentage > 95 ? 'bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 
                      capacityPercentage > 80 ? 'bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]' : 
                      'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                    }`} 
                    style={{ width: `${capacityPercentage}%` }} 
                  />
               </div>
            </div>
          </div>
        </Card>

        {/* FINANCIAL HUB (UPGRADED BLANK INPUT LOGIC) */}
        <Card className="p-10 rounded-[48px] border-none shadow-sm bg-white space-y-8">
           <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Banknote size={20} /></div>
              <h2 className="font-black text-sm uppercase tracking-widest text-slate-800">Financial Hub</h2>
           </div>
           <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Global Voucher Value (PHP)</label>
                <div className="relative">
                  <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  {/* UPDATED: Handles blank state properly if deleted */}
                  <Input 
                    type="text" 
                    value={config.voucherValue === 0 || config.voucherValue === null ? "" : config.voucherValue} 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || val === " ") {
                        setConfig({...config, voucherValue: ""});
                      } else {
                        const parsed = parseInt(val);
                        if (!isNaN(parsed)) setConfig({...config, voucherValue: parsed});
                      }
                    }}
                    className="h-14 rounded-2xl bg-slate-50 border-none font-black text-xl pl-12 focus-visible:ring-emerald-500" 
                  />
                </div>
                <p className="text-[9px] text-slate-400 font-medium italic mt-2 px-2">Used for real-time revenue matrix calculations on the Dashboard.</p>
              </div>
           </div>
        </Card>

        <div className="pt-6 space-y-4">
          <Button onClick={handleGlobalSave} disabled={isSaving} className="w-full h-20 rounded-[32px] bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.4em] text-xs shadow-2xl transition-all hover:-translate-y-1 active:scale-95 shadow-indigo-200">
            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={20} />} Commit Protocol Configuration
          </Button>

          <div className="flex justify-center">
              <Button onClick={async () => { setIsSyncing(true); await forceSyncCapacities(); setIsSyncing(false); toast.success("Recalibrated Successfully."); }} disabled={isSyncing} variant="ghost" className="text-slate-400 hover:text-amber-600 text-[10px] font-black uppercase tracking-widest group">
                  <Zap size={14} className="mr-2 group-hover:fill-amber-600 transition-all" /> {isSyncing ? "Calibrating..." : "Force Sync Capacities"}
              </Button>
          </div>
        </div>

      </div>
    </div>
  )
}