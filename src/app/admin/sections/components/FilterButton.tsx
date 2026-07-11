// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\sections\components\FilterButton.tsx

import { memo } from "react"

export const FilterButton = memo(function FilterButton({ label, active, onClick, icon, type, isDarkMode }: any) {
  let activeClass = 'bg-slate-900 !text-white border border-slate-500 dark:border-slate-400'
  let hoverClass = 'hover:bg-slate-500/10 hover:!text-slate-400'

  if (type === 'ICT' || type === 'TechPro') {
    activeClass = 'bg-blue-600 !text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
    hoverClass = 'hover:bg-blue-500/10 hover:!text-blue-500'
  } else if (type === 'GAS' || type === 'Academic Track') {
    activeClass = 'bg-orange-600 !text-white shadow-[0_0_20px_rgba(234,88,12,0.4)]'
    hoverClass = 'hover:bg-orange-500/10 hover:!text-orange-500'
  } else if (type === 'STEM') {
    activeClass = 'bg-emerald-600 !text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
    hoverClass = 'hover:bg-emerald-500/10 hover:!text-emerald-500'
  } else if (type === 'HUMSS') {
    activeClass = 'bg-amber-600 !text-white shadow-[0_0_20px_rgba(217,119,6,0.4)]'
    hoverClass = 'hover:bg-amber-500/10 hover:!text-amber-500'
  } else if (type === 'ABM') {
    activeClass = 'bg-yellow-500 !text-white shadow-[0_0_20px_rgba(234,179,8,0.4)]'
    hoverClass = 'hover:bg-yellow-500/10 hover:!text-yellow-500'
  }

  return (
    <button 
      onClick={onClick} 
      className={`flex items-center gap-2 px-6 py-2.5 rounded-[18px] font-black uppercase text-[10px] tracking-widest transition-all duration-300 relative overflow-hidden isolate ${
        active 
          ? `${activeClass} scale-105 z-10` 
          : `text-slate-500 dark:text-slate-400 bg-transparent ${hoverClass}`
      }`}
    >
      {/* Internal Specular Highlight for Active State */}
      {active && (
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-40 pointer-events-none" />
      )}
      
      <span className={`shrink-0 transition-transform duration-500 ${active ? 'scale-110' : 'opacity-40'}`}>
        {icon}
      </span>
      
      <span className="relative z-10">{label}</span>
    </button>
  )
})