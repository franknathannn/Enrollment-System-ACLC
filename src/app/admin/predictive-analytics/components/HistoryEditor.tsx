"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Pencil, Save, X, Trash2, Database, Calendar, UserPlus, GraduationCap, BookOpen, Users } from "lucide-react"
import { toast } from "sonner"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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

  const columns = [
    { label: "School Year", icon: Calendar, color: "text-slate-300" },
    { label: "Total Enrolled", icon: Users, color: "text-sky-400" },
    { label: "JHS Graduates", icon: GraduationCap, color: "text-violet-400" },
    { label: "ALS Passers", icon: BookOpen, color: "text-amber-400" },
    { label: "Payees", icon: UserPlus, color: "text-emerald-400" },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .db-manager * { font-family: 'DM Sans', sans-serif; }
        .db-mono { font-family: 'DM Mono', monospace !important; }

        .db-trigger-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(148,163,184,0.15);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .db-trigger-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .db-trigger-btn:hover::before { opacity: 1; }
        .db-trigger-btn:hover { 
          border-color: rgba(99,102,241,0.4);
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(99,102,241,0.2), 0 0 0 1px rgba(99,102,241,0.1);
        }
        .db-trigger-btn:active { transform: translateY(0) scale(0.98); }

        .db-dialog-overlay {
          background: rgba(2, 6, 23, 0.92);
          backdrop-filter: blur(12px);
        }

        .db-dialog {
          background: #060c1a;
          border: 1px solid rgba(148,163,184,0.08);
          box-shadow: 
            0 0 0 1px rgba(99,102,241,0.08),
            0 40px 80px rgba(0,0,0,0.8),
            inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .db-header {
          background: linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(10,16,35,0.98) 100%);
          border-bottom: 1px solid rgba(148,163,184,0.06);
          backdrop-filter: blur(20px);
        }

        .db-icon-glow {
          background: linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.15) 100%);
          box-shadow: 0 0 20px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.1);
          border: 1px solid rgba(99,102,241,0.2);
        }

        .db-stats-bar {
          background: rgba(15,23,42,0.6);
          border: 1px solid rgba(148,163,184,0.06);
          border-radius: 12px;
        }

        .db-table-container {
          border: 1px solid rgba(148,163,184,0.07);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03);
        }

        .db-thead {
          background: linear-gradient(180deg, rgba(10,16,35,1) 0%, rgba(8,13,28,1) 100%);
        }

        .db-th {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(148,163,184,0.08);
          white-space: nowrap;
        }

        .db-row {
          border-bottom: 1px solid rgba(148,163,184,0.04);
          transition: all 0.2s ease;
          position: relative;
        }
        .db-row:last-child { border-bottom: none; }
        .db-row:hover { background: rgba(99,102,241,0.04); }
        .db-row.editing { background: rgba(99,102,241,0.06); }
        .db-row.editing td { border-top: 1px solid rgba(99,102,241,0.15); border-bottom: 1px solid rgba(99,102,241,0.15); }

        .db-td { padding: 13px 16px; }

        .db-year-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px 4px 8px;
          border-radius: 8px;
          background: rgba(15,23,42,0.8);
          border: 1px solid rgba(148,163,184,0.1);
          font-size: 13px;
          font-weight: 600;
          color: #e2e8f0;
          white-space: nowrap;
        }

        .db-number { 
          font-family: 'DM Mono', monospace;
          font-size: 14px;
          font-weight: 500;
        }

        .db-input {
          height: 36px;
          width: 110px;
          border-radius: 8px;
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
          background: rgba(10,16,35,0.8) !important;
          border: 1px solid rgba(148,163,184,0.12) !important;
          color: white !important;
        }
        .db-input:focus {
          border-color: rgba(99,102,241,0.5) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important;
          outline: none !important;
        }
        .db-input-highlight {
          border-color: rgba(99,102,241,0.3) !important;
          color: #818cf8 !important;
        }
        .db-input-emerald {
          border-color: rgba(52,211,153,0.2) !important;
          color: #34d399 !important;
        }

        .db-save-btn {
          height: 34px; width: 34px; padding: 0;
          border-radius: 9px;
          background: linear-gradient(135deg, #059669, #047857);
          border: none;
          box-shadow: 0 4px 12px rgba(5,150,105,0.35);
          transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
          display: flex; align-items: center; justify-content: center;
        }
        .db-save-btn:hover { 
          background: linear-gradient(135deg, #10b981, #059669);
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(5,150,105,0.5);
        }

        .db-cancel-btn {
          height: 34px; width: 34px; padding: 0;
          border-radius: 9px;
          background: rgba(30,41,59,0.8);
          border: 1px solid rgba(148,163,184,0.12);
          transition: all 0.2s ease;
          display: flex; align-items: center; justify-content: center;
        }
        .db-cancel-btn:hover {
          background: rgba(51,65,85,0.8);
          border-color: rgba(148,163,184,0.25);
        }

        .db-edit-btn {
          height: 32px; width: 32px; padding: 0;
          border-radius: 8px;
          background: transparent;
          border: 1px solid transparent;
          transition: all 0.2s ease;
          display: flex; align-items: center; justify-content: center;
          color: #64748b;
        }
        .db-edit-btn:hover {
          background: rgba(99,102,241,0.12);
          border-color: rgba(99,102,241,0.2);
          color: #818cf8;
          transform: scale(1.05);
        }

        .db-delete-btn {
          height: 32px; width: 32px; padding: 0;
          border-radius: 8px;
          background: transparent;
          border: 1px solid transparent;
          transition: all 0.2s ease;
          display: flex; align-items: center; justify-content: center;
          color: #64748b;
        }
        .db-delete-btn:hover {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.2);
          color: #f87171;
          transform: scale(1.05);
        }

        .db-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22d3ee;
          box-shadow: 0 0 8px rgba(34,211,238,0.6);
          animation: db-pulse 2s ease-in-out infinite;
        }
        @keyframes db-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }

        .db-scrollbar::-webkit-scrollbar { width: 5px; }
        .db-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .db-scrollbar::-webkit-scrollbar-thumb { 
          background: rgba(99,102,241,0.3); 
          border-radius: 10px;
        }
        .db-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.5); }

        .db-empty-state {
          padding: 60px 20px;
          text-align: center;
          color: #334155;
        }

        .db-col-sky { color: #38bdf8; }
        .db-col-violet { color: #a78bfa; }
        .db-col-amber { color: #fbbf24; }
        .db-col-emerald { color: #34d399; }
        .db-col-muted { color: #475569; }
      `}</style>

      <div className="db-manager">
        <Dialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <button className="db-trigger-btn inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-200">
                  <Database className="w-4 h-4 text-indigo-400" />
                  <span className="hidden sm:inline">Manage Database</span>
                </button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white border-slate-800 text-xs">
              View and edit historical enrollment records
            </TooltipContent>
          </Tooltip>

          <DialogContent className="db-dialog max-w-4xl max-h-[88vh] p-0 gap-0 rounded-2xl overflow-hidden">

            {/* HEADER */}
            <div className="db-header px-7 pt-6 pb-5 sticky top-0 z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="db-icon-glow w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Database className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <DialogTitle className="text-[17px] font-700 text-white tracking-tight" style={{fontWeight: 700}}>
                        Historical Data Manager
                      </DialogTitle>
                      <div className="db-dot" />
                    </div>
                    <DialogDescription className="text-[13px] text-slate-500 leading-snug">
                      Edit past enrollment records · Changes retrain the prediction model
                    </DialogDescription>
                  </div>
                </div>

                {/* Stats Pills */}
                <div className="hidden md:flex items-center gap-2">
                  <div className="db-stats-bar px-3 py-1.5 flex items-center gap-2">
                    <span className="text-[11px] font-500 text-slate-500 uppercase tracking-wider">Records</span>
                    <span className="db-mono text-sm font-600 text-indigo-400" style={{fontFamily: "'DM Mono', monospace", fontWeight: 600}}>
                      {historyData.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CONTENT */}
            <div className="db-scrollbar overflow-y-auto" style={{maxHeight: 'calc(88vh - 110px)'}}>
              <div className="px-7 pb-7 pt-4">

                {historyData.length === 0 ? (
                  <div className="db-table-container">
                    <div className="db-empty-state">
                      <Database className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-slate-500 text-sm">No records found</p>
                    </div>
                  </div>
                ) : (
                  <div className="db-table-container">
                    <table className="w-full border-collapse">
                      <thead className="db-thead">
                        <tr>
                          <th className="db-th text-left text-slate-500">School Year</th>
                          <th className="db-th text-left db-col-sky">Total Enrolled</th>
                          <th className="db-th text-left db-col-violet">JHS Graduates</th>
                          <th className="db-th text-left db-col-amber">ALS Passers</th>
                          <th className="db-th text-left db-col-emerald">Payees</th>
                          <th className="db-th text-right text-slate-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.map((record) => (
                          <tr
                            key={record.id}
                            className={`db-row ${editingId === record.id ? 'editing' : ''}`}
                            onMouseEnter={() => setHoveredRow(record.id)}
                            onMouseLeave={() => setHoveredRow(null)}
                            style={{background: editingId === record.id ? 'rgba(99,102,241,0.05)' : undefined}}
                          >
                            {editingId === record.id ? (
                              <>
                                <td className="db-td">
                                  <div className="db-year-badge">
                                    <Calendar className="w-3 h-3 text-slate-500" />
                                    {record.school_year}
                                  </div>
                                </td>
                                <td className="db-td">
                                  <input
                                    type="number"
                                    value={editValues.total_enrolled}
                                    onChange={e => setEditValues({...editValues, total_enrolled: e.target.value})}
                                    className="db-input db-input-highlight"
                                  />
                                </td>
                                <td className="db-td">
                                  <input
                                    type="number"
                                    value={editValues.jhs_graduates_count}
                                    onChange={e => setEditValues({...editValues, jhs_graduates_count: e.target.value})}
                                    className="db-input"
                                    style={{color: '#a78bfa'}}
                                  />
                                </td>
                                <td className="db-td">
                                  <input
                                    type="number"
                                    value={editValues.als_passers_count}
                                    onChange={e => setEditValues({...editValues, als_passers_count: e.target.value})}
                                    className="db-input"
                                    style={{color: '#fbbf24'}}
                                  />
                                </td>
                                <td className="db-td">
                                  <input
                                    type="number"
                                    value={editValues.others_count}
                                    onChange={e => setEditValues({...editValues, others_count: e.target.value})}
                                    className="db-input db-input-emerald"
                                  />
                                </td>
                                <td className="db-td">
                                  <div className="flex justify-end items-center gap-2">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button className="db-save-btn" onClick={handleSave} disabled={isSaving}>
                                          <Save className="w-3.5 h-3.5 text-white" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-slate-900 text-white border-slate-800 text-xs">Save changes</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button className="db-cancel-btn" onClick={() => setEditingId(null)}>
                                          <X className="w-3.5 h-3.5 text-slate-400" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-slate-900 text-white border-slate-800 text-xs">Cancel</TooltipContent>
                                    </Tooltip>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="db-td">
                                  <div className="db-year-badge">
                                    <Calendar className="w-3 h-3 text-slate-500" />
                                    {record.school_year}
                                  </div>
                                </td>
                                <td className="db-td">
                                  <span className="db-number db-col-sky font-semibold">
                                    {record.total_enrolled.toLocaleString()}
                                  </span>
                                </td>
                                <td className="db-td">
                                  <span className="db-number db-col-violet">
                                    {record.jhs_graduates_count?.toLocaleString() ?? '—'}
                                  </span>
                                </td>
                                <td className="db-td">
                                  <span className="db-number db-col-amber">
                                    {record.als_passers_count?.toLocaleString() ?? '—'}
                                  </span>
                                </td>
                                <td className="db-td">
                                  <div className="flex items-center gap-2">
                                    <div style={{width:6, height:6, borderRadius:'50%', background:'#34d399', boxShadow:'0 0 6px rgba(52,211,153,0.5)', flexShrink:0}} />
                                    <span className="db-number db-col-emerald font-semibold">
                                      {(record.others_count || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </td>
                                <td className="db-td">
                                  <div
                                    className="flex justify-end items-center gap-1"
                                    style={{opacity: hoveredRow === record.id ? 1 : 0, transition: 'opacity 0.15s ease'}}
                                  >
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button className="db-edit-btn" onClick={() => handleEdit(record)}>
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-slate-900 text-white border-slate-800 text-xs">Edit record</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button className="db-delete-btn" onClick={() => handleDelete(record.id)}>
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-red-950 text-red-200 border-red-900 text-xs">Delete record</TooltipContent>
                                    </Tooltip>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Footer note */}
                <p className="mt-4 text-[11px] text-slate-600 text-center tracking-wide">
                  {editingId 
                    ? <span>Press <kbd style={{background:'rgba(99,102,241,0.15)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.25)', borderRadius:4, padding:'1px 6px', fontFamily:"'DM Mono', monospace", fontSize:10}}>Enter</kbd> to save · <kbd style={{background:'rgba(148,163,184,0.08)', color:'#64748b', border:'1px solid rgba(148,163,184,0.12)', borderRadius:4, padding:'1px 6px', fontFamily:"'DM Mono', monospace", fontSize:10}}>Esc</kbd> to cancel</span>
                    : "Changes are saved directly to the database and affect AI prediction accuracy"
                  }
                </p>
              </div>
            </div>

          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}