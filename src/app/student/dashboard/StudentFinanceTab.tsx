"use client"

import { useEffect, useState } from "react"
import { getStudentBalanceDetails } from "@/lib/actions/financial"
import { Loader2, DollarSign, FileText, CheckCircle2 } from "lucide-react"

import { studentSupabase } from "@/lib/supabase/student-client"

export default function StudentFinanceTab({ studentId, dm }: { studentId: string; dm: boolean }) {
  const [loading, setLoading] = useState(true)
  const [details, setDetails] = useState<any | null>(null)

  useEffect(() => {
    async function load(isRefresh = false) {
      if (!isRefresh) setLoading(true)
      const res = await getStudentBalanceDetails(studentId)
      if (res.success) {
        setDetails(res.data)
      }
      if (!isRefresh) setLoading(false)
    }
    load()

    // POLLING FALLBACK — 3 seconds (guarantees live updates even if realtime misses)
    const pollingInterval = setInterval(() => load(true), 3000)

    // REALTIME SUBSCRIPTIONS — Push updates for instant response
    const channel = studentSupabase
      .channel(`finance_live_${studentId.slice(0, 8)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `student_id=eq.${studentId}` },
        () => load(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_balances', filter: `student_id=eq.${studentId}` },
        () => load(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'voucher_ledger', filter: `student_id=eq.${studentId}` },
        () => load(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_config' },
        () => load(true)
      )
      .subscribe()

    return () => {
      clearInterval(pollingInterval)
      studentSupabase.removeChannel(channel)
    }
  }, [studentId])

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Syncing Finance...</span>
      </div>
    )
  }

  if (!details) {
    return (
      <div className={`text-center py-20 rounded-[2rem] border border-dashed ${dm ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
        <DollarSign className="w-8 h-8 mx-auto mb-3" />
        <p className="text-[11px] font-black uppercase tracking-widest">No financial record found</p>
      </div>
    )
  }

  const {
    tuition,
    voucherDiscount,
    customFees,
    payments,
    totalFees,
    confirmedPayments,
    remainingBalance
  } = details

  return (
    <div className="space-y-6 animate-step-in">
      {/* Balance Banner */}
      <div className={`p-6 rounded-[2rem] border transition-all ${
        remainingBalance > 0
          ? dm ? 'bg-red-950/20 border-red-500/20' : 'bg-red-50/50 border-red-200'
          : dm ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200'
      }`}>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current Remaining Balance</span>
        <h3 className={`text-3xl md:text-4xl font-black mt-2 ${
          remainingBalance > 0 ? 'text-red-500' : 'text-emerald-500'
        }`}>
          ₱{remainingBalance.toLocaleString()}
        </h3>
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">
          {remainingBalance > 0 ? "Outstanding balance to be settled" : "All school fees fully cleared"}
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border ${dm ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Base Tuition</span>
          <p className="text-lg font-black mt-1 text-slate-900 dark:text-white">₱{tuition.toLocaleString()}</p>
        </div>
        <div className={`p-5 rounded-2xl border ${dm ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Voucher Subsidy</span>
          <p className="text-lg font-black mt-1 text-emerald-600 dark:text-emerald-400">-₱{voucherDiscount.toLocaleString()}</p>
        </div>
        <div className={`p-5 rounded-2xl border ${dm ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Payments</span>
          <p className="text-lg font-black mt-1 text-blue-500">₱{confirmedPayments.toLocaleString()}</p>
        </div>
      </div>

      {/* Statement of Account Statement */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <FileText size={12} /> Statement of Account Breakdown
        </p>

        <div className={`rounded-2xl border overflow-hidden text-xs font-bold ${dm ? 'border-slate-800' : 'border-slate-200'}`}>
          <table className="w-full text-left">
            <thead>
              <tr className={`text-[9px] uppercase tracking-widest text-slate-400 border-b ${
                dm ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <th className="px-4 py-3">Item Description</th>
                <th className="px-4 py-3 text-right">Debit (+)</th>
                <th className="px-4 py-3 text-right">Credit (-)</th>
              </tr>
            </thead>
            <tbody>
              {/* Tuition */}
              <tr className={`border-b ${dm ? 'border-slate-900' : 'border-slate-100'}`}>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-350">Tuition Fee Assessment</td>
                <td className="px-4 py-3 text-right text-slate-900 dark:text-white">₱{tuition.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">-</td>
              </tr>
              {/* Voucher */}
              {voucherDiscount > 0 && (
                <tr className={`border-b bg-emerald-500/5 ${dm ? 'border-slate-900' : 'border-slate-100'}`}>
                  <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">Voucher / ESC Subsidy</td>
                  <td className="px-4 py-3 text-right">-</td>
                  <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">₱{voucherDiscount.toLocaleString()}</td>
                </tr>
              )}
              {/* Additional custom charges */}
              {customFees.map((f: any) => (
                <tr key={f.id} className={`border-b ${dm ? 'border-slate-900' : 'border-slate-100'}`}>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-350">{f.fee_name}</td>
                  <td className="px-4 py-3 text-right text-amber-500">₱{f.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">-</td>
                </tr>
              ))}
              {/* Payments */}
              {payments.map((p: any) => (
                <tr key={p.id} className={`border-b ${p.status === 'confirmed' ? 'bg-blue-500/5' : 'opacity-50'} ${dm ? 'border-slate-900' : 'border-slate-100'}`}>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-350">
                    Payment ({p.payment_method}) - {p.payee_type}
                    {p.status === 'pending' && <span className="ml-2 text-[7px] tracking-wider uppercase bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">Pending Verification</span>}
                  </td>
                  <td className="px-4 py-3 text-right">-</td>
                  <td className="px-4 py-3 text-right text-blue-500">₱{p.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
