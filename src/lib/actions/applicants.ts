"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

/**
 * 🔥 NUCLEAR OPTION: REDISTRIBUTE STUDENTS
 */
export async function redistributeStudents(strand: 'ICT' | 'GAS', gradeLevel?: '11' | '12') {
  const supabase = await createClient()

  try {
    console.log(`🚀 Starting redistribution for ${strand} GL${gradeLevel || 'all'}`)

    let sectionsQuery = supabase
      .from('sections')
      .select('id, section_name, capacity')
      .eq('strand', strand)
      .order('section_name', { ascending: true })

    if (gradeLevel) {
      sectionsQuery = sectionsQuery.eq('grade_level', gradeLevel) as any
    }

    const { data: sections, error: sectionsError } = await sectionsQuery

    if (sectionsError) throw sectionsError
    if (!sections || sections.length === 0) {
      throw new Error(`No sections found for ${strand}${gradeLevel ? ` G${gradeLevel}` : ''}`)
    }

    console.log(`📦 Found ${sections.length} sections:`, sections.map(s => `${s.section_name}(${s.capacity})`).join(', '))

    let studentsQuery = supabase
      .from('students')
      .select('id, gender, first_name, last_name, is_locked, section_id')
      .eq('strand', strand)
      .in('status', ['Accepted', 'Approved'])
      .order('created_at', { ascending: true })

    if (gradeLevel) {
      studentsQuery = studentsQuery.eq('grade_level', gradeLevel) as any
    }

    const { data: students, error: studentsError } = await studentsQuery

    if (studentsError) throw studentsError
    if (!students || students.length === 0) {
      console.log('✅ No students to redistribute')
      return { success: true, message: 'No students to redistribute' }
    }

    // Separate locked and unlocked students
    const lockedStudents = students.filter(s => s.is_locked && s.section_id)
    const unlockedStudents = students.filter(s => !s.is_locked || !s.section_id)

    console.log(`👥 Found ${students.length} students. Locked: ${lockedStudents.length}, Unlocked: ${unlockedStudents.length}`)

    console.log('🗑️ Unassigning unlocked students...')
    const { error: unassignError } = await supabase
      .from('students')
      .update({ section_id: null, section: 'Unassigned' })
      .eq('strand', strand)
      .in('status', ['Accepted', 'Approved'])
      .eq('is_locked', false) // Only unassign unlocked students

    if (unassignError) throw unassignError
    console.log('✅ All students unassigned')

    const plan: Array<{ student: typeof students[0], section: typeof sections[0] }> = []
    
    const males = unlockedStudents.filter(s => s.gender === 'Male')
    const females = unlockedStudents.filter(s => s.gender === 'Female')
    
    console.log(`📋 Males: ${males.length}, Females: ${females.length}`)

    // Initialize tracker with locked students pre-filled
    const sectionTracker = sections.map(s => {
      const lockedInThisSection = lockedStudents.filter(ls => ls.section_id === s.id)
      const lockedMales = lockedInThisSection.filter(ls => ls.gender === 'Male').length
      const lockedFemales = lockedInThisSection.filter(ls => ls.gender === 'Female').length
      
      return {
        section: s,
        males: lockedMales,
        females: lockedFemales,
        total: lockedMales + lockedFemales,
        lockedCount: lockedInThisSection.length
      }
    })

    let maleIdx = 0
    let femaleIdx = 0
    let sectionIdx = 0

    while (maleIdx < males.length || femaleIdx < females.length) {
      let foundSection = false
      
      for (let i = 0; i < sectionTracker.length; i++) {
        const currentSectionIdx = (sectionIdx + i) % sectionTracker.length
        const tracker = sectionTracker[currentSectionIdx]
        
        if (tracker.total >= tracker.section.capacity) continue
        
        const capacity = Number(tracker.section.capacity)
        const halfCap = Math.floor(capacity / 2)
        const isEven = capacity % 2 === 0
        
        let maxM = halfCap
        let maxF = halfCap
        
        if (!isEven) {
          if (tracker.males === 0 && tracker.females === 0) {
            if (maleIdx < males.length) {
              maxM = halfCap + 1
              maxF = halfCap
            } else {
              maxM = halfCap
              maxF = halfCap + 1
            }
          } else if (tracker.males > tracker.females) {
            maxM = halfCap + 1
            maxF = halfCap
          } else if (tracker.females > tracker.males) {
            maxM = halfCap
            maxF = halfCap + 1
          } else {
            if (maleIdx < males.length) {
              maxM = halfCap + 1
              maxF = halfCap
            } else {
              maxM = halfCap
              maxF = halfCap + 1
            }
          }
        }
        
        let added = false
        
        if (maleIdx < males.length && tracker.males < maxM) {
          plan.push({ student: males[maleIdx], section: tracker.section })
          tracker.males++
          tracker.total++
          maleIdx++
          added = true
          console.log(`  ➕ ${tracker.section.section_name}: Added Male (${tracker.males}M/${tracker.females}F = ${tracker.total}/)`)
        }
        else if (femaleIdx < females.length && tracker.females < maxF) {
          plan.push({ student: females[femaleIdx], section: tracker.section })
          tracker.females++
          tracker.total++
          femaleIdx++
          added = true
          console.log(`  ➕ ${tracker.section.section_name}: Added Female (${tracker.males}M/${tracker.females}F = ${tracker.total}/)`)
        }
        
        if (added) {
          sectionIdx = currentSectionIdx
          foundSection = true
          break
        }
      }
      
      if (!foundSection) {
        console.log('⚠️ No more space in any section!')
        break
      }
    }

    console.log(`📊 Assignment plan created: ${plan.length} assignments`)
    console.log(`💾 Writing ${plan.length} assignments to database...`)
    
    const chunkSize = 50
    for (let i = 0; i < plan.length; i += chunkSize) {
      const chunk = plan.slice(i, i + chunkSize)
      await Promise.all(chunk.map(({ student, section }) => 
        supabase
          .from('students')
          .update({ section_id: section.id, section: section.section_name })
          .eq('id', student.id)
      ))
    }

    console.log('✅ All assignments written')
    console.log('\n📈 FINAL DISTRIBUTION:')
    sectionTracker.forEach(t => {
      if (t.total > 0) {
        console.log(`  ${t.section.section_name}: ${t.males}M/${t.females}F = ${t.total}/${t.section.capacity}`)
      }
    })

    revalidatePath("/admin/applicants")
    revalidatePath("/admin/dashboard")
    revalidatePath("/admin/sections")

    const unassigned = students.length - plan.length
    const summary = sectionTracker
      .filter(t => t.total > 0)
      .map(t => `${t.section.section_name}: ${t.males}M/${t.females}F`)
      .join(' | ')

    return { 
      success: true, 
      message: `Redistributed ${plan.length}/${students.length} students${unassigned > 0 ? ` ( unassigned - need more capacity)` : ''} | `
    }

  } catch (error: any) {
    console.error("🔥 REDISTRIBUTION FAILED:", error)
    throw error
  }
}

