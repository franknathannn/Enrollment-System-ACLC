// src/app/admin/dashboard/components/ArchivesManager.tsx

"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Activity, Trash2, TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowRight } from "lucide-react"
import { toast } from "sonner"

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
        <DialogTrigger asChild>
          <Button variant="outline" className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border py-2 flex-1 md:flex-none h-14 px-6 md:px-8 rounded-2xl font-black text-[10px] uppercase transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 bg-white text-black border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:text-white dark:border-slate-800 dark:hover:bg-slate-900">
              <Activity /> Archives
          </Button>
        </DialogTrigger>
        <DialogContent 
          className="max-w-4xl rounded-[48px] p-0 overflow-hidden border-none shadow-2xl transition-colors duration-500"
          style={{ backgroundColor: '#020617' }}
        >
          <DialogHeader className="p-10 text-white bg-slate-900">
            <DialogTitle className="text-3xl font-black uppercase">Institutional Archives</DialogTitle>
            <DialogDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Historical Record Archives</DialogDescription>
          </DialogHeader>
          <div className="p-4 md:p-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <Table className="border-separate border-spacing-y-2">
              <TableHeader className="bg-slate-900/50">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">School Year</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 text-center">Males</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 text-center">Females</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 text-center">Total</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record, idx) => (
                  <TableRow 
                    key={record.id} 
                    className="hover:bg-slate-900/50 transition-all rounded-2xl"
                    style={{ backgroundColor: 'rgba(30, 41, 59, 0.3)' }}
                  >
                    <TableCell className="py-6 px-6 font-black uppercase rounded-l-2xl" style={{ color: '#fff' }}>
                      {record.school_year} 
                      {idx === history.length - 1 && <span className="ml-2 text-[8px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">BASELINE</span>}
                    </TableCell>
                    <TableCell className="text-center font-bold text-blue-400">{record.male_total}</TableCell>
                    <TableCell className="text-center font-bold text-pink-400">{record.female_total}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="font-black text-lg" style={{ color: '#fff' }}>
                          {record.male_total + record.female_total}
                        </span>
                        {idx + 1 < history.length && (() => {
                          const prev = history[idx + 1].male_total + history[idx + 1].female_total;
                          const curr = record.male_total + record.female_total;
                          const diff = curr - prev;
                          const percent = prev > 0 ? ((diff / prev) * 100).toFixed(1) : 0;
                          
                          if (curr > prev) return (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <TrendingUp size={10} /> +{diff} ({percent}%)
                            </div>
                          );
                          if (curr < prev) return (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                              <TrendingDown size={10} /> {diff} ({percent}%)
                            </div>
                          );
                          return (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-full">
                              <Minus size={10} /> No Change
                            </div>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-6 rounded-r-2xl">
                      <button onClick={() => { setSnapshotToDelete({id: record.id, year: record.school_year}); setIsDeleteModalOpen(true); }} className="p-2 rounded-xl hover:bg-red-900/20 text-red-400 hover:text-red-600 transition-all">
                        <Trash2 size={18} />
                      </button>
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
          className="max-w-md rounded-[32px] md:rounded-[40px] p-6 md:p-10 border-none shadow-2xl transition-colors duration-500"
          style={{ backgroundColor: '#020617' }}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>Confirm deletion of yearly snapshot</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-16 md:w-20 h-16 md:h-20 bg-red-950 text-red-400 rounded-full flex items-center justify-center animate-bounce">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white">Confirm Purge</h3>
              <p className="text-slate-400 text-sm font-medium">
                Permanently delete matrix for <span className="font-black text-white uppercase">S.Y. {snapshotToDelete?.year}</span>?
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <Button 
                onClick={() => setIsDeleteModalOpen(false)} 
                variant="outline" 
                className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase bg-transparent border-slate-800 text-slate-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmDelete} 
                className="flex-1 h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase shadow-none"
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
