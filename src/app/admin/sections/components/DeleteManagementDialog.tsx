// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\sections\components\DeleteManagementDialog.tsx

import { memo, useMemo } from "react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import { 
  Settings2, 
  Trash2, 
  AlertTriangle, 
  Code, 
  BookOpen, 
  Layers, 
  ChevronRight,
  ShieldAlert
} from "lucide-react"
import { themeColors } from "@/lib/themeColors"

export const DeleteManagementDialog = memo(function DeleteManagementDialog({ sections, onDelete, onClearStudents, isDarkMode }: any) {
  
  // Logic: Group sections by Strand (RETAINED)
  const groupedSections = useMemo(() => {
    return sections.reduce((acc: any, sec: any) => {
      const strand = sec.strand || "Unassigned";
      if (!acc[strand]) acc[strand] = [];
      acc[strand].push(sec);
      return acc;
    }, {});
  }, [sections]);

  const getStrandIcon = (strand: string) => {
    if (strand.toUpperCase().includes('ICT')) return <Code size={16} className="text-blue-500" />;
    if (strand.toUpperCase().includes('GAS')) return <BookOpen size={16} className="text-orange-500" />;
    return <Layers size={16} className="text-slate-400" />;
  };

  // 🎨 PROP-BASED THEME ENGINE (Ignoring Tailwind dark: selectors)
  const theme = {
    surface: isDarkMode ? 'bg-slate-950' : 'bg-white',
    header: isDarkMode ? 'bg-black' : 'bg-slate-900',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textSub: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    border: isDarkMode ? 'border-white/10' : 'border-slate-200',
    itemBg: isDarkMode ? 'bg-white/[0.03]' : 'bg-slate-50',
    itemHover: isDarkMode ? 'hover:bg-white/[0.06]' : 'hover:bg-slate-100',
    dangerBg: isDarkMode ? 'bg-red-950/20' : 'bg-red-50',
    dangerBorder: isDarkMode ? 'border-red-900/30' : 'border-red-100'
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className={`rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest border shadow-sm transition-all group ${
            isDarkMode ? 'border-red-900/50 text-red-400 hover:bg-red-900/20' : 'border-red-100 text-red-500 hover:bg-red-500 hover:text-white'
          }`}
        >
          <Settings2 size={16} className="mr-2 group-hover:rotate-90 transition-transform duration-500" /> 
          Section Control
        </Button>
      </DialogTrigger>
      
      <DialogContent 
        className={`rounded-[32px] md:rounded-[48px] w-[95vw] max-w-xl p-0 overflow-hidden border-none shadow-2xl transition-all duration-500 ${theme.surface}`}
      >
        <Tabs defaultValue="sections" className="w-full">
          <DialogHeader className={`p-8 text-white relative overflow-hidden ${theme.header}`}>
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-[60px] rounded-full -mr-16 -mt-16" />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
              <div>
                <DialogTitle className="font-black uppercase tracking-tighter text-2xl italic flex items-center gap-2">
                  <div className="w-2 h-8 bg-blue-500 rounded-full" />
                  Control Center
                </DialogTitle>
                <DialogDescription className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1 ml-4">
                  Section Controlling Center
                </DialogDescription>
              </div>
              
              <TabsList className="bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
                <TabsTrigger 
                  value="sections" 
                  className="rounded-xl px-4 py-2 font-black uppercase text-[9px] data-[state=active]:bg-white data-[state=active]:text-slate-900 transition-all"
                >
                  Sections
                </TabsTrigger>
                <TabsTrigger 
                  value="danger" 
                  className="rounded-xl px-4 py-2 font-black uppercase text-[9px] data-[state=active]:bg-red-600 data-[state=active]:text-white transition-all"
                >
                  Student Deletion
                </TabsTrigger>
              </TabsList>
            </div>
          </DialogHeader>
          
          {/* TAB: SECTION MANAGEMENT */}
          <TabsContent value="sections" className="p-6 mt-0">
            <div className="max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {sections.length === 0 ? (
                <div className="py-20 text-center opacity-40 italic text-sm">No active matrices detected in hub.</div>
              ) : (
                <Accordion type="multiple" defaultValue={Object.keys(groupedSections)} className="space-y-4">
                  {Object.entries(groupedSections).map(([strand, strandSections]: any) => (
                    <AccordionItem 
                      key={strand} 
                      value={strand} 
                      className={`border-none rounded-[24px] overflow-hidden transition-all ${theme.itemBg} ${theme.itemHover}`}
                    >
                      <AccordionTrigger className="px-6 py-4 hover:no-underline group">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl shadow-sm border ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100'}`}>
                            {getStrandIcon(strand)}
                          </div>
                          <div className="text-left">
                            <p className={`font-black uppercase tracking-tighter text-sm leading-none ${theme.textMain}`}>
                              {strand} Strand
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                              {strandSections.length} Active Sections
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      
                      <AccordionContent className="px-4 pb-4 space-y-2">
                        {strandSections.map((sec: any) => (
                          <div 
                            key={sec.id} 
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                              isDarkMode 
                                ? 'bg-slate-950/50 border-white/5 hover:border-white/10' 
                                : 'bg-white border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-blue-500/50' : 'bg-blue-500'}`} />
                              <p className={`font-black uppercase tracking-tight text-[11px] ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                                {sec.section_name}
                              </p>
                            </div>
                            <Button 
                              onClick={() => onDelete(sec.id, sec.section_name, sec.strand)} 
                              size="sm" 
                              variant="ghost"
                              className="hover:bg-red-500 hover:text-white rounded-xl h-9 w-9 p-0 text-red-500 transition-all duration-300 transform-gpu active:scale-90"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </TabsContent>
          
          {/* TAB: DANGER ZONE */}
          <TabsContent value="danger" className="p-8 mt-0">
            <div className={`group relative p-8 rounded-[40px] border text-center overflow-hidden transition-all isolate ${theme.dangerBg} ${theme.dangerBorder}`}>
              {/* Critical State Pulse */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-red-600/50 blur-sm" />
              
              <div className="relative z-10 space-y-6">
                <div className="w-20 h-20 bg-red-600 rounded-[28px] flex items-center justify-center mx-auto text-white shadow-[0_10px_40px_rgba(220,38,38,0.3)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <ShieldAlert size={38} />
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-black text-red-600 uppercase tracking-tighter text-2xl leading-none italic">
                    SCHOOL RECORD DELETION
                  </h3>
                  <div className="flex flex-col gap-2">
                    <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-red-500/20 inline-block mx-auto ${isDarkMode ? 'bg-red-950/40 text-red-300' : 'bg-white text-red-500'}`}>
                      Level 5 Security Action
                    </div>
                    <p className={`text-xs font-medium leading-relaxed max-w-[280px] mx-auto mt-2 ${isDarkMode ? 'text-red-200/60' : 'text-red-400'}`}>
                      Warning: This protocol erases the entire student data. Data recovery is <span className="underline font-bold">physically impossible</span> after execution.
                    </p>
                  </div>
                </div>
                
                <Button 
                  onClick={onClearStudents} 
                  className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  Execute Registry Wipe <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
})