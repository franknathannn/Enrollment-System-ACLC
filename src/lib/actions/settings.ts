"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * GET DETAILED SYSTEM STATUS
 * This is the "Bouncer" for your enrollment portal.
 * Checks Manual Switch + Opening Date + Closing Date + Capacity.
 */
export async function getEnrollmentStatus() {
  try {
    const supabase = createAdminClient()
    
    const { data: config, error } = await supabase
      .from('system_config')
      .select('*')
      .single()
    
    if (error || !config) {
      return { isOpen: false, reason: "System Configuration Missing", capacity: 1000, schoolYear: "2025-2026" };
    }

    const { count: approvedCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Approved');

    const now = new Date();
    const start = config.enrollment_start ? new Date(config.enrollment_start) : null;
    const end = config.enrollment_end ? new Date(config.enrollment_end) : null;

    const isManualMode = config.control_mode === 'manual';
    const isManualOpen = config.is_portal_active;
    const isPastStart = !start || now >= start;
    const isBeforeEnd = !end || now <= end;
    const isFull = (approvedCount || 0) >= config.capacity * 2;

    // In manual mode, respect only the portal toggle — dates are irrelevant
    const isOpen = isManualMode
      ? (isManualOpen && !isFull)
      : (isManualOpen && isPastStart && isBeforeEnd && !isFull);

    let reason = "Active";
    if (!isManualOpen) reason = "Manual Shutdown";
    else if (!isManualMode && !isPastStart) reason = "Enrollment Not Yet Started";
    else if (!isManualMode && !isBeforeEnd) reason = "Enrollment Period Over";
    else if (isFull) reason = "Capacity Reached";

    return { 
      isOpen,
      reason,
      closingTime: config.enrollment_end,
      openingTime: config.enrollment_start,
      capacity: config.capacity * 2,
      schoolYear: config.school_year,
      currentCount: approvedCount || 0,
      isFull
    };
  } catch (err) {
    console.error("🔥 Critical Settings Error:", err);
    return { isOpen: false, reason: "Connection Error", capacity: 1000 };
  }
}

/**
 * RE-EVALUATES SYSTEM CAPACITY AND TOGGLES PORTAL
 * Intended to be called whenever a student is Accepted, Rejected, or Deleted
 * to ensure the auto-lock/auto-unlock logic fires regardless of whether the settings page is open.
 */
export async function checkAndSyncSystemCapacity() {
  try {
    const supabase = createAdminClient()
    
    const { data: config, error } = await supabase
      .from('system_config')
      .select('*')
      .single()
      
    if (error || !config || config.close_portal_when_full === false) return;

    const { count: approvedCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .in('status', ['Approved', 'Accepted']);

    const capacityPercentage = approvedCount ? (approvedCount / (config.capacity || 750)) * 100 : 0;
    
    // Only auto-toggle in automatic mode — manual mode is admin-authoritative.
    if (config.is_portal_active && capacityPercentage >= 100 && config.control_mode === 'automatic') {
      await supabase.from('system_config').update({
        is_portal_active: false,
        updated_at: new Date().toISOString()
      }).eq('id', config.id);
      
      revalidatePath("/enroll")
      revalidatePath("/admin/configuration")
    } else if (!config.is_portal_active && capacityPercentage < 100 && config.control_mode === 'automatic') {
      // Only auto-reopen in automatic mode when within enrollment dates
      const now = new Date();
      let isWithinDate = true;
      if (config.enrollment_start) {
        const start = new Date(config.enrollment_start);
        if (now < start) isWithinDate = false;
      }
      if (config.enrollment_end) {
        const end = new Date(config.enrollment_end);
        if (now > end) isWithinDate = false;
      }
      
      if (isWithinDate) {
        await supabase.from('system_config').update({
          is_portal_active: true,
          updated_at: new Date().toISOString()
        }).eq('id', config.id);
        
        revalidatePath("/enroll")
        revalidatePath("/admin/configuration")
      }
    }
  } catch (err) {
    console.error("Auto Capacity Guardian Error:", err);
  }
}

/**
 * 🎯 STRICT SEQUENTIAL GENDER-BALANCED REDISTRIBUTION
 */
export async function syncSectionCapacities() {
  const supabase = createAdminClient()

  const { data: config } = await supabase
    .from('system_config')
    .select('capacity')
    .single()

  const globalLimit = config?.capacity || 1000

  const { data: sections } = await supabase
    .from('sections')
    .select('id, section_name, strand, grade_level, capacity')
    .order('section_name', { ascending: true })
    
  if (!sections || sections.length === 0) {
    return { success: false, error: "No sections found to synchronize." }
  }

  const g11Sections = sections.filter(s => s.grade_level === '11')
  const g12Sections = sections.filter(s => s.grade_level === '12')

  const g11Base = g11Sections.length > 0 ? Math.floor(globalLimit / g11Sections.length) : 0
  const g11Rem = g11Sections.length > 0 ? globalLimit % g11Sections.length : 0

  const g12Base = g12Sections.length > 0 ? Math.floor(globalLimit / g12Sections.length) : 0
  const g12Rem = g12Sections.length > 0 ? globalLimit % g12Sections.length : 0

  const sectionCapacities = sections.map((sec) => {
    let newCap = 0;
    if (sec.grade_level === '11') {
      const idx = g11Sections.findIndex(s => s.id === sec.id)
      newCap = idx < g11Rem ? g11Base + 1 : g11Base
    } else {
      const idx = g12Sections.findIndex(s => s.id === sec.id)
      newCap = idx < g12Rem ? g12Base + 1 : g12Base
    }
    return { ...sec, capacity: newCap }
  })

  // Update capacities in database
  const updatePromises = sectionCapacities.map(sec => 
    supabase.from('sections').update({ capacity: sec.capacity }).eq('id', sec.id)
  )
  
  try {
    await Promise.all(updatePromises)
    
    const gradeLevels = ['11', '12']
    const strands = ['ICT', 'GAS']
    const allUpdates: any[] = []
    
    for (const grade of gradeLevels) {
      for (const strand of strands) {
        const strandSections = sectionCapacities.filter(s => s.strand === strand && s.grade_level === grade)
        if (strandSections.length === 0) continue

        // Get all students for this grade and strand, sorted alphabetically
        const { data: students } = await supabase
          .from('students')
          .select('id, section_id, first_name, last_name, gender, is_locked')
          .eq('strand', strand)
          .eq('grade_level', grade)
          .in('status', ['Accepted', 'Approved'])
          .or('is_archived.is.null,is_archived.eq.false')
          .order('last_name', { ascending: true })
          .order('first_name', { ascending: true })

        if (!students || students.length === 0) continue

        // Separate locked and unlocked students
        const lockedStudents = students.filter(s => s.is_locked && s.section_id)
        const unlockedStudents = students.filter(s => !s.is_locked || !s.section_id)

        // Unassign unlocked students in this grade and strand first to handle shrinking
        await supabase.from('students')
          .update({ section_id: null, section: 'Unassigned' })
          .eq('strand', strand)
          .eq('grade_level', grade)
          .in('status', ['Accepted', 'Approved'])
          .eq('is_locked', false)

        // Separate by gender
        const males = unlockedStudents.filter(s => s.gender === 'Male')
        const females = unlockedStudents.filter(s => s.gender === 'Female')

        let maleIndex = 0
        let femaleIndex = 0
        
        // 🎯 STRICT SEQUENTIAL FILLING
        for (let i = 0; i < strandSections.length; i++) {
          const section = strandSections[i]
          const capacity = section.capacity
          
          // Start with locked students for this section
          const lockedInThisSection = lockedStudents.filter(s => s.section_id === section.id)
          const studentsForSection: typeof students = [...lockedInThisSection]

          // Calculate targets to avoid deadlock
          const halfCap = Math.floor(capacity / 2)
          const isOdd = capacity % 2 !== 0
          
          let maxM = halfCap
          let maxF = halfCap
          
          if (isOdd) {
              const malesLeft = males.length - maleIndex
              const femalesLeft = females.length - femaleIndex
              if (malesLeft >= femalesLeft) maxM++
              else maxF++
          }
          
          // Stop if no students left at all
          if (maleIndex >= males.length && femaleIndex >= females.length) break
          
          // 🔥 FILL THIS SECTION TO CAPACITY
          while (studentsForSection.length < capacity) {
            const currentMales = studentsForSection.filter(s => s.gender === 'Male').length
            const currentFemales = studentsForSection.filter(s => s.gender === 'Female').length
            
            const malesAvailable = maleIndex < males.length
            const femalesAvailable = femaleIndex < females.length
            
            if (!malesAvailable && !femalesAvailable) break
            
            const canAddMale = malesAvailable && currentMales < maxM
            const canAddFemale = femalesAvailable && currentFemales < maxF
            
            if (canAddMale && canAddFemale) {
              if (currentMales <= currentFemales) {
                studentsForSection.push(males[maleIndex++])
              } else {
                studentsForSection.push(females[femaleIndex++])
              }
            } else if (canAddMale) {
              studentsForSection.push(males[maleIndex++])
            } else if (canAddFemale) {
              studentsForSection.push(females[femaleIndex++])
            } else {
              break
            }
          }

          const idsToUpdate = studentsForSection.filter(s => !s.is_locked).map(s => s.id)
          if (idsToUpdate.length > 0) {
            allUpdates.push({
              section_id: section.id,
              section: section.section_name,
              ids: idsToUpdate
            })
          }
          
          // Log for debugging
          const mCount = studentsForSection.filter(s => s.gender === 'Male').length
          const fCount = studentsForSection.filter(s => s.gender === 'Female').length
          console.log(`✅ ${section.section_name}: ${mCount}M/${fCount}F (${studentsForSection.length}/${capacity})`)
        }
      }
    }

    // 🚀 BATCH UPDATE: Process by section instead of individual students
    if (allUpdates.length > 0) {
      const updatePromises = []
      for (const update of allUpdates) {
        const chunkSize = 500
        for (let i = 0; i < update.ids.length; i += chunkSize) {
          const chunkIds = update.ids.slice(i, i + chunkSize)
          updatePromises.push(
            supabase
              .from('students')
              .update({ section_id: update.section_id, section: update.section })
              .in('id', chunkIds)
          )
        }
      }
      await Promise.all(updatePromises)
    }

    revalidatePath("/admin/sections")
    revalidatePath("/admin/dashboard")
    revalidatePath("/admin/configuration")
    
    return { success: true }
  } catch (error) {
    console.error("Sync Error:", error)
    return { success: false, error: "Failed to update sections." }
  }
}

/**
 * FORCE SYNC
 */
export async function forceSyncCapacities() {
  try {
    await syncSectionCapacities()
    return { success: true }
  } catch (error) {
    console.error("Manual Sync Failed:", error)
    return { success: false }
  }
}

/**
 * UPDATE ENROLLMENT CAPACITY
 */
export async function updateCapacity(newCapacity: number) {
  if (newCapacity < 50) {
    throw new Error("Enrollment capacity cannot be lower than 50 students.");
  }

  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from('system_config')
    .update({ 
      capacity: Math.abs(newCapacity),
      updated_at: new Date().toISOString() 
    })
    .not('id', 'is', null)

  if (error) throw new Error(error.message);

  await syncSectionCapacities()
  
  revalidatePath("/enroll")
  revalidatePath("/admin/configuration")
  revalidatePath("/admin/dashboard")
  
  return { success: true }
}

/**
 * TOGGLE STATUS (Manual Switch)
 */
export async function toggleEnrollment(status: boolean) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('system_config')
    .update({ is_portal_active: status, updated_at: new Date().toISOString() })
    .not('id', 'is', null)

  if (error) throw new Error(error.message)
  
  revalidatePath("/enroll") 
  revalidatePath("/") 
  return { success: true }
}

/**
 * SCHOOL YEAR ROLLOVER AND GRADE 12 PROMOTION
 */
export async function rolloverToGrade12(): Promise<{
  success: boolean
  promoted: number
  overAge: number
  error?: string
}> {
  try {
    const supabase = createAdminClient()

    // Get current school year from config
    const { data: config } = await supabase
      .from('system_config')
      .select('school_year')
      .single()

    if (!config?.school_year) {
      return { success: false, promoted: 0, overAge: 0, error: 'No school year configured.' }
    }

    const currentSYStart = parseInt(config.school_year.split('-')[0])

    // Fetch all Approved/Accepted G11 students
    const { data: students, error: fetchErr } = await supabase
      .from('students')
      .select('id, school_year, grade_level')
      .in('status', ['Approved', 'Accepted'])
      .eq('grade_level', '11')
      .neq('mock', true)

    if (fetchErr) throw fetchErr

    // 1. Fetch current Grade 11 sections
    const { data: g11Secs } = await supabase
      .from('sections')
      .select('section_name, strand, capacity')
      .eq('grade_level', '11')

    // 2. Auto-create matching Grade 12 sections if they do not exist
    if (g11Secs && g11Secs.length > 0) {
      for (const g11Sec of g11Secs) {
        const g12Name = g11Sec.section_name.replace('11', '12')
        
        const { count } = await supabase
          .from('sections')
          .select('*', { count: 'exact', head: true })
          .eq('section_name', g12Name)

        if (count === 0) {
          await supabase.from('sections').insert([{
            section_name: g12Name,
            strand: g11Sec.strand,
            grade_level: '12',
            capacity: g11Sec.capacity
          }])
        }
      }
    }

    const toPromote: string[] = []
    let overAge = 0

    for (const s of (students || [])) {
      const studentSYStart = s.school_year ? parseInt(s.school_year.split('-')[0]) : null
      
      if (studentSYStart === null) {
        toPromote.push(s.id)
        continue
      }

      const yearDiff = currentSYStart - studentSYStart

      if (yearDiff >= 2) {
        overAge++
      } else {
        toPromote.push(s.id)
      }
    }

    // Promote G11 -> G12 in batches
    if (toPromote.length > 0) {
      const chunkSize = 50
      for (let i = 0; i < toPromote.length; i += chunkSize) {
        const chunk = toPromote.slice(i, i + chunkSize)
        const { error: updateErr } = await supabase
          .from('students')
          .update({
            grade_level: '12',
            section_id: null,
            section: 'Unassigned',
          })
          .in('id', chunk)
        if (updateErr) throw updateErr
      }
    }

    // 3. Automatically run syncSectionCapacities to assign students to Grade 12 sections
    await syncSectionCapacities()

    revalidatePath('/admin/sections')
    revalidatePath('/admin/applicants')
    revalidatePath('/admin/enrolled')
    revalidatePath('/admin/dashboard')

    return { success: true, promoted: toPromote.length, overAge }
  } catch (err: any) {
    console.error('Rollover Error:', err)
    return { success: false, promoted: 0, overAge: 0, error: err?.message || 'Unknown error' }
  }
}
