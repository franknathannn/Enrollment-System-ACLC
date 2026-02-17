"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase/client"
import { 
  toggleEnrollment, 
  forceSyncCapacities,
  updateCapacity 
} from "@/lib/actions/settings"
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
}

export default function SettingsPage() {
  const { isDarkMode: themeDarkMode } = useTheme()
  const [isDarkMode, setIsDarkMode] = useState(themeDarkMode)
  const [_loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
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
    isPreEnrollment: false
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
          isPreEnrollment: configData.is_pre_enrollment ?? false
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

  useEffect(() => {
    setIsDarkMode(themeDarkMode)
  }, [themeDarkMode])

  useEffect(() => {
    const handleThemeChange = (e: CustomEvent) => {
      setIsDarkMode(e.detail.mode === 'dark')
    }
    globalThis.addEventListener('theme-change', handleThemeChange as EventListener)
    return () => globalThis.removeEventListener('theme-change', handleThemeChange as EventListener)
  }, [])

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

            <EnrollmentMatrix
              schoolYear={config.schoolYear}
              startDate={config.startDate}
              endDate={config.endDate}
              controlMode={config.controlMode}
              isDarkMode={isDarkMode}
              onSchoolYearChange={(value) => setConfig({...config, schoolYear: value})}
              onStartDateChange={(value) => setConfig({...config, startDate: value})}
              onEndDateChange={(value) => setConfig({...config, endDate: value})}
              onClearFields={() => setConfig({...config, schoolYear: "", startDate: "", endDate: ""})}
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