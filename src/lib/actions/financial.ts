"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * GET TUITION FEE
 */
export async function getTuitionFee() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('system_config')
      .select('tuition_fee')
      .single()
    if (error) throw error
    return data?.tuition_fee ?? 22500
  } catch (err) {
    console.error("Error getting tuition:", err)
    return 22500
  }
}

/**
 * UPDATE TUITION FEE
 */
export async function updateTuitionFee(amount: number) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('system_config')
      .update({ tuition_fee: amount })
      .not('id', 'is', null) // target the single row
    if (error) throw error
    revalidatePath("/admin/financial")
    return { success: true }
  } catch (err: any) {
    console.error("Error updating tuition:", err)
    return { success: false, error: err.message }
  }
}

/**
 * GET ALL STUDENT BALANCES (For Admin Dashboard)
 */
export async function getStudentBalances() {
  try {
    const supabase = createAdminClient()
    
    // Fetch all active/approved students
    const { data: students, error: stdErr } = await supabase
      .from('students')
      .select('id, first_name, last_name, lrn, strand, grade_level, school_year, student_category, voucher_status, is_payee, two_by_two_url')
      .in('status', ['Accepted', 'Approved'])
    
    if (stdErr) throw stdErr

    // Fetch school tuition
    const tuition = await getTuitionFee()

    // Fetch all voucher ledger entries
    const { data: ledger, error: ledErr } = await supabase
      .from('voucher_ledger')
      .select('student_id, voucher_amount')
    if (ledErr) throw ledErr

    // Fetch all confirmed payments
    const { data: payments, error: payErr } = await supabase
      .from('payments')
      .select('student_id, amount')
      .eq('status', 'confirmed')
    if (payErr) throw payErr

    // Fetch all custom balances (additional fees)
    const { data: customFees, error: feeErr } = await supabase
      .from('student_balances')
      .select('student_id, amount')
    if (feeErr) throw feeErr

    // Map everything
    const balanceList = (students || []).map(student => {
      const studentLedgers = (ledger || []).filter(l => l.student_id === student.id)
      const voucherAmount = studentLedgers.reduce((acc, curr) => acc + (curr.voucher_amount || 0), 0)

      const studentPayments = (payments || []).filter(p => p.student_id === student.id)
      const totalPayments = studentPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0)

      const studentFees = (customFees || []).filter(f => f.student_id === student.id)
      const totalCustomFees = studentFees.reduce((acc, curr) => acc + (curr.amount || 0), 0)

      // If they are a payee, their voucher discount is 0 (handled by DB trigger too, but enforced here)
      const discount = student.is_payee ? 0 : voucherAmount

      const balance = (tuition + totalCustomFees) - (discount + totalPayments)

      return {
        ...student,
        tuition,
        totalCustomFees,
        voucherDiscount: discount,
        totalPayments,
        balance,
      }
    })

    return { success: true, balances: balanceList }
  } catch (err: any) {
    console.error("Error getting student balances:", err)
    return { success: false, error: err.message, balances: [] }
  }
}

/**
 * ADD CUSTOM CHARGE / ADDITIONAL FEE (Graduation fee, venue fee, etc.)
 */
export async function addCustomCharge(
  studentId: string | null, 
  feeName: string, 
  amount: number, 
  criteria?: { gradeLevel?: string; strand?: string }
) {
  try {
    const supabase = createAdminClient()
    
    // Get active school year
    const { data: config } = await supabase.from('system_config').select('school_year').single()
    const activeSY = config?.school_year ?? '2027-2028'

    if (studentId) {
      // Individual student charge
      const { error } = await supabase
        .from('student_balances')
        .insert({
          student_id: studentId,
          fee_name: feeName,
          amount: amount,
          school_year: activeSY
        })
      if (error) throw error
    } else if (criteria) {
      // Bulk charge based on gradeLevel and/or strand
      let query = supabase
        .from('students')
        .select('id')
        .in('status', ['Accepted', 'Approved'])

      if (criteria.gradeLevel) query = query.eq('grade_level', criteria.gradeLevel)
      if (criteria.strand) query = query.eq('strand', criteria.strand)

      const { data: students, error: stdErr } = await query
      if (stdErr) throw stdErr

      if (students && students.length > 0) {
        const rows = students.map(s => ({
          student_id: s.id,
          fee_name: feeName,
          amount: amount,
          school_year: activeSY
        }))

        // Insert in chunks of 200
        const CHUNK = 200
        for (let i = 0; i < rows.length; i += CHUNK) {
          const { error: insErr } = await supabase
            .from('student_balances')
            .insert(rows.slice(i, i + CHUNK))
          if (insErr) throw insErr
        }
      }
    }

    revalidatePath("/admin/financial")
    return { success: true }
  } catch (err: any) {
    console.error("Error adding custom charge:", err)
    return { success: false, error: err.message }
  }
}

