"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import {
  Send, Loader2, MessageSquare, Paperclip,
  ShieldCheck, User as UserIcon, FileIcon,
  Download, Eye, SmilePlus, MoreVertical, Edit3, Trash2, Check, X, UserX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useTheme } from "@/hooks/useTheme"
import { themeColors } from "@/lib/themeColors"
import { toast } from "sonner"

const MAX_FILE_SIZE = 30 * 1024 * 1024

const EMOJI_MAP: Record<string, { icon: string; label: string }> = {
  heart: { icon: "❤️", label: "Heart" },
  thumbs_up: { icon: "👍", label: "Thumbs Up" },
  haha: { icon: "😂", label: "Haha" },
  wow: { icon: "😮", label: "Wow" },
  angry: { icon: "😡", label: "Angry" },
}

const forceDownload = async (url: string, filename: string) => {
  const toastId = toast.loading("Downloading file...")
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error()
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = blobUrl; link.download = filename
    document.body.appendChild(link); link.click()
    document.body.removeChild(link); URL.revokeObjectURL(blobUrl)
    toast.success("Download complete", { id: toastId })
  } catch { toast.error("Download failed", { id: toastId }) }
}

// ── Attachment ─────────────────────────────────────────────────────────────────
const MsgAttachment = ({ msg, isMe, isDarkMode }: { msg: any; isMe: boolean; isDarkMode: boolean }) => {
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
    : ["doc", "docx"].includes(ext) ? "from-blue-500 to-blue-600"
      : ["xls", "xlsx", "csv"].includes(ext) ? "from-emerald-500 to-emerald-600"
        : ["ppt", "pptx"].includes(ext) ? "from-orange-500 to-orange-600"
          : ["zip", "rar", "7z"].includes(ext) ? "from-amber-500 to-amber-600"
            : "from-violet-500 to-violet-600"
  return (
    <button type="button" onClick={() => forceDownload(url, name)}
      className={cn("flex items-center gap-3 mt-2 p-3 rounded-xl border shadow-sm transition-all active:scale-95 w-full max-w-xs text-left hover:scale-[1.02]",
        isMe ? "bg-white/10 border-white/20 hover:bg-white/20"
          : isDarkMode ? "bg-slate-800/50 border-slate-700 hover:bg-slate-700" : "bg-blue-50/50 border-blue-100 hover:bg-blue-100"
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

// ── Message bubble ─────────────────────────────────────────────────────────────
const AdminBubble = memo(({
  msg, currentUserId, isDarkMode,
  editingId, editContent, setEditContent,
  onSaveEdit, onStartEdit, onCancelEdit,
  onDelete, onToggleReaction,
}: {
  msg: any; currentUserId: string; isDarkMode: boolean
  editingId: string | null; editContent: string
  setEditContent: (v: string) => void
  onSaveEdit: () => void; onStartEdit: (m: any) => void; onCancelEdit: () => void
  onDelete: (id: any) => void; onToggleReaction: (msgId: any, emoji: string) => void
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const isMe = String(msg.sender_id) === String(currentUserId)
  const isOptimistic = String(msg.id).startsWith("optimistic")
  const name = msg.sender_name || "Admin"
  const date = msg.created_at ? format(new Date(msg.created_at), "MMM d, h:mm a") : "Sending…"
  const isEditing = editingId === String(msg.id)

  const grouped: Record<string, { count: number; users: string[]; mine: boolean }> = {}
    ; (msg.reactions ?? []).forEach((r: any) => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [], mine: false }
      grouped[r.emoji].count++
      grouped[r.emoji].users.push(r.user_name || "Admin")
      if (String(r.user_id) === String(currentUserId)) grouped[r.emoji].mine = true
    })
  const hasReactions = Object.keys(grouped).length > 0

  return (
    <div className={cn("flex gap-2 md:gap-3 group animate-in slide-in-from-bottom-2 duration-400",
      isMe ? "flex-row-reverse" : "flex-row", isOptimistic && "opacity-50")}>

      <div className={cn("w-8 h-8 md:w-9 md:h-9 rounded-2xl flex items-center justify-center shrink-0 self-end mb-1 border-2 overflow-hidden",
        isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-white")}>
        {msg.sender_avatar_url
          ? <img src={msg.sender_avatar_url} alt={name} className="w-full h-full object-cover" />
          : <ShieldCheck size={13} className="text-blue-400" />
        }
      </div>

      <div className={cn("flex flex-col max-w-[78%] md:max-w-[65%]", isMe ? "items-end" : "items-start")}>
        <span className={cn("text-[9px] font-bold mb-1 px-1 opacity-70 flex items-center gap-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
          <ShieldCheck size={9} className="text-blue-500 shrink-0" />
          {name} · {date}
        </span>

        <div className={cn("flex items-center gap-1.5 relative", isMe ? "flex-row-reverse" : "flex-row")}>
          {isEditing ? (
            <div className="flex items-center gap-2 p-2 rounded-[24px] border border-blue-500/50 shadow-xl animate-in zoom-in-95 w-full"
              style={{ backgroundColor: isDarkMode ? themeColors.dark.surface : themeColors.light.surface }}>
              <Input value={editContent} onChange={e => setEditContent(e.target.value)}
                className={cn("h-10 rounded-xl border-none text-sm font-bold", isDarkMode ? "text-white placeholder:text-slate-500" : "text-slate-900")}
                style={{ backgroundColor: isDarkMode ? "rgb(15,23,42)" : "rgb(241,245,249)" }}
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") onSaveEdit(); if (e.key === "Escape") onCancelEdit() }}
              />
              <button onClick={onSaveEdit} className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg hover:scale-110 transition-transform"><Check size={14} /></button>
              <button onClick={onCancelEdit} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl hover:scale-110 transition-transform"><X size={14} /></button>
            </div>
          ) : (
            <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
              {msg.content && (
                <div className={cn("p-3 md:p-4 rounded-[20px] text-[13px] font-medium leading-relaxed shadow-sm border break-words whitespace-pre-wrap",
                  isMe ? "rounded-tr-sm" : "rounded-tl-sm")}
                  style={isMe
                    ? { backgroundColor: isDarkMode ? themeColors.dark.primary : "rgb(37,99,235)", color: "#fff", border: "none" }
                    : { backgroundColor: isDarkMode ? themeColors.dark.surface : themeColors.light.surface, color: isDarkMode ? themeColors.dark.text.primary : themeColors.light.text.primary, borderColor: isDarkMode ? themeColors.dark.border : themeColors.light.border }
                  }>
                  {msg.content}
                </div>
              )}
              {msg.attachment_url && <MsgAttachment msg={msg} isMe={isMe} isDarkMode={isDarkMode} />}

              {hasReactions && (
                <div className={cn("flex flex-wrap gap-1 mt-1", isMe ? "justify-end" : "justify-start")}>
                  {Object.entries(grouped).map(([emoji, data]) => (
                    <TooltipProvider key={emoji}>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <button onClick={() => onToggleReaction(msg.id, emoji)}
                            className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-all active:scale-95",
                              data.mine
                                ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                                : isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600"
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

          {!isEditing && !isOptimistic && (
            <div className="flex items-center gap-0.5 self-end mb-1 shrink-0">
              <div className="relative">
                <button onClick={() => setShowEmojiPicker(v => !v)}
                  className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-all active:scale-90">
                  <SmilePlus size={16} />
                </button>
                {showEmojiPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                    <div className={cn("absolute z-50 flex items-center p-1.5 border shadow-2xl animate-in zoom-in-75 fade-in duration-200 rounded-full gap-0.5",
                      isMe ? "left-0" : "right-0", "bottom-full mb-2",
                      isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200")}>
                      {Object.entries(EMOJI_MAP).map(([key, { icon }]) => (
                        <button key={key} onClick={() => { onToggleReaction(msg.id, key); setShowEmojiPicker(false) }}
                          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform active:scale-75 text-xl">
                          {icon}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {isMe && msg.content && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-all active:scale-90">
                      <MoreVertical size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isMe ? "end" : "start"}
                    className="rounded-2xl p-2 shadow-2xl min-w-[150px] z-[100]"
                    style={{ backgroundColor: isDarkMode ? themeColors.dark.surface : themeColors.light.surface, borderColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgb(241,245,249)" }}>
                    <DropdownMenuItem onClick={() => onStartEdit(msg)}
                      className={cn("gap-2.5 text-[11px] font-black uppercase tracking-widest px-3 py-2.5 rounded-xl cursor-pointer",
                        isDarkMode ? "text-slate-200 hover:bg-blue-900/30 hover:text-white" : "text-slate-700 hover:bg-blue-50")}>
                      <Edit3 size={14} className="text-blue-500" /> Edit Msg
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(msg.id)}
                      className="gap-2.5 text-[11px] font-black uppercase tracking-widest text-red-600 hover:!text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 px-3 py-2.5 rounded-xl cursor-pointer">
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
AdminBubble.displayName = "AdminBubble"

// ── Main Panel ─────────────────────────────────────────────────────────────────
export function AdminChatPanel({ currentUser }: { currentUser: any }) {
  const { isDarkMode } = useTheme()

  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [adminProfile, setAdminProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prevCountRef = useRef(0)
  const avatarMapRef = useRef<Record<string, string | null>>({})

  useEffect(() => {
    setIsAnonymous(localStorage.getItem("admin_channel_anonymous") === "true")
    if (currentUser) {
      supabase.from("admin_profiles").select("full_name, avatar_url").eq("id", currentUser.id).single()
        .then(({ data }) => { if (data) setAdminProfile(data) })
      // Build avatar map for all admins
      supabase.from("admin_profiles").select("full_name, avatar_url")
        .then(({ data }) => {
          data?.forEach(a => { if (a.full_name) avatarMapRef.current[a.full_name] = a.avatar_url })
        })
    }
  }, [currentUser])

  const toggleAnonymous = () => {
    setIsAnonymous(v => {
      const next = !v
      localStorage.setItem("admin_channel_anonymous", String(next))
      return next
    })
  }

  const fetchAll = useCallback(async () => {
    const [{ data: msgs }, { data: rxns }] = await Promise.all([
      supabase.from("admin_messages").select("*").order("created_at", { ascending: true }),
      supabase.from("teacher_message_reactions").select("*").eq("message_type", "admin_global"),
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
    const ch = supabase.channel("admin_global_chat_v1")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_messages" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_message_reactions", filter: `message_type=eq.admin_global` }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchAll])

  useEffect(() => {
    const count = messages.length
    if (count > prevCountRef.current) {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    prevCountRef.current = count
  }, [messages])

  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser || isUploading) return
    const content = newMessage.trim()
    setNewMessage("")
    const myName = isAnonymous ? "Admin" : (adminProfile?.full_name || currentUser.user_metadata?.full_name || "Admin")
    const myAvatar = isAnonymous ? null : (adminProfile?.avatar_url ?? currentUser.user_metadata?.avatar_url ?? null)
    const optId = `optimistic-${Date.now()}`
    setMessages(prev => [...prev, {
      id: optId, content, sender_id: currentUser.id,
      sender_name: myName, sender_avatar_url: myAvatar,
      reactions: [], created_at: new Date().toISOString(),
    }])
    const { error } = await supabase.from("admin_messages").insert({
      content, sender_id: currentUser.id, sender_name: myName, sender_avatar_url: myAvatar,
    })
    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optId))
      setNewMessage(content)
      toast.error(error.message || "Failed to send.")
    }
  }, [newMessage, currentUser, isUploading, isAnonymous, adminProfile])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return
    if (file.size > MAX_FILE_SIZE) { toast.error("File exceeds 30MB limit."); e.target.value = ""; return }
    setIsUploading(true)
    const toastId = toast.loading("Uploading…")
    try {
      const ext = file.name.split(".").pop()
      const fileName = `ag_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`
      const { error: up } = await supabase.storage.from("chat-attachments").upload(fileName, file)
      if (up) throw up
      const { data: { publicUrl } } = supabase.storage.from("chat-attachments").getPublicUrl(fileName)
      const { error: db } = await supabase.from("admin_messages").insert({
        content: "", sender_id: currentUser.id,
        sender_name: isAnonymous ? "Admin" : (adminProfile?.full_name || currentUser.user_metadata?.full_name || "Admin"),
        sender_avatar_url: isAnonymous ? null : (adminProfile?.avatar_url ?? currentUser.user_metadata?.avatar_url ?? null),
        attachment_url: publicUrl, attachment_name: file.name, attachment_type: file.type, attachment_size: file.size,
      })
      if (db) throw db
      toast.success("Attachment sent.", { id: toastId })
    } catch (err: any) {
      toast.error("Upload failed: " + err.message, { id: toastId })
    } finally { setIsUploading(false); e.target.value = "" }
  }

  const startEdit = useCallback((msg: any) => { setEditingId(String(msg.id)); setEditContent(msg.content) }, [])
  const cancelEdit = useCallback(() => { setEditingId(null); setEditContent("") }, [])
  const saveEdit = useCallback(async () => {
    if (!editingId || !editContent.trim()) return
    const { error } = await supabase.from("admin_messages").update({ content: editContent.trim() }).eq("id", editingId)
    if (error) { toast.error("Failed to edit."); return }
    setEditingId(null); setEditContent("")
  }, [editingId, editContent])

  const deleteMsg = useCallback(async (id: any) => {
    const { error } = await supabase.from("admin_messages").delete().eq("id", id)
    if (error) toast.error("Failed to delete.")
  }, [])

  const toggleReaction = useCallback(async (msgId: any, emoji: string) => {
    if (!currentUser) return
    const msgReactions = messages.find(m => String(m.id) === String(msgId))?.reactions ?? []
    const myReaction = msgReactions.find((r: any) => String(r.user_id) === String(currentUser.id))
    if (myReaction) {
      const { error } = await supabase.from("teacher_message_reactions").delete().eq("id", myReaction.id)
      if (error) { toast.error("Failed to remove reaction."); return }
      if (myReaction.emoji === emoji) return
    }
    const { error } = await supabase.from("teacher_message_reactions").insert({
      message_type: "admin_global", message_id: String(msgId), emoji,
      user_id: currentUser.id,
      user_name: isAnonymous ? "Admin" : (adminProfile?.full_name || currentUser.user_metadata?.full_name || "Admin"),
    })
    if (error) toast.error("Reaction failed: " + error.message)
  }, [currentUser, messages, isAnonymous, adminProfile])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn("px-5 py-3 border-b shrink-0 flex items-center gap-3", isDarkMode ? "border-white/5" : "border-slate-100")}>
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-blue-500" />
          <ShieldCheck size={13} className="text-blue-400" />
        </div>
        <div>
          <p className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-500")}>
            Admin Channel
          </p>
          <p className={cn("text-[9px]", isDarkMode ? "text-slate-600" : "text-slate-400")}>
            Admins only · Private
          </p>
        </div>
        <div className="ml-auto">
          <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
            isDarkMode ? "bg-blue-900/40 text-blue-400" : "bg-blue-50 text-blue-600")}>
            For Admins Only
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-blue-500" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-25">
            <ShieldCheck size={36} className="text-blue-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin channel — no messages yet</p>
          </div>
        ) : (
          messages.map(msg => (
            <AdminBubble
              key={msg.id} msg={msg} currentUserId={currentUser?.id ?? ""} isDarkMode={isDarkMode}
              editingId={editingId} editContent={editContent} setEditContent={setEditContent}
              onSaveEdit={saveEdit} onStartEdit={startEdit} onCancelEdit={cancelEdit}
              onDelete={deleteMsg} onToggleReaction={toggleReaction}
            />
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t shrink-0 relative transition-colors"
        style={{ backgroundColor: isDarkMode ? "rgb(2,6,23)" : "rgb(241,245,249)", borderColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgb(226,232,240)" }}>
        {isUploading && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500/20"><div className="h-full bg-blue-500 animate-pulse w-full" /></div>}
        <form onSubmit={sendMessage} className="flex gap-2 items-center">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
            className={cn("h-12 w-12 flex items-center justify-center rounded-[20px] active:scale-95 transition-all shrink-0",
              isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-400" : "bg-slate-100 hover:bg-slate-200 text-slate-500")}>
            {isUploading ? <Loader2 size={18} className="animate-spin text-blue-500" /> : <Paperclip size={17} className="-rotate-45" />}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

          {/* Anonymous toggle */}
          <button type="button" onClick={toggleAnonymous}
            title={isAnonymous ? "Anonymous — click to show your identity" : `Sending as ${adminProfile?.full_name || "Admin"} — click for anonymous`}
            className={cn("h-12 w-12 flex items-center justify-center rounded-[20px] transition-all active:scale-95 shrink-0 border",
              isAnonymous
                ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                : isDarkMode
                  ? "bg-slate-800 hover:bg-slate-700 border-transparent text-slate-400"
                  : "bg-slate-100 hover:bg-slate-200 border-transparent text-slate-500"
            )}>
            {isAnonymous
              ? <UserX size={17} />
              : adminProfile?.avatar_url
                ? <img src={adminProfile.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                : <UserIcon size={17} />
            }
          </button>

          <Input
            placeholder={isUploading ? "Uploading…" : "Admin channel message…"}
            value={newMessage} onChange={e => setNewMessage(e.target.value)} disabled={isUploading}
            className={cn("h-12 rounded-[20px] border-slate-200 dark:border-white/10 font-bold px-4 focus:ring-2 focus:ring-blue-600 text-sm shadow-inner",
              isDarkMode ? "text-white" : "text-slate-900")}
            style={{ backgroundColor: isDarkMode ? "rgb(15,23,42)" : "#fff" }}
          />
          <Button type="submit" disabled={!newMessage.trim() || isUploading}
            className="h-12 w-12 rounded-[20px] bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 shrink-0 active:scale-90 transition-all">
            <Send size={17} />
          </Button>
        </form>
      </div>
    </div>
  )
}
