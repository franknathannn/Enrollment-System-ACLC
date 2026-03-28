"use client"

import { useEffect, useState, useCallback } from "react"
import { useTheme } from "@/hooks/useTheme"
import { StarConstellation } from "./components/StarConstellation"
import { EnrolledHeader } from "./components/EnrolledHeader"
import { EnrolledFilter } from "./components/EnrolledFilter"
import { EnrolledTable } from "./components/EnrolledTable"
import { EnrolledProfileModal } from "./components/EnrolledProfileModal"
import { DocumentViewerModal } from "./components/DocumentViewerModal"
import { EditRequestsPanel } from "./components/EditRequestsPanel"
import { useEnrolledData } from "./hooks/useEnrolledData"
import { useEnrolledFiltering } from "./hooks/useEnrolledFiltering"
import { useEnrolledActions } from "./hooks/useEnrolledActions"
import { useStudentUI } from "../applicants/hooks/useStudentUI"
import { downloadEnrolledExcel } from "./api/exportEnrolled"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Users, Inbox } from "lucide-react"

type RegistryMainTab = "enrolled" | "reEnrollment"

export default function EnrolledPage() {
  const { isDarkMode } = useTheme()
  const [mainTab, setMainTab] = useState<RegistryMainTab>("enrolled")

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
    toggleAccountStatus,
    approveEditRequest,
    denyEditRequest
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

  const tabBtn = useCallback((active: boolean) =>
    `flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 flex-1 sm:flex-none min-h-[44px] ${
      active
        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
        : isDarkMode
          ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
    }`, [isDarkMode])

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

          <div
            className={`flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 p-1.5 rounded-2xl border w-full max-w-lg mx-auto ${
              isDarkMode ? "bg-slate-900/50 border-slate-700/60" : "bg-slate-100/80 border-slate-200/80"
            }`}
            role="tablist"
            aria-label="Registry view"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === "enrolled"}
              className={tabBtn(mainTab === "enrolled")}
              onClick={() => setMainTab("enrolled")}
            >
              <Users size={14} className="shrink-0 opacity-90" />
              Enrolled
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mainTab === "reEnrollment"}
              className={tabBtn(mainTab === "reEnrollment")}
              onClick={() => setMainTab("reEnrollment")}
            >
              <Inbox size={14} className="shrink-0 opacity-90" />
              Re-Enrollment Requests
            </button>
          </div>

          {mainTab === "reEnrollment" && (
            <EditRequestsPanel
              isDarkMode={isDarkMode}
              onApprove={approveEditRequest}
              onDeny={denyEditRequest}
            />
          )}

          {mainTab === "enrolled" && (
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
                onToggleStatus={toggleAccountStatus}
                animatingIds={animatingIds}
                totalCount={students.length}
                totalFilteredCount={filteredStudents.length}
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
                loading={loading}
              />
            </>
          )}
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
    </TooltipProvider>
  )
}