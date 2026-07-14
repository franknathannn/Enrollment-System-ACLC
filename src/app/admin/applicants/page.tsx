"use client"

import { useMemo, useState, useCallback } from "react"
import { Loader2 } from "lucide-react"
import { useTheme } from "@/hooks/useTheme"
import { StarConstellation } from "./components/StarConstellation"
import { ApplicantsHeader } from "./components/ApplicantsHeader"
import { ApplicantsFilter } from "./components/ApplicantsFilter"
import { ApplicantsTable } from "./components/ApplicantsTable"
import { BulkActionsFloatingBar } from "./components/BulkActionsFloatingBar"
import { ApplicantModals } from "./components/ApplicantModals"
import { DocumentViewerModal } from "./components/DocumentViewerModal"
import { CapacityAlert } from "./components/CapacityAlert"
import { StudentProfileModal } from "./components/StudentProfileModal"
import { AcceptConfirmModal } from "./components/AcceptConfirmModal"
import { useApplicants } from "./hooks/useApplicants"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function ApplicantsPage() {
 const { isDarkMode } = useTheme()

 const {
   loading, config, searchTerm, setSearchTerm, fetchStudents, exportToCSV,
   filter, setFilter, gradeLevelFilter, setGradeLevelFilter, students, setSelectedIds, sortBy, setSortBy,
   sortDropdownOpen, setSortDropdownOpen, filteredStudents,
   selectedIds, toggleSelect, toggleSelectAll, hiddenRows, exitingRows,
   animatingIds, setOpenStudentDialog, handleExit, handleStatusChange,
   paginatedStudents, totalPages, currentPage, setCurrentPage,
   setActiveDeclineStudent, setDeclineModalOpen, setActiveDeleteStudent, setDeleteModalOpen,
   strandStats, selectedStudentForDialog, openStudentDialog,
   viewerOpen, setViewerOpen, viewingFile, setViewingFile, rotation, setRotation,
   declineModalOpen, activeDeclineStudent, declineReason, setDeclineReason,
   bulkDeclineModalOpen, setBulkDeclineModalOpen,
   processBulkUpdate, deleteModalOpen, activeDeleteStudent, handleConfirmDelete,
   bulkDeleteModalOpen, setBulkDeleteModalOpen, processBulkDelete, handleBulkAction,
   openDocumentViewer, navigateDocument, canNavigatePrev, canNavigateNext,
   updateStudentProfile,
   sections
 } = useApplicants()

 // ── Accept Confirmation Modal state ──────────────────────────────────
 const [acceptModalStudent, setAcceptModalStudent] = useState<any>(null)
 const [acceptModalMeta, setAcceptModalMeta] = useState<{ id: string; name: string } | null>(null)

 // Intercept accept calls: instead of immediately accepting, open the modal
 const handleAcceptIntercept = useCallback((studentId: string, name: string, status: string) => {
   if (status === 'Accepted' || status === 'Approved') {
     const student = students.find(s => s.id === studentId)
     if (student) {
       setAcceptModalStudent(student)
       setAcceptModalMeta({ id: studentId, name })
       return
     }
   }
   // For non-accept statuses (Pending, etc.), call directly
   handleStatusChange(studentId, name, status)
 }, [students, handleStatusChange])

 // Called when user confirms in the AcceptConfirmModal
  const handleAcceptConfirm = useCallback((voucherStatus: string, checks: Record<string, boolean>, isPayee: boolean) => {
    if (!acceptModalMeta) return
    const extra = {
      voucher_status: voucherStatus,
      shs_vms_registered: checks.shs_vms,
      is_payee: isPayee,
    }
    handleExit(acceptModalMeta.id, () => {
      handleStatusChange(acceptModalMeta.id, acceptModalMeta.name, 'Accepted', undefined, extra)
    })
   setAcceptModalStudent(null)
   setAcceptModalMeta(null)
 }, [acceptModalMeta, handleExit, handleStatusChange])

 // Calculate visible students for the current page (for the filter component)
 const visibleStudentsForFilter = useMemo(() => {
   if (paginatedStudents.length > 5 || (paginatedStudents.length === filteredStudents.length && filteredStudents.length > 5)) {
     const startIndex = (currentPage - 1) * 5
     const endIndex = startIndex + 5
     return filteredStudents.slice(startIndex, endIndex)
   }
   return paginatedStudents
 }, [paginatedStudents, filteredStudents, currentPage])

 if (loading && students.length === 0) return (
  <div className={`h-screen flex flex-col items-center justify-center gap-6 ${isDarkMode ? 'bg-slate-950' : 'bg-gradient-to-br from-slate-50 to-blue-50'}`}>
   <div className="relative flex items-center justify-center">
    <span className="absolute w-24 h-24 rounded-full border-2 border-blue-500/15 animate-ping" />
    <span className="absolute w-16 h-16 rounded-full border-2 border-blue-400/20 animate-ping" style={{ animationDelay: "0.15s" }} />
    <span className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 shadow-lg shadow-blue-500/30 flex items-center justify-center relative z-10">
     <Loader2 className="animate-spin text-white" size={20} />
    </span>
   </div>
   <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Connecting to Database...</p>
  </div>
 )

 return (
  <TooltipProvider delayDuration={100}>
  <div className="relative min-h-screen [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transition-colors duration-500 overflow-x-hidden">
   <style jsx global>{`
     body { overflow-y: auto; }
     ::-webkit-scrollbar { display: none; }
     * { -ms-overflow-style: none; scrollbar-width: none; }
   `}</style>

   <StarConstellation />
   
   <div className="relative z-10 space-y-6 md:space-y-8 p-[0.1rem] md:p-8 animate-in fade-in duration-700 pb-32">
    <CapacityAlert strandStats={strandStats} />
    <ApplicantsHeader 
      isDarkMode={isDarkMode}
      loading={loading}
      config={config}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      fetchStudents={fetchStudents}
      exportToCSV={exportToCSV}
    />

    <ApplicantsFilter 
      isDarkMode={isDarkMode}
      filter={filter}
      setFilter={setFilter}
      gradeLevelFilter={gradeLevelFilter}
      setGradeLevelFilter={setGradeLevelFilter}
      students={students}
      filteredStudents={visibleStudentsForFilter}
      allFilteredStudents={filteredStudents}
      setSelectedIds={setSelectedIds}
      sortBy={sortBy}
      setSortBy={setSortBy}
      sortDropdownOpen={sortDropdownOpen}
      setSortDropdownOpen={setSortDropdownOpen}
      currentPage={currentPage}
      totalPages={totalPages}
      setCurrentPage={setCurrentPage}
    />

    <ApplicantsTable 
      isDarkMode={isDarkMode}
      filteredStudents={paginatedStudents}
      totalFilteredCount={filteredStudents.length}
      selectedIds={selectedIds}
      toggleSelect={toggleSelect}
      toggleSelectAll={toggleSelectAll}
      hiddenRows={hiddenRows}
      exitingRows={exitingRows}
      animatingIds={animatingIds}
      setOpenStudentDialog={setOpenStudentDialog}
      handleExit={handleExit}
      handleStatusChange={handleAcceptIntercept}
      setActiveDeclineStudent={setActiveDeclineStudent}
      setDeclineModalOpen={setDeclineModalOpen}
      setActiveDeleteStudent={setActiveDeleteStudent}
      setDeleteModalOpen={setDeleteModalOpen}
      strandStats={strandStats}
      currentPage={currentPage}
      totalPages={totalPages}
      setCurrentPage={setCurrentPage}
      isSystemLocked={!config?.is_portal_active}
    />
   </div>

   <StudentProfileModal 
     isOpen={!!openStudentDialog}
     onClose={() => setOpenStudentDialog(null)}
     student={selectedStudentForDialog}
     onOpenFile={openDocumentViewer}
     isDarkMode={isDarkMode}
     onUpdate={updateStudentProfile}
     sections={sections}
     onStatusChange={(id, status) => { 
       if (selectedStudentForDialog) {
         handleAcceptIntercept(id, `${selectedStudentForDialog.first_name} ${selectedStudentForDialog.last_name}`, status); 
       }
       setOpenStudentDialog(null); 
     }}
     onDecline={(student) => { setActiveDeclineStudent(student); setDeclineModalOpen(true); setOpenStudentDialog(null); }}
   />

   <DocumentViewerModal 
     viewerOpen={viewerOpen}
     setViewerOpen={setViewerOpen}
     viewingFile={viewingFile}
     rotation={rotation}
     setRotation={setRotation}
     onNavigate={navigateDocument}
     canNavigatePrev={canNavigatePrev}
     canNavigateNext={canNavigateNext}
   />

   <ApplicantModals 
     isDarkMode={isDarkMode}
     declineModalOpen={declineModalOpen}
     setDeclineModalOpen={setDeclineModalOpen}
     activeDeclineStudent={activeDeclineStudent}
     declineReason={declineReason}
     setDeclineReason={setDeclineReason}
     handleExit={handleExit}
     handleStatusChange={handleStatusChange}
     bulkDeclineModalOpen={bulkDeclineModalOpen}
     setBulkDeclineModalOpen={setBulkDeclineModalOpen}
     selectedIds={selectedIds}
     students={students}
     processBulkUpdate={processBulkUpdate}
     deleteModalOpen={deleteModalOpen}
     setDeleteModalOpen={setDeleteModalOpen}
     activeDeleteStudent={activeDeleteStudent}
     handleConfirmDelete={handleConfirmDelete}
     bulkDeleteModalOpen={bulkDeleteModalOpen}
     setBulkDeleteModalOpen={setBulkDeleteModalOpen}
     processBulkDelete={processBulkDelete}
   />

   <AcceptConfirmModal
     student={acceptModalStudent}
     isOpen={!!acceptModalStudent}
     isDarkMode={isDarkMode}
     onClose={() => { setAcceptModalStudent(null); setAcceptModalMeta(null) }}
     onConfirm={handleAcceptConfirm}
   />

   <BulkActionsFloatingBar 
     selectedIds={selectedIds}
     filter={filter}
     handleBulkAction={handleBulkAction}
     setBulkDeleteModalOpen={setBulkDeleteModalOpen}
     setSelectedIds={setSelectedIds}
     isSystemLocked={!config?.is_portal_active}
   />
  </div>
  </TooltipProvider>
 )
}