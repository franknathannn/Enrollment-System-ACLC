// app/teacher/dashboard/components/GlobalChatPanel.tsx
"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { supabase } from "@/lib/supabase/teacher-client"
import {
  Send, Loader2, MessageSquare, Paperclip,
  ShieldCheck, GraduationCap, User as UserIcon, FileIcon,
  Download, Eye, SmilePlus, MoreVertical, Edit3, Trash2, Check, X,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { TeacherSession } from "../types"
import { formatTeacherName } from "@/lib/utils/formatTeacherName"

const MAX_FILE_SIZE = 30 * 1024 * 1024

const EMOJI_MAP: Record<string, { icon: string; label: string }> = {
  heart:     { icon: "❤️", label: "Heart" },
  thumbs_up: { icon: "👍", label: "Thumbs Up" },
  haha:      { icon: "😂", label: "Haha" },
  wow:       { icon: "😮", label: "Wow" },
  angry:     { icon: "😡", label: "Angry" },
}

const forceDownload = async (url: string, filename: string) => {
  const toastId = toast.loading("Downloading file...")
  try {
    const r = await fetch(url)
    if (!r.ok) throw new Error()
    const blob = await r.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = blobUrl; a.download = filename
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(blobUrl)
    toast.success("Download complete", { id: toastId })
  } catch { toast.error("Download failed", { id: toastId }) }
}

const Attachment = ({ msg, isMe, dm }: { msg: any; isMe: boolean; dm: boolean }) => {
  if (!msg.attachment_url) return null
  const type = msg.attachment_type || "", name = msg.attachment_name || "Attachment", url = msg.attachment_url
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (type.startsWith("image/")) return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="mt-2 rounded-xl overflow-hidden border border-white/10 shadow-lg group relative max-w-xs cursor-pointer">
          <img src={url} alt={name} className="w-full h-auto object-cover max-h-56 group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Eye className="text-white w-7 h-7" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="w-[90vw] max-w-4xl max-h-[85vh] flex flex-col p-0 border border-white/20 bg-slate-900/90 backdrop-blur-2xl shadow-2xl overflow-hidden rounded-[24px] sm:rounded-[32px] gap-0 [&>button]:!text-white">
        <div className="p-4 shrink-0 flex items-center justify-between border-b border-white/10 bg-white/5">
          <DialogTitle className="text-sm font-black text-white truncate pr-4">{name}</DialogTitle>
          <button type="button" onClick={() => forceDownload(url, name)} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 active:scale-95 transition-all sm:mr-6 mr-8"><Download size={16} /></button>
        </div>
        <div className="flex-1 min-h-0 w-full flex items-center justify-center p-4 sm:p-6">
          <img src={url} alt={name} className="max-w-full max-h-[calc(85vh-6rem)] w-auto h-auto object-contain rounded-xl drop-shadow-2xl" />
        </div>
      </DialogContent>
    </Dialog>
  )
  const gradient = ext === "pdf" ? "from-red-500 to-red-600"
    : ["doc","docx"].includes(ext) ? "from-blue-500 to-blue-600"
    : ["xls","xlsx","csv"].includes(ext) ? "from-emerald-500 to-emerald-600"
    : ["ppt","pptx"].includes(ext) ? "from-orange-500 to-orange-600"
    : ["zip","rar","7z"].includes(ext) ? "from-amber-500 to-amber-600"
    : "from-violet-500 to-violet-600"
  return (
    <button type="button" onClick={() => forceDownload(url, name)}
      className={cn("flex items-center gap-3 mt-2 p-3 rounded-xl border shadow-sm transition-all active:scale-95 w-full max-w-xs text-left hover:scale-[1.02]",
        isMe ? "bg-white/10 border-white/20 hover:bg-white/20"
          : dm ? "bg-slate-800/50 border-slate-700 hover:bg-slate-700 text-slate-200"
          : "bg-blue-50/50 border-blue-100 hover:bg-blue-100 text-slate-700"
      )}>
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br text-white shadow-sm", gradient)}>
        <FileIcon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold truncate">{name}</p>
        <p className="text-[10px] opacity-60 mt-0.5 flex items-center gap-1"><Download size={9} /> Download</p>
      </div>
    </button>
  )
}

