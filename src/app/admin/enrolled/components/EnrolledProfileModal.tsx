// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\enrolled\components\EnrolledProfileModal.tsx

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { EnrolledDossier } from "./EnrolledDossier"

export function EnrolledProfileModal({ isOpen, onClose, student, onUpdate, isDarkMode, onOpenFile, sections }: any) {
  if (!student) return null
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] md:w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] md:rounded-[48px] p-0 border-none shadow-2xl [&>button]:hidden bg-transparent">
        <DialogTitle className="sr-only">Enrolled Student Profile</DialogTitle>
        <DialogDescription className="sr-only">Details for {student.first_name} {student.last_name}</DialogDescription>
        
        <EnrolledDossier 
            student={student} 
            onClose={onClose} 
            onUpdate={onUpdate} 
            isDarkMode={isDarkMode}
            onOpenFile={onOpenFile}
            sections={sections}
        />
      </DialogContent>
    </Dialog>
  )
}
