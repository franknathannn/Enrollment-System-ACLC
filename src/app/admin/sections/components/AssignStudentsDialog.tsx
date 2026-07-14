import { memo, useState, useEffect } from "react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Users, Info, Check, X } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { updateStudentSection } from "@/lib/actions/applicants"

export const AssignStudentsDialog = memo(function AssignStudentsDialog({ 
  isDarkMode, 
  sections,
  onAssigned
}: any) {
  const [open, setOpen] = useState(false)
  const [unassigned, setUnassigned] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (open) {
      fetchUnassigned()
    }
  }, [open])

  const fetchUnassigned = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('student_applicants')
      .select('*')
      .is('section_id', null)
      .in('status', ['Accepted', 'Approved'])
    
    if (data) {
      setUnassigned(data)
    }
    setLoading(false)
  }

  const handleAssign = async (studentId: string, sectionId: string) => {
    try {
      await updateStudentSection(studentId, sectionId)
      toast.success("Student assigned successfully!")
      setUnassigned(prev => prev.filter(s => s.id !== studentId))
      onAssigned?.()
    } catch (err) {
      toast.error("Failed to assign student")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-black text-[9px] uppercase px-4 h-8 tracking-widest transition-colors shadow-sm">
          ASSIGN →
        </Button>
      </DialogTrigger>
      <DialogContent className={`rounded-[32px] sm:max-w-3xl h-[80vh] flex flex-col p-0 border-none shadow-2xl ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
        <DialogHeader className={`p-6 pb-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <DialogTitle className="font-black uppercase tracking-tighter text-2xl flex items-center gap-2">
            <Users size={24} className="text-blue-500" /> Unassigned Students
          </DialogTitle>
          <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Assign students to available sections
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="text-center opacity-50 py-10 text-[10px] font-black uppercase tracking-widest">Loading...</div>
          ) : unassigned.length === 0 ? (
            <div className="text-center opacity-50 py-10 text-[10px] font-black uppercase tracking-widest">No unassigned students found.</div>
          ) : (
            unassigned.map(student => {
              // Find matching sections
              const availableSections = sections.filter((s: any) => 
                s.strand === student.strand && 
                s.grade_level === student.grade_level
              );

              return (
                <div key={student.id} className={`flex items-center justify-between p-4 rounded-[20px] border ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-4">
                    <img 
                      src={student.two_by_two_url || student.profile_2x2_url || '/placeholder.png'} 
                      alt="Student" 
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    <div>
                      <h4 className="font-black text-sm">{student.last_name}, {student.first_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                          {student.strand}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">
                          G{student.grade_level}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <select
                      className={`text-xs font-bold p-2 rounded-xl border outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
                      onChange={(e) => {
                        if (e.target.value) handleAssign(student.id, e.target.value)
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Select Section...</option>
                      {availableSections.map((sec: any) => {
                        const enrolled = sec.students?.filter((s: any) => s.status === 'Accepted' || s.status === 'Approved').length || 0;
                        const cap = sec.capacity || 40;
                        const space = cap - enrolled;
                        if (space <= 0) return null; // Can't assign if full
                        return (
                          <option key={sec.id} value={sec.id}>
                            {sec.section_name} ({space} slots left)
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})
