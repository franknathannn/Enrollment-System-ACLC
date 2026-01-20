"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { syncSectionCapacities } from "./settings"

/**
 * ADD SECTION (Sequential Logic)
 * Automatically determines the next letter (e.g., E -> F)
 */
export async function addSection(strand: "ICT" | "GAS") {
  const supabase = await createClient()

  // 1. Fetch ALL sections to determine the next letter accurately (Robust against gaps/sorting issues)
  const { data: sections } = await supabase
    .from('sections')
    .select('section_name')
    .eq('strand', strand)

  // Extract existing suffixes (e.g., 'A', 'B')
  const existingSuffixes = new Set<string>()
  if (sections) {
    sections.forEach(sec => {
      // Assuming format "STRAND11-X"
      const parts = sec.section_name.split('-')
      if (parts.length > 1) {
        const suffix = parts[parts.length - 1]
        // Only consider single uppercase letters to avoid confusion with other formats
        if (suffix.length === 1 && /[A-Z]/.test(suffix)) {
          existingSuffixes.add(suffix)
        }
      }
    })
  }

  let nextChar = 'A'
  if (existingSuffixes.size > 0) {
    // Find the max char code used
    const maxCode = Array.from(existingSuffixes)
      .map(s => s.charCodeAt(0))
      .reduce((a, b) => Math.max(a, b), 0)
    
    nextChar = String.fromCharCode(maxCode + 1)
  }

  // 2. Collision detection loop (Safety net against race conditions or manual DB edits)
  let newName = `${strand}11-${nextChar}`
  let attempts = 0
  
  while (attempts < 10) {
    const { count } = await supabase
      .from('sections')
      .select('*', { count: 'exact', head: true })
      .eq('section_name', newName)
    
    if (count === 0) break // Unique name found

    // Increment char if collision
    nextChar = String.fromCharCode(nextChar.charCodeAt(0) + 1)
    newName = `${strand}11-${nextChar}`
    attempts++
  }

  if (attempts >= 10) {
    throw new Error("Failed to generate a unique section name after multiple attempts.")
  }

  // 3. Create the section
  const { data, error } = await supabase
    .from('sections')
    .insert([{
      section_name: newName,
      strand: strand,
      capacity: 0 
    }])
    .select()
    .single()

  if (error) throw new Error(error.message)

  // 4. Sync capacities
  await syncSectionCapacities()
  
  revalidatePath("/admin/sections")
  return { success: true, data }
}

/**
 * DELETE & COLLAPSE (Sequential Shift Logic)
 * If B is deleted, C becomes B, D becomes C, and students follow the move.
 */
export async function deleteAndCollapseSection(sectionId: string, strand: "ICT" | "GAS") {
  const supabase = await createClient()

  // 1. Get all sections for this strand ordered A-Z
  const { data: allSections } = await supabase
    .from('sections')
    .select('id, section_name')
    .eq('strand', strand)
    .order('section_name', { ascending: true })

  if (!allSections || allSections.length === 0) return

  const targetIndex = allSections.findIndex(s => s.id === sectionId)
  if (targetIndex === -1) return

  // 2. Handle the "Shift": Move students from subsequent sections up
  // Example: If deleting B, move students from C -> B, D -> C...
  for (let i = targetIndex; i < allSections.length - 1; i++) {
    const currentSectionId = allSections[i].id
    const nextSectionId = allSections[i + 1].id

    // Move students from the NEXT section into the CURRENT section ID
    const { error: moveError } = await supabase
      .from('students')
      .update({ 
        section_id: currentSectionId,
        section: allSections[i].section_name
      })
      .eq('section_id', nextSectionId)

    if (moveError) console.error(`Error shifting students to ${allSections[i].section_name}:`, moveError.message)
  }

  // 3. Delete the LAST section in the list (since it's now empty after the shift)
  const lastSection = allSections[allSections.length - 1]
  const { error: deleteError } = await supabase
    .from('sections')
    .delete()
    .eq('id', lastSection.id)

  if (deleteError) throw new Error(deleteError.message)

  // 4. Final Sync: Recalculate capacities for the new total count
  await syncSectionCapacities()
  
  revalidatePath("/admin/sections")
  revalidatePath("/admin/dashboard")
  return { success: true }
}

