"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import {
  toggleEnrollment,
  forceSyncCapacities,
  updateCapacity
} from "@/lib/actions/settings"
import { snapshotCurrentYearData } from "@/lib/actions/history"
import { toast } from "sonner"
import { useTheme } from "@/hooks/useTheme"
import { TooltipProvider } from "@/components/ui/tooltip"
import { StarConstellation } from "./components/StarConstellation"
import { SettingsHeader } from "./components/SettingsHeader"
import { SystemLogicMode } from "./components/SystemLogicMode"
import { ManualPortalOverride } from "./components/ManualPortalOverride"
import { EnrollmentMatrix } from "./components/EnrollmentMatrix"
import { PreEnrollmentMode } from "./components/PreEnrollmentMode"
import { CapacityGuardian } from "./components/CapacityGuardian"
import { FinancialHub } from "./components/FinancialHub"
import { SettingsActions } from "./components/SettingsActions"
import { EnrollmentFormControl } from "./components/EnrollmentFormControl"
import { GradeOperationsPanel } from "./components/GradeOperationsPanel"

type ConfigState = {
  id: string
  isOpen: boolean
  capacity: string | number
  schoolYear: string
  startDate: string
  endDate: string
  controlMode: "automatic" | "manual"
  voucherValue: string | number
  isPreEnrollment: boolean
  grade12Enabled: boolean
}

