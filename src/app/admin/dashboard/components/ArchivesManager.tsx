// src/app/admin/dashboard/components/ArchivesManager.tsx

"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Activity, Trash2, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

export function ArchivesManager({ history, onDelete }: { history: any[], onDelete: (id: string) => Promise<void> }) {
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
        <DialogContent className="max-w-4xl rounded-[48px] p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950">
          <DialogHeader className="p-10 bg-blue-600 dark:bg-slate-900 text-white">
            <DialogTitle className="text-3xl font-black uppercase">Institutional Archives</DialogTitle>
            <DialogDescription className="text-slate-300 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Historical Snapshots & Baseline Matrix</DialogDescription>
          </DialogHeader>
          <div className="p-4 md:p-10 bg-white dark:bg-slate-950 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-500">School Year</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-500 text-center">Males</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-500 text-center">Females</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-500 text-center">Total</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-500 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((record, idx) => (
                  <TableRow key={record.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                    <TableCell className="py-6 px-6 font-black text-slate-900 dark:text-white uppercase">
                    {record.school_year} {idx === 1 && <span className="inline-flex items-center gap-2 ml-2"><Badge className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-none text-[8px]">BASELINE</Badge><span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Performance Reference</span></span>}
                    </TableCell>
                    <TableCell className="text-center font-bold text-blue-500 dark:text-blue-400">{record.male_total}</TableCell>
                    <TableCell className="text-center font-bold text-pink-500 dark:text-pink-400">{record.female_total}</TableCell>
                    <TableCell className="text-center font-black text-slate-900 dark:text-white">
                      <div className="flex items-center justify-center gap-2">
                        {record.male_total + record.female_total}
                        {idx + 1 < history.length && (() => {
                          const prev = history[idx + 1].male_total + history[idx + 1].female_total;
                          const curr = record.male_total + record.female_total;
                          if (curr > prev) return <TrendingUp size={14} className="text-emerald-500" />;
                          if (curr < prev) return <TrendingDown size={14} className="text-red-500" />;
                          return <span className="text-[8px] font-bold text-slate-400 uppercase flex items-center gap-1"><Minus size={12} /> (Constant)</span>;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <button onClick={() => { setSnapshotToDelete({id: record.id, year: record.school_year}); setIsDeleteModalOpen(true); }} className="p-3 text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all">
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
        <DialogContent className="max-w-md rounded-[32px] md:rounded-[40px] p-6 md:p-10 border-none shadow-2xl bg-white dark:bg-slate-950">
          <DialogHeader className="sr-only">
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>Confirm deletion of yearly snapshot</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-16 md:w-20 h-16 md:h-20 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center animate-bounce">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Confirm Purge</h3>
              <p className="text-slate-700 dark:text-slate-400 text-sm font-medium">
                Permanently delete matrix for <span className="font-black text-slate-900 dark:text-white uppercase">S.Y. {snapshotToDelete?.year}</span>?
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <Button 
                onClick={() => setIsDeleteModalOpen(false)} 
                variant="outline" 
                className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase border-slate-300 bg-slate-50 text-slate-700 dark:bg-transparent dark:border-slate-800 dark:text-slate-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmDelete} 
                className="flex-1 h-14 rounded-2xl bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white font-black text-[10px] uppercase shadow-lg shadow-red-100 dark:shadow-none"
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
