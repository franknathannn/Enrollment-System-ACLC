"use client"

import React, { useState } from "react"
import { createPortal } from "react-dom"
import { X, Plus, Trash2, Loader2, MapPin } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/admin-client"
import { Room } from "../../sections/hooks/useRooms"

interface RoomManagerModalProps {
  rooms: Room[]
  isDarkMode: boolean
  onClose: () => void
}

export function RoomManagerModal({ rooms, isDarkMode, onClose }: RoomManagerModalProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [capacity, setCapacity] = useState<number | "">("")
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Create Portal mounting state
  const [mounted, setMounted] = useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  // Custom confirm modal state
  const [confirmDelete, setConfirmDelete] = useState<{id: string, name: string} | null>(null)

  // Live optimistic UI state
  const [localRooms, setLocalRooms] = useState(rooms)

  React.useEffect(() => {
    setLocalRooms(rooms)
  }, [rooms])

  const surface = isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
  const muted = isDarkMode ? "text-slate-400" : "text-slate-500"
  const text = isDarkMode ? "text-white" : "text-slate-900"
  const inputBg = isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setAdding(true)
    const { error } = await supabase.from("rooms").insert({
      name: name.trim(),
      type: type.trim() || null,
      capacity: capacity === "" ? null : Number(capacity)
    })

    setAdding(false)
    if (error) {
      toast.error(`Failed to add room: ${error.message}`)
    } else {
      toast.success("Room added successfully!")
      setName("")
      setType("")
      setCapacity("")
    }
  }

  const handleDeleteRequest = (id: string, roomName: string) => {
    setConfirmDelete({ id, name: roomName })
  }

  const executeDelete = async () => {
    if (!confirmDelete) return

    const id = confirmDelete.id
    const roomName = confirmDelete.name
    
    setConfirmDelete(null)
    setDeletingId(id)

    // Optimistically remove from UI
    setLocalRooms(prev => prev.filter(r => r.id !== id))

    const { error } = await supabase.from("rooms").delete().eq("id", id)
    
    setDeletingId(null)
    if (error) {
      // Revert optimistic update on failure
      setLocalRooms(rooms)
      if (error.message.includes("violates foreign key constraint")) {
        toast.error("Cannot delete room. There are active schedules assigned to this room.")
      } else {
        toast.error(`Failed to delete room: ${error.message}`)
      }
    } else {
      toast.success(`${roomName} has been deleted.`)
    }
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
        style={{ animation: "saas-fade-in 0.3s ease-out both" }}
      />
      
      {/* Modal - Full screen on mobile, max-h rounded on desktop */}
      <div 
        className={`relative w-full h-[95vh] sm:h-auto sm:max-h-[90vh] sm:max-w-xl rounded-t-3xl sm:rounded-3xl border sm:shadow-2xl overflow-hidden flex flex-col ${surface}`}
        style={{ animation: "saas-fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        {/* Render confirmation overlay if active */}
        {confirmDelete && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" style={{ animation: "saas-fade-in 0.2s ease-out both" }}>
            <div className={`relative w-full max-w-sm p-6 rounded-3xl border shadow-2xl flex flex-col items-center text-center ${surface}`} style={{ animation: "saas-fade-up 0.3s cubic-bezier(0.16,1,0.3,1) both" }}>
              <button 
                onClick={() => setConfirmDelete(null)}
                className={`absolute top-4 right-4 p-1.5 rounded-full transition-all ${isDarkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"}`}
              >
                <X size={18} />
              </button>
              <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-4 border border-red-500/20">
                <Trash2 size={32} />
              </div>
              <h3 className={`text-xl font-black ${text} mb-2`}>Delete Room?</h3>
              <p className={`text-sm ${muted} mb-6 leading-relaxed`}>
                Are you sure you want to completely remove <strong className={text}>{confirmDelete.name}</strong> from the database? This action cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${isDarkMode ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg shadow-red-500/20"
                >
                  Delete Room
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className={`p-4 sm:p-5 flex items-center justify-between border-b ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
              <MapPin size={20} />
            </div>
            <div>
              <h2 className={`text-lg font-black tracking-tight ${text}`}>Manage Rooms</h2>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${muted}`}>Add or remove campus areas</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-xl transition-all ${isDarkMode ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* List of Existing Rooms */}
        <div className={`flex-1 overflow-y-auto p-5 space-y-2 ${isDarkMode ? "bg-slate-900/50" : "bg-slate-50/50"}`}>
          {localRooms.length === 0 ? (
            <p className={`text-center text-sm py-4 ${muted}`}>No rooms recorded yet.</p>
          ) : (
            localRooms.map(r => (
              <div key={r.id} className={`flex items-center justify-between p-3 rounded-xl border ${isDarkMode ? "bg-slate-800/80 border-slate-700/50" : "bg-white border-slate-200"} transition-all shadow-sm hover:shadow-md`}>
                <div>
                  <p className={`text-sm font-bold ${text}`}>{r.name}</p>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${muted}`}>
                    {r.type || "General Room"} • Capacity: {r.capacity || "N/A"}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteRequest(r.id, r.name)}
                  disabled={deletingId === r.id}
                  className={`p-2 rounded-lg transition-all ${isDarkMode ? "text-slate-400 hover:text-red-400 hover:bg-red-500/10" : "text-slate-500 hover:text-red-600 hover:bg-red-50"}`}
                >
                  {deletingId === r.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Room Form */}
        <div className={`p-5 border-t ${isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-white"}`}>
          <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${muted}`}>Register New Room</h3>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <input 
                type="text" 
                placeholder="Room Name (e.g., Comlab 3)" 
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className={`sm:col-span-6 px-3 py-2.5 rounded-xl border outline-none text-sm font-medium transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${inputBg}`}
              />
              <input 
                type="text" 
                placeholder="Type (Optional)" 
                value={type}
                onChange={e => setType(e.target.value)}
                className={`sm:col-span-4 px-3 py-2.5 rounded-xl border outline-none text-sm font-medium transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${inputBg}`}
              />
              <input 
                type="number" 
                placeholder="Capacity" 
                value={capacity}
                onChange={e => setCapacity(e.target.value ? Number(e.target.value) : "")}
                className={`sm:col-span-2 px-3 py-2.5 rounded-xl border outline-none text-sm font-medium transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${inputBg}`}
              />
            </div>
            <button 
              type="submit"
              disabled={adding || !name.trim()}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              {adding ? "Registering..." : "Add Room"}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  )
}
