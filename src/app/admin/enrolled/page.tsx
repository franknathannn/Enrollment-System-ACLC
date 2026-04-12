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
import { useStudentUI } from "../applicants/hooks/useStudentUI"
import { downloadEnrolledExcel } from "./api/exportEnrolled"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function EnrolledPage() {
  const { isDarkMode } = useTheme()

  // 1. Data Layer
  const { students, setStudents, sections, loading, fetchStudents } = useEnrolledData()

  // 2. Filtering Layer
  const {
    searchTerm, setSearchTerm,
    strandFilter, setStrandFilter,
    gradeLevelFilter, setGradeLevelFilter,
    categoryFilter, setCategoryFilter,
    sectionFilter, setSectionFilter,
    sortBy, setSortBy,
    sortDropdownOpen, setSortDropdownOpen,
    strandDropdownOpen, setStrandDropdownOpen,
    categoryDropdownOpen, setCategoryDropdownOpen,
    sectionDropdownOpen, setSectionDropdownOpen,
    paginatedStudents,
    totalPages,
    currentPage, setCurrentPage,
    filteredStudents,
    animatingIds
  } = useEnrolledFiltering({ students })

  // 3. Actions Layer
  const {
    updateStudentProfile,
    resetStudentToPending,
  } = useEnrolledActions({ setStudents })

  // 4. UI Layer (Modal & Viewer)
  const {
    viewerOpen, setViewerOpen,
    viewingFile, rotation, setRotation,
    openDocumentViewer, navigateDocument,
    canNavigatePrev, canNavigateNext
  } = useStudentUI()

  const [selectedStudent, setSelectedStudent] = useState<any>(null)

  // Initial Fetch
  useEffect(() => { fetchStudents() }, [fetchStudents])

  return (
    <TooltipProvider delayDuration={100}>
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

          <>
            <EnrolledFilter
                isDarkMode={isDarkMode}
                strandFilter={strandFilter}
                setStrandFilter={setStrandFilter}
                gradeLevelFilter={gradeLevelFilter}
                setGradeLevelFilter={setGradeLevelFilter}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                sectionFilter={sectionFilter}
                setSectionFilter={setSectionFilter}
                sections={sections}
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
                sectionDropdownOpen={sectionDropdownOpen}
                setSectionDropdownOpen={setSectionDropdownOpen}
              />

              <EnrolledTable
                students={filteredStudents}
                isDarkMode={isDarkMode}
                onView={setSelectedStudent}
                onReset={resetStudentToPending}
                animatingIds={animatingIds}
                totalCount={students.length}
                totalFilteredCount={filteredStudents.length}
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
                loading={loading}
              />
          </>
        </div>

        <EnrolledProfileModal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          student={selectedStudent}
          onUpdate={updateStudentProfile}
          isDarkMode={isDarkMode}
          onOpenFile={openDocumentViewer}
          sections={sections}
          onStatusChange={(_: any, status: string) => {
            if (status === 'Pending' && selectedStudent) {
              resetStudentToPending(selectedStudent)
              setSelectedStudent(null)
            }
          }}
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
    </TooltipProvider>
  )
}