// ── Rich bubble ────────────────────────────────────────────────────────────────
const GlobalBubble = memo(({
  msg, authUserId, dm,
  editingId, editContent, setEditContent,
  onSaveEdit, onStartEdit, onCancelEdit,
  onDelete, onToggleReaction, teacherGenderMap,
}: {
  msg: any; authUserId: string; dm: boolean
  editingId: string | null; editContent: string
  setEditContent: (v: string) => void
  onSaveEdit: () => void
  onStartEdit: (msg: any) => void
  onCancelEdit: () => void
  onDelete: (id: any) => void
  onToggleReaction: (msgId: any, emoji: string) => void
  teacherGenderMap?: Record<string, string>
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const isMe         = String(msg.sender_id) === String(authUserId)
  const isOptimistic = String(msg.id).startsWith("optimistic")
  const isAdmin      = msg.sender_type === "admin"
  
  let name = msg.sender_name || (isAdmin ? "Admin" : "Teacher")
  if (!isAdmin && teacherGenderMap && msg.sender_id) {
    name = formatTeacherName(name, teacherGenderMap[msg.sender_id])
  }
  const date         = msg.created_at ? format(new Date(msg.created_at), "MMM d, h:mm a") : "Sending…"
  const isEditing    = editingId === String(msg.id)

  // Group reactions
  const grouped: Record<string, { count: number; users: string[]; mine: boolean }> = {}
  ;(msg.reactions ?? []).forEach((r: any) => {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [], mine: false }
    grouped[r.emoji].count++
    grouped[r.emoji].users.push(r.user_name || "Unknown")
    if (String(r.user_id) === String(authUserId)) grouped[r.emoji].mine = true
  })
  const hasReactions = Object.keys(grouped).length > 0

  return (
    <div className={cn("flex gap-2 group animate-in slide-in-from-bottom-2 duration-400 relative",
      isMe ? "flex-row-reverse" : "flex-row", isOptimistic && "opacity-50")}>

      {/* Avatar */}
      <div className="shrink-0 self-end mb-1 relative">
        <div className={cn("w-8 h-8 rounded-2xl flex items-center justify-center overflow-hidden border-2",
          dm ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-white")}>
          {msg.sender_avatar_url
            ? <img src={msg.sender_avatar_url} alt={name} className="w-full h-full object-cover" />
            : isAdmin
              ? <ShieldCheck size={13} className="text-blue-400" />
              : <UserIcon size={13} className="text-slate-400" />
          }
        </div>
      </div>

      <div className={cn("flex flex-col max-w-[78%]", isMe ? "items-end" : "items-start")}>
        <span className={cn("text-[9px] font-bold mb-1 px-1 opacity-70 flex items-center gap-1",
          dm ? "text-slate-400" : "text-slate-500")}>
          {isAdmin
            ? <ShieldCheck size={9} className="text-blue-500 shrink-0" />
            : <GraduationCap size={9} className="text-emerald-500 shrink-0" />
          }
          {name} · {date}
        </span>

        <div className={cn("flex items-center gap-1.5 relative w-full", isMe ? "flex-row-reverse" : "flex-row")}>
          {isEditing ? (
            <div className={cn("flex items-center gap-2 p-2 rounded-[24px] border border-blue-500/50 shadow-xl animate-in zoom-in-95 w-full",
              dm ? "bg-slate-900" : "bg-white")}>
              <input
                value={editContent} onChange={e => setEditContent(e.target.value)}
                className={cn("flex-1 h-9 rounded-xl border-none px-3 text-sm font-medium outline-none",
                  dm ? "bg-slate-800 text-white placeholder:text-slate-500" : "bg-slate-100 text-slate-900")}
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") onSaveEdit(); if (e.key === "Escape") onCancelEdit() }}
              />
              <button onClick={onSaveEdit} className="p-2 bg-blue-600 text-white rounded-xl hover:scale-110 transition-transform"><Check size={13} /></button>
              <button onClick={onCancelEdit} className={cn("p-2 rounded-xl hover:scale-110 transition-transform",
                dm ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500")}><X size={13} /></button>
            </div>
          ) : (
            <div className={cn("flex flex-col w-fit max-w-full", isMe ? "items-end" : "items-start")}>
              {msg.content && (
                <div className={cn("p-3 rounded-[20px] text-[13px] font-medium leading-relaxed shadow-sm border break-words whitespace-pre-wrap",
                  isMe ? "rounded-tr-sm border-transparent text-white"
                    : cn("rounded-tl-sm", dm ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800")
                )}
                  style={isMe ? { backgroundColor: "rgb(37,99,235)" } : undefined}>
                  {msg.content}
                </div>
              )}
              {msg.attachment_url && <Attachment msg={msg} isMe={isMe} dm={dm} />}

              {/* Reaction pills */}
              {hasReactions && (
                <div className={cn("flex flex-wrap gap-1 mt-1 max-w-full", isMe ? "justify-end" : "justify-start")}>
                  {Object.entries(grouped).map(([emoji, data]) => (
                    <TooltipProvider key={emoji}>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <button onClick={() => onToggleReaction(msg.id, emoji)}
                            className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-all active:scale-95",
                              data.mine
                                ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                                : dm ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600"
                            )}>
                            <span className="text-sm leading-none">{EMOJI_MAP[emoji]?.icon}</span>
                            <span className="text-[10px]">{data.count}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[10px] font-bold bg-slate-900 text-white border-slate-800 max-w-[200px]">
                          {data.users.join(", ")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          {!isEditing && !isOptimistic && (
            <div className="flex items-center gap-0.5 self-end mb-1 shrink-0">
              {/* Emoji picker */}
              <div className="relative">
                <button onClick={() => setShowEmojiPicker(v => !v)}
                  className={cn("h-7 w-7 flex items-center justify-center rounded-full transition-all active:scale-90",
                    dm ? "hover:bg-slate-800 text-slate-500 hover:text-slate-300" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700")}>
                  <SmilePlus size={14} />
                </button>
                {showEmojiPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                    <div className={cn("absolute z-50 flex items-center p-1.5 border shadow-2xl animate-in zoom-in-75 fade-in duration-200 rounded-full gap-0.5",
                      isMe ? "left-0" : "right-0", "bottom-full mb-2",
                      dm ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200")}>
                      {Object.entries(EMOJI_MAP).map(([key, { icon }]) => (
                        <button key={key} onClick={() => { onToggleReaction(msg.id, key); setShowEmojiPicker(false) }}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform active:scale-75 text-lg">
                          {icon}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Edit/Delete — own messages only */}
              {isMe && msg.content && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn("h-7 w-7 flex items-center justify-center rounded-full transition-all active:scale-90",
                      dm ? "hover:bg-slate-800 text-slate-500 hover:text-slate-300" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700")}>
                      <MoreVertical size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isMe ? "end" : "start"} className={cn("rounded-2xl p-2 shadow-2xl min-w-[150px] z-[100]",
                    dm ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200")}>
                    <DropdownMenuItem onClick={() => onStartEdit(msg)}
                      className={cn("gap-2.5 text-[11px] font-black uppercase tracking-widest px-3 py-2.5 rounded-xl cursor-pointer",
                        dm ? "text-slate-200 hover:bg-blue-900/30 hover:text-white" : "text-slate-700 hover:bg-blue-50")}>
                      <Edit3 size={14} className="text-blue-500" /> Edit Msg
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(msg.id)}
                      className="gap-2.5 text-[11px] font-black uppercase tracking-widest text-red-500 hover:!text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 px-3 py-2.5 rounded-xl cursor-pointer">
                      <Trash2 size={14} /> Unsend
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
GlobalBubble.displayName = "GlobalBubble"

interface GlobalChatPanelProps {
  session: TeacherSession
  authUserId: string
  dm: boolean
}

export function GlobalChatPanel({ session, authUserId, dm }: GlobalChatPanelProps) {
  const [messages,    setMessages]    = useState<any[]>([])
  const [newMessage,  setNewMessage]  = useState("")
  const [loading,     setLoading]     = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const scrollRef    = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarMapRef = useRef<Record<string, string | null>>({})
  const [teacherGenderMap, setTeacherGenderMap] = useState<Record<string, string>>({})

  // Build name→avatar map from teachers table (fallback for old messages)
  useEffect(() => {
    supabase.from("teachers").select("id, full_name, avatar_url, gender").then(({ data }) => {
      data?.forEach(t => { if (t.full_name) avatarMapRef.current[t.full_name] = t.avatar_url })
      const gMap: Record<string, string> = {}
      data?.forEach(t => { if (t.id && t.gender) gMap[t.id] = t.gender })
      setTeacherGenderMap(gMap)
    })
  }, [])

  const fetchAll = useCallback(async () => {
    const [{ data: msgs }, { data: rxns }] = await Promise.all([
      supabase.from("teacher_global_chat_messages").select("*").order("created_at", { ascending: true }),
      supabase.from("teacher_message_reactions").select("*").eq("message_type", "global"),
    ])
    const merged = (msgs ?? []).map(msg => ({
      ...msg,
      sender_avatar_url: msg.sender_avatar_url || avatarMapRef.current[msg.sender_name] || null,
      reactions: (rxns ?? []).filter(r => String(r.message_id) === String(msg.id)),
    }))
    setMessages(merged)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const channel = supabase
      .channel(`global_chat_teacher_${session.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_global_chat_messages" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_message_reactions", filter: `message_type=eq.global` }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session.id, fetchAll])

  const prevMsgCountRef = useRef(0)
  useEffect(() => {
    const count = messages.length
    if (count > prevMsgCountRef.current) {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    prevMsgCountRef.current = count
  }, [messages])

  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !authUserId || isUploading) return
    const content = newMessage.trim()
    setNewMessage("")
    const optimisticId = `optimistic-${Date.now()}`
    setMessages(prev => [...prev, {
      id: optimisticId, content, sender_id: authUserId,
      sender_type: "teacher", sender_name: session.full_name,
      sender_avatar_url: session.avatar_url ?? null,
      reactions: [], created_at: new Date().toISOString(),
    }])
    const { error } = await supabase.from("teacher_global_chat_messages").insert({
      content, sender_id: authUserId, sender_type: "teacher",
      sender_name: session.full_name, sender_avatar_url: session.avatar_url ?? null,
    })
    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setNewMessage(content)
      toast.error(error.message || "Failed to send message.")
    }
  }, [newMessage, authUserId, session, isUploading])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !authUserId) return
    if (file.size > MAX_FILE_SIZE) { toast.error("File exceeds 30MB limit."); e.target.value = ""; return }
    setIsUploading(true)
    const toastId = toast.loading("Uploading…")
    try {
      const ext = file.name.split(".").pop()
      const fileName = `gc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`
      const { error: up } = await supabase.storage.from("chat-attachments").upload(fileName, file)
      if (up) throw up
      const { data: { publicUrl } } = supabase.storage.from("chat-attachments").getPublicUrl(fileName)
      const { error: db } = await supabase.from("teacher_global_chat_messages").insert({
        content: "", sender_id: authUserId, sender_type: "teacher",
        sender_name: session.full_name, sender_avatar_url: session.avatar_url ?? null,
        attachment_url: publicUrl, attachment_name: file.name, attachment_type: file.type, attachment_size: file.size,
      })
      if (db) throw db
      toast.success("Attachment sent.", { id: toastId })
    } catch (err: any) {
      toast.error("Upload failed: " + err.message, { id: toastId })
    } finally { setIsUploading(false); e.target.value = "" }
  }

  const startEdit = useCallback((msg: any) => {
    setEditingId(String(msg.id))
    setEditContent(msg.content)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditContent("")
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editingId || !editContent.trim()) return
    const { error } = await supabase
      .from("teacher_global_chat_messages")
      .update({ content: editContent.trim() })
      .eq("id", editingId)
    if (error) { toast.error("Failed to edit."); return }
    setEditingId(null)
    setEditContent("")
  }, [editingId, editContent])

  const deleteMsg = useCallback(async (id: any) => {
    const { error } = await supabase
      .from("teacher_global_chat_messages")
      .delete()
      .eq("id", id)
    if (error) toast.error("Failed to delete.")
  }, [])

  const toggleReaction = useCallback(async (msgId: any, emoji: string) => {
    if (!authUserId) return
    const msgReactions = messages.find(m => String(m.id) === String(msgId))?.reactions ?? []
    const myReaction = msgReactions.find((r: any) => String(r.user_id) === String(authUserId))
    if (myReaction) {
      const { error } = await supabase.from("teacher_message_reactions").delete().eq("id", myReaction.id)
      if (error) { toast.error("Failed to remove reaction."); return }
      if (myReaction.emoji === emoji) return // toggled off
    }
    const { error } = await supabase.from("teacher_message_reactions").insert({
      message_type: "global", message_id: String(msgId),
      emoji, user_id: authUserId, user_name: session.full_name,
    })
    if (error) toast.error("Reaction failed: " + error.message)
  }, [authUserId, messages, session.full_name])

  const card = dm ? "bg-slate-900/70 border-slate-700/50" : "bg-white border-slate-200"
  const sub  = dm ? "text-slate-400" : "text-slate-500"
  const head = dm ? "text-white" : "text-slate-900"

  return (
    <div className={cn("rounded-2xl md:rounded-3xl border shadow-sm flex flex-col overflow-hidden h-full", card)}>
      {/* header */}
      <div className={cn("px-4 py-3 border-b shrink-0 flex items-center gap-2", dm ? "border-slate-700/50" : "border-slate-100")}>
        <div className="flex items-center gap-1">
          <ShieldCheck size={11} className="text-blue-500" />
          <GraduationCap size={11} className="text-emerald-500" />
        </div>
        <div>
          <p className={cn("text-xs font-black", head)}>Global Channel</p>
          <p className={cn("text-[10px]", sub)}>All admins & teachers</p>
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 space-y-4 overscroll-contain" style={{ scrollbarWidth: "none" }}>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-blue-500" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
            <MessageSquare size={32} className={dm ? "text-slate-600" : "text-slate-300"} />
            <p className={cn("text-xs font-black", head)}>No messages yet</p>
          </div>
        ) : (
          messages.map(msg => (
            <GlobalBubble
              key={msg.id} msg={msg} authUserId={authUserId} dm={dm}
              editingId={editingId} editContent={editContent}
              setEditContent={setEditContent}
              onSaveEdit={saveEdit} onStartEdit={startEdit} onCancelEdit={cancelEdit}
              onDelete={deleteMsg} onToggleReaction={toggleReaction}
              teacherGenderMap={teacherGenderMap}
            />
          ))
        )}
      </div>

      {/* input */}
      <div className={cn("px-3 py-2.5 border-t shrink-0 relative", dm ? "border-slate-700/50" : "border-slate-100")}
        style={{ backgroundColor: dm ? "rgb(2,6,23)" : "rgb(248,250,252)" }}>
        {isUploading && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500/20"><div className="h-full bg-blue-500 animate-pulse w-full" /></div>}
        <form onSubmit={sendMessage} className="flex gap-2 items-center">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
            className={cn("h-10 w-10 flex items-center justify-center rounded-xl transition-all active:scale-95 shrink-0",
              dm ? "bg-slate-800 hover:bg-slate-700 text-slate-400" : "bg-slate-100 hover:bg-slate-200 text-slate-500")}>
            {isUploading ? <Loader2 size={15} className="animate-spin text-blue-500" /> : <Paperclip size={14} className="-rotate-45" />}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <input
            value={newMessage} onChange={e => setNewMessage(e.target.value)}
            placeholder={isUploading ? "Uploading…" : "Message everyone…"}
            disabled={isUploading}
            className={cn("flex-1 h-10 rounded-xl border px-3 text-sm font-medium outline-none transition-colors focus:ring-2 focus:ring-blue-500",
              dm ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400")}
          />
          <button type="submit" disabled={!newMessage.trim() || isUploading}
            className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center active:scale-90 transition-all shadow-md shadow-blue-500/20 shrink-0">
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  )
}