export default function SettingsPage() {
  const { isDarkMode } = useTheme()
  // Tracks what school year was last saved to DB — used to detect changes on save
  const originalSchoolYearRef = useRef<string>("")
  const [_loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCommittingMatrix, setIsCommittingMatrix] = useState(false)
  const [currentAccepted, setCurrentAccepted] = useState(0)

  // capacity and voucherValue are string | number to handle blank states
  const [config, setConfig] = useState<ConfigState>({
    id: "",
    isOpen: true,
    capacity: 1000,
    schoolYear: "",
    startDate: "",
    endDate: "",
    controlMode: "automatic",
    voucherValue: 22500,
    isPreEnrollment: false,
    grade12Enabled: true,
  })

  const loadSettings = useCallback(async () => {
    try {
      // Use maybeSingle() to avoid crashing if table is empty or RLS blocks it
      let { data: configData, error: configError } = await supabase.from('system_config').select('*').maybeSingle()
      
      if (configError) {
        console.error("Error fetching system_config:", configError)
        toast.error("Failed to load settings. Check console for details.")
      }

      // Self-healing: If no config exists, create a default one automatically
      if (!configData && !configError) {
        const { data: newConfig, error: insertError } = await supabase
          .from('system_config')
          .insert({ 
            school_year: '2025-2026', 
            capacity: 1000,
            voucher_value: 22500,
            control_mode: 'automatic',
            is_portal_active: false,
            is_pre_enrollment: false
          })
          .select()
          .single()
          
        if (!insertError) {
          configData = newConfig
        } else {
          console.error("Auto-init failed:", insertError)
          toast.error("Failed to initialize settings. Check database permissions.")
        }
      }
      
      const { count } = await supabase.from('students')
        .select('*', { count: 'exact', head: true })
        .or('status.eq.Accepted,status.eq.Approved')
      
      if (configData) {
        const controlMode = (configData.control_mode === 'manual' || configData.control_mode === 'automatic')
          ? configData.control_mode
          : 'automatic' as "automatic" | "manual"

        setConfig({
          id: configData.id,
          isOpen: configData.is_portal_active,
          capacity: configData.capacity ?? 1000,
          schoolYear: configData.school_year || "",
          startDate: configData.enrollment_start || "",
          endDate: configData.enrollment_end || "",
          controlMode,
          voucherValue: configData.voucher_value ?? 22500,
          isPreEnrollment: configData.is_pre_enrollment ?? false,
          grade12Enabled: configData.grade12_enabled ?? true,
        })
        // Lock in the DB-loaded school year so we can detect changes at save time
        originalSchoolYearRef.current = configData.school_year || ""
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
    // Optimistic Update
    const prevMode = config.controlMode;
    setConfig(prev => ({ ...prev, controlMode: isManual ? 'manual' : 'automatic' }));

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
      // Confirm final state
      setConfig(prev => ({ ...prev, isOpen: finalPortalStatus }))
      toast.success(`System logic synchronized to ${newMode.toUpperCase()}`)
    } catch (_err) {
      setConfig(prev => ({ ...prev, controlMode: prevMode })); // Revert
      toast.error("Protocol Sync Failed.")
    } finally {
      setUpdating(false)
    }
  }

  // --- LOGIC B: Manual Override (STRICTLY RETAINED) ---
  const handleManualOverride = async (checked: boolean) => {
    setUpdating(true)
    // Optimistic Update
    const prevOpen = config.isOpen;
    const prevPreEnrollment = config.isPreEnrollment;

    setConfig(prev => ({ 
      ...prev, 
      isOpen: checked,
      isPreEnrollment: checked ? prev.isPreEnrollment : false 
    }));

    try {
      await toggleEnrollment(checked)
      
      if (!checked) {
        await supabase.from('system_config')
          .update({ is_pre_enrollment: false })
          .eq('id', config.id)
      }

      toast.success(`Override: Portal ${checked ? 'OPEN' : 'CLOSED'}`)
    } catch (_err) {
      setConfig(prev => ({ ...prev, isOpen: prevOpen, isPreEnrollment: prevPreEnrollment })); // Revert
      toast.error("Manual Override Command Failed.")
    } finally {
      setUpdating(false)
    }
  }

  // --- LOGIC B.2: Pre-Enrollment Toggle ---
  const handlePreEnrollmentToggle = async (checked: boolean) => {
    setUpdating(true)
    const prev = config.isPreEnrollment
    setConfig(prev => ({ ...prev, isPreEnrollment: checked }))

    try {
      const { error } = await supabase.from('system_config')
        .update({ is_pre_enrollment: checked })
        .eq('id', config.id)
      
      if (error) throw error
      toast.success(`Pre-Enrollment Mode ${checked ? 'ENABLED' : 'DISABLED'}`)
    } catch (err) {
      setConfig(state => ({ ...state, isPreEnrollment: prev }))
      toast.error("Failed to update Pre-Enrollment mode")
    } finally {
      setUpdating(false)
    }
  }

  // --- LOGIC B.3: Grade 12 Toggle ---
  const handleGrade12Toggle = async (checked: boolean) => {
    setUpdating(true)
    const prev = config.grade12Enabled
    setConfig(p => ({ ...p, grade12Enabled: checked }))
    try {
      const { error } = await supabase.from('system_config')
        .update({ grade12_enabled: checked })
        .eq('id', config.id)
      if (error) throw error
      toast.success(`Grade 12 enrollment ${checked ? 'ENABLED' : 'DISABLED'}`)
    } catch {
      setConfig(p => ({ ...p, grade12Enabled: prev }))
      toast.error("Failed to update Grade 12 setting")
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
    } catch (_err) {
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
      // AUTO-ARCHIVE: if the school year is being advanced, snapshot the current year
      // into both enrollment_history and enrollment_predictions_data BEFORE committing
      // the new year — so neither the dashboard archives nor predictive analytics lose data.
      const originalYear = originalSchoolYearRef.current
      if (originalYear && config.schoolYear && config.schoolYear !== originalYear) {
        const snapToastId = toast.loading(`Auto-archiving S.Y. ${originalYear} before advancing...`)
        const snapRes = await snapshotCurrentYearData(originalYear)
        if (snapRes.success) {
          toast.success(`S.Y. ${originalYear} auto-archived — ${snapRes.total} student(s) recorded.`, { id: snapToastId, duration: 4000 })
        } else {
          toast.dismiss(snapToastId)
        }
        // Update ref so re-saving the same new year doesn't re-trigger
        originalSchoolYearRef.current = config.schoolYear
      }

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

      const payload: {
        school_year: string
        enrollment_start: string | null
        enrollment_end: string | null
        capacity: number
        voucher_value: number
        is_portal_active: boolean
      } = {
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
      toast.success("Configuration Committed Successfully")
    } catch (err: unknown) {
      console.error(err)
      toast.error("Schema Mismatch. Please refresh browser and try again.")
    } finally {
      setIsSaving(false)
    }
  }

  // --- MATRIX COMMIT: saves only school year + dates, with auto-archive if year changed ---
  const handleMatrixCommit = async () => {
    if (!config.schoolYear) return toast.error("School year cannot be blank.")
    setIsCommittingMatrix(true)
    try {
      // Auto-archive current year before advancing school year
      const originalYear = originalSchoolYearRef.current
      if (originalYear && config.schoolYear !== originalYear) {
        const snapToastId = toast.loading(`Auto-archiving S.Y. ${originalYear} before advancing...`)
        const snapRes = await snapshotCurrentYearData(originalYear)
        if (snapRes.success) {
          toast.success(`S.Y. ${originalYear} auto-archived — ${snapRes.total} student(s) recorded.`, { id: snapToastId, duration: 4000 })
        } else {
          toast.dismiss(snapToastId)
        }
        originalSchoolYearRef.current = config.schoolYear
      }

      // Recalculate portal status when in automatic mode
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

      const { error } = await supabase.from('system_config')
        .update({
          school_year:      config.schoolYear,
          enrollment_start: config.startDate || null,
          enrollment_end:   config.endDate || null,
          is_portal_active: calculatedStatus,
        })
        .eq('id', config.id)

      if (error) throw error
      setConfig(prev => ({ ...prev, isOpen: calculatedStatus }))
      toast.success("Enrollment Matrix committed.")
    } catch (err: unknown) {
      console.error(err)
      toast.error("Commit failed. Please try again.")
    } finally {
      setIsCommittingMatrix(false)
    }
  }

  // --- REACTIVE SATURATION ENGINE ---
  const capacityPercentage = useMemo(() => {
    const cap = Number(config.capacity)
    if (!cap || cap <= 0) return 0
    return Math.min((currentAccepted / cap) * 100, 100)
  }, [currentAccepted, config.capacity])

  const handleSync = async () => {
    setIsSyncing(true)
    await forceSyncCapacities()
    setIsSyncing(false)
    toast.success("Recalibrated Successfully.")
  }

  return (
    <TooltipProvider delayDuration={100}>
    {/* Thin themed scrollbar — adapts to dark/light mode */}
    <style>{`
      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-track { background: ${isDarkMode ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,0.6)'}; border-radius: 99px; }
      ::-webkit-scrollbar-thumb { background: ${isDarkMode ? 'rgba(100,116,139,0.7)' : 'rgba(148,163,184,0.8)'}; border-radius: 99px; }
      ::-webkit-scrollbar-thumb:hover { background: ${isDarkMode ? 'rgba(148,163,184,0.9)' : 'rgba(100,116,139,0.9)'}; }
      * { scrollbar-width: thin; scrollbar-color: ${isDarkMode ? 'rgba(100,116,139,0.7) rgba(51,65,85,0.3)' : 'rgba(148,163,184,0.8) rgba(226,232,240,0.6)'}; }
    `}</style>
      <div className="relative min-h-screen transition-colors duration-500">
        <StarConstellation />
        <div className="relative z-10 max-w-4xl mx-auto p-4 md:p-8 space-y-12 animate-in fade-in duration-700 pb-32">
          <SettingsHeader isDarkMode={isDarkMode} />

          <div className="space-y-6">
            <SystemLogicMode
              controlMode={config.controlMode}
              isDarkMode={isDarkMode}
              updating={updating}
              onModeToggle={handleModeToggle}
            />

            <ManualPortalOverride
              isOpen={config.isOpen}
              controlMode={config.controlMode}
              isDarkMode={isDarkMode}
              updating={updating}
              onToggle={handleManualOverride}
            />

            <PreEnrollmentMode
              isPreEnrollment={config.isPreEnrollment}
              isDarkMode={isDarkMode}
              updating={updating}
              disabled={!config.isOpen}
              onToggle={handlePreEnrollmentToggle}
            />

            {/* Grade 12 Toggle */}
            <div className={`p-6 rounded-[32px] border transition-all duration-500 ${isDarkMode ? "bg-slate-900 border-slate-700/60" : "bg-white border-slate-200"}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${config.grade12Enabled ? "bg-emerald-500/10" : isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={config.grade12Enabled ? "text-emerald-400" : "text-slate-400"}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-[0.2em] ${isDarkMode ? "text-white" : "text-slate-900"}`}>Grade 12 Enrollment</p>
                    <p className={`text-[9px] mt-0.5 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                      {config.grade12Enabled
                        ? "Grade 12 option is visible in the enrollment form"
                        : "Only Grade 11 is available — Grade 12 is hidden from applicants"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleGrade12Toggle(!config.grade12Enabled)}
                  role="switch"
                  aria-checked={config.grade12Enabled}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0 disabled:opacity-50
                    ${config.grade12Enabled ? "bg-emerald-500" : isDarkMode ? "bg-slate-600" : "bg-slate-300"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
                    ${config.grade12Enabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </div>

            <EnrollmentMatrix
              schoolYear={config.schoolYear}
              startDate={config.startDate}
              endDate={config.endDate}
              controlMode={config.controlMode}
              isDarkMode={isDarkMode}
              isCommitting={isCommittingMatrix}
              onSchoolYearChange={(value) => setConfig({...config, schoolYear: value})}
              onStartDateChange={(value) => setConfig({...config, startDate: value})}
              onEndDateChange={(value) => setConfig({...config, endDate: value})}
              onClearFields={() => setConfig({...config, schoolYear: "", startDate: "", endDate: ""})}
              onCommit={handleMatrixCommit}
            />

            <CapacityGuardian
              capacity={config.capacity}
              currentAccepted={currentAccepted}
              capacityPercentage={capacityPercentage}
              isDarkMode={isDarkMode}
              updating={updating}
              onCapacityChange={(value) => setConfig({...config, capacity: value})}
              onIntegrityScan={runCapacityGuardian}
            />

            <FinancialHub
              voucherValue={config.voucherValue}
              isDarkMode={isDarkMode}
              onVoucherValueChange={(value) => setConfig({...config, voucherValue: value})}
            />

            <EnrollmentFormControl
              configId={config.id}
              isDarkMode={isDarkMode}
            />

            <GradeOperationsPanel
              isDarkMode={isDarkMode}
              schoolYear={config.schoolYear}
            />

            <SettingsActions
              isSaving={isSaving}
              isSyncing={isSyncing}
              onSave={handleGlobalSave}
              onSync={handleSync}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}