export async function updateSectionCapacity(sectionId: string, newCapacity: number) {
  const supabase = await createClient()

  const { data: section } = await supabase
    .from('sections')
    .select('strand')
    .eq('id', sectionId)
    .single()

  if (!section) throw new Error('Section not found')

  const { error } = await supabase
    .from('sections')
    .update({ capacity: newCapacity })
    .eq('id', sectionId)

  if (error) throw error

  await redistributeStudents(section.strand)
  
  return { success: true }
}

export async function updateAllSectionCapacities(strand: 'ICT' | 'GAS', newCapacity: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('sections')
    .update({ capacity: newCapacity })
    .eq('strand', strand)

  if (error) throw error

  await redistributeStudents(strand)
  
  return { success: true }
}

export async function updateStudentSection(id: string, sectionId: string) {
  const supabase = await createClient()

  const { data: section } = await supabase
    .from('sections')
    .select('section_name')
    .eq('id', sectionId)
    .single()
  
  const { error } = await supabase
    .from('students')
    .update({ 
      section_id: sectionId, 
      section: section?.section_name,
      updated_at: new Date().toISOString() // Critical: Marks student as recently modified for balancing priority
    })
    .eq('id', id)

  if (error) throw error

  revalidatePath("/admin/sections")
  return { success: true }
}

export async function deleteApplicant(id: string) {
  const supabase = await createClient()

  await supabase.from('activity_logs').delete().eq('student_id', id)
  
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id)

  if (error) throw error

  revalidatePath("/admin/applicants")
  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/sections") 
  
  return { success: true }
}

