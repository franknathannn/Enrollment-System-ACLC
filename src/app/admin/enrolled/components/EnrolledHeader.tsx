import { memo } from "react"
import { RefreshCw, Search, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemedCard } from "@/components/ThemedCard"
import { ThemedText } from "@/components/ThemedText"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface EnrolledHeaderProps {
  isDarkMode: boolean
  loading: boolean
  fetchStudents: (isBackground?: boolean) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  onExport: () => void
}

export const EnrolledHeader = memo(({ isDarkMode, loading, fetchStudents, searchTerm, setSearchTerm, onExport }: EnrolledHeaderProps) => {
  return (
    <ThemedCard
      className="flex flex-col md:flex-row justify-between items-center md:items-end gap-4 p-4 md:p-8 rounded-[32px] border relative z-40 transition-colors duration-500 overflow-hidden"
      style={{
        backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : '#ffffff',
        borderColor: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : '#e2e8f0',
        width: '100%',
        maxWidth: '100%'
      }}
    >
      {/* Top accent strip */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />
      {/* Ambient glow */}
      <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-[60px] pointer-events-none ${isDarkMode ? 'bg-emerald-500/6' : 'bg-emerald-400/5'}`} />

      <div className="w-full md:w-auto text-center md:text-left">
        <div className="flex items-center gap-2.5 justify-center md:justify-start mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <p className={`text-[9px] font-black uppercase tracking-[0.4em] ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Official Registry</p>
        </div>
        <ThemedText variant="h1" className={`text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`} isDarkMode={isDarkMode}>Enrolled</ThemedText>
        <p className={`text-[11px] font-semibold mt-1.5 italic ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Official List of Enrolled Students
        </p>
      </div>
      
      <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto flex-wrap justify-center md:justify-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              onClick={() => fetchStudents(false)} 
              variant="ghost" 
              size="icon" 
              className={`rounded-2xl h-12 w-12 ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
            >
               <RefreshCw className={loading ? "animate-spin" : ""} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Refresh Data</p></TooltipContent>
        </Tooltip>

        <div className="relative flex-1 w-full md:w-auto md:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Input 
                placeholder="Search LRN, Name or Tracking ID..." 
                className="h-10 md:h-12 pl-10 w-full rounded-2xl bg-white dark:bg-slate-900/90 backdrop-blur-sm shadow-lg border font-bold text-sm text-black dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all duration-500" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ backgroundColor: isDarkMode ? undefined : '#ffffff', color: isDarkMode ? undefined : '#000000', borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : '#f1f5f9' }}
              />
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Search by Student LRN, NAME or Tracking ID.</p></TooltipContent>
          </Tooltip>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
            onClick={onExport}
            className={`h-10 md:h-12 px-3 md:px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shrink-0 transform hover:scale-105 flex items-center justify-center gap-2 border ${
              isDarkMode 
                ? 'bg-white text-black hover:bg-slate-200 border-white/50' 
                : 'bg-slate-900 text-white hover:bg-slate-800 border-slate-700/50'
            }`}
          >
            <FileDown size={16} />
            <span className="hidden sm:inline">Export List</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 text-white border-slate-800"><p>Download Enrolled List</p></TooltipContent>
        </Tooltip>
      </div>
    </ThemedCard>
  )
})

EnrolledHeader.displayName = "EnrolledHeader"