"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Pencil, Save, X, Trash2, Database, Calendar, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"

interface Props {
  historyData: any[] 
  isDarkMode: boolean
}

export function HistoryEditor({ historyData, isDarkMode }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)

  const handleEdit = (record: any) => {
    setEditingId(record.id)
    setEditValues({ ...record })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('enrollment_predictions_data')
        .update({
          total_enrolled: parseInt(editValues.total_enrolled),
          jhs_graduates_count: parseInt(editValues.jhs_graduates_count),
          als_passers_count: parseInt(editValues.als_passers_count),
          others_count: parseInt(editValues.others_count)
        })
        .eq('id', editingId)

      if (error) throw error
      toast.success("Database record updated")
      setEditingId(null)
    } catch (error: any) {
      toast.error("Update failed")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record permanently?")) return
    const { error } = await supabase.from('enrollment_predictions_data').delete().eq('id', id)
    if (error) toast.error("Delete failed")
    else toast.success("Record removed")
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className={`gap-2 shadow-sm transition-all hover:scale-105 active:scale-95 border ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'}`}>
           <Database className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-indigo-500'}`} /> 
           <span className="hidden sm:inline font-bold">Manage Database</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto p-0 gap-0 bg-slate-950 border border-slate-800">
        
        {/* HEADER */}
        <div className="p-6 border-b sticky top-0 z-10 bg-slate-900 border-slate-800">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-900/30">
                    <Database className="w-5 h-5 text-blue-400" />
                </div>
                <DialogTitle className="text-xl font-bold text-white">Historical Data Manager</DialogTitle>
            </div>
            <DialogDescription className="text-slate-400">
                Modify past enrollment records directly. These values train the AI model for future predictions.
            </DialogDescription>
        </div>

        {/* TABLE AREA */}
        <div className="p-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-sm ring-1 ring-slate-800">
            <Table>
                <TableHeader className="bg-slate-950">
                <TableRow className="border-slate-800">
                    <TableHead className="w-[140px] font-bold text-slate-200">School Year</TableHead>
                    <TableHead className="text-blue-400 font-bold">Total Enrolled</TableHead>
                    <TableHead className="text-slate-400">JHS Pool</TableHead>
                    <TableHead className="text-slate-400">ALS Pool</TableHead>
                    <TableHead className="text-emerald-400 font-bold">Payees</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {historyData.map((record) => (
                    <TableRow key={record.id} className="hover:bg-slate-800/50 transition-colors border-slate-800/50">
                    
                    {editingId === record.id ? (
                        <>
                        <TableCell>
                            <Badge variant="outline" className="gap-1.5 py-1 pr-3 pl-2 h-8 text-sm font-medium border-slate-700 text-slate-200 bg-slate-800">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                {record.school_year}
                            </Badge>
                        </TableCell>
                        <TableCell><Input type="number" value={editValues.total_enrolled} onChange={e => setEditValues({...editValues, total_enrolled: e.target.value})} className="h-9 w-28 font-bold text-blue-400 border-blue-800 bg-blue-950/30 focus-visible:ring-blue-500" /></TableCell>
                        <TableCell><Input type="number" value={editValues.jhs_graduates_count} onChange={e => setEditValues({...editValues, jhs_graduates_count: e.target.value})} className="h-9 w-28 bg-slate-950 border-slate-700 text-white" /></TableCell>
                        <TableCell><Input type="number" value={editValues.als_passers_count} onChange={e => setEditValues({...editValues, als_passers_count: e.target.value})} className="h-9 w-28 bg-slate-950 border-slate-700 text-white" /></TableCell>
                        <TableCell><Input type="number" value={editValues.others_count} onChange={e => setEditValues({...editValues, others_count: e.target.value})} className="h-9 w-28 font-bold text-emerald-400 border-emerald-800 bg-emerald-950/30 focus-visible:ring-emerald-500" /></TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white shadow-md transition-all hover:scale-105"><Save className="w-4 h-4" /></Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-8 w-8 p-0 border-slate-700 hover:bg-slate-800 bg-transparent"><X className="w-4 h-4 text-slate-400" /></Button>
                            </div>
                        </TableCell>
                        </>
                    ) : (
                        <>
                        <TableCell>
                             <div className="font-bold text-slate-200 flex items-center gap-2">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {record.school_year}
                             </div>
                        </TableCell>
                        <TableCell>
                            <span className="font-black text-blue-400">{record.total_enrolled.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-slate-400">{record.jhs_graduates_count?.toLocaleString()}</TableCell>
                        <TableCell className="text-slate-400">{record.als_passers_count?.toLocaleString()}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-1.5">
                                <UserPlus className="w-3 h-3 text-emerald-500" />
                                <span className="font-bold text-emerald-400">{record.others_count || 0}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(record)} className="h-8 w-8 hover:bg-blue-900/30 hover:text-blue-400 text-slate-400"><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(record.id)} className="h-8 w-8 hover:bg-red-900/30 hover:text-red-400 text-slate-400"><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                        </TableCell>
                        </>
                    )}
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}