export async function updateApplicantStatus(id: string, newStatus: string, feedback?: string) {
  const supabase = await createClient()
  let sectionIdToAssign: string | null = null
  let sectionNameToAssign: string = 'Unassigned'
  
  const dbStatus = newStatus === "Accepted" ? "Approved" : newStatus

  if (dbStatus === "Approved") {
    const { data: student } = await supabase
      .from('students')
      .select('strand, gender, grade_level')
      .eq('id', id)
      .single()

    if (student) {
      const studentGradeLevel = student.grade_level || "11"
      // 1. Fetch sections and ALL students in this strand AND grade level in parallel
      const [sectionsRes, studentsRes] = await Promise.all([
        supabase
          .from('sections')
          .select('id, section_name, capacity')
          .eq('strand', student.strand)
          .eq('grade_level', studentGradeLevel)
          .order('section_name', { ascending: true }),
        supabase
          .from('students')
          .select('section_id, gender, grade_level')
          .eq('strand', student.strand)
          .eq('grade_level', studentGradeLevel)
          .eq('status', 'Approved')
          .not('section_id', 'is', null)
      ])

      const sections = sectionsRes.data || []
      const allStrandStudents = studentsRes.data || []

      if (sections.length > 0) {
        // 2. Build occupancy map in memory
        const occupancy: Record<string, { male: number, female: number }> = {}
        sections.forEach(s => occupancy[s.id] = { male: 0, female: 0 })
        
        allStrandStudents.forEach(s => {
          if (occupancy[s.section_id]) {
            if (s.gender === 'Male') occupancy[s.section_id].male++
            else occupancy[s.section_id].female++
          }
        })

        // 3. Find best section using in-memory data
        for (const sec of sections) {
          if (!sec.capacity || sec.capacity <= 0) continue

          const counts = occupancy[sec.id]
          const currentMale = counts.male
          const currentFemale = counts.female
          const totalInSection = currentMale + currentFemale

          if (totalInSection >= sec.capacity) continue

          const isEvenCapacity = sec.capacity % 2 === 0
          const halfCapacity = Math.floor(sec.capacity / 2)
          
          let maxMale: number, maxFemale: number
          
          if (isEvenCapacity) {
            maxMale = halfCapacity
            maxFemale = halfCapacity
          } else {
            if (currentMale === 0 && currentFemale === 0) {
              if (student.gender === 'Male') {
                maxMale = halfCapacity + 1
                maxFemale = halfCapacity
              } else {
                maxMale = halfCapacity
                maxFemale = halfCapacity + 1
              }
            } else if (currentMale > currentFemale) {
              maxMale = halfCapacity + 1
              maxFemale = halfCapacity
            } else if (currentFemale > currentMale) {
              maxMale = halfCapacity
              maxFemale = halfCapacity + 1
            } else {
              if (student.gender === 'Male') {
                maxMale = halfCapacity + 1
                maxFemale = halfCapacity
              } else {
                maxMale = halfCapacity
                maxFemale = halfCapacity + 1
              }
            }
          }

          const currentGenderCount = student.gender === 'Male' ? currentMale : currentFemale
          const maxForThisGender = student.gender === 'Male' ? maxMale : maxFemale

          if (currentGenderCount < maxForThisGender) {
            sectionIdToAssign = sec.id
            sectionNameToAssign = sec.section_name
            break
          }
        }
      }
    }
  } else {
    sectionIdToAssign = null
  }

  const { error } = await supabase
    .from('students')
    .update({ 
      status: dbStatus, 
      section_id: sectionIdToAssign,
      section: sectionNameToAssign,
      registrar_feedback: dbStatus === "Approved" ? null : (feedback || null)
    })
    .eq('id', id)

  if (error) throw error

  revalidatePath("/admin/applicants")
  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/sections") 
  revalidatePath("/admin/status") 
  
  return { 
    success: true,
    assignedSectionId: sectionIdToAssign,
    assignedSection: sectionNameToAssign
  }
}

/**
 * 🚀 OPTIMIZED BULK UPDATE - Processes students with intelligent section assignment
 */
