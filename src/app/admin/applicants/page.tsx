"use client"

import { useMemo } from "react"
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

 // Calculate visible students for the current page (for the filter component)
 const visibleStudentsForFilter = useMemo(() => {
   if (paginatedStudents.length > 10 || (paginatedStudents.length === filteredStudents.length && filteredStudents.length > 10)) {
     const startIndex = (currentPage - 1) * 10
     const endIndex = startIndex + 10
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
      handleStatusChange={handleStatusChange}
      setActiveDeclineStudent={setActiveDeclineStudent}
      setDeclineModalOpen={setDeclineModalOpen}
      setActiveDeleteStudent={setActiveDeleteStudent}
      setDeleteModalOpen={setDeleteModalOpen}
      strandStats={strandStats}
      currentPage={currentPage}
      totalPages={totalPages}
      setCurrentPage={setCurrentPage}
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

   <BulkActionsFloatingBar 
     selectedIds={selectedIds}
     filter={filter}
     handleBulkAction={handleBulkAction}
     setBulkDeleteModalOpen={setBulkDeleteModalOpen}
     setSelectedIds={setSelectedIds}
   />
  </div>
  </TooltipProvider>
 )
}