/**
 * GENDER BALANCE (Strict Sequential Logic)
 * Re-balances students across existing sections of a strand to maintain gender balance.
 * Prioritizes keeping students in their current sections by processing recently updated students last.
 */
export async function balanceGenderAcrossSections(strand: 'ICT' | 'GAS' | 'ALL') {
  if (strand === 'ALL') {
    await balanceGenderAcrossSections('ICT')
    await balanceGenderAcrossSections('GAS')
    return { success: true, message: "Re-balanced ALL sections." }
  }

  const supabase = await createClient()

  try {
    console.log(`⚖️ Starting gender balancing for ${strand}`)

    const { data: sections, error: sectionsError } = await supabase
      .from('sections')
      .select('id, section_name, capacity')
      .eq('strand', strand)
      .order('section_name', { ascending: true })

    if (sectionsError) throw sectionsError
    if (!sections || sections.length === 0) {
      console.log(`No sections for ${strand} to balance.`)
      return { success: true, message: `No sections for ${strand} to balance.` }
    }

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, gender, first_name, last_name, section_id, is_locked')
      .eq('strand', strand)
      .in('status', ['Accepted', 'Approved'])
      // Sort by updated_at ASC so recently modified students (switched) are at the end
      .order('updated_at', { ascending: true }) 

    if (studentsError) throw studentsError
    if (!students || students.length === 0) {
      console.log('✅ No students to balance.')
      return { success: true, message: 'No students to balance.' }
    }

    // Separate locked and unlocked students
    const lockedStudents = students.filter(s => s.is_locked && s.section_id)
    const unlockedStudents = students.filter(s => !s.is_locked || !s.section_id)

    console.log('🗑️ Unassigning unlocked students for re-balancing...')
    await supabase
      .from('students')
      .update({ section_id: null, section: 'Unassigned' })
      .eq('strand', strand)
      .in('status', ['Accepted', 'Approved'])
      .eq('is_locked', false) // Only unassign unlocked students

    const males = unlockedStudents.filter(s => s.gender === 'Male')
    const females = unlockedStudents.filter(s => s.gender === 'Female')
    let maleIndex = 0
    let femaleIndex = 0

    const updates: { id: string; section_id: string; section: string }[] = []

    for (const section of sections) {
      const capacity = section.capacity
      
      // Count locked students already in this section
      const lockedInThisSection = lockedStudents.filter(s => s.section_id === section.id)
      let sectionMales = lockedInThisSection.filter(s => s.gender === 'Male').length
      let sectionFemales = lockedInThisSection.filter(s => s.gender === 'Female').length

      while (sectionMales + sectionFemales < capacity) {
        const maleTarget = Math.ceil((sectionMales + sectionFemales + 1) / 2)
        const femaleTarget = Math.floor((sectionMales + sectionFemales + 1) / 2)

        if (maleIndex < males.length && (sectionMales < maleTarget || femaleIndex >= females.length)) {
          updates.push({ id: males[maleIndex].id, section_id: section.id, section: section.section_name })
          sectionMales++
          maleIndex++
        } else if (femaleIndex < females.length && (sectionFemales < femaleTarget || maleIndex >= males.length)) {
          updates.push({ id: females[femaleIndex].id, section_id: section.id, section: section.section_name })
          sectionFemales++
          femaleIndex++
        } else {
          break // No more students can be added
        }
      }
    }

    // Batch update students
    for (const update of updates) {
      await supabase.from('students').update({ section_id: update.section_id, section: update.section }).eq('id', update.id)
    }

    revalidatePath("/admin/sections")
    return { success: true, message: `Re-balanced  sections.` }
  } catch (error: any) {
    console.error(`🔥 GENDER BALANCE FAILED for ${strand}:`, error)
    throw error
  }
}

/**
 * DELETE SECTION (Old Version - Kept for compatibility if needed elsewhere)
 */
export async function deleteSection(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('sections').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await syncSectionCapacities()
  revalidatePath("/admin/sections")
  return { success: true }
}
