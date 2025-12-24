"use server"

import { supabase } from "@/lib/supabase/client"

export async function getDashboardStats() {
  try {
    // Fetch all required counts in parallel for better performance
    const [
      { count: totalAccepted },
      { count: ictAccepted },
      { count: gasAccepted },
      { count: pending },
      { count: declinedTotal },
      { count: ictDeclined },
      { count: gasDeclined },
      { count: males },   // New Query
      { count: females }  // New Query
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'Approved'),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'Approved').eq('strand', 'ICT'),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'Approved').eq('strand', 'GAS'),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'Rejected'),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'Rejected').eq('strand', 'ICT'),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'Rejected').eq('strand', 'GAS'),
      // The census logic:
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'Approved').eq('gender', 'Male'),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'Approved').eq('gender', 'Female'),
    ])

    return {
      totalAccepted,
      ictAccepted,
      gasAccepted,
      pending,
      declinedTotal,
      ictDeclined,
      gasDeclined,
      males,
      females
    }
  } catch (error) {
    console.error("Dashboard Stats Error:", error)
    return null
  }
}