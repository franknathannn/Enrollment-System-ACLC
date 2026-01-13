// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\enrolled\page.tsx

"use client"

import { useEffect, useState } from "react"
import { useTheme } from "@/hooks/useTheme"
import { StarConstellation } from "./components/StarConstellation"
import { EnrolledHeader } from "./components/EnrolledHeader"
import { EnrolledFilter } from "./components/EnrolledFilter"
import { EnrolledTable } from "./components/EnrolledTable"
import { EnrolledProfileModal } from "./components/EnrolledProfileModal"
import { DocumentViewerModal } from "./components/DocumentViewerModal"
import { useEnrolledData } from "./hooks/useEnrolledData"
import { useEnrolledFiltering } from "./hooks/useEnrolledFiltering"
import { useEnrolledActions } from "./hooks/useEnrolledActions"
import { useStudentUI } from "../applicants/hooks/useStudentUI" // Reusing UI hook for viewer
import { downloadEnrolledExcel } from "./api/exportEnrolled"

export default function EnrolledPage() {
  const { isDarkMode: themeDarkMode } = useTheme()
  const [isDarkMode, setIsDarkMode] = useState(themeDarkMode)

  // 1. Data Layer
  const { students, setStudents, sections, loading, fetchStudents } = useEnrolledData();

  // 2. Filtering Layer
  const { 
    searchTerm, setSearchTerm,
    strandFilter, setStrandFilter,
    categoryFilter, setCategoryFilter,
    sortBy, setSortBy,
    sortDropdownOpen, setSortDropdownOpen,
    strandDropdownOpen, setStrandDropdownOpen,
    categoryDropdownOpen, setCategoryDropdownOpen,
    paginatedStudents,
    totalPages,
    currentPage, setCurrentPage,
    filteredStudents,
    animatingIds
  } = useEnrolledFiltering({ students })

  // 3. Actions Layer
  const { updateStudentProfile, resetStudentToPending } = useEnrolledActions({ setStudents })

  // 4. UI Layer (Modal & Viewer)
  const { 
    viewerOpen, setViewerOpen, 
    viewingFile, rotation, setRotation, 
    openDocumentViewer, navigateDocument, 
    canNavigatePrev, canNavigateNext 
  } = useStudentUI()

  const [selectedStudent, setSelectedStudent] = useState<any>(null)

  // Theme Sync
  useEffect(() => { setIsDarkMode(themeDarkMode) }, [themeDarkMode])
  useEffect(() => {
    const handleThemeChange = (e: any) => setIsDarkMode(e.detail.mode === 'dark')
    window.addEventListener('theme-change', handleThemeChange)
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  // Initial Fetch
  useEffect(() => { fetchStudents() }, [fetchStudents])

  return (
    <div className="relative min-h-screen [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transition-colors duration-500">
       <style jsx global>{`
         body { overflow-y: auto; }
         ::-webkit-scrollbar { display: none; }
         * { -ms-overflow-style: none; scrollbar-width: none; }
       `}</style>
    
       <StarConstellation />

       <div className="relative z-10 space-y-6 md:space-y-8 p-[0.1rem] md:p-8 animate-in fade-in duration-700 pb-32">
          
          <EnrolledHeader 
            isDarkMode={isDarkMode}
            loading={loading}
            fetchStudents={fetchStudents}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onExport={() => downloadEnrolledExcel(strandFilter, categoryFilter)}
          />

          <EnrolledFilter 
            isDarkMode={isDarkMode}
            strandFilter={strandFilter}
            setStrandFilter={setStrandFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            totalCount={filteredStudents.length}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortDropdownOpen={sortDropdownOpen}
            setSortDropdownOpen={setSortDropdownOpen}
            strandDropdownOpen={strandDropdownOpen}
            setStrandDropdownOpen={setStrandDropdownOpen}
            categoryDropdownOpen={categoryDropdownOpen}
            setCategoryDropdownOpen={setCategoryDropdownOpen}
          />

          <EnrolledTable 
            students={paginatedStudents}
            isDarkMode={isDarkMode}
            onView={setSelectedStudent}
            onReset={resetStudentToPending}
            animatingIds={animatingIds}
          />
       </div>

       <EnrolledProfileModal 
         isOpen={!!selectedStudent}
         onClose={() => setSelectedStudent(null)}
         student={selectedStudent}
         onUpdate={updateStudentProfile}
         isDarkMode={isDarkMode}
         onOpenFile={openDocumentViewer}
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
    </div>
  )
}
