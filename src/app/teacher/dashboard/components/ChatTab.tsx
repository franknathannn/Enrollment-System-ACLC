// app/teacher/dashboard/components/ChatTab.tsx
"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { supabase } from "@/lib/supabase/teacher-client"
import {
  Send, User as UserIcon, Loader2, MessageSquare,
  Paperclip, FileIcon, Download, Eye, Globe, Search, Pin,
  SmilePlus, MoreVertical, Edit3, Trash2, Check, X, GraduationCap, ShieldCheck,
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
import { GlobalChatPanel } from "./GlobalChatPanel"

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

// ── Attachment ─────────────────────────────────────────────────────────────────
const MsgAttachment = ({ msg, isMe, dm }: { msg: any; isMe: boolean; dm: boolean }) => {
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

// ── Generic message bubble (teacher↔teacher DMs and admin↔teacher DMs) ─────────
const DmBubble = memo(({
  msg, isMe, authUserId, dm,
  editingId, editContent, setEditContent,
  onSaveEdit, onStartEdit, onCancelEdit,
  onDelete, onToggleReaction,
}: {
  msg: any; isMe: boolean; authUserId: string; dm: boolean
  editingId: string | null; editContent: string
  setEditContent: (v: string) => void
  onSaveEdit: () => void; onStartEdit: (m: any) => void; onCancelEdit: () => void
  onDelete: (id: any) => void; onToggleReaction: (msgId: any, emoji: string) => void
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const isOptimistic = String(msg.id).startsWith("optimistic")
  const isAdmin      = msg.sender_type === "admin"
  const name         = msg.sender_name || (isMe ? "You" : isAdmin ? "Admin" : "Teacher")
  const date         = msg.created_at ? format(new Date(msg.created_at), "MMM d, h:mm a") : "Sending…"
  const isEditing    = editingId === String(msg.id)

  const grouped: Record<string, { count: number; users: string[]; mine: boolean }> = {}
  ;(msg.reactions ?? []).forEach((r: any) => {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [], mine: false }
    grouped[r.emoji].count++
    grouped[r.emoji].users.push(r.user_name || "Unknown")
    if (String(r.user_id) === String(authUserId)) grouped[r.emoji].mine = true
  })
  const hasReactions = Object.keys(grouped).length > 0

  return (
    <div className={cn("flex gap-2 group animate-in slide-in-from-bottom-2 duration-400",
      isMe ? "flex-row-reverse" : "flex-row", isOptimistic && "opacity-50")}>

      {/* Avatar */}
      <div className={cn("w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 self-end mb-1 border-2 overflow-hidden",
        dm ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-white")}>
        {msg.sender_avatar_url
          ? <img src={msg.sender_avatar_url} alt={name} className="w-full h-full object-cover" />
          : isAdmin
            ? <ShieldCheck size={13} className="text-blue-400" />
            : <GraduationCap size={13} className={dm ? "text-emerald-400" : "text-emerald-500"} />
        }
      </div>

      <div className={cn("flex flex-col max-w-[78%]", isMe ? "items-end" : "items-start")}>
        <span className={cn("text-[9px] font-bold mb-1 px-1 opacity-70 flex items-center gap-1", dm ? "text-slate-400" : "text-slate-500")}>
          {isAdmin
            ? <ShieldCheck size={9} className="text-blue-500 shrink-0" />
            : <GraduationCap size={9} className="text-emerald-500 shrink-0" />
          }
          {name} · {date}
        </span>

        <div className={cn("flex items-center gap-1.5 relative", isMe ? "flex-row-reverse" : "flex-row")}>
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
            <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
              {msg.content && (
                <div className={cn("p-3 rounded-[20px] text-[13px] font-medium leading-relaxed shadow-sm border break-words whitespace-pre-wrap",
                  isMe ? "rounded-tr-sm border-transparent text-white"
                    : cn("rounded-tl-sm", dm ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800")
                )}
                  style={isMe ? { backgroundColor: "rgb(37,99,235)" } : undefined}>
                  {msg.content}
                </div>
              )}
              {msg.attachment_url && <MsgAttachment msg={msg} isMe={isMe} dm={dm} />}

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
            <div className={cn("flex items-center gap-0.5 self-end mb-1 shrink-0",
              isMe ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity",
              showEmojiPicker && "opacity-100")}>
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
              {isMe && msg.content && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn("h-7 w-7 flex items-center justify-center rounded-full transition-all active:scale-90",
                      dm ? "hover:bg-slate-800 text-slate-500 hover:text-slate-300" : "hover:bg-slate-100 text-slate-400 hover:text-slate-700")}>
                      <MoreVertical size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isMe ? "end" : "start"}
                    className={cn("rounded-2xl p-2 shadow-2xl min-w-[150px] z-[100]",
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
DmBubble.displayName = "DmBubble"

// ── Sidebar list item (works for both teachers and admins) ─────────────────────
const SidebarItem = ({ person, selected, pinned, dm, isAdmin, unread, lastPreview, onClick, onTogglePin }: {
  person: any; selected: boolean; pinned: boolean; dm: boolean; isAdmin: boolean
  unread?: number; lastPreview?: string
  onClick: () => void; onTogglePin?: (id: string) => void
}) => (
  <div className="relative group/item">
    <button type="button" onClick={onClick}
      className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 rounded-2xl",
        onTogglePin ? "pr-10" : "pr-3",
        selected ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
          : dm ? "hover:bg-slate-800/70 text-slate-300" : "hover:bg-slate-100 text-slate-700"
      )}>
      <div className={cn("w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border-2",
        selected ? "border-white/30" : dm ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-100")}>
        {person.avatar_url
          ? <img src={person.avatar_url} alt={person.full_name} className="w-full h-full object-cover" />
          : isAdmin
            ? <ShieldCheck size={15} className={selected ? "text-white/70" : "text-blue-400"} />
            : <UserIcon size={15} className={selected ? "text-white/60" : "text-slate-400"} />
        }
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p className={cn("text-xs font-black truncate", selected ? "text-white" : "")}>{person.full_name}</p>
          {(unread ?? 0) > 0 && !selected && (
            <span className="shrink-0 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-sm">
              {(unread ?? 0) > 99 ? "99+" : unread}
            </span>
          )}
        </div>
        <p className={cn("text-[10px] truncate mt-0.5", selected ? "text-white/60" : dm ? "text-slate-500" : "text-slate-400")}>
          {lastPreview || (isAdmin ? "Admin" : person.email)}
        </p>
      </div>
    </button>
    {onTogglePin && (
      <button type="button" onClick={e => { e.stopPropagation(); onTogglePin(person.id) }}
        title={pinned ? "Unpin" : "Pin to top"}
        className={cn("absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-150",
          pinned ? "opacity-100 text-amber-400 hover:text-amber-300"
            : "opacity-30 hover:opacity-100 text-slate-400 hover:text-amber-400",
          selected && !pinned && "text-white/40 hover:text-white"
        )}>
        <Pin size={11} className={pinned ? "fill-current" : ""} />
      </button>
    )}
  </div>
)

// ── Main ───────────────────────────────────────────────────────────────────────
interface ChatTabProps { session: TeacherSession; dm: boolean }

type ChatMode = "global" | "teacher_dm" | "admin_dm"

export function ChatTab({ session, dm }: ChatTabProps) {
  const [mode,             setMode]             = useState<ChatMode>("global")
  const [authUserId,       setAuthUserId]       = useState<string | null>(null)
  const [showChatOnMobile, setShowChatOnMobile] = useState(false)

  // Teachers
  const [teachers,        setTeachers]        = useState<any[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(true)
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null)
  const [pinnedIds,       setPinnedIds]       = useState<string[]>([])

  // Admins
  const [admins,        setAdmins]        = useState<any[]>([])
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  const [selectedAdmin, setSelectedAdmin] = useState<any | null>(null)

  // Shared search
  const [search, setSearch] = useState("")

  // Teacher DM state
  const [dmMessages,  setDmMessages]  = useState<any[]>([])
  const [dmLoading,   setDmLoading]   = useState(false)

  // Admin DM state
  const [adminDmMessages, setAdminDmMessages] = useState<any[]>([])
  const [adminDmLoading,  setAdminDmLoading]  = useState(false)

  // Shared compose state
  const [newMessage,  setNewMessage]  = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")

  const scrollRef       = useRef<HTMLDivElement>(null)
  const fileInputRef    = useRef<HTMLInputElement>(null)
  const lastReadRef       = useRef<Record<string, string>>({})
  const prevMsgCountRef   = useRef(0)
  const sessionRestoredRef = useRef(false)
  const sessionSaveRef    = useRef(false)
  const [lastMessageMap, setLastMessageMap] = useState<Record<string, { lastAt: string; preview: string; unread: number }>>({})

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s?.user) setAuthUserId(s.user.id)
    })
    const stored = localStorage.getItem(`pinned_teachers_${session.id}`)
    if (stored) { try { setPinnedIds(JSON.parse(stored)) } catch { /* ignore */ } }
    const lrStored = localStorage.getItem(`chat_lastread_${session.id}`)
    if (lrStored) { try { lastReadRef.current = JSON.parse(lrStored) } catch { /* ignore */ } }
  }, [session.id])

  // ── Session restore (once teachers + admins both loaded) ──────────────────
  useEffect(() => {
    if (sessionRestoredRef.current || loadingTeachers || loadingAdmins) return
    sessionRestoredRef.current = true
    try {
      const saved = localStorage.getItem(`chat_session_${session.id}`)
      if (saved) {
        const { mode: m, teacherId, adminId } = JSON.parse(saved)
        if (m === "teacher_dm" && teacherId) {
          const t = teachers.find(t => t.id === teacherId)
          if (t) { setMode("teacher_dm"); setSelectedTeacher(t) }
        } else if (m === "admin_dm" && adminId) {
          const a = admins.find(a => a.id === adminId)
          if (a) { setMode("admin_dm"); setSelectedAdmin(a) }
        }
      }
    } catch { /* ignore */ }
    sessionSaveRef.current = true
  }, [teachers, admins, loadingTeachers, loadingAdmins, session.id])

  // ── Session save (after restore is done) ─────────────────────────────────
  useEffect(() => {
    if (!sessionSaveRef.current) return
    localStorage.setItem(`chat_session_${session.id}`, JSON.stringify({
      mode, teacherId: selectedTeacher?.id ?? null, adminId: selectedAdmin?.id ?? null,
    }))
  }, [mode, selectedTeacher, selectedAdmin, session.id])

  const togglePin = useCallback((id: string) => {
    setPinnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
      localStorage.setItem(`pinned_teachers_${session.id}`, JSON.stringify(next))
      return next
    })
  }, [session.id])

  const markRead = useCallback((partnerId: string) => {
    const now = new Date().toISOString()
    lastReadRef.current[partnerId] = now
    localStorage.setItem(`chat_lastread_${session.id}`, JSON.stringify(lastReadRef.current))
    setLastMessageMap(prev => prev[partnerId] ? { ...prev, [partnerId]: { ...prev[partnerId], unread: 0 } } : prev)
  }, [session.id])

  // ── Fetch teachers ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from("teachers").select("id, full_name, email, avatar_url")
      .eq("is_active", true).neq("id", session.id).order("full_name")
      .then(({ data }) => { setTeachers(data ?? []); setLoadingTeachers(false) })
  }, [session.id])

  // ── Fetch admins ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from("admin_profiles").select("id, full_name, avatar_url").order("full_name")
      .then(({ data }) => { setAdmins(data ?? []); setLoadingAdmins(false) })
  }, [])

  // ── Sidebar: last message preview + unread counts ─────────────────────────
  const fetchLastMessages = useCallback(async () => {
    const [{ data: dmMsgs }, { data: adminMsgs }] = await Promise.all([
      supabase.from("teacher_dm_messages")
        .select("id, sender_teacher_id, recipient_teacher_id, content, created_at, attachment_url")
        .or(`sender_teacher_id.eq.${session.id},recipient_teacher_id.eq.${session.id}`)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("teacher_chat_messages")
        .select("id, admin_id, sender_type, content, created_at, attachment_url")
        .eq("teacher_id", session.id)
        .order("created_at", { ascending: false })
        .limit(300),
    ])
    const map: Record<string, { lastAt: string; preview: string; unread: number }> = {}
    // Teacher DMs
    const tMap: Record<string, any[]> = {}
    for (const m of (dmMsgs ?? [])) {
      const pid = String(m.sender_teacher_id) === String(session.id) ? String(m.recipient_teacher_id) : String(m.sender_teacher_id)
      if (!tMap[pid]) tMap[pid] = []
      tMap[pid].push(m)
    }
    for (const [pid, msgs] of Object.entries(tMap)) {
      const lastRead = lastReadRef.current[pid] || "1970-01-01"
      const latest = msgs[0]
      map[pid] = {
        lastAt: latest.created_at,
        preview: latest.content || (latest.attachment_url ? "📎 Attachment" : ""),
        unread: msgs.filter(m => m.created_at > lastRead && String(m.sender_teacher_id) !== String(session.id)).length,
      }
    }
    // Admin DMs
    const aMap: Record<string, any[]> = {}
    for (const m of (adminMsgs ?? [])) {
      if (!m.admin_id) continue
      const aid = String(m.admin_id)
      if (!aMap[aid]) aMap[aid] = []
      aMap[aid].push(m)
    }
    for (const [aid, msgs] of Object.entries(aMap)) {
      const lastRead = lastReadRef.current[aid] || "1970-01-01"
      const latest = msgs[0]
      map[aid] = {
        lastAt: latest.created_at,
        preview: latest.content || (latest.attachment_url ? "📎 Attachment" : ""),
        unread: msgs.filter(m => m.created_at > lastRead && m.sender_type === "admin").length,
      }
    }
    setLastMessageMap(map)
  }, [session.id])

  useEffect(() => {
    fetchLastMessages()
    const ch = supabase.channel(`sidebar_activity_${session.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "teacher_dm_messages" }, fetchLastMessages)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "teacher_chat_messages" }, fetchLastMessages)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchLastMessages, session.id])

  // ── Teacher DM fetch + realtime ────────────────────────────────────────────
  const fetchDm = useCallback(async () => {
    if (!selectedTeacher) return
    const [{ data: msgs }, { data: rxns }] = await Promise.all([
      supabase.from("teacher_dm_messages").select("*")
        .or(`and(sender_teacher_id.eq.${session.id},recipient_teacher_id.eq.${selectedTeacher.id}),and(sender_teacher_id.eq.${selectedTeacher.id},recipient_teacher_id.eq.${session.id})`)
        .order("created_at", { ascending: true }),
      supabase.from("teacher_message_reactions").select("*").eq("message_type", "teacher_dm"),
    ])
    const msgIds = new Set((msgs ?? []).map((m: any) => String(m.id)))
    setDmMessages((msgs ?? []).map(msg => ({
      ...msg,
      reactions: (rxns ?? []).filter(r => msgIds.has(String(r.message_id)) && String(r.message_id) === String(msg.id)),
    })))
    setDmLoading(false)
  }, [session.id, selectedTeacher])

  useEffect(() => {
    if (mode !== "teacher_dm" || !selectedTeacher) return
    setDmLoading(true); setDmMessages([])
    fetchDm()
    const ch = supabase.channel(`t2t_${session.id}_${selectedTeacher.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_dm_messages" }, fetchDm)
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_message_reactions", filter: `message_type=eq.teacher_dm` }, fetchDm)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [mode, selectedTeacher, session.id, fetchDm])

  // ── Admin DM fetch + realtime ──────────────────────────────────────────────
  const fetchAdminDm = useCallback(async () => {
    if (!selectedAdmin) return
    const [{ data: msgs }, { data: rxns }] = await Promise.all([
      supabase.from("teacher_chat_messages").select("*")
        .eq("teacher_id", session.id)
        .eq("admin_id", selectedAdmin.id)
        .order("created_at", { ascending: true }),
      supabase.from("teacher_message_reactions").select("*").eq("message_type", "admin_dm"),
    ])
    const msgIds = new Set((msgs ?? []).map((m: any) => String(m.id)))
    setAdminDmMessages((msgs ?? []).map(msg => ({
      ...msg,
      reactions: (rxns ?? []).filter(r => msgIds.has(String(r.message_id)) && String(r.message_id) === String(msg.id)),
    })))
    setAdminDmLoading(false)
  }, [session.id, selectedAdmin])

  useEffect(() => {
    if (mode !== "admin_dm" || !selectedAdmin) return
    setAdminDmLoading(true); setAdminDmMessages([])
    fetchAdminDm()
    const ch = supabase.channel(`teacher_admin_dm_${session.id}_${selectedAdmin.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_chat_messages", filter: `teacher_id=eq.${session.id}` }, fetchAdminDm)
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_message_reactions", filter: `message_type=eq.admin_dm` }, fetchAdminDm)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [mode, selectedAdmin, session.id, fetchAdminDm])

  // ── Scroll to bottom only on new messages (not reactions) ─────────────────
  const currentMessages = mode === "teacher_dm" ? dmMessages : adminDmMessages
  useEffect(() => {
    const count = currentMessages.length
    if (count > prevMsgCountRef.current) {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    prevMsgCountRef.current = count
  }, [currentMessages])

  // ── Navigation ─────────────────────────────────────────────────────────────
  const selectGlobal  = () => { setMode("global"); setShowChatOnMobile(true) }
  const selectTeacher = (t: any) => { setMode("teacher_dm"); setSelectedTeacher(t); setShowChatOnMobile(true); setNewMessage(""); markRead(t.id) }
  const selectAdmin   = (a: any) => { setMode("admin_dm");   setSelectedAdmin(a);   setShowChatOnMobile(true); setNewMessage(""); markRead(a.id) }

  // ── Send teacher DM ────────────────────────────────────────────────────────
  const sendDm = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !authUserId || !selectedTeacher || isUploading) return
    const content = newMessage.trim()
    setNewMessage("")
    const optId = `optimistic-${Date.now()}`
    setDmMessages(prev => [...prev, {
      id: optId, content, sender_teacher_id: session.id,
      recipient_teacher_id: selectedTeacher.id, sender_name: session.full_name,
      sender_avatar_url: session.avatar_url ?? null, sender_type: "teacher",
      reactions: [], created_at: new Date().toISOString(),
    }])
    const { error } = await supabase.from("teacher_dm_messages").insert({
      content, sender_auth_id: authUserId, sender_teacher_id: session.id,
      recipient_teacher_id: selectedTeacher.id, sender_name: session.full_name,
      sender_avatar_url: session.avatar_url ?? null,
    })
    if (error) { setDmMessages(prev => prev.filter(m => m.id !== optId)); setNewMessage(content); toast.error(error.message) }
  }, [newMessage, authUserId, session, selectedTeacher, isUploading])

  // ── Send admin DM ──────────────────────────────────────────────────────────
  const sendAdminDm = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !authUserId || !selectedAdmin || isUploading) return
    const content = newMessage.trim()
    setNewMessage("")
    const optId = `optimistic-${Date.now()}`
    setAdminDmMessages(prev => [...prev, {
      id: optId, content, sender_id: authUserId, sender_type: "teacher",
      sender_name: session.full_name, sender_avatar_url: session.avatar_url ?? null,
      teacher_id: session.id, admin_id: selectedAdmin.id,
      reactions: [], created_at: new Date().toISOString(),
    }])
    const { error } = await supabase.from("teacher_chat_messages").insert({
      content, sender_id: authUserId, sender_type: "teacher",
      sender_name: session.full_name, sender_avatar_url: session.avatar_url ?? null,
      teacher_id: session.id, admin_id: selectedAdmin.id,
    })
    if (error) { setAdminDmMessages(prev => prev.filter(m => m.id !== optId)); setNewMessage(content); toast.error(error.message) }
  }, [newMessage, authUserId, session, selectedAdmin, isUploading])

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !authUserId) return
    const partner = mode === "teacher_dm" ? selectedTeacher : selectedAdmin
    if (!partner) return
    if (file.size > MAX_FILE_SIZE) { toast.error("File exceeds 30MB limit."); e.target.value = ""; return }
    setIsUploading(true)
    const toastId = toast.loading("Uploading…")
    try {
      const ext = file.name.split(".").pop()
      const pre = mode === "teacher_dm" ? "t2t" : "tadm"
      const fileName = `${pre}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`
      const { error: up } = await supabase.storage.from("chat-attachments").upload(fileName, file)
      if (up) throw up
      const { data: { publicUrl } } = supabase.storage.from("chat-attachments").getPublicUrl(fileName)
      let error: any
      if (mode === "teacher_dm") {
        ;({ error } = await supabase.from("teacher_dm_messages").insert({
          content: "", sender_auth_id: authUserId, sender_teacher_id: session.id,
          recipient_teacher_id: partner.id, sender_name: session.full_name,
          sender_avatar_url: session.avatar_url ?? null,
          attachment_url: publicUrl, attachment_name: file.name, attachment_type: file.type, attachment_size: file.size,
        }))
      } else {
        ;({ error } = await supabase.from("teacher_chat_messages").insert({
          content: "", sender_id: authUserId, sender_type: "teacher",
          sender_name: session.full_name, sender_avatar_url: session.avatar_url ?? null,
          teacher_id: session.id, admin_id: partner.id,
          attachment_url: publicUrl, attachment_name: file.name, attachment_type: file.type, attachment_size: file.size,
        }))
      }
      if (error) throw error
      toast.success("Attachment sent.", { id: toastId })
    } catch (err: any) {
      toast.error("Upload failed: " + err.message, { id: toastId })
    } finally { setIsUploading(false); e.target.value = "" }
  }

  // ── Edit / Delete ──────────────────────────────────────────────────────────
  const startEdit  = useCallback((msg: any) => { setEditingId(String(msg.id)); setEditContent(msg.content) }, [])
  const cancelEdit = useCallback(() => { setEditingId(null); setEditContent("") }, [])

  const saveEdit = useCallback(async () => {
    if (!editingId || !editContent.trim()) return
    const table = mode === "teacher_dm" ? "teacher_dm_messages" : "teacher_chat_messages"
    const { error } = await supabase.from(table).update({ content: editContent.trim() }).eq("id", editingId)
    if (error) { toast.error("Failed to edit."); return }
    setEditingId(null); setEditContent("")
  }, [editingId, editContent, mode])

  const deleteMsg = useCallback(async (id: any) => {
    const table = mode === "teacher_dm" ? "teacher_dm_messages" : "teacher_chat_messages"
    const { error } = await supabase.from(table).delete().eq("id", id)
    if (error) toast.error("Failed to delete.")
  }, [mode])

  // ── Reactions ──────────────────────────────────────────────────────────────
  const toggleReaction = useCallback(async (msgId: any, emoji: string) => {
    if (!authUserId) return
    const messageType = mode === "teacher_dm" ? "teacher_dm" : "admin_dm"
    const allMessages = mode === "teacher_dm" ? dmMessages : adminDmMessages
    const msgReactions = allMessages.find(m => String(m.id) === String(msgId))?.reactions ?? []
    const myReaction = msgReactions.find((r: any) => String(r.user_id) === String(authUserId))
    if (myReaction) {
      const { error } = await supabase.from("teacher_message_reactions").delete().eq("id", myReaction.id)
      if (error) { toast.error("Failed to remove reaction."); return }
      if (myReaction.emoji === emoji) return // toggled off
    }
    const { error } = await supabase.from("teacher_message_reactions").insert({
      message_type: messageType, message_id: String(msgId),
      emoji, user_id: authUserId, user_name: session.full_name,
    })
    if (error) toast.error("Reaction failed: " + error.message)
  }, [authUserId, mode, dmMessages, adminDmMessages, session.full_name])

  // ── Filtered lists ─────────────────────────────────────────────────────────
  const filteredTeachers = teachers.filter(t =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  )
  const filteredAdmins = admins.filter(a =>
    a.full_name?.toLowerCase().includes(search.toLowerCase())
  )
  const byRecency = (a: any, b: any) => {
    const aAt = lastMessageMap[a.id]?.lastAt ?? ""
    const bAt = lastMessageMap[b.id]?.lastAt ?? ""
    return bAt > aAt ? 1 : bAt < aAt ? -1 : 0
  }
  const pinnedList    = filteredTeachers.filter(t => pinnedIds.includes(t.id)).sort(byRecency)
  const unpinnedList  = filteredTeachers.filter(t => !pinnedIds.includes(t.id)).sort(byRecency)
  const sortedAdmins  = [...filteredAdmins].sort(byRecency)

  // ── Current DM context ─────────────────────────────────────────────────────
  const currentLoading  = mode === "teacher_dm" ? dmLoading  : adminDmLoading
  const currentPartner  = mode === "teacher_dm" ? selectedTeacher : selectedAdmin
  const currentSend     = mode === "teacher_dm" ? sendDm : sendAdminDm

  const borderColor = dm ? "rgba(255,255,255,0.05)" : "rgb(226,232,240)"
  const bg          = dm ? "rgba(15,23,42,0.9)"      : "rgba(255,255,255,0.95)"

  const inputBg = dm
    ? { backgroundColor: "rgb(2,6,23)", borderTopColor: "rgba(255,255,255,0.05)" }
    : { backgroundColor: "rgb(248,250,252)", borderTopColor: "rgb(226,232,240)" }

  return (
    <div className="rounded-2xl md:rounded-3xl shadow-sm overflow-hidden flex"
      style={{ height: "calc(100vh - 300px)", minHeight: "460px", backgroundColor: bg, border: "1px solid", borderColor }}>

      {/* ── Left panel ──────────────────────────────────────────────────────── */}
      <div className={cn("w-full md:w-64 shrink-0 flex flex-col border-r",
        dm ? "border-white/5" : "border-slate-100",
        showChatOnMobile ? "hidden md:flex" : "flex")}>

        {/* Search */}
        <div className={cn("p-3 border-b shrink-0", dm ? "border-white/5" : "border-slate-100")}>
          <p className={cn("text-[9px] font-black uppercase tracking-[0.3em] mb-2.5", dm ? "text-blue-400" : "text-blue-600")}>Messenger</p>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className={cn("w-full pl-7 pr-3 py-1.5 rounded-xl text-xs font-medium border outline-none transition-colors",
                dm ? "bg-slate-800/60 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-blue-500/50"
                  : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-400")} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5" style={{ scrollbarWidth: "none" }}>
          {/* Global Chat */}
          <button type="button" onClick={selectGlobal}
            className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 rounded-2xl",
              mode === "global"
                ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/20"
                : dm ? "hover:bg-slate-800/70 text-slate-300" : "hover:bg-slate-100 text-slate-700"
            )}>
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2",
              mode === "global" ? "bg-white/20 border-white/30" : dm ? "bg-slate-800 border-slate-700" : "bg-violet-50 border-violet-200")}>
              <Globe size={16} className={mode === "global" ? "text-white" : "text-violet-500"} />
            </div>
            <div className="min-w-0">
              <p className={cn("text-xs font-black truncate", mode === "global" ? "text-white" : "")}>Global Chat</p>
              <p className={cn("text-[10px] mt-0.5 truncate", mode === "global" ? "text-white/60" : dm ? "text-slate-500" : "text-slate-400")}>All admins & teachers</p>
            </div>
          </button>

          <div className={cn("mx-3 my-1 border-t", dm ? "border-slate-800" : "border-slate-100")} />

          {/* Admins section */}
          <p className={cn("text-[9px] font-black uppercase tracking-widest px-4 pt-1 pb-0.5 flex items-center gap-1", dm ? "text-blue-400/60" : "text-blue-500/70")}>
            <ShieldCheck size={8} /> Admins
          </p>
          {loadingAdmins ? (
            <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-blue-500" /></div>
          ) : sortedAdmins.length === 0 ? (
            <p className={cn("text-[10px] px-4 py-2 opacity-40", dm ? "text-slate-400" : "text-slate-500")}>No admins found</p>
          ) : sortedAdmins.map(a => (
            <SidebarItem key={a.id} person={a} isAdmin
              selected={mode === "admin_dm" && selectedAdmin?.id === a.id}
              pinned={false} dm={dm}
              unread={lastMessageMap[a.id]?.unread}
              lastPreview={lastMessageMap[a.id]?.preview}
              onClick={() => selectAdmin(a)} />
          ))}

          <div className={cn("mx-3 my-1 border-t", dm ? "border-slate-800" : "border-slate-100")} />

          {/* Teachers section */}
          <p className={cn("text-[9px] font-black uppercase tracking-widest px-4 pt-1 pb-0.5 flex items-center gap-1", dm ? "text-emerald-400/60" : "text-emerald-500/70")}>
            <GraduationCap size={8} /> Teachers
          </p>
          {loadingTeachers ? (
            <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-blue-500" /></div>
          ) : filteredTeachers.length === 0 ? (
            <p className={cn("text-[10px] px-4 py-2 opacity-40", dm ? "text-slate-400" : "text-slate-500")}>
              {search ? "No results" : "No other teachers"}
            </p>
          ) : (
            <>
              {pinnedList.length > 0 && (
                <>
                  <p className={cn("text-[9px] font-black uppercase tracking-widest px-4 pt-1 pb-0.5 flex items-center gap-1", dm ? "text-amber-400/60" : "text-amber-500/70")}>
                    <Pin size={8} className="fill-current" /> Pinned
                  </p>
                  {pinnedList.map(t => (
                    <SidebarItem key={t.id} person={t} isAdmin={false}
                      selected={mode === "teacher_dm" && selectedTeacher?.id === t.id}
                      pinned dm={dm}
                      unread={lastMessageMap[t.id]?.unread}
                      lastPreview={lastMessageMap[t.id]?.preview}
                      onClick={() => selectTeacher(t)} onTogglePin={togglePin} />
                  ))}
                  <div className={cn("mx-3 my-1 border-t", dm ? "border-slate-800" : "border-slate-100")} />
                </>
              )}
              {unpinnedList.map(t => (
                <SidebarItem key={t.id} person={t} isAdmin={false}
                  selected={mode === "teacher_dm" && selectedTeacher?.id === t.id}
                  pinned={false} dm={dm}
                  unread={lastMessageMap[t.id]?.unread}
                  lastPreview={lastMessageMap[t.id]?.preview}
                  onClick={() => selectTeacher(t)} onTogglePin={togglePin} />
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────────── */}
      <div className={cn("flex-1 flex flex-col min-w-0 overflow-hidden", !showChatOnMobile && "hidden md:flex")}>

        {/* Mobile back */}
        {showChatOnMobile && (
          <button type="button" onClick={() => setShowChatOnMobile(false)}
            className={cn("md:hidden flex items-center gap-2 px-4 py-3 text-xs font-bold border-b shrink-0",
              dm ? "border-white/5 text-slate-400 hover:text-white" : "border-slate-100 text-slate-500 hover:text-slate-800")}>
            ← Back
          </button>
        )}

        {/* Global Chat */}
        {mode === "global" && authUserId && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <GlobalChatPanel session={session} authUserId={authUserId} dm={dm} />
          </div>
        )}
        {mode === "global" && !authUserId && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-blue-500" />
          </div>
        )}

        {/* No partner selected */}
        {(mode === "teacher_dm" && !selectedTeacher) || (mode === "admin_dm" && !selectedAdmin) ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-25 p-8">
            <MessageSquare size={44} className={dm ? "text-slate-600" : "text-slate-300"} />
            <p className={cn("text-sm font-black uppercase tracking-widest", dm ? "text-slate-500" : "text-slate-400")}>
              {mode === "admin_dm" ? "Select an Admin" : "Select a Teacher"}
            </p>
          </div>
        ) : null}

        {/* DM panel (teacher or admin) */}
        {((mode === "teacher_dm" && selectedTeacher) || (mode === "admin_dm" && selectedAdmin)) && currentPartner && (
          <>
            {/* Header */}
            <div className={cn("flex items-center gap-3 px-4 py-3 border-b shrink-0", dm ? "border-white/5" : "border-slate-100")}>
              <div className={cn("w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border",
                dm ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200")}>
                {currentPartner.avatar_url
                  ? <img src={currentPartner.avatar_url} alt={currentPartner.full_name} className="w-full h-full object-cover" />
                  : mode === "admin_dm"
                    ? <ShieldCheck size={15} className="text-blue-400" />
                    : <UserIcon size={15} className="text-slate-400" />
                }
              </div>
              <div className="min-w-0">
                <p className={cn("text-sm font-black truncate", dm ? "text-white" : "text-slate-900")}>{currentPartner.full_name}</p>
                <p className={cn("text-[10px] truncate", dm ? "text-slate-500" : "text-slate-400")}>
                  {mode === "admin_dm" ? "Admin · Private message" : "Private message"}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: "none" }}>
              {currentLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-blue-500" /></div>
              ) : currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
                  <MessageSquare size={36} className={dm ? "text-slate-600" : "text-slate-300"} />
                  <p className={cn("text-xs font-black", dm ? "text-white" : "text-slate-900")}>
                    Start a conversation with {currentPartner.full_name}
                  </p>
                </div>
              ) : (
                currentMessages.map(msg => {
                  // Determine isMe and avatar based on message type
                  const isMe = mode === "teacher_dm"
                    ? String(msg.sender_teacher_id) === String(session.id)
                    : msg.sender_type === "teacher" // admin DM: teacher's own messages
                  const avatar = msg.sender_avatar_url
                    || (isMe ? session.avatar_url : currentPartner?.avatar_url)
                    || null
                  return (
                    <DmBubble
                      key={msg.id}
                      msg={{ ...msg, sender_avatar_url: avatar }}
                      isMe={isMe}
                      authUserId={authUserId ?? ""}
                      dm={dm}
                      editingId={editingId} editContent={editContent} setEditContent={setEditContent}
                      onSaveEdit={saveEdit} onStartEdit={startEdit} onCancelEdit={cancelEdit}
                      onDelete={deleteMsg} onToggleReaction={toggleReaction}
                    />
                  )
                })
              )}
            </div>

            {/* Input */}
            <div className={cn("px-3 py-2.5 border-t shrink-0 relative", dm ? "border-white/5" : "border-slate-100")}
              style={inputBg}>
              {isUploading && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500/20"><div className="h-full bg-blue-500 animate-pulse w-full" /></div>}
              <form onSubmit={currentSend} className="flex gap-2 items-center">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                  className={cn("h-10 w-10 flex items-center justify-center rounded-xl transition-all active:scale-95 shrink-0",
                    dm ? "bg-slate-800 hover:bg-slate-700 text-slate-400" : "bg-slate-100 hover:bg-slate-200 text-slate-500")}>
                  {isUploading ? <Loader2 size={15} className="animate-spin text-blue-500" /> : <Paperclip size={14} className="-rotate-45" />}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <input
                  value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  placeholder={isUploading ? "Uploading…" : `Message ${currentPartner.full_name}…`}
                  disabled={isUploading}
                  className={cn("flex-1 h-10 rounded-xl border px-3 text-sm font-medium outline-none transition-colors focus:ring-2 focus:ring-blue-500",
                    dm ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400")}
                />
                <button type="submit" disabled={!newMessage.trim() || isUploading}
                  className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center active:scale-90 transition-all shadow-md shadow-blue-500/20 shrink-0">
                  <Send size={15} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