export async function bulkUpdateApplicantStatus(ids: string[], newStatus: string, feedback?: string) {
  const supabase = await createClient()
  const dbStatus = newStatus === "Accepted" ? "Approved" : newStatus
  
  try {
    // Get all students being updated
    const { data: studentsToUpdate, error: fetchError } = await supabase
      .from('students')
      .select('id, strand, gender, grade_level')
      .in('id', ids)
    
    if (fetchError) throw fetchError
    if (!studentsToUpdate || studentsToUpdate.length === 0) return { success: false, results: [] }

    // Group by strand + grade_level for efficient section lookup
    type GroupKey = string // `${strand}:${gradeLevel}`
    const strandGroups: Record<GroupKey, typeof studentsToUpdate> = {}
    studentsToUpdate.forEach(s => {
      const gl = s.grade_level || "11"
      const key = `${s.strand}:${gl}`
      if (!strandGroups[key]) strandGroups[key] = []
      strandGroups[key].push(s)
    })

    const results: any[] = []
    const updatesBySection: Record<string, string[]> = {}
    const sectionNames: Record<string, string> = { 'null': 'Unassigned', 'Unassigned': 'Unassigned' }

    for (const [groupKey, students] of Object.entries(strandGroups)) {
      const [strand, gradeLevel] = groupKey.split(":")
      // Fetch sections and existing students for this strand+grade_level in parallel
      const [sectionsRes, existingStudentsRes] = await Promise.all([
        supabase
          .from('sections')
          .select('id, section_name, capacity')
          .eq('strand', strand)
          .eq('grade_level', gradeLevel)
          .order('section_name', { ascending: true }),
        supabase
          .from('students')
          .select('section_id, gender')
          .eq('strand', strand)
          .eq('grade_level', gradeLevel)
          .eq('status', 'Approved')
          .not('section_id', 'is', null)
      ])

      const sections = sectionsRes.data || []
      const existingStudents = existingStudentsRes.data || []

      // Build occupancy map
      const occupancy: Record<string, { male: number, female: number, total: number }> = {}
      sections.forEach(s => {
        occupancy[s.id] = { male: 0, female: 0, total: 0 }
        sectionNames[s.id] = s.section_name
      })
      
      existingStudents.forEach(s => {
        if (occupancy[s.section_id]) {
          if (s.gender === 'Male') occupancy[s.section_id].male++
          else occupancy[s.section_id].female++
          occupancy[s.section_id].total++
        }
      })

      // Assign students to sections
      for (const student of students) {
        let assignedId = 'null' // Represents unassigned/null in DB

        if (dbStatus === "Approved" && sections.length > 0) {
          // Find best section
          for (const sec of sections) {
            const occ = occupancy[sec.id]
            if (occ.total >= sec.capacity) continue

            const halfCapacity = Math.floor(sec.capacity / 2)
            const isEven = sec.capacity % 2 === 0

            let maxMale: number, maxFemale: number

            if (isEven) {
              maxMale = halfCapacity
              maxFemale = halfCapacity
            } else {
              if (occ.male === 0 && occ.female === 0) {
                if (student.gender === 'Male') {
                  maxMale = halfCapacity + 1
                  maxFemale = halfCapacity
                } else {
                  maxMale = halfCapacity
                  maxFemale = halfCapacity + 1
                }
              } else if (occ.male > occ.female) {
                maxMale = halfCapacity + 1
                maxFemale = halfCapacity
              } else if (occ.female > occ.male) {
                maxMale = halfCapacity
                maxFemale = halfCapacity + 1
              } else {
                if (student.gender === 'Male') {
                  maxMale = halfCapacity + 1
                  maxFemale = halfCapacity
                } else {
                  maxMale = halfCapacity
                  maxFemale = halfCapacity + 1
                }
              }
            }

            const currentGenderCount = student.gender === 'Male' ? occ.male : occ.female
            const maxForGender = student.gender === 'Male' ? maxMale : maxFemale

            if (currentGenderCount < maxForGender) {
              assignedId = sec.id
              
              // Update local tracking immediately
              if (student.gender === 'Male') occ.male++
              else occ.female++
              occ.total++
              
              break
            }
          }
        }

        // Group the update instead of executing it immediately
        if (!updatesBySection[assignedId]) updatesBySection[assignedId] = []
        updatesBySection[assignedId].push(student.id)

        results.push({
          id: student.id,
          success: true,
          assignedSectionId: assignedId === 'null' ? null : assignedId,
          assignedSection: sectionNames[assignedId]
        })
      }
    }

    // Execute batched updates (One query per section group)
    const updatePromises = Object.entries(updatesBySection).map(([secId, studentIds]) => {
      const payload: any = {
        status: dbStatus,
        registrar_feedback: dbStatus === "Approved" ? null : (feedback || null)
      }
      
      if (secId === 'null' || secId === 'Unassigned') {
        payload.section_id = null
        payload.section = 'Unassigned'
      } else {
        payload.section_id = secId
        payload.section = sectionNames[secId]
      }

      return supabase
        .from('students')
        .update(payload)
        .in('id', studentIds)
    })

    await Promise.all(updatePromises)

    revalidatePath("/admin/applicants")
    revalidatePath("/admin/dashboard")
    revalidatePath("/admin/sections")
    
    return { success: true, results }
  } catch (error) {
    console.error("Bulk update error:", error)
    throw error
  }
}

/**
 * 🚀 OPTIMIZED BULK DELETE
 */
export async function bulkDeleteApplicants(ids: string[]) {
  const supabase = await createClient()
  
  try {
    // Delete logs first
    await supabase.from('activity_logs').delete().in('student_id', ids)
    
    // Delete students
    const { error } = await supabase
      .from('students')
      .delete()
      .in('id', ids)

    if (error) throw error

    revalidatePath("/admin/applicants")
    revalidatePath("/admin/dashboard")
    revalidatePath("/admin/sections")
    
    return { success: true }
  } catch (error) {
    console.error("Bulk delete error:", error)
    throw error
  }
}
