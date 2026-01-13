import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { StudentDossier } from "./StudentDossier"

interface StudentProfileModalProps {
  isOpen: boolean
  onClose: () => void
  student: any
  onOpenFile: (url: string, label: string) => void
  isDarkMode: boolean
  onUpdate?: (id: string, data: any) => Promise<void | boolean>
  sections?: any[]
}

export function StudentProfileModal({ isOpen, onClose, student, onOpenFile, isDarkMode, onUpdate, sections }: StudentProfileModalProps) {
  if (!student) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
     <DialogContent className="w-[95vw] md:w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] md:rounded-[48px] p-0 border-none shadow-2xl [&>button]:hidden">
      <DialogHeader className="sr-only">
       <DialogTitle>Profile Detail: {student.first_name} {student.last_name}</DialogTitle>
       <DialogDescription>Verification matrix for applicant {student.lrn}</DialogDescription>
      </DialogHeader>
      <StudentDossier 
       student={student} 
       onOpenFile={onOpenFile}
       isDarkMode={isDarkMode}
       onClose={onClose}
       onUpdate={onUpdate}
       sections={sections}
      />
     </DialogContent>
    </Dialog>
  )
}