"use client"

import { Loader2, Cpu, BookOpen } from "lucide-react"
import { SectionGroup } from "./components/SectionGroup"
import { ProcessingOverlay } from "./components/ProcessingOverlay"
import { RealtimeStatusIndicator } from "./components/RealtimeStatusIndicator"
import { DocumentViewerDialog } from "./components/DocumentViewerDialog"
import { UnenrollDialog } from "./components/UnenrollDialog"
import { AddSectionDialog } from "./components/AddSectionDialog"
import { BulkDeleteDialog } from "./components/BulkDeleteDialog"
import { ProfileDialog } from "./components/ProfileDialog"
import { SectionDetailView } from "./components/SectionDetailView"
import { SectionsHeader } from "./components/SectionsHeader"
import { useSections } from "./hooks/useSections"

// ===== MAIN COMPONENT =====
export default function SectionsPage() {
  const {
    config, isDarkMode, sections, loading, isProcessing, selectedSectionName, setSelectedSectionName,
    searchTerm, setSearchTerm, debouncedSearch, strandFilter, setStrandFilter, sectionSelection,
    confirmAdd, setConfirmAdd, confirmDeleteSelect, setConfirmDeleteSelect, ictExpanded, setIctExpanded,
    gasExpanded, setGasExpanded, exitingRows, hiddenRows, animatingIds, ghostStudents, viewerOpen, setViewerOpen,
    viewingFile, rotation, setRotation, unenrollOpen, setUnenrollOpen, activeUnenrollStudent, profileOpen, setProfileOpen,
    activeProfile, realtimeStatus, lastUpdate, ictSections, gasSections, ictLoad, gasLoad, currentSection, activeStudents,
    currentSectionData, handleExit, handleOpenFile, handleViewProfile, handleUnenroll, initiateAdd, handleBalance, toggleSelection,
    handleSelectAll, executeAdd, executeBulkDelete, handleDeleteSection, handleClearAllStudents, handleReturnToPending,
    handleConfirmUnenroll, handleSwitch, exportSectionCSV, fetchSections, handleToggleLock, updateStudentProfile
  } = useSections()

  if (loading && sections.length === 0) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 text-slate-400">
      <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
      <p className="text-[10px] font-black uppercase tracking-widest text-center">Syncing School Sections & Students...</p>
    </div>
  )

  return (
    <div className="relative min-h-screen [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transition-colors duration-500 overflow-x-hidden max-w-[100vw]">
      <style jsx global>{`
        body { overflow-y: auto; }
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <RealtimeStatusIndicator status={realtimeStatus} lastUpdate={lastUpdate} />
      
      <div className="space-y-6 md:space-y-12 animate-in fade-in duration-700 pb-20 relative z-10 w-full overflow-x-hidden">
      
      {selectedSectionName ? (() => {
        if (!currentSectionData) return null
        return (
          <SectionDetailView
            sectionName={selectedSectionName}
            currentSection={currentSection!}
            activeStudents={activeStudents}
            capacity={currentSectionData.capacity}
            fillPercent={currentSectionData.fillPercent}
            config={config}
            isDarkMode={isDarkMode}
            onBack={() => setSelectedSectionName(null)}
            onRefresh={() => fetchSections(false)}
            loading={loading}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onExport={exportSectionCSV}
            sortedStudents={currentSectionData.sortedStudents}
            mCount={currentSectionData.mCount}
            fCount={currentSectionData.fCount}
            debouncedSearch={debouncedSearch}
            sections={sections}
            handleReturnToPending={handleReturnToPending}
            handleUnenroll={handleUnenroll}
            handleSwitch={handleSwitch}
            handleOpenFile={handleOpenFile}
            handleViewProfile={handleViewProfile}
            exitingRows={exitingRows}
            hiddenRows={hiddenRows}
            handleExit={handleExit}
            animatingIds={animatingIds}
            onToggleLock={handleToggleLock}
          />
        )
      })() : (
        <>
          <SectionsHeader 
            isDarkMode={isDarkMode}
            strandFilter={strandFilter}
            setStrandFilter={setStrandFilter}
            sectionSelection={sectionSelection}
            setConfirmDeleteSelect={setConfirmDeleteSelect}
            sections={sections}
            handleDeleteSection={handleDeleteSection}
            handleClearAllStudents={handleClearAllStudents}
            initiateAdd={initiateAdd}
            onBalance={handleBalance}
            isProcessing={isProcessing}
          />
          
          {['ICT', 'GAS'].map(strand => (strandFilter === 'ALL' || strandFilter === strand) && (
            <SectionGroup 
              key={strand} 
              title={strand === 'ICT' ? "Information Technology" : "General Academics"}
              mobileTitle={strand === 'ICT' ? "ICT Program" : "GAS Program"}
              icon={strand === 'ICT' ? <Cpu/> : <BookOpen/>} 
              color={strand === 'ICT' ? 'blue' : 'orange'} 
              sections={strand === 'ICT' ? ictSections : gasSections} 
              load={strand === 'ICT' ? ictLoad : gasLoad} 
              onSelect={setSelectedSectionName} 
              onDelete={handleDeleteSection} 
              isExpanded={strand === 'ICT' ? ictExpanded : gasExpanded} 
              onToggle={strand === 'ICT' ? () => setIctExpanded(!ictExpanded) : () => setGasExpanded(!gasExpanded)}
              selection={sectionSelection}
              onToggleSelect={toggleSelection}
              onSelectAll={handleSelectAll}
              isDarkMode={isDarkMode}
              config={config}
            />
          ))}
        </>
      )}

      {/* DIALOGS (RETAINED) */}
      <DocumentViewerDialog 
        open={viewerOpen} 
        onOpenChange={setViewerOpen} 
        file={viewingFile} 
        rotation={rotation} 
        setRotation={setRotation} 
      />
      <UnenrollDialog 
        open={unenrollOpen} 
        onOpenChange={setUnenrollOpen} 
        student={activeUnenrollStudent} 
        onConfirm={handleConfirmUnenroll} 
        isDarkMode={isDarkMode} 
      />
      <ProfileDialog 
        open={profileOpen} 
        onOpenChange={setProfileOpen} 
        student={activeProfile} 
        onOpenFile={handleOpenFile} 
        isDarkMode={isDarkMode} 
        onUpdate={updateStudentProfile}
        sections={sections}
      />
      <AddSectionDialog 
        open={confirmAdd.isOpen} 
        onOpenChange={(open: boolean) => !open && setConfirmAdd({ ...confirmAdd, isOpen: false })} 
        strand={confirmAdd.strand} 
        onConfirm={executeAdd} 
        isProcessing={isProcessing} 
        isDarkMode={isDarkMode} 
      />
      <BulkDeleteDialog 
        open={confirmDeleteSelect} 
        onOpenChange={setConfirmDeleteSelect} 
        count={sectionSelection.size} 
        onConfirm={executeBulkDelete} 
        isDarkMode={isDarkMode} 
      />
      {isProcessing && <ProcessingOverlay />}
    </div>
    </div>
  )
}