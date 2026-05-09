"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import {
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
import { ParentNotificationControl } from "./components/ParentNotificationControl"
import { ManualPortalOverride } from "./components/ManualPortalOverride"
import { EnrollmentMatrix } from "./components/EnrollmentMatrix"
import { PreEnrollmentMode } from "./components/PreEnrollmentMode"
import { CapacityGuardian } from "./components/CapacityGuardian"
import { FinancialHub } from "./components/FinancialHub"
import { SettingsActions } from "./components/SettingsActions"
import { EnrollmentFormControl } from "./components/EnrollmentFormControl"
import { GradeOperationsPanel } from "./components/GradeOperationsPanel"
import { StudentEditControl } from "./components/StudentEditControl"

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
  notifyParentsStatus: boolean
  notifyParentsAttendance: boolean
  notifyParentsSummary: boolean
  allowStudentEdit: boolean
  closePortalWhenFull: boolean
  slotDisplayMode: string
}

export default function SettingsPage() {
  const { isDarkMode } = useTheme()
  // Tracks what school year was last saved to DB — used to detect changes on save
  const originalSchoolYearRef = useRef<string>("")
  const [_loading, setLoading] = useState(true)
  const [updating, setUpdatingState] = useState(false)
  // Ref-based guard: prevents real-time refreshes from overwriting optimistic state
  // during active user operations (toggle, save, etc.)
  const updatingRef = useRef(false)
  const setUpdating = useCallback((val: boolean) => {
    updatingRef.current = val
    setUpdatingState(val)
  }, [])
  const configIdRef = useRef("")
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
    notifyParentsStatus: true,
    notifyParentsAttendance: false,
    notifyParentsSummary: false,
    allowStudentEdit: false,
    closePortalWhenFull: true,
    slotDisplayMode: "grade11",
  })
  useEffect(() => { configIdRef.current = config.id }, [config.id])

  // Full reload from DB — used on initial mount and when students change

  const logActivity = useCallback(async (details: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      await supabase.from('activity_logs').insert([{
        admin_id: user.id,
        admin_name: user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Authorized Admin',
        action_type: 'UPDATED',
        student_name: 'N/A',
        details
      }]);
    } catch (e) { console.error("Log failed", e) }
  }, []);
  const loadSettings = useCallback(async () => {
    try {
      // Use maybeSingle() to avoid crashing if table is empty or RLS blocks it
      const { data: configRows, error: configError } = await supabase
        .from('system_config')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
      let configData = configRows?.[0] ?? null

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
          notifyParentsStatus: configData.notify_parents_status ?? true,
          notifyParentsAttendance: configData.notify_parents_attendance ?? false,
          notifyParentsSummary: configData.notify_parents_summary ?? false,
          allowStudentEdit: configData.allow_student_edit ?? false,
          closePortalWhenFull: configData.close_portal_when_full ?? true,
          slotDisplayMode: configData.slot_display_mode || "total",
        })
        configIdRef.current = configData.id
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

  // Lightweight reload — only refreshes the student count + portal-affecting fields
  // without overwriting local uncommitted edits (dates, capacity, voucher, etc.)
  const refreshFromDb = useCallback(async () => {
    // Skip if a user operation is in progress — prevents race conditions
    // where stale DB reads overwrite optimistic state updates
    if (updatingRef.current) return;
    try {
      const configQuery = configIdRef.current
        ? supabase
            .from('system_config')
            .select('is_portal_active, control_mode, is_pre_enrollment, close_portal_when_full')
            .eq('id', configIdRef.current)
            .maybeSingle()
        : supabase
            .from('system_config')
            .select('is_portal_active, control_mode, is_pre_enrollment, close_portal_when_full')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()

      const [{ data: configData }, { count }] = await Promise.all([
        configQuery,
        supabase.from('students').select('*', { count: 'exact', head: true }).or('status.eq.Accepted,status.eq.Approved')
      ])
      // Double-check the guard after the async read
      if (updatingRef.current) return;
      if (configData) {
        setConfig(prev => ({
          ...prev,
          isOpen: configData.is_portal_active,
          controlMode: (configData.control_mode === 'manual' || configData.control_mode === 'automatic')
            ? configData.control_mode : prev.controlMode,
          isPreEnrollment: configData.is_pre_enrollment ?? prev.isPreEnrollment,
          closePortalWhenFull: configData.close_portal_when_full ?? prev.closePortalWhenFull,
        }))
      }
      setCurrentAccepted(count || 0)
    } catch (err) {
      console.error("Refresh Error:", err)
    }
  }, [])

  useEffect(() => {
    loadSettings()
    const channel = supabase.channel('settings-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        // Student changes affect capacity count — lightweight refresh
        refreshFromDb()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, () => {
        // Config changes from other tabs/guardian — lightweight refresh
        // Does NOT overwrite local uncommitted edits (dates, capacity, voucher, etc.)
        refreshFromDb()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadSettings, refreshFromDb])

  useEffect(() => {
    const savedScroll = sessionStorage.getItem("settings_scroll_pos")
    if (savedScroll) {
      setTimeout(() => window.scrollTo({ top: parseInt(savedScroll), behavior: 'instant' }), 100)
    }

    const handleScroll = () => {
      sessionStorage.setItem("settings_scroll_pos", window.scrollY.toString())
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // --- LOGIC A: System Mode Toggle (STRICTLY RETAINED) ---
  const handleModeToggle = async (isManual: boolean) => {
    setUpdating(true)
    // Optimistic Update
    const prevMode = config.controlMode;
    setConfig(prev => ({ ...prev, controlMode: isManual ? 'manual' : 'automatic' }));

    const newMode = isManual ? 'manual' : 'automatic'
    try {
      // Mode control must be independent from enrollment dates.
      // Date window rules are enforced when evaluating enrollment availability,
      // not when the admin chooses control mode.
      const targetId = config.id || configIdRef.current
      let modeUpdateQuery = supabase
        .from('system_config')
        .update({
          control_mode: newMode,
        })

      modeUpdateQuery = targetId
        ? modeUpdateQuery.eq('id', targetId)
        : modeUpdateQuery.not('id', 'is', null)

      const { data: updatedRow, error } = await modeUpdateQuery
        .select('id, control_mode')
        .maybeSingle()
      if (error) throw error
      if (!updatedRow || updatedRow.control_mode !== newMode) {
        throw new Error("Mode update was not persisted to database.")
      }
      configIdRef.current = updatedRow.id
      toast.success(`Control mode set to ${newMode.toUpperCase()}. Portal state unchanged.`); await logActivity(`Control mode set to ${newMode.toUpperCase()}. Portal state unchanged.`);
    } catch (_err) {
      setConfig(prev => ({ ...prev, controlMode: prevMode })); // Revert
      toast.error("Control mode update failed to persist. Check database policy/trigger.")
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
      // Use client-side supabase directly (same as all other toggles)
      const updatePayload: Record<string, unknown> = {
        is_portal_active: checked,
      }
      if (!checked) {
        updatePayload.is_pre_enrollment = false
      }

      const { error } = await supabase.from('system_config')
        .update(updatePayload)
        .eq('id', config.id)

      if (error) throw error

      toast.success(`Override: Portal ${checked ? 'OPEN' : 'CLOSED'}`); await logActivity(`Override: Portal ${checked ? 'OPEN' : 'CLOSED'}`);
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
      toast.success(`Pre-Enrollment Mode ${checked ? 'ENABLED' : 'DISABLED'}`); await logActivity(`Pre-Enrollment Mode ${checked ? 'ENABLED' : 'DISABLED'}`);
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
      toast.success(`Grade 12 enrollment ${checked ? 'ENABLED' : 'DISABLED'}`); await logActivity(`Grade 12 enrollment ${checked ? 'ENABLED' : 'DISABLED'}`);
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
        }).eq('id', config.id)
        if (error) throw error
        setConfig(prev => ({ ...prev, isOpen: false }))
        toast.warning("Guardian Critical: Limit reached. Portal shutdown complete."); await logActivity("Guardian Critical: Limit reached. Portal shutdown complete.");
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
        notify_parents_status: boolean
        notify_parents_attendance: boolean
        notify_parents_summary: boolean
        close_portal_when_full: boolean
        slot_display_mode: string
      } = {
        school_year: config.schoolYear,
        enrollment_start: config.startDate || null,
        enrollment_end: config.endDate || null,
        capacity: numericCapacity,
        voucher_value: numericVoucher,
        is_portal_active: calculatedStatus,
        notify_parents_status: config.notifyParentsStatus,
        notify_parents_attendance: config.notifyParentsAttendance,
        notify_parents_summary: config.notifyParentsSummary,
        close_portal_when_full: config.closePortalWhenFull,
        slot_display_mode: config.slotDisplayMode
      }

      const { error } = await supabase.from('system_config')
        .update(payload)
        .eq('id', config.id)

      if (error) throw error

      await updateCapacity(numericCapacity)
      setConfig(prev => ({ ...prev, isOpen: calculatedStatus }))
      toast.success("Configuration Committed Successfully"); await logActivity("Configuration Committed Successfully");
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
          school_year: config.schoolYear,
          enrollment_start: config.startDate || null,
          enrollment_end: config.endDate || null,
          is_portal_active: calculatedStatus,
        })
        .eq('id', config.id)

      if (error) throw error
      setConfig(prev => ({ ...prev, isOpen: calculatedStatus }))
      toast.success("Enrollment Changes committed."); await logActivity("Enrollment Changes committed.");
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

  // --- AUTO CAPACITY GUARDIAN ---
  // ONLY reacts to capacity and portal status changes.
  // Does NOT react to date changes — dates are handled by Commit and mode toggle.
  // In MANUAL mode: never auto-closes/auto-reopens. Admin override stays authoritative.
  // In AUTOMATIC mode: auto-closes at 100%, auto-reopens when slots free up (if within dates).
  const startDateRef = useRef(config.startDate)
  const endDateRef = useRef(config.endDate)
  useEffect(() => { startDateRef.current = config.startDate }, [config.startDate])
  useEffect(() => { endDateRef.current = config.endDate }, [config.endDate])

  useEffect(() => {
    if (_loading || !config.id || !config.closePortalWhenFull) return;

    if (config.isOpen && capacityPercentage >= 100 && config.controlMode === 'automatic') {
      // Auto-close portal when capacity is reached (automatic mode only)
      const autoRunGuardian = async () => {
        setUpdating(true)
        try {
          const { error } = await supabase.from('system_config').update({
            is_portal_active: false,
          }).eq('id', config.id)
          if (error) throw error
          setConfig(prev => ({ ...prev, isOpen: false }))
          toast.warning("Auto-Trigger: Capacity limit reached. Portal automatically closed."); await logActivity("Auto-Trigger: Capacity limit reached. Portal automatically closed.");
        } catch (_err) {
          console.error("Auto Guardian Execution Failed.")
        } finally {
          setUpdating(false)
        }
      }
      autoRunGuardian()
    } else if (!config.isOpen && capacityPercentage < 100 && config.controlMode === 'automatic') {
      // Auto-reopen ONLY in automatic mode when slots freed up and dates are valid
      const autoReopen = async () => {
        setUpdating(true)
        try {
          let calculatedStatus = false
          const sd = startDateRef.current
          const ed = endDateRef.current
          if (sd && ed) {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const start = new Date(sd)
            const end = new Date(ed)
            end.setHours(23, 59, 59, 999)
            calculatedStatus = today >= start && today <= end
          }

          if (calculatedStatus) {
            const { error } = await supabase.from('system_config').update({
              is_portal_active: true,
            }).eq('id', config.id)

            if (error) throw error
            setConfig(prev => ({ ...prev, isOpen: true }))
            toast.success("Auto-Trigger: Slot freed up! Portal automatically re-opened."); await logActivity("Auto-Trigger: Slot freed up! Portal automatically re-opened.");
          }
        } catch (_err) {
          console.error("Auto Guardian Re-open Failed.")
        } finally {
          setUpdating(false)
        }
      }
      autoReopen()
    }
  }, [_loading, capacityPercentage, config.closePortalWhenFull, config.isOpen, config.id, config.controlMode])

  const handleSync = async () => {
    setIsSyncing(true)
    await forceSyncCapacities()
    setIsSyncing(false)
    toast.success("Recalibrated Successfully."); await logActivity("Recalibrated Successfully.");
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={config.grade12Enabled ? "text-emerald-400" : "text-slate-400"}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
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

            <ParentNotificationControl
              isDarkMode={isDarkMode}
              updating={updating}
              notifyStatus={config.notifyParentsStatus}
              notifyAttendance={config.notifyParentsAttendance}
              notifySummary={config.notifyParentsSummary}
              onToggleStatus={async (v) => {
                setUpdating(true)
                const prev = config.notifyParentsStatus
                setConfig(p => ({ ...p, notifyParentsStatus: v }))
                try {
                  const { error } = await supabase.from('system_config').update({ notify_parents_status: v }).eq('id', config.id)
                  if (error) throw error
                  toast.success(`Enrollment Status notifications ${v ? 'ENABLED' : 'DISABLED'}`); await logActivity(`Enrollment Status notifications ${v ? 'ENABLED' : 'DISABLED'}`);
                } catch {
                  setConfig(p => ({ ...p, notifyParentsStatus: prev }))
                  toast.error("Failed to update notification setting")
                } finally { setUpdating(false) }
              }}
              onToggleAttendance={async (v) => {
                setUpdating(true)
                const prev = config.notifyParentsAttendance
                setConfig(p => ({ ...p, notifyParentsAttendance: v }))
                try {
                  const { error } = await supabase.from('system_config').update({ notify_parents_attendance: v }).eq('id', config.id)
                  if (error) throw error
                  toast.success(`Attendance Arrival notifications ${v ? 'ENABLED' : 'DISABLED'}`); await logActivity(`Attendance Arrival notifications ${v ? 'ENABLED' : 'DISABLED'}`);
                } catch {
                  setConfig(p => ({ ...p, notifyParentsAttendance: prev }))
                  toast.error("Failed to update notification setting")
                } finally { setUpdating(false) }
              }}
              onToggleSummary={async (v) => {
                setUpdating(true)
                const prev = config.notifyParentsSummary
                setConfig(p => ({ ...p, notifyParentsSummary: v }))
                try {
                  const { error } = await supabase.from('system_config').update({ notify_parents_summary: v }).eq('id', config.id)
                  if (error) throw error
                  toast.success(`Daily Summary notifications ${v ? 'ENABLED' : 'DISABLED'}`); await logActivity(`Daily Summary notifications ${v ? 'ENABLED' : 'DISABLED'}`);
                } catch {
                  setConfig(p => ({ ...p, notifyParentsSummary: prev }))
                  toast.error("Failed to update notification setting")
                } finally { setUpdating(false) }
              }}
            />

            <StudentEditControl
              allowStudentEdit={config.allowStudentEdit}
              isDarkMode={isDarkMode}
              updating={updating}
              onToggle={async (v) => {
                setUpdating(true)
                const prev = config.allowStudentEdit
                setConfig(p => ({ ...p, allowStudentEdit: v }))
                try {
                  const { error } = await supabase.from('system_config').update({ allow_student_edit: v }).eq('id', config.id)
                  if (error) throw error
                  toast.success(`Student self-edit ${v ? 'ENABLED' : 'DISABLED'}`); await logActivity(`Student self-edit ${v ? 'ENABLED' : 'DISABLED'}`);
                } catch {
                  setConfig(p => ({ ...p, allowStudentEdit: prev }))
                  toast.error("Failed to update student edit setting")
                } finally { setUpdating(false) }
              }}
            />

            <EnrollmentMatrix
              schoolYear={config.schoolYear}
              startDate={config.startDate}
              endDate={config.endDate}
              controlMode={config.controlMode}
              isDarkMode={isDarkMode}
              isCommitting={isCommittingMatrix}
              onSchoolYearChange={(value) => setConfig({ ...config, schoolYear: value })}
              onStartDateChange={(value) => setConfig({ ...config, startDate: value })}
              onEndDateChange={(value) => setConfig({ ...config, endDate: value })}
              onClearFields={() => setConfig({ ...config, schoolYear: "", startDate: "", endDate: "" })}
              onCommit={handleMatrixCommit}
            />

            <CapacityGuardian
              capacity={config.capacity}
              currentAccepted={currentAccepted}
              capacityPercentage={capacityPercentage}
              isDarkMode={isDarkMode}
              updating={updating}
              closePortalWhenFull={config.closePortalWhenFull}
              slotDisplayMode={config.slotDisplayMode}
              onCapacityChange={(value) => setConfig({ ...config, capacity: value })}
              onIntegrityScan={runCapacityGuardian}
              onClosePortalChange={async (v) => {
                setUpdating(true)
                const prev = config.closePortalWhenFull
                setConfig(p => ({ ...p, closePortalWhenFull: v }))
                try {
                  const { error } = await supabase.from('system_config').update({ close_portal_when_full: v }).eq('id', config.id)
                  if (error) throw error
                  toast.success(`Auto-close portal ${v ? 'ENABLED' : 'DISABLED'}`); await logActivity(`Auto-close portal ${v ? 'ENABLED' : 'DISABLED'}`);
                } catch {
                  setConfig(p => ({ ...p, closePortalWhenFull: prev }))
                  toast.error("Failed to update auto-close setting")
                } finally { setUpdating(false) }
              }}
              onSlotDisplayChange={async (v) => {
                setUpdating(true)
                const prev = config.slotDisplayMode
                setConfig(p => ({ ...p, slotDisplayMode: v }))
                try {
                  const { error } = await supabase.from('system_config').update({ slot_display_mode: v }).eq('id', config.id)
                  if (error) throw error
                  toast.success(`Slot display mode updated to ${v.toUpperCase()}`); await logActivity(`Slot display mode updated to ${v.toUpperCase()}`);
                } catch {
                  setConfig(p => ({ ...p, slotDisplayMode: prev }))
                  toast.error("Failed to update slot display mode")
                } finally { setUpdating(false) }
              }}
            />

            <FinancialHub
              voucherValue={config.voucherValue}
              isDarkMode={isDarkMode}
              onVoucherValueChange={(value) => setConfig({ ...config, voucherValue: value })}
            />

            <EnrollmentFormControl
              configId={config.id}
              isDarkMode={isDarkMode}
            />

            <GradeOperationsPanel
              isDarkMode={isDarkMode}
              schoolYear={config.schoolYear}
              onRefresh={loadSettings}
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