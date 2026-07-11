"use client"

import { useState, useEffect, useMemo } from "react"
import { Save, Loader2, Check, Copy, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase/admin-client"
import { toast } from "sonner"

export function SubjectManagerModal({ isOpen, onClose, section, isDarkMode, schoolYear, allSections }: any) {
  const [masterSubjects, setMasterSubjects] = useState<any[]>([])
  const [selectedForEnrollment, setSelectedForEnrollment] = useState<string[]>([])
  const [initialSubjects, setInitialSubjects] = useState<string[]>([])
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [students, setStudents] = useState<any[]>([])

  useEffect(() => {
    if (!isOpen || !section) return
    
    async function initData() {
      setLoading(true)
      
      // Fetch master subjects matching strand
      const { data: subData } = await supabase.from('subjects').select('*').order('type', { ascending: true })
      if (subData) {
        const filtered = subData.filter(s => {
          if (s.type === 'Core' || s.type === 'Applied') return true
          if (section.strand && s.type.includes(`Specialized`) && s.type.includes(section.strand)) return true
          if (!section.strand) return true 
          return false
        })
        setMasterSubjects(filtered)
      }

      // Fetch currently enrolled subjects
      const { data: enrolledData } = await supabase
        .from('student_subject_enrollment')
        .select('subject_id')
        .eq('section_id', section.id)
        .eq('school_year', schoolYear)

      if (enrolledData) {
        const uniqueIds = Array.from(new Set(enrolledData.map(e => e.subject_id)))
        setSelectedForEnrollment(uniqueIds)
        setInitialSubjects(uniqueIds)
      }
      
      // Fetch students in this section
      const { data: stdData } = await supabase
        .from('students')
        .select('id')
        .eq('section_id', section.id)
        .in('status', ['Accepted', 'Approved'])
        
      setStudents(stdData || [])
      
      setLoading(false)
    }
    initData()
  }, [isOpen, section, schoolYear])
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  // Compute if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (initialSubjects.length !== selectedForEnrollment.length) return true
    for (const id of selectedForEnrollment) {
      if (!initialSubjects.includes(id)) return true
    }
    return false
  }, [initialSubjects, selectedForEnrollment])

  const handleSaveSubjects = async (shouldClose = false) => {
    if (!students || students.length === 0) {
      toast.error("No students in this section to enroll.")
      return
    }

    setSaving(true)
    const toastId = toast.loading("Updating section subjects...")

    try {
      // Fast path: delete all enrollments for this section and re-insert 
      // (Wait, deleting enrollments cascades to delete grades! We CANNOT do that if grades exist.)
      // Better approach: Add missing enrollments. DO NOT delete automatically unless explicitly asked.
      
      const { data: existing } = await supabase
        .from('student_subject_enrollment')
        .select('student_id, subject_id')
        .eq('section_id', section.id)
        .eq('school_year', schoolYear)

      const existingSet = new Set(existing?.map(e => `${e.student_id}_${e.subject_id}`) || [])
      const toInsert: any[] = []
      
      students.forEach((student: any) => {
        selectedForEnrollment.forEach(subjectId => {
          if (!existingSet.has(`${student.id}_${subjectId}`)) {
            toInsert.push({
              student_id: student.id,
              subject_id: subjectId,
              section_id: section.id,
              school_year: schoolYear,
              term: 'Year-Round'
            })
          }
        })
      })

      if (toInsert.length > 0) {
        const { error } = await supabase.from('student_subject_enrollment').insert(toInsert)
        if (error) throw error
        toast.success(`Assigned ${toInsert.length} new enrollments!`, { id: toastId })
      } else {
        toast.success("Section subjects updated successfully!", { id: toastId })
      }
      
      // Update our source of truth
      setInitialSubjects(selectedForEnrollment)

      if (shouldClose) {
        onClose()
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  const handleBulkSync = async () => {
    const targetSections = allSections.filter((s: any) => 
      s.id !== section.id && 
      s.grade_level === section.grade_level && 
      s.strand === section.strand
    )

    if (targetSections.length === 0) {
      toast.error(`No other Grade ${section.grade_level} ${section.strand || ''} sections found.`)
      return
    }

    const confirmMsg = `Apply these exactly ${selectedForEnrollment.length} subjects to ${targetSections.length} other sections?\nSections: ${targetSections.map((s:any)=>s.section_name).join(', ')}`
    if (!window.confirm(confirmMsg)) return

    setSaving(true)
    const toastId = toast.loading("Syncing subjects to other sections...")

    try {
      let totalInserted = 0

      for (const targetSec of targetSections) {
        const { data: stdData } = await supabase
          .from('students')
          .select('id')
          .eq('section_id', targetSec.id)
          .in('status', ['Accepted', 'Approved'])

        if (!stdData || stdData.length === 0) continue

        const { data: existing } = await supabase
          .from('student_subject_enrollment')
          .select('student_id, subject_id')
          .eq('section_id', targetSec.id)
          .eq('school_year', schoolYear)

        const existingSet = new Set(existing?.map(e => `${e.student_id}_${e.subject_id}`) || [])
        const toInsert: any[] = []

        stdData.forEach((student: any) => {
          selectedForEnrollment.forEach(subjectId => {
            if (!existingSet.has(`${student.id}_${subjectId}`)) {
              toInsert.push({
                student_id: student.id,
                subject_id: subjectId,
                section_id: targetSec.id,
                school_year: schoolYear,
                term: 'Year-Round'
              })
            }
          })
        })

        if (toInsert.length > 0) {
          const { error } = await supabase.from('student_subject_enrollment').insert(toInsert)
          if (error) throw error
          totalInserted += toInsert.length
        }
      }

      toast.success(`Successfully synced subjects across sections! (${totalInserted} enrollments added)`, { id: toastId })
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (hasUnsavedChanges) {
        setShowUnsavedWarning(true)
      } else {
        onClose()
      }
    }
  }

  if (!section) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={`max-w-4xl max-h-[90vh] flex flex-col ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white'}`}>
        <DialogHeader className="mb-4">
          <DialogTitle className={`text-xl font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Subject Load: <span className="text-blue-500">{section.section_name}</span>
          </DialogTitle>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
            Grade {section.grade_level} {section.strand && `• ${section.strand}`}
          </p>
        </DialogHeader>
        
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
        ) : (
          <>
            <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${isDarkMode ? 'bg-blue-900/10 border-blue-900/50' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className={`text-sm font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>Bulk Sync Available</h4>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-1 opacity-70 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                    Apply this exact subject bundle to all other {section.strand} sections.
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleBulkSync}
                disabled={saving || selectedForEnrollment.length === 0}
                variant="outline" 
                className={`shrink-0 rounded-xl font-bold h-10 ${isDarkMode ? 'border-blue-800 text-blue-400 hover:bg-blue-900/50' : 'border-blue-300 text-blue-700 hover:bg-blue-100'}`}
              >
                <Copy size={14} className="mr-2" />
                Sync to all {section.strand}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-2" style={{ scrollbarWidth: "thin" }}>
              {masterSubjects.map(sub => {
                const isSelected = selectedForEnrollment.includes(sub.id)
                return (
                  <div 
                    key={sub.id} 
                    onClick={() => {
                      if (isSelected) {
                        setSelectedForEnrollment(prev => prev.filter(id => id !== sub.id))
                      } else {
                        setSelectedForEnrollment(prev => [...prev, sub.id])
                      }
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors
                      ${isSelected ? (isDarkMode ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-blue-50 border-blue-300 text-blue-700') 
                                   : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}
                    `}
                  >
                    <div>
                      <p className="font-bold text-sm">{sub.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">{sub.code}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">•</span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{sub.type}</span>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-400'}`}>
                      {isSelected && <Check size={14} />}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end mt-6 gap-3 border-t pt-4 dark:border-slate-800">
              <Button variant="ghost" onClick={() => handleOpenChange(false)} className="rounded-xl font-bold">Cancel</Button>
              <Button 
                onClick={() => handleSaveSubjects()} 
                disabled={saving || !hasUnsavedChanges}
                className="rounded-xl font-black uppercase tracking-widest text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                Save Load for {section.section_name}
              </Button>
            </div>
          </>
        )}
      </DialogContent>

      {/* Unsaved Changes Warning */}
      <Dialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <DialogContent className={`max-w-md ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <DialogTitle className={`text-lg font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Unsaved Changes</DialogTitle>
          <div className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-4`}>
            You have unsaved changes in the subjects list. Are you sure you want to exit without saving?
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowUnsavedWarning(false)} className={`font-black uppercase tracking-widest text-xs ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => { setShowUnsavedWarning(false); onClose(); }} className="font-black uppercase tracking-widest text-xs">
              Exit Without Saving
            </Button>
            <Button onClick={() => { setShowUnsavedWarning(false); handleSaveSubjects(true); }} className="font-black uppercase tracking-widest text-xs bg-blue-600 hover:bg-blue-700 text-white">
              Save & Exit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
