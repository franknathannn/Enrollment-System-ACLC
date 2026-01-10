"use client"

import { useEffect, useState } from "react"
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

export default function ApplicantsPage() {
 const { isDarkMode: themeDarkMode } = useTheme()
 const [isDarkMode, setIsDarkMode] = useState(themeDarkMode)

 useEffect(() => {
   setIsDarkMode(themeDarkMode)
 }, [themeDarkMode])

 useEffect(() => {
   const handleThemeChange = (e: any) => {
     setIsDarkMode(e.detail.mode === 'dark')
   }
   window.addEventListener('theme-change', handleThemeChange)
   return () => window.removeEventListener('theme-change', handleThemeChange)
 }, [])

 const {
   loading, config, searchTerm, setSearchTerm, fetchStudents, exportToCSV,
   filter, setFilter, students, setSelectedIds, sortBy, setSortBy,
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
   openDocumentViewer, navigateDocument, canNavigatePrev, canNavigateNext
 } = useApplicants()

 if (loading && students.length === 0) return (
  <div className="h-screen flex flex-col items-center justify-center gap-4 text-slate-400">
   <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
   <p className="text-[10px] font-black uppercase tracking-widest text-center animate-pulse">⚡ Syncing Admissions Matrix...</p>
  </div>
 )

 return (
  <div className="relative min-h-screen [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transition-colors duration-500">
   <style jsx global>{`
     body { overflow-y: auto; }
     ::-webkit-scrollbar { display: none; }
     * { -ms-overflow-style: none; scrollbar-width: none; }
   `}</style>

   <StarConstellation />
   
   <div className="relative z-10 space-y-6 md:space-y-8 p-4 md:p-8 animate-in fade-in duration-700 pb-32">
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
      students={students}
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
 )
}