/**
 * GET STATEMENT OF ACCOUNT DETAILS (Single Student)
 */
export async function getStudentBalanceDetails(studentId: string) {
  try {
    const supabase = createAdminClient()
    
    // Fetch student info
    const { data: student, error: stdErr } = await supabase
      .from('students')
      .select('id, first_name, last_name, lrn, strand, grade_level, school_year, is_payee')
      .eq('id', studentId)
      .single()
    if (stdErr) throw stdErr

    // Fetch tuition fee
    const tuition = await getTuitionFee()

    // Fetch voucher amount from ledger
    const { data: ledger } = await supabase
      .from('voucher_ledger')
      .select('voucher_amount')
      .eq('student_id', studentId)
    const voucherDiscount = student.is_payee ? 0 : (ledger || []).reduce((acc, curr) => acc + (curr.voucher_amount || 0), 0)

    // Fetch payments
    const { data: payments } = await supabase
      .from('payments')
      .select('id, payee_type, amount, payment_method, status, reference_no, created_at')
      .eq('student_id', studentId)

    // Fetch custom fees
    const { data: customFees } = await supabase
      .from('student_balances')
      .select('id, fee_name, amount, created_at')
      .eq('student_id', studentId)

    const totalFees = tuition + (customFees || []).reduce((acc, curr) => acc + curr.amount, 0)
    const confirmedPayments = (payments || []).filter(p => p.status === 'confirmed').reduce((acc, curr) => acc + curr.amount, 0)
    const pendingPayments = (payments || []).filter(p => p.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0)
    const remainingBalance = totalFees - (voucherDiscount + confirmedPayments)

    return {
      success: true,
      data: {
        student,
        tuition,
        voucherDiscount,
        payments: payments || [],
        customFees: customFees || [],
        totalFees,
        confirmedPayments,
        pendingPayments,
        remainingBalance
      }
    }
  } catch (err: any) {
    console.error("Error getting balance details:", err)
    return { success: false, error: err.message }
  }
}

/**
 * RECORD MANUAL CASH PAYMENT (Guardian / Self-pay)
 */
export async function recordCashPayment(studentId: string, amount: number, payeeType: 'Guardian' | 'Self-pay', method: string = 'Cash') {
  try {
    const supabase = createAdminClient()
    
    // Get active school year
    const { data: config } = await supabase.from('system_config').select('school_year').single()
    const activeSY = config?.school_year ?? '2027-2028'

    const { error } = await supabase
      .from('payments')
      .insert({
        student_id: studentId,
        school_year: activeSY,
        payee_type: payeeType,
        amount: amount,
        payment_method: method,
        status: 'confirmed',
        reference_no: 'CASH-' + Math.random().toString(36).substr(2, 9).toUpperCase()
      })

    if (error) throw error
    revalidatePath("/admin/financial")
    return { success: true }
  } catch (err: any) {
    console.error("Error recording cash payment:", err)
    return { success: false, error: err.message }
  }
}

/**
 * GET UNIQUE CUSTOM CHARGES FOR THE SYSTEM
 */
export async function getUniqueCustomCharges() {
  try {
    const supabase = createAdminClient()
    const { data: config } = await supabase.from('system_config').select('school_year').single()
    const activeSY = config?.school_year ?? '2027-2028'

    const { data, error } = await supabase
      .from('student_balances')
      .select('fee_name, amount, school_year, created_at')
      .eq('school_year', activeSY)
      .order('created_at', { ascending: false })
    
    if (error) throw error

    // Group by fee_name and amount to show them uniquely
    const uniqueMap: { [key: string]: { fee_name: string; amount: number; created_at: string; count: number } } = {}
    
    ;(data || []).forEach((row: any) => {
      const key = `${row.fee_name}-${row.amount}`
      if (!uniqueMap[key]) {
        uniqueMap[key] = {
          fee_name: row.fee_name,
          amount: row.amount,
          created_at: row.created_at,
          count: 0
        }
      }
      uniqueMap[key].count++
    })

    return { success: true, charges: Object.values(uniqueMap) }
  } catch (err: any) {
    console.error("Error getting unique charges:", err)
    return { success: false, error: err.message, charges: [] }
  }
}
