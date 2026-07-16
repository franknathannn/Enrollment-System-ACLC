"use client"

import { useEffect, useState, useMemo } from "react"
import { getStudentBalances, recordCashPayment } from "@/lib/actions/financial"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Users, Loader2, User, DollarSign } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useTheme } from "@/hooks/useTheme"
import { toast } from "sonner"

export default function PayeesPage() {
  const { isDarkMode } = useTheme()
  const [loading, setLoading] = useState(true)
  const [payees, setPayees] = useState<any[]>([])
  const [search, setSearch] = useState("")

  // Payment dialog states
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [payStudentId, setPayStudentId] = useState("")
  const [payAmount, setPayAmount] = useState("")
  const [payeeType, setPayeeType] = useState<"Guardian" | "Self-pay">("Self-pay")
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [payeeSearch, setPayeeSearch] = useState("")
  const [payeeDropdownOpen, setPayeeDropdownOpen] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const res = await getStudentBalances()
    if (res.success) {
      // Filter only payee/transferee students
      const payeeList = (res.balances || []).filter(b => 
        b.is_payee || 
        b.voucher_status?.includes("CATEGORY") || 
        b.voucher_status === "Transferee"
      )
      setPayees(payeeList)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredPayees = useMemo(() => {
    return payees.filter(p => {
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase()
      const searchLower = search.toLowerCase()
      return fullName.includes(searchLower) || p.lrn?.includes(searchLower)
    })
  }, [payees, search])

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payStudentId || !payAmount) {
      return toast.error("Please fill all payment fields")
    }
    setSubmittingPayment(true)
    const amt = parseFloat(payAmount)
    if (isNaN(amt) || amt <= 0) {
      setSubmittingPayment(false)
      return toast.error("Invalid payment amount")
    }

    const res = await recordCashPayment(payStudentId, amt, payeeType)
    if (res.success) {
      toast.success("Tuition payment recorded successfully")
      setPayAmount("")
      setPayStudentId("")
      setShowPaymentModal(false)
      fetchData()
    } else {
      toast.error(res.error || "Failed to record payment")
    }
    setSubmittingPayment(false)
  }

  // Summary stats
  const totalTuitionOwed = payees.reduce((acc, p) => acc + p.tuition, 0)
  const totalPaymentsReceived = payees.reduce((acc, p) => acc + p.totalPayments, 0)
  const totalOutstanding = payees.reduce((acc, p) => acc + p.balance, 0)

  return (
    <div className="p-6 sm:p-10 space-y-8 max-w-[1400px] mx-auto animate-step-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest italic text-amber-500">Student Payees</h2>
          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Self-paying students & transferees who pay full tuition — {payees.length} total</p>
        </div>

        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogTrigger asChild>
            <Button className="text-[10px] uppercase font-black tracking-widest px-4 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2">
              <DollarSign size={16} /> Record Tuition Payment
            </Button>
          </DialogTrigger>
          <DialogContent className={`max-w-md rounded-3xl ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white text-slate-900'}`}>
            <DialogHeader>
              <DialogTitle className="uppercase font-black tracking-wider text-base italic text-amber-500">Record Tuition Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRecordPayment} className="space-y-4 pt-4">
              <div className="space-y-2 relative">
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400">Select Payee Student</label>
                <div className="relative">
                  <Input 
                    placeholder="Search student..."
                    value={payeeSearch}
                    onChange={(e) => { setPayeeSearch(e.target.value); setPayeeDropdownOpen(true); }}
                    onFocus={() => setPayeeDropdownOpen(true)}
                    className={`h-11 w-full rounded-xl border-none font-bold text-xs px-4 outline-none ${isDarkMode ? 'bg-slate-850 text-white' : 'bg-slate-100 text-slate-900'}`}
                  />
                  {payeeDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setPayeeDropdownOpen(false)} />
                      <div className={`absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl shadow-xl z-50 p-1 border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        {payees.filter(b => `${b.first_name} ${b.last_name} ${b.lrn}`.toLowerCase().includes(payeeSearch.toLowerCase())).map(b => (
                          <div 
                            key={b.id} 
                            onClick={() => { setPayStudentId(b.id); setPayeeSearch(`${b.last_name}, ${b.first_name}`); setPayeeDropdownOpen(false); }}
                            className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer ${payStudentId === b.id ? (isDarkMode ? 'bg-amber-500/20 text-amber-500' : 'bg-amber-50 text-amber-600') : (isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50')}`}
                          >
                            {b.last_name}, {b.first_name} (LRN: {b.lrn}) — Balance: ₱{b.balance.toLocaleString()}
                          </div>
                        ))}
                        {payees.filter(b => `${b.first_name} ${b.last_name} ${b.lrn}`.toLowerCase().includes(payeeSearch.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-xs text-slate-400">No students found</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400">Payer Type</label>
                <select 
                  value={payeeType} 
                  onChange={(e) => setPayeeType(e.target.value as any)}
                  className={`h-11 w-full rounded-xl border-none font-bold text-xs px-4 outline-none ${isDarkMode ? 'bg-slate-850 text-white' : 'bg-slate-100 text-slate-900'}`}
                >
                  <option value="Self-pay">Student (Self-pay)</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black tracking-widest text-slate-400">Cash Amount Paid (PHP)</label>
                <Input 
                  type="number" 
                  placeholder="22500" 
                  value={payAmount} 
                  onChange={e => setPayAmount(e.target.value)} 
                  className="h-11 rounded-xl"
                  required
                />
              </div>

              <Button type="submit" disabled={submittingPayment} className="w-full h-11 rounded-xl font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-white">
                {submittingPayment ? <Loader2 className="animate-spin mr-2" size={14} /> : "Record Tuition Receipt"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      {!loading && payees.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Tuition Owed</span>
            <p className="text-lg font-black mt-1 text-slate-900 dark:text-white">₱{totalTuitionOwed.toLocaleString()}</p>
          </div>
          <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Collected</span>
            <p className="text-lg font-black mt-1 text-emerald-500">₱{totalPaymentsReceived.toLocaleString()}</p>
          </div>
          <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Outstanding Balance</span>
            <p className={`text-lg font-black mt-1 ${totalOutstanding > 0 ? 'text-red-500' : 'text-emerald-500'}`}>₱{totalOutstanding.toLocaleString()}</p>
          </div>
        </div>
      )}

      <Card className={`p-6 rounded-[2rem] border-none shadow-sm ${isDarkMode ? 'bg-slate-900/60' : 'bg-white'}`}>
        <div className="flex items-center gap-3 w-full max-w-md mb-6 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Search className="text-slate-400 ml-2.5" size={16} />
          <input 
            type="text" 
            placeholder="Search payee or LRN..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 bg-transparent outline-none border-none text-xs font-bold"
          />
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-amber-500 w-10 h-10" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Syncing payees...</span>
          </div>
        ) : filteredPayees.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs font-black uppercase tracking-wider">No payees registered</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs font-bold border-collapse">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-850/50 text-[9px] uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">LRN</th>
                  <th className="px-6 py-4">Strand</th>
                  <th className="px-6 py-4">Status Tag</th>
                  <th className="px-6 py-4 text-right">Tuition Owed</th>
                  <th className="px-6 py-4 text-right">Total Payments</th>
                  <th className="px-6 py-4 text-right">Remaining Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayees.map(p => {
                  return (
                    <tr key={p.id} className="hover:bg-slate-500/5 border-t border-slate-100 dark:border-slate-800 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shrink-0 flex items-center justify-center">
                            {p.two_by_two_url ? (
                              <img src={p.two_by_two_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <User size={16} className="text-slate-400" />
                            )}
                          </div>
                          <p className="text-slate-900 dark:text-white font-bold">{p.last_name}, {p.first_name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{p.lrn}</td>
                      <td className="px-6 py-4 text-slate-500">{p.strand}-{p.grade_level}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-[8px] uppercase tracking-widest bg-amber-500/10 text-amber-500 font-black">
                          {p.voucher_status || "PAYEE"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-900 dark:text-white">₱{p.tuition.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-blue-500">₱{p.totalPayments.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${
                          p.balance > 0 
                            ? 'bg-red-500/10 text-red-500' 
                            : 'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          ₱{p.balance.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
