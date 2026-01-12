// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\sections\components\SectionsHeader.tsx

import { memo } from "react"
import { ThemedCard } from "@/components/ThemedCard"
import { ThemedText } from "@/components/ThemedText"
import { FilterButton } from "./FilterButton"
import { Button } from "@/components/ui/button"
import { Trash, Plus, Layers, Cpu, BookOpen, Scale } from "lucide-react"
import { DeleteManagementDialog } from "./DeleteManagementDialog"

interface SectionsHeaderProps {
  isDarkMode: boolean
  strandFilter: "ALL" | "ICT" | "GAS"
  setStrandFilter: (filter: "ALL" | "ICT" | "GAS") => void
  sectionSelection: Set<string>
  setConfirmDeleteSelect: (open: boolean) => void
  sections: any[]
  handleDeleteSection: (id: string, name: string, strand: "ICT" | "GAS") => void
  handleClearAllStudents: () => void
  initiateAdd: (strand: "ICT" | "GAS") => void
  onBalance: (strand: "ICT" | "GAS" | "ALL") => void
  isProcessing: boolean
}

export const SectionsHeader = memo(({
  isDarkMode, strandFilter, setStrandFilter, sectionSelection, setConfirmDeleteSelect,
  sections, handleDeleteSection, handleClearAllStudents, initiateAdd, onBalance, isProcessing
}: SectionsHeaderProps) => {

  // 🧪 PROP-BASED THEME ENGINE (Ignoring Tailwind dark: for state sync)
  const theme = {
    surface: isDarkMode ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.85)',
    border: isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.6)',
    filterBg: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.9)',
    filterBorder: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 1)'
  };

  return (
    <ThemedCard 
      className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 p-6 md:p-10 rounded-[32px] md:rounded-[48px] backdrop-blur-3xl shadow-2xl border transition-all duration-700 bg-clip-padding outline outline-1 outline-transparent isolate"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border
      }}
    >
      {/* 🏙️ TITLE CLUSTER */}
      <div className="space-y-2 md:space-y-4 transform-gpu w-full lg:w-auto text-left">
        <ThemedText 
           variant="h1" 
           className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic leading-none" 
           isDarkMode={isDarkMode}
        >
          School Units
        </ThemedText>
        <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <ThemedText variant="body" className="text-[10px] md:text-xs font-bold opacity-60 uppercase tracking-[0.2em]" isDarkMode={isDarkMode}>
              AMA ACLC NORTHBAY SECTION MANAGING
            </ThemedText>
        </div>
      </div>

      {/* 📊 PERSISTENT FILTER DOCK (Fitted & Minimized) */}
      <div 
        className="flex p-1.5 rounded-[22px] border shadow-inner transition-all duration-500 bg-clip-padding isolate transform-gpu w-full sm:w-auto justify-center sm:justify-start"
        style={{ 
          backgroundColor: theme.filterBg,
          borderColor: theme.filterBorder
        }}
      >
         <FilterButton 
           label="All" 
           active={strandFilter === 'ALL'} 
           onClick={() => setStrandFilter('ALL')} 
           icon={<Layers size={14}/>} 
           type="ALL" 
           isDarkMode={isDarkMode} 
         />
         <FilterButton 
           label="ICT" 
           active={strandFilter === 'ICT'} 
           onClick={() => setStrandFilter('ICT')} 
           icon={<Cpu size={14}/>} 
           type="ICT" 
           isDarkMode={isDarkMode} 
         />
         <FilterButton 
           label="GAS" 
           active={strandFilter === 'GAS'} 
           onClick={() => setStrandFilter('GAS')} 
           icon={<BookOpen size={14}/>} 
           type="GAS" 
           isDarkMode={isDarkMode} 
         />
      </div>
      
      {/* 🎮 COMMAND ACTIONS */}
      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
        {sectionSelection.size > 0 && (
           <Button 
             onClick={() => setConfirmDeleteSelect(true)} 
             variant="destructive" 
             className="rounded-[18px] h-11 px-6 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-red-500/20 transition-all transform-gpu animate-in fade-in zoom-in slide-in-from-left-4 duration-500"
           >
              <Trash className="mr-2" size={14}/> Wipe ({sectionSelection.size})
           </Button>
        )}

        <DeleteManagementDialog 
          sections={sections} 
          onDelete={handleDeleteSection} 
          onClearStudents={handleClearAllStudents} 
          isDarkMode={isDarkMode} 
        />

        <div className="h-8 w-px bg-slate-500/10 mx-1 hidden md:block" />

        <Button
          onClick={() => onBalance(strandFilter)}
          disabled={isProcessing}
          className="rounded-[18px] bg-purple-600 hover:bg-purple-700 h-11 px-5 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-purple-500/20 transition-all transform-gpu active:scale-90 flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed text-white"
        >
          <Scale className="mr-2" size={16}/> Balance {strandFilter}
        </Button>

        <Button 
          onClick={() => initiateAdd('ICT')} 
          disabled={isProcessing} 
          className="rounded-[18px] bg-blue-600 hover:bg-blue-700 h-11 px-5 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-blue-500/20 transition-all transform-gpu active:scale-90 flex-1 sm:flex-none text-white"
        >
          <Plus className="mr-2" size={16}/> Add ICT
        </Button>
        
        <Button 
          onClick={() => initiateAdd('GAS')} 
          disabled={isProcessing} 
          className="rounded-[18px] bg-orange-600 hover:bg-orange-700 h-11 px-5 font-black uppercase text-[9px] tracking-widest shadow-lg shadow-orange-500/20 transition-all transform-gpu active:scale-90 flex-1 sm:flex-none text-white"
        >
          <Plus className="mr-2" size={16}/> Add GAS
        </Button>
      </div>
    </ThemedCard>
  )
})

SectionsHeader.displayName = "SectionsHeader"
