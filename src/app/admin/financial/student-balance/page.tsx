"use client"

import { useEffect, useState, useMemo } from "react"
import { getStudentBalances, addCustomCharge, recordCashPayment, getStudentBalanceDetails, getUniqueCustomCharges, deleteCustomCharge, deleteCustomChargeGroup, clearStudentPayments } from "@/lib/actions/financial"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { 
  Loader2, DollarSign, Search, PlusCircle, CheckCircle2, FileText, ChevronRight, X, ArrowUpDown, User, Trash2
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useTheme } from "@/hooks/useTheme"
import { themeColors } from "@/lib/themeColors"
import { supabase } from "@/lib/supabase/admin-client"

export default function StudentBalancePage() {
  const { isDarkMode } = useTheme()
  const [loading, setLoading] = useState(true)
  const [balances, setBalances] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
  const [soaDetails, setSoaDetails] = useState<any | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showSoaModal, setShowSoaModal] = useState(false)

  // Charge dialog states
  const [chargeType, setChargeType] = useState<"individual" | "bulk">("individual")
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [feeName, setFeeName] = useState("")
  const [feeAmount, setFeeAmount] = useState("")
  const [targetGrade, setTargetGrade] = useState("")
  const [targetStrand, setTargetStrand] = useState("")
  const [submittingCharge, setSubmittingCharge] = useState(false)
  const [showChargeModal, setShowChargeModal] = useState(false)

  // Payment dialog states
  const [payStudentId, setPayStudentId] = useState("")
  const [payAmount, setPayAmount] = useState("")
  const [payeeType, setPayeeType] = useState<"Guardian" | "Self-pay">("Self-pay")
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Strands & Unique Charges states
  const [availableStrands, setAvailableStrands] = useState<string[]>(["ICT", "GAS"])
  const [postedCharges, setPostedCharges] = useState<any[]>([])

  // Beautiful Confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    action: async () => {},
  })

  const handleDeleteIndividualFee = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Remove Individual Charge",
      message: "Are you sure you want to remove this charge for this student? This will deduct the amount from their balance.",
      action: async () => {
        const res = await deleteCustomCharge(id)
        if (res.success) {
          toast.success("Charge deleted successfully")
          if (selectedStudent) {
            const detailsRes = await getStudentBalanceDetails(selectedStudent.id)
            if (detailsRes.success) {
              setSoaDetails(detailsRes.data)
            }
          }
          fetchData()
        } else {
          toast.error(res.error || "Failed to delete charge")
        }
      }
    })
  }

  const handleDeleteFeeGroup = (feeName: string, amount: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Custom Fee Group",
      message: `Are you sure you want to delete "${feeName}" (₱${amount.toLocaleString()}) for ALL students? This cannot be undone.`,
      action: async () => {
        const res = await deleteCustomChargeGroup(feeName, amount)
        if (res.success) {
          toast.success("Custom fee deleted for all students")
          fetchData()
        } else {
          toast.error(res.error || "Failed to delete custom fee group")
        }
      }
    })
  }

  const handleClearStudentPayments = (studentId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Clear Student Payments",
      message: "Are you sure you want to delete ALL recorded payments for this student? This action cannot be undone.",
      action: async () => {
        const res = await clearStudentPayments(studentId)
        if (res.success) {
          toast.success("Payments cleared successfully")
          if (selectedStudent) {
            const detailsRes = await getStudentBalanceDetails(selectedStudent.id)
            if (detailsRes.success) {
              setSoaDetails(detailsRes.data)
            }
          }
          fetchData()
        } else {
          toast.error(res.error || "Failed to clear payments")
        }
      }
    })
  }

  const fetchData = async () => {
    setLoading(true)
    const res = await getStudentBalances()
    if (res.success) {
      setBalances(res.balances || [])
    } else {
      toast.error(res.error || "Failed to load balances")
    }

    // Load available strands from settings
    const { data: setting } = await supabase
      .from('system_settings')
      .select('value_text')
      .eq('setting_key', 'available_strands')
      .single()
    if (setting?.value_text) {
      try {
        setAvailableStrands(JSON.parse(setting.value_text))
      } catch (e) {
        console.error("Strand parse error:", e)
      }
    }

    // Load unique charges list
    const chargeRes = await getUniqueCustomCharges()
    if (chargeRes.success) {
      setPostedCharges(chargeRes.charges || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenSoa = async (student: any) => {
    setSelectedStudent(student)
    setLoadingDetails(true)
    setShowSoaModal(true)
    const res = await getStudentBalanceDetails(student.id)
    if (res.success) {
      setSoaDetails(res.data)
    } else {
      toast.error("Failed to load Statement of Account details")
      setShowSoaModal(false)
    }
    setLoadingDetails(false)
  }

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feeName.trim() || !feeAmount) {
      return toast.error("Please provide fee name and amount")
    }
    setSubmittingCharge(true)
    const amt = parseFloat(feeAmount)
    if (isNaN(amt) || amt <= 0) {
      setSubmittingCharge(false)
      return toast.error("Invalid amount")
    }

    const targetId = chargeType === "individual" ? selectedStudentId : null
    const criteria = chargeType === "bulk" ? { gradeLevel: targetGrade || undefined, strand: targetStrand || undefined } : undefined

    const res = await addCustomCharge(targetId, feeName, amt, criteria)
    if (res.success) {
      toast.success("Fee charged successfully")
      setFeeName("")
      setFeeAmount("")
      setShowChargeModal(false)
      fetchData()
    } else {
      toast.error(res.error || "Failed to post charge")
    }
    setSubmittingCharge(false)
  }

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
      toast.success("Payment recorded successfully")
      setPayAmount("")
      setShowPaymentModal(false)
      fetchData()
    } else {
      toast.error(res.error || "Failed to record payment")
    }
    setSubmittingPayment(false)
  }

  const filteredBalances = useMemo(() => {
    return balances.filter(b => {
      const fullName = `${b.first_name} ${b.last_name}`.toLowerCase()
      const searchLower = search.toLowerCase()
      return fullName.includes(searchLower) || b.lrn?.includes(searchLower)
    })
  }, [balances, search])

  return (
    <div className="p-6 sm:p-10 space-y-8 max-w-[1400px] mx-auto animate-step-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest italic text-blue-600">Student Balances</h2>
          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Manage school tuition, voucher discounts, custom fees, and student collections</p>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <Dialog open={showChargeModal} onOpenChange={setShowChargeModal}>
            <DialogTrigger asChild>
              <Button className="spring-btn-blue text-[10px] uppercase font-black tracking-widest px-4 h-11 rounded-xl bg-blue-600 text-white flex items-center gap-2">
                <PlusCircle size={16} /> Add Charge
              </Button>
            </DialogTrigger>
            <DialogContent className={`max-w-md rounded-3xl ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white text-slate-900'}`}>
              <DialogHeader>
                <DialogTitle className="uppercase font-black tracking-wider text-base italic text-blue-600">Post Custom Charge</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCharge} className="space-y-4 pt-4">
                <div className="flex gap-3 mb-2">
                  <Button 
                    type="button" 
                    className={`flex-1 rounded-xl text-[10px] uppercase font-black transition-all ${
                      chargeType === "individual"
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
                        : isDarkMode ? "bg-slate-850 text-slate-400 hover:bg-slate-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    onClick={() => setChargeType("individual")}
                  >
                    Individual Student
                  </Button>
                  <Button 
                    type="button" 
                    className={`flex-1 rounded-xl text-[10px] uppercase font-black transition-all ${
                      chargeType === "bulk"
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
                        : isDarkMode ? "bg-slate-850 text-slate-400 hover:bg-slate-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    onClick={() => setChargeType("bulk")}
                  >
                    Bulk (Grade/Strand)
                  </Button>
                </div>

                {chargeType === "individual" ? (
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400">Select Student</label>
                    <select 
                      value={selectedStudentId} 
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className={`h-11 w-full rounded-xl border-none font-bold text-xs px-4 outline-none ${isDarkMode ? 'bg-slate-850 text-white' : 'bg-slate-100 text-slate-900'}`}
                      required
                    >
                      <option value="">-- Choose Student --</option>
                      {balances.map(b => (
                        <option key={b.id} value={b.id}>{b.last_name}, {b.first_name} (LRN: {b.lrn})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase font-black tracking-widest text-slate-400">Grade Level</label>
                      <select 
                        value={targetGrade} 
                        onChange={(e) => setTargetGrade(e.target.value)}
                        className={`h-11 w-full rounded-xl border-none font-bold text-xs px-4 outline-none ${isDarkMode ? 'bg-slate-850 text-white' : 'bg-slate-100 text-slate-900'}`}
                      >
                        <option value="">All Grades</option>
                        <option value="11">Grade 11</option>
                        <option value="12">Grade 12</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase font-black tracking-widest text-slate-400">Strand</label>
                      <select 
                        value={targetStrand} 
                        onChange={(e) => setTargetStrand(e.target.value)}
                        className={`h-11 w-full rounded-xl border-none font-bold text-xs px-4 outline-none ${isDarkMode ? 'bg-slate-850 text-white' : 'bg-slate-100 text-slate-900'}`}
                      >
                        <option value="">All Strands</option>
                        {availableStrands.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-black tracking-widest text-slate-400">Fee Label</label>
                  <Input 
                    type="text" 
                    placeholder="e.g. Graduation Ceremony Fee" 
                    value={feeName} 
                    onChange={e => setFeeName(e.target.value)} 
                    className="h-11 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-black tracking-widest text-slate-400">Amount (PHP)</label>
                  <Input 
                    type="number" 
                    placeholder="3500" 
                    value={feeAmount} 
                    onChange={e => setFeeAmount(e.target.value)} 
                    className="h-11 rounded-xl"
                    required
                  />
                </div>

                <Button type="submit" disabled={submittingCharge} className="w-full h-11 rounded-xl font-bold uppercase tracking-wider bg-blue-600 text-white">
                  {submittingCharge ? <Loader2 className="animate-spin mr-2" size={14} /> : "Post Charge"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
            <DialogTrigger asChild>
              <Button variant="outline" className="spring-btn-emerald border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 text-[10px] uppercase font-black tracking-widest px-4 h-11 rounded-xl">
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className={`max-w-md rounded-3xl ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white text-slate-900'}`}>
              <DialogHeader>
                <DialogTitle className="uppercase font-black tracking-wider text-base italic text-emerald-600">Record Cash Payment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRecordPayment} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-black tracking-widest text-slate-400">Select Student</label>
                  <select 
                    value={payStudentId} 
                    onChange={(e) => setPayStudentId(e.target.value)}
                    className={`h-11 w-full rounded-xl border-none font-bold text-xs px-4 outline-none ${isDarkMode ? 'bg-slate-850 text-white' : 'bg-slate-100 text-slate-900'}`}
                    required
                  >
                    <option value="">-- Choose Student --</option>
                    {balances.map(b => (
                      <option key={b.id} value={b.id}>{b.last_name}, {b.first_name} (LRN: {b.lrn})</option>
                    ))}
                  </select>
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
                    placeholder="5000" 
                    value={payAmount} 
                    onChange={e => setPayAmount(e.target.value)} 
                    className="h-11 rounded-xl"
                    required
                  />
                </div>

                <Button type="submit" disabled={submittingPayment} className="w-full h-11 rounded-xl font-bold uppercase tracking-wider bg-emerald-600 text-white">
                  {submittingPayment ? <Loader2 className="animate-spin mr-2" size={14} /> : "Record Cash Receipt"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className={`p-6 rounded-[2rem] border-none shadow-sm ${isDarkMode ? 'bg-slate-900/60' : 'bg-white'}`}>
        <div className="flex items-center gap-3 w-full max-w-md mb-6 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Search className="text-slate-400 ml-2.5" size={16} />
          <input 
            type="text" 
            placeholder="Search student or LRN..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 bg-transparent outline-none border-none text-xs font-bold"
          />
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 animate-pulse">Syncing balances...</span>
          </div>
        ) : filteredBalances.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs font-black uppercase tracking-wider">No matching students found</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs font-bold border-collapse">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-850/50 text-[9px] uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">LRN</th>
                  <th className="px-6 py-4">Strand</th>
                  <th className="px-6 py-4 text-right">Voucher</th>
                  <th className="px-6 py-4 text-right">Custom Fees</th>
                  <th className="px-6 py-4 text-right">Payments</th>
                  <th className="px-6 py-4 text-right">Balance</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.map(b => (
                  <tr key={b.id} className="hover:bg-slate-500/5 border-t border-slate-100 dark:border-slate-800 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shrink-0 flex items-center justify-center">
                        {b.two_by_two_url ? (
                          <img src={b.two_by_two_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User size={16} className="text-slate-450" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-slate-900 dark:text-white font-bold">{b.last_name}, {b.first_name}</p>
                        <span className="text-[8px] uppercase tracking-wider bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded">
                          {b.is_payee ? "PAYEE" : b.voucher_status || b.student_category}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{b.lrn}</td>
                    <td className="px-6 py-4 text-slate-500">{b.strand}-{b.grade_level}</td>
                    <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400">-₱{b.voucherDiscount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-amber-500">₱{b.totalCustomFees.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-blue-500">₱{b.totalPayments.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${
                        b.balance > 0 
                          ? 'bg-red-500/10 text-red-500' 
                          : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        ₱{b.balance.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button onClick={() => handleOpenSoa(b)} variant="ghost" size="sm" className="h-8 rounded-lg text-slate-400 hover:text-blue-500 font-black uppercase text-[9px] tracking-widest gap-1">
                        SOA <ChevronRight size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Charge History Section */}
      <Card className={`p-6 rounded-[2rem] border-none shadow-sm ${isDarkMode ? 'bg-slate-900/60' : 'bg-white'}`}>
        <div className="mb-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <FileText size={16} /> Active Custom Fees
          </h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">List of custom items currently charged to students for this school year</p>
        </div>
        
        {postedCharges.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs font-black uppercase tracking-wider">No custom fees posted yet</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs font-bold border-collapse">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-850/50 text-[9px] uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-3">Fee Label</th>
                  <th className="px-6 py-3">Rate (PHP)</th>
                  <th className="px-6 py-3 text-right">Students Charged</th>
                </tr>
              </thead>
              <tbody>
                {postedCharges.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-500/5 border-t border-slate-100 dark:border-slate-800 transition-colors">
                    <td className="px-6 py-3 text-slate-900 dark:text-white flex items-center justify-between">
                      <span>{c.fee_name}</span>
                      <button
                        onClick={() => handleDeleteFeeGroup(c.fee_name, c.amount)}
                        className="text-red-500 hover:text-red-700 p-1 sm:p-1.5 rounded hover:bg-red-500/10 transition-all flex items-center gap-1.5 text-[8px] sm:text-[9px] uppercase tracking-widest font-black"
                        title="Delete this fee group for all students"
                      >
                        <Trash2 size={11} /> Delete Fee Group
                      </button>
                    </td>
                    <td className="px-6 py-3 text-amber-500">₱{c.amount.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-slate-550">{c.count} Students</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Statement of Account Modal */}
      <Dialog open={showSoaModal} onOpenChange={setShowSoaModal}>
        <DialogContent className={`max-w-2xl rounded-3xl ${isDarkMode ? 'bg-slate-950 border-slate-900 text-white' : 'bg-white text-slate-900'}`}>
          {loadingDetails || !soaDetails ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Loading Statement...</span>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-dashed border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-blue-600">Statement of Account</h3>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{soaDetails.student.last_name}, {soaDetails.student.first_name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">LRN: {soaDetails.student.lrn} | Strand: {soaDetails.student.strand}-{soaDetails.student.grade_level}</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">Active SY</span>
                  <p className="text-xs font-black">{soaDetails.student.school_year}</p>
                </div>
              </div>

              {/* Balances Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Charged</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white mt-1">₱{soaDetails.totalFees.toLocaleString()}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Deducted</span>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">₱{(soaDetails.voucherDiscount + soaDetails.confirmedPayments).toLocaleString()}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Remaining Due</span>
                  <p className={`text-lg font-black mt-1 ${soaDetails.remainingBalance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    ₱{soaDetails.remainingBalance.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Statement Breakdown Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    <FileText size={12} /> Transaction History
                  </p>
                  {soaDetails.payments.length > 0 && (
                    <Button 
                      onClick={() => handleClearStudentPayments(soaDetails.student.id)} 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 rounded-lg text-red-500 hover:text-red-750 hover:bg-red-500/10 font-black uppercase text-[8px] tracking-widest gap-1.5"
                    >
                      <Trash2 size={12} /> Clear Payments
                    </Button>
                  )}
                </div>
                
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs font-bold">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100/50 dark:bg-slate-900/50 text-[9px] uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-4 py-2">Item</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2 text-right">Debit (+)</th>
                        <th className="px-4 py-2 text-right">Credit (-)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Tuition */}
                      <tr className="border-b border-slate-100 dark:border-slate-900">
                        <td className="px-4 py-2.5">School Tuition Fee</td>
                        <td className="px-4 py-2.5 text-slate-400">Initial</td>
                        <td className="px-4 py-2.5 text-right">₱{soaDetails.tuition.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right">-</td>
                      </tr>
                      {/* Voucher Discount */}
                      {soaDetails.voucherDiscount > 0 && (
                        <tr className="border-b border-slate-100 dark:border-slate-900 bg-emerald-500/5">
                          <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-400">Voucher Discount</td>
                          <td className="px-4 py-2.5 text-slate-400">Verification</td>
                          <td className="px-4 py-2.5 text-right">-</td>
                          <td className="px-4 py-2.5 text-right text-emerald-600 dark:text-emerald-400">₱{soaDetails.voucherDiscount.toLocaleString()}</td>
                        </tr>
                      )}
                      {/* Custom charges */}
                      {soaDetails.customFees.map((f: any) => (
                        <tr key={f.id} className="border-b border-slate-100 dark:border-slate-900">
                          <td className="px-4 py-2.5 flex items-center justify-between">
                            <span>{f.fee_name}</span>
                            <button
                              onClick={() => handleDeleteIndividualFee(f.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-500/10 transition-colors"
                              title="Remove this charge"
                            >
                              <X size={12} />
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-slate-400">{new Date(f.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-2.5 text-right text-amber-500">₱{f.amount.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right">-</td>
                        </tr>
                      ))}
                      {/* Payments */}
                      {soaDetails.payments.map((p: any) => (
                        <tr key={p.id} className={`border-b border-slate-100 dark:border-slate-900 ${p.status === 'confirmed' ? 'bg-blue-500/5' : 'opacity-50'}`}>
                          <td className="px-4 py-2.5">
                            {p.payee_type} Payment ({p.payment_method})
                            {p.status === 'pending' && <span className="ml-2 text-[7px] uppercase tracking-wider bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">Pending</span>}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400">{new Date(p.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-2.5 text-right">-</td>
                          <td className="px-4 py-2.5 text-right text-blue-500">₱{p.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Beautiful Confirm Dialog */}
      <Dialog open={confirmModal.isOpen} onOpenChange={(open) => setConfirmModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className={`max-w-md rounded-3xl ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white text-slate-900'}`}>
          <DialogHeader>
            <DialogTitle className="uppercase font-black tracking-wider text-base italic text-red-500">
              {confirmModal.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-3">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-405">
              {confirmModal.message}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 h-11 rounded-xl font-bold uppercase tracking-wider text-[10px]"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  await confirmModal.action()
                  setConfirmModal(prev => ({ ...prev, isOpen: false }))
                }}
                className="flex-1 h-11 rounded-xl font-bold uppercase tracking-wider text-[10px] bg-red-500 hover:bg-red-600 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
