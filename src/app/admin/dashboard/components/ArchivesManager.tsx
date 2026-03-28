// src/app/admin/dashboard/components/ArchivesManager.tsx

"use client"

import { useState } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Activity, Trash2, TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function ArchivesManager({ history, onDelete, isDarkMode }: { history: any[], onDelete: (id: string) => Promise<void>, isDarkMode: boolean }) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [snapshotToDelete, setSnapshotToDelete] = useState<{id: string, year: string} | null>(null)

  const confirmDelete = async () => {
    if (!snapshotToDelete) return;
    try {
      await onDelete(snapshotToDelete.id)
      toast.success(`Purged Archive: ${snapshotToDelete.year}`)
    } catch (error) { 
      toast.error("Purge Failed.") 
    } finally { 
      setIsDeleteModalOpen(false)
      setSnapshotToDelete(null)
    }
  }

  return (
    <>
      <Dialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" className={`inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border py-2 flex-1 md:flex-none h-14 px-6 md:px-8 rounded-2xl font-black text-[10px] uppercase transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 ${isDarkMode ? 'bg-slate-950 text-white border-slate-800 hover:bg-slate-900' : 'bg-white text-black border-slate-200 hover:bg-slate-50'}`}>
                  <Activity /> Archives
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900/95 backdrop-blur-xl text-white border-slate-800 rounded-xl p-3"><p className="font-bold text-[9px] uppercase tracking-widest">Historical Enrollment Records</p></TooltipContent>
        </Tooltip>
        <DialogContent 
          className="max-w-4xl rounded-[48px] p-0 overflow-hidden border-none shadow-2xl transition-all duration-500"
          style={{ backgroundColor: isDarkMode ? '#020617' : '#ffffff' }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className={`p-10 md:p-14 ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50'} border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between gap-6">
              <div className="space-y-1">
                <DialogTitle className={`text-3xl md:text-4xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Institutional Archives</DialogTitle>
                <DialogDescription className="text-blue-500 font-black uppercase text-[10px] tracking-[0.3em]">Historical Record Snapshots</DialogDescription>
              </div>
              <Link
                href="/admin/archive"
                className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"
              >
                <ArrowRight size={14} /> View Archive Students
              </Link>
            </div>
          </DialogHeader>
          <div className="p-8 md:p-14 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <Table className="border-separate border-spacing-y-4">
              <TableHeader className={isDarkMode ? 'bg-slate-900/30' : 'bg-slate-50/50'}>
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-500">School Year</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-500 text-center">Males</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-500 text-center">Females</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-500 text-center">Cohort Total</TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record, idx) => (
                  <TableRow 
                    key={record.id} 
                    className={`transition-all duration-300 rounded-[32px] group hover:shadow-xl ${isDarkMode ? 'hover:bg-slate-900/80' : 'hover:bg-slate-50'}`}
                    style={{ backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.3)' : 'rgba(241, 245, 249, 0.5)' }}
                  >
                    <TableCell className="py-8 px-8 font-black uppercase rounded-l-[32px]">
                      <div className="flex items-center gap-4">
                        <Link
                          href={`/admin/archive?year=${encodeURIComponent(record.school_year)}`}
                          className={`text-lg md:text-xl transition-colors flex items-center gap-3 group/link ${isDarkMode ? 'text-white hover:text-blue-400' : 'text-slate-900 hover:text-blue-600'}`}
                        >
                          {record.school_year}
                          <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-blue-500" />
                        </Link>
                        {idx === history.length - 1 && (
                          <span className="text-[8px] px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-black tracking-widest">BASELINE</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-black text-blue-500 text-lg tabular-nums">{record.male_total}</TableCell>
                    <TableCell className="text-center font-black text-pink-500 text-lg tabular-nums">{record.female_total}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className={`font-black text-2xl tabular-nums ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {record.male_total + record.female_total}
                        </span>
                        {idx + 1 < history.length && (() => {
                          const prev = history[idx + 1].male_total + history[idx + 1].female_total;
                          const curr = record.male_total + record.female_total;
                          const diff = curr - prev;
                          const percent = prev > 0 ? ((diff / prev) * 100).toFixed(1) : 0;
                          
                          if (curr > prev) return (
                            <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                              <TrendingUp size={12} /> +{diff} ({percent}%)
                            </div>
                          );
                          if (curr < prev) return (
                            <div className="flex items-center gap-1 text-[10px] font-black text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                              <TrendingDown size={12} /> {diff} ({percent}%)
                            </div>
                          );
                          return (
                            <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 bg-slate-500/10 px-3 py-1 rounded-full border border-slate-500/20">
                              <Minus size={12} /> No Change
                            </div>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-8 rounded-r-[32px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button onClick={() => { setSnapshotToDelete({id: record.id, year: record.school_year}); setIsDeleteModalOpen(true); }} className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-red-50 text-red-500'} active:scale-90`}>
                            <Trash2 size={20} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-red-900 text-white border-red-800 rounded-xl p-3"><p className="font-bold text-[9px] uppercase tracking-widest">Purge Snaphot</p></TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}> 
        <DialogContent 
          className="max-w-md rounded-[48px] p-10 md:p-14 border-none shadow-2xl transition-all duration-500"
          style={{ backgroundColor: isDarkMode ? '#020617' : '#ffffff' }}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>Confirm deletion of yearly snapshot</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="w-20 md:w-24 h-20 md:h-24 bg-red-500/10 text-red-500 rounded-[32px] flex items-center justify-center animate-bounce shadow-xl shadow-red-500/10 border border-red-500/20">
              <AlertTriangle size={40} />
            </div>
            <div className="space-y-3">
              <h3 className={`text-2xl md:text-3xl font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Confirm Purge</h3>
              <p className="text-slate-400 text-[13px] font-bold leading-relaxed px-4">
                Permanently delete archive matrix for <span className={`font-black uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>S.Y. {snapshotToDelete?.year}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-4 w-full">
              <Button 
                onClick={() => setIsDeleteModalOpen(false)} 
                variant="outline" 
                className={`flex-1 h-16 rounded-[24px] font-black text-[11px] uppercase tracking-widest border-2 transition-all active:scale-95 ${isDarkMode ? 'bg-transparent border-slate-800 text-slate-300 hover:bg-slate-900' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmDelete} 
                className="flex-1 h-16 rounded-[24px] bg-red-600 hover:bg-red-700 text-white font-black text-[11px] uppercase tracking-widest shadow-xl shadow-red-500/20 transition-all active:scale-95"
              >
                Purge Record
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}