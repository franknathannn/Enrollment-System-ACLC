import { memo } from "react"
import { RefreshCw, Search, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemedCard } from "@/components/ThemedCard"
import { ThemedText } from "@/components/ThemedText"

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
      className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-6 md:p-8 rounded-[32px] border relative z-40 transition-colors duration-500"
      style={{ 
        backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : '#ffffff',
        borderColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#f1f5f9'
      }}
    >
      <div className="w-full md:w-auto">
        <ThemedText variant="h1" className={`text-3xl md:text-5xl ${isDarkMode ? 'text-white' : 'text-slate-900'}`} isDarkMode={isDarkMode}>Enrolled Students</ThemedText>
        <p className={`text-xs md:text-sm italic mt-2 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Official Registry of Admitted Students
        </p>
      </div>
      
      <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto flex-nowrap">
        <Button 
          onClick={() => fetchStudents(false)} 
          variant="ghost" 
          size="icon" 
          className={`rounded-2xl h-12 w-12 ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
        >
           <RefreshCw className={loading ? "animate-spin" : ""} />
        </Button>

        <div className="relative flex-1 min-w-[200px] md:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
          <Input 
            placeholder="Search LRN or Name..." 
            className="h-10 md:h-12 pl-10 w-full rounded-2xl bg-white dark:bg-slate-900/90 backdrop-blur-sm shadow-lg border font-bold text-sm text-black dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all duration-500" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ backgroundColor: isDarkMode ? undefined : '#ffffff', color: isDarkMode ? undefined : '#000000', borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : '#f1f5f9' }}
          />
        </div>

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
      </div>
    </ThemedCard>
  )
})

EnrolledHeader.displayName = "EnrolledHeader"