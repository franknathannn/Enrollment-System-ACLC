// src/app/admin/schedules/components/SectionList.tsx
import { memo } from "react"
import { ChevronRight } from "lucide-react"

export const SectionList = memo(({ sections, onSelectSection, isDarkMode }: any) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {sections.map((sec: any) => {
        const isICT = sec.strand === 'ICT'
        const students = sec.students || []
        const activeStudents = students.filter((s: any) => s.status === 'Accepted' || s.status === 'Approved')
        const mCount = activeStudents.filter((s: any) => s.gender === 'Male').length
        const fCount = activeStudents.filter((s: any) => s.gender === 'Female').length
        const capacity = sec.capacity || 40

        return (
          <div
            key={sec.id}
            onClick={() => onSelectSection(sec)}
            className={`cursor-pointer group rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden relative ${
              isDarkMode 
                ? 'border-slate-800 bg-slate-900 hover:border-slate-700' 
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            {/* Color stripe */}
            <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${isICT ? 'bg-blue-500' : 'bg-orange-500'}`} />
            
            <div className="p-5 pl-6 flex flex-col h-full relative">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className={`text-xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {sec.section_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      isICT 
                        ? (isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700')
                        : (isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700')
                    }`}>
                      {sec.strand} STRAND
                    </span>
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1 ${
                  isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  <ChevronRight size={16} />
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-auto pt-4 space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-blue-500">{mCount} Male</span>
                  <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>
                    {activeStudents.length} / {capacity}
                  </span>
                  <span className="text-pink-500">{fCount} Female</span>
                </div>
                <div className={`h-2 w-full rounded-full overflow-hidden flex ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {activeStudents.length > 0 ? (
                    <>
                      <div className="bg-blue-500 h-full" style={{ width: `${(mCount / capacity) * 100}%` }} />
                      <div className="bg-pink-500 h-full" style={{ width: `${(fCount / capacity) * 100}%` }} />
                    </>
                  ) : (
                    <div className="w-full h-full" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
})
