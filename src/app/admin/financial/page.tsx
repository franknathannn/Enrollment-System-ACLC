"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  TrendingUp, Loader2, Users, Landmark, Banknote, Activity, ChevronRight, Scale, ShieldCheck, HelpCircle, Save, DollarSign
} from "lucide-react"
import { toast } from "sonner"
import { ThemedText } from "@/components/ThemedText"
import { useTheme } from "@/hooks/useTheme"
import { themeColors } from "@/lib/themeColors"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function FinancialPage() {
  const { isDarkMode, mounted } = useTheme()
  const [config, setConfig] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [rates, setRates] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [settings, setSettings] = useState<any[]>([])
  const [ledger, setLedger] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [tuitionFee, setTuitionFee] = useState<number>(22500)

  // Selected Years states
  const [revenueYear, setRevenueYear] = useState<string>("")
  const [compareYear, setCompareYear] = useState<string>("")

  // Form states for the Financial Calculator
  const [selectedTier, setSelectedTier] = useState<string>("NCR")
  const [selectedGoal, setSelectedGoal] = useState<string>("8100000")
  const [categoryRates, setCategoryRates] = useState<Record<string, number | string>>({
    "CATEGORY A, B, C": 22500,
    "CATEGORY D, E": 18000
  })

  // Synchronize school years once configuration loads
  useEffect(() => {
    if (config?.school_year && !revenueYear) {
      setRevenueYear(config.school_year)
    }
  }, [config?.school_year, revenueYear])

  // Synchronize Calculator values when selected year, rates, history, or settings update
  useEffect(() => {
    if (isEditingFinancialsRef.current) return;
    const activeYear = revenueYear || config?.school_year || "2027-2028"
    
    // Set Goal Quota
    const yearHistory = history.find(h => h.school_year === activeYear)
    if (yearHistory) {
      setSelectedGoal(String(yearHistory.target_cap || 8100000))
    } else {
      setSelectedGoal("8100000")
    }

    // Set Voucher Tier
    const tierSetting = settings.find(s => s.key === "school_voucher_tier")
    if (tierSetting) {
      setSelectedTier(tierSetting.value || "NCR")
    }

    // Set Category Rates
    const yearRates = rates.filter(r => r.school_year === activeYear)
    const newRates: Record<string, number | string> = {
      "CATEGORY A, B, C": 22500,
      "CATEGORY D, E": 18000
    }
    yearRates.forEach(r => {
      newRates[r.student_category] = r.amount
    })
    setCategoryRates(newRates)

  }, [revenueYear, config?.school_year, rates, history, settings])

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    if (config?.school_year) {
      yearsSet.add(config.school_year);
    }
    const currentStart = config?.school_year ? parseInt(config.school_year.split("-")[0]) : 9999;

    ledger.forEach(l => {
      if (l.school_year) {
        const start = parseInt(l.school_year.split("-")[0]);
        if (!isNaN(start) && start <= currentStart) {
          yearsSet.add(l.school_year);
        }
      }
    });

    history.forEach(h => {
      if (h.school_year) {
        const start = parseInt(h.school_year.split("-")[0]);
        if (!isNaN(start) && start <= currentStart) {
          yearsSet.add(h.school_year);
        }
      }
    });

    return Array.from(yearsSet).sort().reverse();
  }, [config?.school_year, ledger, history]);

  // Filter comparison options to exclude the currently selected school year
  const comparisonOptions = useMemo(() => {
    return availableYears.filter(yr => yr !== revenueYear)
  }, [availableYears, revenueYear])

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isEditingFinancialsRef = useRef(false)

  const fetchData = useCallback((isBackground = false) => {
    return new Promise<void>((resolve) => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current)

      fetchTimeoutRef.current = setTimeout(async () => {
        try {
          const [studentsRes, configRes, ratesRes, paymentsRes, historyRes, settingsRes, ledgerRes] = await Promise.all([
            supabase.from('students').select('id,first_name,last_name,gender,strand,section,status,student_category,gwa_grade_10,grade_level,is_archived,school_type,school_year,is_transferee,prior_voucher_amount,is_payee,voucher_status').order('created_at', { ascending: false }),
            supabase.from('system_config').select('*').maybeSingle(),
            supabase.from('voucher_rates').select('*'),
            supabase.from('payments').select('*'),
            supabase.from('enrollment_history').select('*'),
            supabase.from('site_settings').select('*'),
            supabase.from('voucher_ledger').select('*')
          ])

          if (studentsRes.error) {
            console.error("studentsRes error:", studentsRes.error);
            throw new Error(`Students: ${studentsRes.error.message}`);
          }
          if (ratesRes.error) {
            console.error("ratesRes error:", ratesRes.error);
            throw new Error(`Rates: ${ratesRes.error.message}`);
          }
          if (paymentsRes.error) {
            console.error("paymentsRes error:", paymentsRes.error);
            throw new Error(`Payments: ${paymentsRes.error.message}`);
          }
          if (historyRes.error) {
            console.error("historyRes error:", historyRes.error);
            throw new Error(`History: ${historyRes.error.message}`);
          }
          if (settingsRes.error) {
            console.error("settingsRes error:", settingsRes.error);
            throw new Error(`Settings: ${settingsRes.error.message}`);
          }
          if (ledgerRes.error) {
            console.error("ledgerRes error:", ledgerRes.error);
            throw new Error(`Ledger: ${ledgerRes.error.message}`);
          }

          setStudents(studentsRes.data || [])
          if (configRes.data) setConfig(configRes.data)
          if (configRes.data) {
            setConfig(configRes.data)
            setTuitionFee(configRes.data.tuition_fee ?? 22500)
          }
          setRates(ratesRes.data || [])
          setPayments(paymentsRes.data || [])
          setHistory(historyRes.data || [])
          setSettings(settingsRes.data || [])
          setLedger(ledgerRes.data || [])

          console.log("✅ Dynamic financial database sync complete.")
        } catch (error: any) {
          console.error("Financial fetch error details:", error?.message || error);
          if (!isBackground) toast.error(`Failed to sync financial parameters: ${error?.message || error}`);
        } finally {
          resolve()
        }
      }, isBackground ? 300 : 0)
    })
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchData(false)
      setLoading(false)
    }
    init()
  }, [fetchData])

  // Realtime subscription setup
  useEffect(() => {
    const pollingInterval = setInterval(() => {
      fetchData(true)
    }, 4000)

    const channel = supabase
      .channel('financial_live_sync_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voucher_rates' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollment_history' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voucher_ledger' }, () => fetchData(true))
      .subscribe()

    return () => {
      clearInterval(pollingInterval)
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  // Categories rates saver function
  const handleSaveFinancials = async () => {
    setIsSaving(true)
    const activeYear = revenueYear || config?.school_year || "2027-2028"
    const toastId = toast.loading("Saving financial settings...")

    // Validate rates
    for (const [cat, amt] of Object.entries(categoryRates)) {
      if (amt === "" || Number(amt) <= 0) {
        setIsSaving(false)
        return toast.error(`Financial Error: Voucher Rate for ${cat} must be greater than 0.`, { id: toastId })
      }
    }

    try {
      // 1. Save Voucher Tier in site_settings
      const { error: tierError } = await supabase
        .from('site_settings')
        .upsert({ key: 'school_voucher_tier', value: selectedTier, updated_at: new Date().toISOString() })
      if (tierError) throw tierError

      // 2. Save Goal Quota to history
      const { error: histError } = await supabase
        .from('enrollment_history')
        .upsert({
          school_year: activeYear,
          target_cap: Number(selectedGoal) || 0
        }, { onConflict: 'school_year' })
      if (histError) throw histError

      // 3. Save tuition fee to config
      const { error: configError } = await supabase
        .from('system_config')
        .update({
          tuition_fee: Number(tuitionFee) || 22500
        })
        .not('id', 'is', null)
      if (configError) throw configError

      // 3. Save voucher rates
      const ratesPayload = Object.entries(categoryRates).map(([category, amount]) => ({
        student_category: category,
        school_year: activeYear,
        amount: Number(amount) || 0
      }))

      for (const payload of ratesPayload) {
        const { error: rateError } = await supabase
          .from('voucher_rates')
          .upsert(payload, { onConflict: 'student_category,school_year' })
        if (rateError) throw rateError

        // 4. Retroactively update all existing students in the ledger for this category and year
        const { error: ledgerError } = await supabase
          .from('voucher_ledger')
          .update({ voucher_amount: payload.amount })
          .eq('school_year', payload.school_year)
          .eq('student_category', payload.student_category)
          
        if (ledgerError) throw ledgerError
      }

      toast.success("Financial configuration updated successfully!", { id: toastId })
      isEditingFinancialsRef.current = false;
      await fetchData(false)
    } catch (e: any) {
      toast.error(e.message || "Failed to update financial settings", { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  // Master revenue calculation formula based on Part 4 requirements
  const calculateYearRevenue = useCallback((year: string) => {
    const activeLedgerRows = ledger.filter(l => l.school_year === year);

    let totalVoucherRevenue = 0;
    let totalICTRevenue = 0;
    let totalGASRevenue = 0;
    let ictCount = 0;
    let gasCount = 0;

    let depEdConfirmed = 0;
    let guardianCollected = 0;
    let selfPayCollected = 0;
    let payeeRevenue = 0;

    activeLedgerRows.forEach(l => {
      const rate = l.voucher_amount || 0;
      totalVoucherRevenue += rate;
      if (l.strand === 'ICT') {
        totalICTRevenue += rate;
        ictCount++;
      } else if (l.strand === 'GAS') {
        totalGASRevenue += rate;
        gasCount++;
      }

      const student = students.find(s => s.id === l.student_id);
      const isStudentPayee = student?.is_payee || student?.voucher_status?.includes("CATEGORY D") || student?.voucher_status === "Transferee";

      // Check payments for this student
      const studentPayments = payments.filter(p => p.student_id === l.student_id && p.school_year === year);

      if (studentPayments.length > 0) {
        studentPayments.forEach(p => {
          if (p.payee_type === 'DepEd' && p.status === 'confirmed') {
            depEdConfirmed += p.amount;
          } else if (p.payee_type === 'Guardian' && p.status === 'confirmed') {
            guardianCollected += p.amount;
            if (isStudentPayee) payeeRevenue += p.amount;
          } else if (p.payee_type === 'Self-pay' && p.status === 'confirmed') {
            selfPayCollected += p.amount;
            if (isStudentPayee) payeeRevenue += p.amount;
          }
        });
      } else {
        // Fallback default: JHS Graduate, ALS Passer, PEPT Passer pay via DepEd. Others pay via Guardian
        const cat = l.student_category?.toLowerCase() || "";
        if (cat.includes("transferee") || cat.includes("private non-esc")) {
          guardianCollected += rate;
        } else {
          depEdConfirmed += rate;
        }
      }
    });

    const historyRow = history.find(h => h.school_year === year);
    const goalQuota = historyRow ? Number(historyRow.target_cap) : 8100000;
    const progress = goalQuota > 0 ? (totalVoucherRevenue / goalQuota) * 100 : 0;

    return {
      totalVoucherRevenue,
      totalICTRevenue,
      totalGASRevenue,
      ictCount,
      gasCount,
      activeGradCount: activeLedgerRows.length,
      depEdConfirmed,
      guardianCollected,
      selfPayCollected,
      payeeRevenue,
      goalQuota,
      progress
    };
  }, [ledger, payments, history, students]);

  // Selected school year metrics
  const currentStats = useMemo(() => {
    return calculateYearRevenue(revenueYear || config?.school_year || "2027-2028")
  }, [revenueYear, config?.school_year, calculateYearRevenue])

  // Comparison school year metrics (if selected)
  const compareStats = useMemo(() => {
    if (!compareYear) return null
    return calculateYearRevenue(compareYear)
  }, [compareYear, calculateYearRevenue])

  // Delta calculations
  const deltas = useMemo(() => {
    if (!compareStats) return null
    const revDelta = currentStats.totalVoucherRevenue - compareStats.totalVoucherRevenue
    const gradDelta = currentStats.activeGradCount - compareStats.activeGradCount
    const ictDelta = currentStats.totalICTRevenue - compareStats.totalICTRevenue
    const gasDelta = currentStats.totalGASRevenue - compareStats.totalGASRevenue
    return {
      revenue: revDelta,
      revenuePct: compareStats.totalVoucherRevenue > 0 ? (revDelta / compareStats.totalVoucherRevenue) * 100 : 0,
      graduates: gradDelta,
      ict: ictDelta,
      gas: gasDelta
    }
  }, [currentStats, compareStats])

  const activeYearLabel = revenueYear || config?.school_year || "2027-2028"

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-6 text-slate-400">
      <div className="relative flex items-center justify-center">
        <span className="absolute w-24 h-24 rounded-full border-2 border-blue-500/15 animate-ping" />
        <span className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 shadow-xl shadow-blue-500/30 flex items-center justify-center">
          <Loader2 className="animate-spin text-white" size={22} />
        </span>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing Financial parameters...</p>
    </div>
  )

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-8 md:space-y-12 animate-in fade-in duration-700 pb-20 p-4 md:p-8 transition-colors duration-500">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <ThemedText variant="h1" className="text-3xl md:text-5xl font-secondary font-normal tracking-tight" isDarkMode={isDarkMode}>Financials</ThemedText>
            <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] opacity-40 mt-1">Quota Goals, Voucher Categories, and Payments Monitor</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Main School Year Selector */}
            <div className="relative">
              <select
                value={revenueYear}
                onChange={(e) => {
                  isEditingFinancialsRef.current = false;
                  setRevenueYear(e.target.value);
                }}
                className={`appearance-none font-black uppercase tracking-wider text-[10px] pl-4 pr-10 py-3 rounded-2xl border outline-none transition-all duration-300 cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {availableYears.map((yr: string) => (
                  <option key={yr} value={yr} className={isDarkMode ? 'bg-slate-950 text-slate-300' : 'bg-white text-slate-600'}>
                    SY {yr}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                <ChevronRight size={14} className="rotate-90" />
              </div>
            </div>

            {/* Compare To Year Selector */}
            <div className="relative">
              <select
                value={compareYear}
                onChange={(e) => setCompareYear(e.target.value)}
                className={`appearance-none font-black uppercase tracking-wider text-[10px] pl-4 pr-10 py-3 rounded-2xl border outline-none transition-all duration-300 cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-905 border-slate-800 text-slate-400 hover:border-slate-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <option value="">Compare To (None)</option>
                {comparisonOptions.map((yr: string) => (
                  <option key={yr} value={yr} className={isDarkMode ? 'bg-slate-950 text-slate-300' : 'bg-white text-slate-600'}>
                    SY {yr}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                <ChevronRight size={14} className="rotate-90" />
              </div>
            </div>
          </div>
        </div>

        {/* COMPARATIVE VIEW OR SINGLE VIEW */}
        {compareStats && deltas ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            
            {/* PRIMARY SELECTED YEAR */}
            <Card
              className="p-8 md:p-12 rounded-[3rem] relative overflow-hidden group hover:shadow-2xl transition-all duration-500 border-none"
              style={{ backgroundColor: isDarkMode ? themeColors.dark.surface : 'rgba(255, 255, 255, 0.85)' }}
            >
              <div className="relative z-10 space-y-8">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-500">SY {activeYearLabel} (Primary)</span>
                  <span className="text-xs font-bold text-slate-400">{currentStats.activeGradCount} Enrolled</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Total Revenue Generated</p>
                  <p className="text-5xl md:text-6xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">₱{currentStats.totalVoucherRevenue.toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">ICT Strand Revenue</span>
                    <p className="text-lg font-black text-slate-700 dark:text-slate-300">₱{currentStats.totalICTRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">GAS Strand Revenue</span>
                    <p className="text-lg font-black text-slate-700 dark:text-slate-300">₱{currentStats.totalGASRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* COMPARISON YEAR */}
            <Card
              className="p-8 md:p-12 rounded-[3rem] relative overflow-hidden group hover:shadow-2xl transition-all duration-500 border-none"
              style={{ backgroundColor: isDarkMode ? themeColors.dark.surface : 'rgba(255, 255, 255, 0.85)' }}
            >
              <div className="relative z-10 space-y-8">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-500">SY {compareYear} (Comparison)</span>
                  <span className="text-xs font-bold text-slate-400">{compareStats.activeGradCount} Enrolled</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Total Revenue Generated</p>
                  <p className="text-5xl md:text-6xl font-black text-indigo-500 tracking-tighter">₱{compareStats.totalVoucherRevenue.toLocaleString()}</p>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">ICT Strand Revenue</span>
                    <p className="text-lg font-black text-slate-700 dark:text-slate-300">₱{compareStats.totalICTRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">GAS Strand Revenue</span>
                    <p className="text-lg font-black text-slate-700 dark:text-slate-300">₱{compareStats.totalGASRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* DELTA / SHIFT COMPARISON CARD */}
            <Card
              className="lg:col-span-2 p-10 rounded-[3rem] relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-none"
              style={{ 
                background: isDarkMode ? 'linear-gradient(135deg, #1e1b4b, #0f172a)' : 'linear-gradient(135deg, #e0e7ff, #ffffff)' 
              }}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                    <Scale size={24} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500">Year-over-Year Analysis</h3>
                    <p className="text-lg font-black text-slate-700 dark:text-slate-300">Revenue Shift: SY {compareYear} → SY {activeYearLabel}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-8 pt-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Revenue Delta</span>
                    <p className={`text-2xl font-black ${deltas.revenue >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {deltas.revenue >= 0 ? '+' : ''}₱{deltas.revenue.toLocaleString()} ({deltas.revenuePct.toFixed(1)}%)
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Enrollee Count Delta</span>
                    <p className={`text-2xl font-black ${deltas.graduates >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {deltas.graduates >= 0 ? '+' : ''}{deltas.graduates}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">ICT Contribution Shift</span>
                    <p className={`text-2xl font-black ${deltas.ict >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {deltas.ict >= 0 ? '+' : ''}₱{deltas.ict.toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">GAS Contribution Shift</span>
                    <p className={`text-2xl font-black ${deltas.gas >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {deltas.gas >= 0 ? '+' : ''}₱{deltas.gas.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

          </div>
        ) : (
          /* SINGLE SCHOOL YEAR DETAILED OVERVIEW */
          <div className="w-full">
            <Card
              className="p-8 md:p-14 rounded-[3rem] md:rounded-[4rem] relative overflow-hidden group transition-all duration-500 hover:shadow-2xl border-none"
              style={{
                backgroundColor: isDarkMode ? themeColors.dark.surface : 'rgba(255, 255, 255, 0.8)',
              }}
            >
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
                <Banknote size={240} className="text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className="relative z-10 space-y-12">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-8">
                  <div className="space-y-2">
                    <ThemedText variant="h3" className="flex items-center gap-4 text-xl md:text-3xl font-black tracking-tight" isDarkMode={isDarkMode}>
                      <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                        <Landmark size={24} />
                      </div>
                      Voucher Revenue
                    </ThemedText>
                    <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] opacity-50 px-1">Registrar Monitoring ({currentStats.activeGradCount} Subsidized Enrollees)</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <Tooltip>
                      <TooltipTrigger>
                        <p className="text-5xl md:text-7xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter cursor-help drop-shadow-sm tabular-nums">₱{currentStats.totalVoucherRevenue.toLocaleString()}</p>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-950 text-white border-slate-800 backdrop-blur-md px-4 py-2 rounded-xl">
                        <p className="font-bold text-[10px] uppercase tracking-widest text-emerald-400">Total Active Funding</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Progress bar to Revenue Goal Quota */}
                <div className="space-y-6">
                  <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-2">
                      <Activity size={12} className="text-emerald-500" />
                      Revenue Goal Quota Progress
                    </span>
                    <span className="hidden sm:inline opacity-60 italic">Target Quota: ₱{(currentStats.goalQuota / 1000000).toFixed(2)}M (Custom Goal)</span>
                  </div>
                  <div className={`h-6 w-full rounded-3xl overflow-hidden p-1.5 shadow-inner border ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'}`} style={{ backgroundColor: isDarkMode ? 'rgb(15 23 42)' : 'rgb(241 245 249)' }}>
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-2xl transition-all duration-1000 ease-out animate-pulse"
                      style={{
                        width: `${Math.min(currentStats.progress, 100)}%`,
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-400">
                    <span>₱{currentStats.totalVoucherRevenue.toLocaleString()} Earned</span>
                    <span>{currentStats.progress.toFixed(1)}% of ₱{currentStats.goalQuota.toLocaleString()} Quota</span>
                  </div>
                </div>

                {/* Payments Split: DepEd Vouchers vs Guardian Payments vs Self-pay */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-10 border-t ${isDarkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
                  <div className={`space-y-2 p-6 rounded-[2rem] border ${isDarkMode ? 'bg-slate-800/20 border-slate-800/40' : 'bg-slate-50/50 border-slate-100'}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Voucher confirmed (DepEd)</span>
                    <p className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">₱{currentStats.depEdConfirmed.toLocaleString()}</p>
                  </div>
                  <div className={`space-y-2 p-6 rounded-[2rem] border ${isDarkMode ? 'bg-slate-800/20 border-slate-800/40' : 'bg-slate-50/50 border-slate-100'}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Guardian-Collected</span>
                    <p className="text-xl md:text-2xl font-black text-amber-500">₱{currentStats.guardianCollected.toLocaleString()}</p>
                  </div>
                  <div className={`space-y-2 p-6 rounded-[2rem] border ${isDarkMode ? 'bg-slate-800/20 border-slate-800/40' : 'bg-slate-50/50 border-slate-100'}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Self-Pay Payments</span>
                    <p className="text-xl md:text-2xl font-black text-blue-500">₱{currentStats.selfPayCollected.toLocaleString()}</p>
                  </div>
                  <div className={`space-y-2 p-6 rounded-[2rem] border ${isDarkMode ? 'bg-slate-800/20 border-slate-800/40' : 'bg-slate-50/50 border-slate-100'}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Payee Revenue</span>
                    <p className="text-xl md:text-2xl font-black text-indigo-500">₱{currentStats.payeeRevenue.toLocaleString()}</p>
                  </div>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12 pt-6`}>
                  <div className={`space-y-3 p-6 rounded-[2rem] border group/item hover:bg-white dark:hover:bg-slate-800/50 transition-all ${isDarkMode ? 'bg-slate-800/30 border-slate-800/50' : 'bg-slate-50/50 border-slate-100/50'}`}>
                    <ThemedText variant="label" className="text-[10px] font-black uppercase tracking-widest opacity-50" isDarkMode={isDarkMode}>ICT Revenue contribution</ThemedText>
                    <ThemedText variant="h3" className="text-xl md:text-3xl font-black tabular-nums" isDarkMode={isDarkMode}>₱{currentStats.totalICTRevenue.toLocaleString()}</ThemedText>
                    <p className="text-[8px] font-bold uppercase text-slate-400">{currentStats.ictCount} ICT Enrollees</p>
                  </div>
                  <div className={`space-y-3 p-6 rounded-[2rem] border group/item hover:bg-white dark:hover:bg-slate-800/50 transition-all sm:text-right ${isDarkMode ? 'bg-slate-800/30 border-slate-800/50' : 'bg-slate-50/50 border-slate-100/50'}`}>
                    <ThemedText variant="label" className="text-[10px] font-black uppercase tracking-widest opacity-50" isDarkMode={isDarkMode}>GAS Revenue contribution</ThemedText>
                    <ThemedText variant="h3" className="text-xl md:text-3xl font-black tabular-nums" isDarkMode={isDarkMode}>₱{currentStats.totalGASRevenue.toLocaleString()}</ThemedText>
                    <p className="text-[8px] font-bold uppercase text-slate-400">{currentStats.gasCount} GAS Enrollees</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* FINANCIAL CALCULATOR HUB */}
        <div className="w-full">
          <Card
            className="p-10 rounded-[3rem] md:rounded-[4rem] space-y-8 border-none transition-all duration-500 hover:shadow-2xl"
            style={{
              backgroundColor: isDarkMode ? themeColors.dark.surface : '#ffffff',
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Banknote size={24} />
                </div>
                <div>
                  <ThemedText variant="h3" className="text-base font-black uppercase tracking-wider" isDarkMode={isDarkMode}>
                    Financial Settings
                  </ThemedText>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Voucher Rates, Target Quota, and Tier Configuration (SY {activeYearLabel})</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              
              {/* TIER AND GOAL SETTINGS */}
              <div className="space-y-6">
                
                {/* 1. School Voucher Tier */}
                <div className="space-y-2">
                  <ThemedText variant="label" className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-2" isDarkMode={isDarkMode}>
                    School Voucher Tier Location
                  </ThemedText>
                  <div className="relative">
                    <select
                      value={selectedTier}
                      onChange={(e) => {
                        isEditingFinancialsRef.current = true;
                        setSelectedTier(e.target.value);
                      }}
                      className={`h-14 w-full rounded-2xl border-none font-bold text-sm px-6 focus-visible:ring-emerald-500 transition-all duration-500 outline-none appearance-none cursor-pointer ${
                        isDarkMode ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-900'
                      }`}
                    >
                      <option value="NCR">NCR (National Capital Region - High Rate)</option>
                      <option value="HUC">HUC (Highly Urbanized Cities)</option>
                      <option value="Provincial">Provincial / Others</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                      <ChevronRight size={16} className="rotate-90" />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium italic mt-2 px-2">
                    Used to establish regional billing classifications for tuition.
                  </p>
                </div>

                {/* 2. Quota Goal Goal */}
                <div className="space-y-2">
                  <ThemedText variant="label" className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-2" isDarkMode={isDarkMode}>
                    School Year Revenue Goal Quota (PHP)
                  </ThemedText>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                      type="text"
                      value={selectedGoal === "0" ? "" : selectedGoal}
                      onChange={(e) => {
                        isEditingFinancialsRef.current = true;
                        const val = e.target.value;
                        if (val === "" || val === " ") {
                          setSelectedGoal("");
                        } else {
                          const parsed = parseInt(val);
                          if (!isNaN(parsed)) setSelectedGoal(String(parsed));
                        }
                      }}
                      className="h-14 rounded-2xl border-none font-bold text-lg pl-12 pr-6 focus-visible:ring-emerald-500 transition-all duration-500 outline-none"
                      style={{ backgroundColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(241 245 249)', color: isDarkMode ? '#ffffff' : '#000000' }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium italic mt-2 px-2">
                    The custom target quota of money established for this active year's revenue progress.
                  </p>
                </div>

                {/* 3. School Tuition Value */}
                <div className="space-y-2">
                  <ThemedText variant="label" className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-2" isDarkMode={isDarkMode}>
                    School Tuition Fee (PHP)
                  </ThemedText>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                      type="text"
                      value={tuitionFee === 0 ? "" : tuitionFee}
                      onChange={(e) => {
                        isEditingFinancialsRef.current = true;
                        const val = e.target.value;
                        if (val === "") {
                          setTuitionFee(0);
                        } else {
                          const parsed = parseInt(val);
                          if (!isNaN(parsed)) setTuitionFee(parsed);
                        }
                      }}
                      className="h-14 rounded-2xl border-none font-bold text-lg pl-12 pr-6 focus-visible:ring-emerald-500 transition-all duration-500 outline-none"
                      style={{ backgroundColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(241 245 249)', color: isDarkMode ? '#ffffff' : '#000000' }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium italic mt-2 px-2">
                    The base tuition fee charged to students for the school year.
                  </p>
                </div>

              </div>

              {/* RATE MODIFICATION TABLE */}
              <div className="space-y-6">
                <ThemedText variant="label" className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-2" isDarkMode={isDarkMode}>
                  Voucher Rates per Student Category
                </ThemedText>
                
                <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <table className="w-full text-left text-xs font-bold">
                    <thead>
                      <tr className={`border-b text-[9px] uppercase tracking-wider text-slate-400 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                        <th className="px-6 py-4">Student Category</th>
                        <th className="px-6 py-4 text-right">Voucher Amount (PHP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {Object.keys(categoryRates)
                        .filter(category => category === "CATEGORY A, B, C" || category === "CATEGORY D, E")
                        .map((category) => (
                        <tr key={category} className={`hover:bg-slate-500/5 transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          <td className="px-6 py-4">{category}</td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end">
                              <Input
                                type="number"
                                value={categoryRates[category]}
                                onChange={(e) => {
                                  isEditingFinancialsRef.current = true;
                                  const val = e.target.value
                                  setCategoryRates(prev => ({
                                    ...prev,
                                    [category]: val === "" ? "" : Number(val)
                                  }))
                                }}
                                className="h-9 w-28 rounded-xl border-none font-bold text-right outline-none pr-3"
                                style={{ backgroundColor: isDarkMode ? 'rgb(30 41 59)' : 'rgb(241 245 249)', color: isDarkMode ? '#ffffff' : '#000000' }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>

            <div className="pt-6 border-t border-slate-50 dark:border-slate-800 flex justify-end">
              <Button
                onClick={handleSaveFinancials}
                disabled={isSaving}
                className="rounded-full px-8 py-6 font-black uppercase text-xs tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <Save size={16} className="mr-2" />
                {isSaving ? "Saving..." : "Save Financial Settings"}
              </Button>
            </div>

          </Card>
        </div>

      </div>
    </TooltipProvider>
  )
}
