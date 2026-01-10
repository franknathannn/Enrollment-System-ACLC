// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\sections\components\AddSectionDialog.tsx

import { memo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
// ✅ FIXED: Added missing Badge import
import { Badge } from "@/components/ui/badge" 
// ✅ FIXED: Added missing Loader2 import
import { LayoutGrid, Plus, Info, Loader2 } from "lucide-react"

export const AddSectionDialog = memo(function AddSectionDialog({ 
  open, 
  onOpenChange, 
  strand, 
  onConfirm, 
  isProcessing, 
  isDarkMode 
}: any) {

  const isICT = strand === 'ICT';

  // 🧪 PROP-BASED THEME ENGINE (Ignoring Tailwind dark: selectors for sync accuracy)
  const theme = {
    surface: isDarkMode ? 'bg-slate-950' : 'bg-white',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSub: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    border: isDarkMode ? 'border-white/10' : 'border-slate-200',
    accent: isICT ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700',
    glow: isICT ? 'shadow-blue-500/20' : 'shadow-orange-500/20'
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
    >
      <DialogContent 
        className={`w-[95vw] md:w-full max-w-sm rounded-[32px] p-0 overflow-hidden border-none shadow-2xl transition-all duration-500 ${theme.surface}`}
      >
        {/* 🏙️ HEADER SECTION */}
        <div className={`p-8 pb-4 relative overflow-hidden ${isDarkMode ? 'bg-black/40' : 'bg-slate-50'}`}>
           {/* Lively Background Glow */}
           <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full -mr-16 -mt-16 opacity-20 ${isICT ? 'bg-blue-500' : 'bg-orange-500'}`} />
           
           <DialogHeader className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                 <div className={`p-2.5 rounded-xl border ${isICT ? 'border-blue-500/30 text-blue-500 bg-blue-500/5' : 'border-orange-500/30 text-orange-500 bg-orange-500/5'}`}>
                    <LayoutGrid size={20} />
                 </div>
                 <Badge className={`${isICT ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'} border-none px-2 py-0 font-black text-[8px] uppercase tracking-widest`}>
                    Add a new Section
                 </Badge>
              </div>
              <DialogTitle className={`text-2xl font-black uppercase tracking-tighter italic leading-none ${theme.textMain}`}>
                Expand Matrix?
              </DialogTitle>
              <DialogDescription className={`font-bold text-[10px] uppercase tracking-[0.15em] mt-2 ${theme.textSub}`}>
                Initializing a new <span className={isICT ? 'text-blue-500' : 'text-orange-500'}>{strand}</span> Sections.
              </DialogDescription>
           </DialogHeader>
        </div>

        {/* 📋 CONTENT SECTION */}
        <div className="p-8 pt-6">
           <div className={`p-4 rounded-2xl border border-dashed mb-8 flex items-start gap-3 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-300'}`}>
              <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
              <p className={`text-[10px] font-medium leading-relaxed italic ${theme.textSub}`}>
                The system will automatically assign the next sequential ID to this section. This action increases total capacity by 40 Sections.
              </p>
           </div>

           <DialogFooter className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => onOpenChange(false)} 
                variant="ghost" 
                className={`flex-1 h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 ${theme.textSub} hover:bg-slate-500/10`}
              >
                Abort
              </Button>
              <Button 
                onClick={onConfirm} 
                disabled={isProcessing}
                className={`flex-[2] h-12 rounded-2xl text-white font-black uppercase text-[10px] tracking-[0.2em] transition-all transform-gpu active:scale-95 shadow-lg ${theme.accent} ${theme.glow}`}
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} />
                    <span>Processing</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Confirm Creation</span>
                    <Plus size={14} />
                  </div>
                )}
              </Button>
           </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
})