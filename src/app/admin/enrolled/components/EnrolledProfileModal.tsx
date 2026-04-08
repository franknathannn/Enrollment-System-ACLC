// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\enrolled\components\EnrolledProfileModal.tsx

import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog"
import { EnrolledDossier } from "./EnrolledDossier"

export function EnrolledProfileModal({ isOpen, onClose, student, onOpenFile, isDarkMode, onUpdate, sections, onStatusChange }: any) {
  if (!student) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="w-[95vw] md:w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] md:rounded-[48px] p-0 border-none shadow-2xl [&>button]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Enrolled Student Detail</DialogTitle>
          <DialogDescription>Information for {student?.lrn}</DialogDescription>
        </DialogHeader>
        <EnrolledDossier 
          student={student}
          onOpenFile={onOpenFile}
          isDarkMode={isDarkMode}
          onClose={onClose}
          onUpdate={onUpdate}
          sections={sections}
          onStatusChange={onStatusChange}
        />
      </DialogContent>
    </Dialog>
  )
}
