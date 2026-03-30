"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Pencil, Save, X, Trash2, Database, Calendar, UserPlus, GraduationCap, BookOpen, Users, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HistoryRecord } from "../types"

interface Props {
  historyData: HistoryRecord[] 
  isDarkMode: boolean
}

export function HistoryEditor({ historyData, isDarkMode }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

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
          total_enrolled: parseInt(editValues.total_enrolled) || 0,
          jhs_graduates_count: parseInt(editValues.jhs_graduates_count) || 0,
          als_passers_count: parseInt(editValues.als_passers_count) || 0,
          others_count: parseInt(editValues.others_count) || 0
        })
        .eq('id', editingId)

      if (error) throw error
      toast.success("Record updated successfully")
      setEditingId(null)
    } catch (error: any) {
      toast.error("Update failed")
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (editingId) {
      if (e.key === "Enter") {
        e.preventDefault()
        handleSave()
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setEditingId(null)
      }
    }
  }, [editingId, editValues])
  
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record permanently?")) return
    const { error } = await supabase.from('enrollment_predictions_data').delete().eq('id', id)
    if (error) toast.error("Delete failed")
    else toast.success("Record removed")
  }

  return (
    <>
      <style>{`
        .db-trigger-btn {
          background: ${isDarkMode ? 'linear-gradient(135deg, #334155 0%, #1e293b 100%)' : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'};
          border: 1px solid ${isDarkMode ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.2)'};
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .db-trigger-btn:hover { 
          border-color: rgba(99,102,241,0.4);
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(99,102,241,0.15);
        }

        .db-dialog {
          background: ${isDarkMode ? '#0f172a' : '#ffffff'};
          border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'};
          box-shadow: 0 40px 80px rgba(0,0,0,0.4);
        }

        .db-header {
          background: ${isDarkMode ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.8)'};
          backdrop-filter: blur(20px);
          border-bottom: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
        }

        .db-table-container {
          border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
          border-radius: 16px;
          overflow: hidden;
        }

        .db-row {
          transition: all 0.2s ease;
        }
        .db-row:hover {
          background: ${isDarkMode ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.03)'};
        }

        .db-input {
          background: ${isDarkMode ? 'rgba(2, 6, 23, 0.5)' : 'rgba(255, 255, 255, 0.8)'} !important;
          border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} !important;
          color: ${isDarkMode ? 'white' : 'black'} !important;
        }
        .db-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.2) !important;
        }

        .db-year-badge {
          background: ${isDarkMode ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.8)'};
          border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
        }
      `}</style>

      <div className="db-manager">
        <Dialog>
          <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <button className={`db-trigger-btn inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  <Database className="w-4 h-4 text-indigo-500" />
                  <span className="hidden sm:inline uppercase tracking-widest text-[10px]">Manage History</span>
                </button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white border-slate-800 text-xs">
              View and edit historical enrollment records
            </TooltipContent>
          </Tooltip>
          </TooltipProvider>

          <DialogContent className="db-dialog w-[calc(100vw-24px)] max-w-4xl max-h-[88vh] p-0 gap-0 rounded-2xl overflow-hidden">
            {/* HEADER */}
            <div className="db-header px-8 py-6 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${isDarkMode ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-100'}`}>
                    <Database className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div>
                    <DialogTitle className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      Historical Data
                    </DialogTitle>
                    <DialogDescription className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Manage past records to refine prediction accuracy
                    </DialogDescription>
                  </div>
                </div>

                <div className={`px-4 py-2 rounded-xl flex items-center gap-3 border ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Records</span>
                  <span className={`text-sm font-black tabular-nums ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    {historyData.length}
                  </span>
                </div>
              </div>
            </div>

            {/* CONTENT */}
            <div className="overflow-y-auto max-h-[calc(88vh-100px)] px-8 pb-8 pt-4">
              {historyData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <Database className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="text-slate-500 font-medium">No historical records found</p>
                </div>
              ) : (
                <div className="db-table-container">
                  <Table>
                    <TableHeader className={isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}>
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className={`text-[10px] font-black uppercase tracking-widest py-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>School Year</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-sky-500">Total Enrolled</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-violet-500">JHS Grads</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-amber-500">ALS Passers</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-emerald-500">Payees</TableHead>
                        <TableHead className="text-right py-4"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.map((record) => (
                        <TableRow 
                          key={record.id} 
                          className={`db-row border-slate-500/5 ${editingId === record.id ? 'bg-indigo-500/5' : ''}`}
                          onMouseEnter={() => setHoveredRow(record.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          {editingId === record.id ? (
                            <>
                              <TableCell className="py-4">
                                <div className={`db-year-badge inline-flex items-center gap-2 px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                  {record.school_year}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <Input
                                  type="number"
                                  value={editValues.total_enrolled}
                                  onChange={e => setEditValues({...editValues, total_enrolled: e.target.value})}
                                  className="db-input h-9 w-24 font-black tabular-nums"
                                />
                              </TableCell>
                              <TableCell className="py-4">
                                <Input
                                  type="number"
                                  value={editValues.jhs_graduates_count}
                                  onChange={e => setEditValues({...editValues, jhs_graduates_count: e.target.value})}
                                  className="db-input h-9 w-24 font-black tabular-nums text-violet-500"
                                />
                              </TableCell>
                              <TableCell className="py-4">
                                <Input
                                  type="number"
                                  value={editValues.als_passers_count}
                                  onChange={e => setEditValues({...editValues, als_passers_count: e.target.value})}
                                  className="db-input h-9 w-24 font-black tabular-nums text-amber-500"
                                />
                              </TableCell>
                              <TableCell className="py-4">
                                <Input
                                  type="number"
                                  value={editValues.others_count}
                                  onChange={e => setEditValues({...editValues, others_count: e.target.value})}
                                  className="db-input h-9 w-24 font-black tabular-nums text-emerald-500"
                                />
                              </TableCell>
                              <TableCell className="py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 h-8 w-8 p-0 rounded-lg">
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-8 w-8 p-0 rounded-lg">
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="py-4">
                                <div className={`db-year-badge inline-flex items-center gap-2 px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                  <Calendar className="w-3 h-3 opacity-50" />
                                  {record.school_year}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <span className="text-sm font-black tabular-nums text-sky-500">
                                  {record.total_enrolled.toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell className="py-4">
                                <span className={`text-sm font-bold tabular-nums ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {record.jhs_graduates_count?.toLocaleString() ?? '—'}
                                </span>
                              </TableCell>
                              <TableCell className="py-4">
                                <span className={`text-sm font-bold tabular-nums ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {record.als_passers_count?.toLocaleString() ?? '—'}
                                </span>
                              </TableCell>
                              <TableCell className="py-4">
                                <span className="text-sm font-black tabular-nums text-emerald-500">
                                  {(record.others_count || 0).toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell className="py-4 text-right">
                                <div className={`flex justify-end gap-1 transition-opacity duration-200 ${hoveredRow === record.id ? 'opacity-100' : 'opacity-0'}`}>
                                  <Button size="sm" variant="ghost" onClick={() => handleEdit(record)} className={`h-8 w-8 p-0 rounded-lg hover:bg-indigo-500/10 ${isDarkMode ? 'text-slate-300 hover:text-indigo-400' : 'text-slate-600 hover:text-indigo-600'}`}>
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDelete(record.id)} className={`h-8 w-8 p-0 rounded-lg hover:bg-red-500/10 ${isDarkMode ? 'text-slate-300 hover:text-red-400' : 'text-slate-600 hover:text-red-600'}`}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 border ${isDarkMode ? 'bg-amber-500/5 border-amber-500/10' : 'bg-amber-50 border-amber-100'}`}>
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className={`text-[10px] leading-relaxed font-medium ${isDarkMode ? 'text-amber-200/70' : 'text-amber-700'}`}>
                  Historical data directly influences the AI model&apos;s training set. 
                  Ensure accuracy when making modifications as they will trigger a re-calculation of all projections.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}