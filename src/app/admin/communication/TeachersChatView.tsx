"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import {
  Send, User as UserIcon, Loader2, MessageSquare,
  Paperclip, Search, FileIcon, Download, Eye, Globe, Pin,
  SmilePlus, MoreVertical, Edit3, Trash2, Check, X, ShieldCheck, GraduationCap, UserX,
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
import { GlobalChatPanel } from "./GlobalChatPanel"
import { AdminChatPanel } from "./AdminChatPanel"

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
    : ["doc","docx"].includes(ext) ? "from-blue-500 to-blue-600"
    : ["xls","xlsx","csv"].includes(ext) ? "from-emerald-500 to-emerald-600"
    : ["ppt","pptx"].includes(ext) ? "from-orange-500 to-orange-600"
    : ["zip","rar","7z"].includes(ext) ? "from-amber-500 to-amber-600"
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

// ── DM bubble ─────────────────────────────────────────────────────────────────
const MessageBubble = memo(({
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
  const isMe         = String(msg.sender_id) === String(currentUserId)
  const isOptimistic = String(msg.id).startsWith("optimistic")
  const isAdmin      = msg.sender_type === "admin"
  const name         = msg.sender_name || (isAdmin ? "Admin" : "Teacher")
  const date         = msg.created_at ? format(new Date(msg.created_at), "MMM d, h:mm a") : "Sending…"
  const isEditing    = editingId === String(msg.id)

  const grouped: Record<string, { count: number; users: string[]; mine: boolean }> = {}
  ;(msg.reactions ?? []).forEach((r: any) => {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [], mine: false }
    grouped[r.emoji].count++
    grouped[r.emoji].users.push(r.user_name || "Unknown")
    if (String(r.user_id) === String(currentUserId)) grouped[r.emoji].mine = true
  })
  const hasReactions = Object.keys(grouped).length > 0

  return (
    <div className={cn("flex gap-2 md:gap-3 group animate-in slide-in-from-bottom-2 duration-400",
      isMe ? "flex-row-reverse" : "flex-row", isOptimistic && "opacity-50")}>

      {/* Avatar */}
      <div className={cn("w-8 h-8 md:w-9 md:h-9 rounded-2xl flex items-center justify-center shrink-0 self-end mb-1 border-2 overflow-hidden",
        isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-white")}>
        {msg.sender_avatar_url
          ? <img src={msg.sender_avatar_url} alt={name} className="w-full h-full object-cover" />
          : isAdmin
            ? <ShieldCheck size={13} className="text-blue-400" />
            : <UserIcon size={13} className="text-slate-400" />
        }
      </div>

      <div className={cn("flex flex-col max-w-[78%] md:max-w-[65%]", isMe ? "items-end" : "items-start")}>
        <span className={cn("text-[9px] font-bold mb-1 px-1 opacity-70 flex items-center gap-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
          {isAdmin
            ? <ShieldCheck size={9} className="text-blue-500 shrink-0" />
            : <GraduationCap size={9} className="text-emerald-500 shrink-0" />
          }
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

          {/* Controls */}
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
MessageBubble.displayName = "MessageBubble"

// ── Teacher list item ──────────────────────────────────────────────────────────
const TeacherListItem = ({ teacher, selected, pinned, isDarkMode, unread, lastPreview, onClick, onTogglePin }: {
  teacher: any; selected: boolean; pinned: boolean; isDarkMode: boolean
  unread?: number; lastPreview?: string
  onClick: () => void; onTogglePin: (id: string) => void
}) => (
  <div className="relative group/item">
    <button type="button" onClick={onClick}
      className={cn("w-full flex items-center gap-3 px-4 py-3 pr-10 text-left transition-all duration-150 rounded-2xl",
        selected ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
          : isDarkMode ? "hover:bg-slate-800/70 text-slate-300" : "hover:bg-slate-100 text-slate-700"
      )}>
      <div className={cn("w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border-2",
        selected ? "border-white/30" : isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-100")}>
        {teacher.avatar_url
          ? <img src={teacher.avatar_url} alt={teacher.full_name} className="w-full h-full object-cover" />
          : <UserIcon size={15} className={selected ? "text-white/60" : "text-slate-400"} />
        }
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p className={cn("text-xs font-black truncate", selected ? "text-white" : "")}>{teacher.full_name}</p>
          {(unread ?? 0) > 0 && !selected && (
            <span className="shrink-0 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-sm">
              {(unread ?? 0) > 99 ? "99+" : unread}
            </span>
          )}
        </div>
        <p className={cn("text-[10px] truncate mt-0.5", selected ? "text-white/60" : isDarkMode ? "text-slate-500" : "text-slate-400")}>
          {lastPreview || teacher.email}
        </p>
      </div>
    </button>
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onTogglePin(teacher.id) }}
      title={pinned ? "Unpin" : "Pin to top"}
      className={cn(
        "absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-150",
        pinned
          ? "opacity-100 text-amber-400 hover:text-amber-300"
          : "opacity-30 hover:opacity-100 text-slate-400 hover:text-amber-400",
        selected && !pinned && "text-white/40 hover:text-white"
      )}
    >
      <Pin size={11} className={pinned ? "fill-current" : ""} />
    </button>
  </div>
)

// ── Main ───────────────────────────────────────────────────────────────────────
export function TeachersChatView() {
  const { isDarkMode } = useTheme()

  const [selectedMode,      setSelectedMode]      = useState<"global" | "admin_global" | "dm" | "admin_dm">("global")
  const [selectedTeacher,   setSelectedTeacher]   = useState<any | null>(null)
  const [selectedOtherAdmin,setSelectedOtherAdmin] = useState<any | null>(null)
  const [teachers,          setTeachers]          = useState<any[]>([])
  const [otherAdmins,       setOtherAdmins]       = useState<any[]>([])
  const [loadingOtherAdmins,setLoadingOtherAdmins]= useState(true)
  const [messages,          setMessages]          = useState<any[]>([])
  const [adminDmMessages,   setAdminDmMessages]   = useState<any[]>([])
  const [adminDmLoading,    setAdminDmLoading]    = useState(false)
  const [newMessage,        setNewMessage]        = useState("")
  const [currentUser,       setCurrentUser]       = useState<any>(null)
  const [loadingTeachers,   setLoadingTeachers]   = useState(true)
  const [loadingMessages,   setLoadingMessages]   = useState(false)
  const [isUploading,       setIsUploading]       = useState(false)
  const [pinnedIds,         setPinnedIds]         = useState<string[]>([])
  const [search,            setSearch]            = useState("")
  const [showChatOnMobile,  setShowChatOnMobile]  = useState(false)
  const [editingId,         setEditingId]         = useState<string | null>(null)
  const [editContent,       setEditContent]       = useState("")
  const [adminProfile,      setAdminProfile]      = useState<{ full_name: string; avatar_url: string | null } | null>(null)
  const [isAnonymous,       setIsAnonymous]       = useState(false)

  const scrollRef    = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastReadRef  = useRef<Record<string, string>>({})
  const [lastMessageMap, setLastMessageMap] = useState<Record<string, { lastAt: string; preview: string; unread: number }>>({})

  useEffect(() => {
    setIsAnonymous(localStorage.getItem("admin_chat_anonymous") === "true")
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user)
        supabase.from("admin_profiles").select("full_name, avatar_url").eq("id", session.user.id).single()
          .then(({ data }) => { if (data) setAdminProfile(data) })
        const lrStored = localStorage.getItem(`admin_chat_lastread_${session.user.id}`)
        if (lrStored) { try { lastReadRef.current = JSON.parse(lrStored) } catch { /* ignore */ } }
      }
    })
    const stored = localStorage.getItem("pinned_teachers_admin")
    if (stored) { try { setPinnedIds(JSON.parse(stored)) } catch { /* ignore */ } }
  }, [])

  const toggleAnonymous = () => {
    setIsAnonymous(v => {
      const next = !v
      localStorage.setItem("admin_chat_anonymous", String(next))
      return next
    })
  }

  const togglePin = useCallback((id: string) => {
    setPinnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
      localStorage.setItem("pinned_teachers_admin", JSON.stringify(next))
      return next
    })
  }, [])

  // ── Sidebar: last message preview + unread counts ─────────────────────────
  const fetchSidebarData = useCallback(async () => {
    if (!currentUser) return
    // Teacher DMs
    const { data: msgs } = await supabase.from("teacher_chat_messages")
      .select("id, teacher_id, sender_type, content, created_at, attachment_url")
      .eq("admin_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(300)
    const tMap: Record<string, any[]> = {}
    for (const m of (msgs ?? [])) {
      const tid = String(m.teacher_id)
      if (!tMap[tid]) tMap[tid] = []
      tMap[tid].push(m)
    }
    const map: Record<string, { lastAt: string; preview: string; unread: number }> = {}
    for (const [tid, tMsgs] of Object.entries(tMap)) {
      const lastRead = lastReadRef.current[tid] || "1970-01-01"
      const latest = tMsgs[0]
      map[tid] = {
        lastAt: latest.created_at,
        preview: latest.content || (latest.attachment_url ? "📎 Attachment" : ""),
        unread: tMsgs.filter(m => m.created_at > lastRead && m.sender_type === "teacher").length,
      }
    }
    // Admin-to-admin DMs
    const { data: adminMsgs } = await supabase.from("admin_dm_messages")
      .select("id, sender_id, recipient_id, content, created_at, attachment_url")
      .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
      .order("created_at", { ascending: false })
      .limit(300)
    const aMap: Record<string, any[]> = {}
    for (const m of (adminMsgs ?? [])) {
      const partnerId = String(m.sender_id) === String(currentUser.id) ? String(m.recipient_id) : String(m.sender_id)
      const key = `admin_${partnerId}`
      if (!aMap[key]) aMap[key] = []
      aMap[key].push(m)
    }
    for (const [key, aMsgs] of Object.entries(aMap)) {
      const lastRead = lastReadRef.current[key] || "1970-01-01"
      const latest = aMsgs[0]
      map[key] = {
        lastAt: latest.created_at,
        preview: latest.content || (latest.attachment_url ? "📎 Attachment" : ""),
        unread: aMsgs.filter(m => m.created_at > lastRead && String(m.sender_id) !== String(currentUser.id)).length,
      }
    }
    setLastMessageMap(map)
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return
    fetchSidebarData()
    const ch = supabase.channel(`admin_sidebar_${currentUser.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "teacher_chat_messages",
        filter: `admin_id=eq.${currentUser.id}` }, fetchSidebarData)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_dm_messages" }, fetchSidebarData)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [currentUser, fetchSidebarData])

  const markRead = useCallback((teacherId: string) => {
    const now = new Date().toISOString()
    lastReadRef.current[teacherId] = now
    if (currentUser) localStorage.setItem(`admin_chat_lastread_${currentUser.id}`, JSON.stringify(lastReadRef.current))
    setLastMessageMap(prev => prev[teacherId] ? { ...prev, [teacherId]: { ...prev[teacherId], unread: 0 } } : prev)
  }, [currentUser])

  useEffect(() => {
    supabase.from("teachers").select("id, full_name, email, avatar_url").eq("is_active", true).order("full_name")
      .then(({ data }) => { setTeachers(data ?? []); setLoadingTeachers(false) })
  }, [])

  // ── Fetch other admins (once currentUser is known) ────────────────────────
  useEffect(() => {
    if (!currentUser) return
    supabase.from("admin_profiles").select("id, full_name, avatar_url")
      .neq("id", currentUser.id).order("full_name")
      .then(({ data }) => { setOtherAdmins(data ?? []); setLoadingOtherAdmins(false) })
  }, [currentUser])

  // ── Admin-to-Admin DM ─────────────────────────────────────────────────────
  const fetchAdminDm = useCallback(async () => {
    if (!selectedOtherAdmin || !currentUser) return
    const [{ data: msgs }, { data: rxns }] = await Promise.all([
      supabase.from("admin_dm_messages").select("*")
        .or(`and(sender_id.eq.${currentUser.id},recipient_id.eq.${selectedOtherAdmin.id}),and(sender_id.eq.${selectedOtherAdmin.id},recipient_id.eq.${currentUser.id})`)
        .order("created_at", { ascending: true }),
      supabase.from("teacher_message_reactions").select("*").eq("message_type", "admin_admin_dm"),
    ])
    const msgIds = new Set((msgs ?? []).map((m: any) => String(m.id)))
    setAdminDmMessages((msgs ?? []).map(msg => ({
      ...msg,
      reactions: (rxns ?? []).filter(r => msgIds.has(String(r.message_id)) && String(r.message_id) === String(msg.id)),
    })))
    setAdminDmLoading(false)
  }, [currentUser, selectedOtherAdmin])

  useEffect(() => {
    if (selectedMode !== "admin_dm" || !selectedOtherAdmin || !currentUser) return
    setAdminDmLoading(true); setAdminDmMessages([])
    fetchAdminDm()
    const ch = supabase.channel(`adm_dm_${currentUser.id}_${selectedOtherAdmin.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_dm_messages" }, fetchAdminDm)
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_message_reactions", filter: `message_type=eq.admin_admin_dm` }, fetchAdminDm)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [selectedMode, selectedOtherAdmin, currentUser, fetchAdminDm])

  const fetchMessages = useCallback(async () => {
    if (!selectedTeacher || !currentUser) return
    const [{ data: msgs }, { data: rxns }] = await Promise.all([
      supabase.from("teacher_chat_messages").select("*")
        .eq("teacher_id", selectedTeacher.id)
        .eq("admin_id", currentUser.id)
        .order("created_at", { ascending: true }),
      supabase.from("teacher_message_reactions").select("*").eq("message_type", "admin_dm"),
    ])
    const relevantMsgIds = new Set((msgs ?? []).map((m: any) => String(m.id)))
    const merged = (msgs ?? []).map(msg => ({
      ...msg,
      reactions: (rxns ?? []).filter(r => relevantMsgIds.has(String(r.message_id)) && String(r.message_id) === String(msg.id)),
    }))
    setMessages(merged)
    setLoadingMessages(false)
  }, [selectedTeacher, currentUser])

  useEffect(() => {
    if (selectedMode !== "dm" || !selectedTeacher) return
    setLoadingMessages(true)
    setMessages([])
    fetchMessages()
    const channel = supabase
      .channel(`tchat_admin_${selectedTeacher.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_chat_messages", filter: `teacher_id=eq.${selectedTeacher.id}` }, fetchMessages)
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_message_reactions", filter: `message_type=eq.admin_dm` }, fetchMessages)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedTeacher, selectedMode, currentUser, fetchMessages])

  const prevMsgCountRef      = useRef(0)
  const prevAdminDmCountRef  = useRef(0)
  const sessionRestoredRef   = useRef(false)
  useEffect(() => {
    const count = messages.length
    if (count > prevMsgCountRef.current) {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    prevMsgCountRef.current = count
  }, [messages])
  useEffect(() => {
    const count = adminDmMessages.length
    if (count > prevAdminDmCountRef.current) {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    prevAdminDmCountRef.current = count
  }, [adminDmMessages])

  // ── Session restore (wait for teachers + other admins) ────────────────────
  useEffect(() => {
    if (sessionRestoredRef.current || loadingTeachers || loadingOtherAdmins || !currentUser) return
    sessionRestoredRef.current = true
    try {
      const saved = localStorage.getItem(`admin_chat_session_${currentUser.id}`)
      if (saved) {
        const { mode: m, teacherId, otherAdminId } = JSON.parse(saved)
        if (m === "admin_global") {
          setSelectedMode("admin_global")
        } else if (m === "dm" && teacherId) {
          const t = teachers.find(t => t.id === teacherId)
          if (t) { setSelectedMode("dm"); setSelectedTeacher(t) }
        } else if (m === "admin_dm" && otherAdminId) {
          const a = otherAdmins.find(a => a.id === otherAdminId)
          if (a) { setSelectedMode("admin_dm"); setSelectedOtherAdmin(a) }
        }
      }
    } catch { /* ignore */ }
  }, [teachers, otherAdmins, loadingTeachers, loadingOtherAdmins, currentUser])

  // ── Session save ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !sessionRestoredRef.current) return
    localStorage.setItem(`admin_chat_session_${currentUser.id}`, JSON.stringify({
      mode: selectedMode,
      teacherId: selectedTeacher?.id ?? null,
      otherAdminId: selectedOtherAdmin?.id ?? null,
    }))
  }, [selectedMode, selectedTeacher, selectedOtherAdmin, currentUser])

  const selectGlobal      = () => { setSelectedMode("global"); setShowChatOnMobile(true) }
  const selectAdminGlobal = () => { setSelectedMode("admin_global"); setShowChatOnMobile(true) }
  const selectTeacher     = (t: any) => { setSelectedMode("dm"); setSelectedTeacher(t); setShowChatOnMobile(true); markRead(t.id) }
  const selectOtherAdmin  = (a: any) => { setSelectedMode("admin_dm"); setSelectedOtherAdmin(a); setShowChatOnMobile(true); markRead(`admin_${a.id}`) }

  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser || !selectedTeacher || isUploading) return
    const content = newMessage.trim()
    setNewMessage("")
    const adminName   = isAnonymous ? "Admin" : (adminProfile?.full_name || currentUser.user_metadata?.full_name || "Admin")
    const adminAvatar = isAnonymous ? null : (adminProfile?.avatar_url ?? currentUser.user_metadata?.avatar_url ?? null)
    const optimisticId = `optimistic-${Date.now()}`
    setMessages(prev => [...prev, {
      id: optimisticId, content, sender_id: currentUser.id, sender_type: "admin",
      sender_name: adminName, sender_avatar_url: adminAvatar,
      teacher_id: selectedTeacher.id, reactions: [], created_at: new Date().toISOString(),
    }])
    const { error } = await supabase.from("teacher_chat_messages").insert({
      content, sender_id: currentUser.id, sender_type: "admin",
      sender_name: adminName, sender_avatar_url: adminAvatar,
      teacher_id: selectedTeacher.id, admin_id: currentUser.id,
    })
    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setNewMessage(content)
      toast.error(error.message || "Message failed to send.")
    }
  }, [newMessage, currentUser, selectedTeacher, isUploading])

  // ── Send admin-to-admin DM ─────────────────────────────────────────────────
  const sendAdminDm = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser || !selectedOtherAdmin || isUploading) return
    const content = newMessage.trim()
    setNewMessage("")
    const myName   = adminProfile?.full_name || currentUser.user_metadata?.full_name || "Admin"
    const myAvatar = adminProfile?.avatar_url ?? currentUser.user_metadata?.avatar_url ?? null
    const optId = `optimistic-${Date.now()}`
    setAdminDmMessages(prev => [...prev, {
      id: optId, content, sender_id: currentUser.id, recipient_id: selectedOtherAdmin.id,
      sender_name: myName, sender_avatar_url: myAvatar,
      reactions: [], created_at: new Date().toISOString(),
    }])
    const { error } = await supabase.from("admin_dm_messages").insert({
      content, sender_id: currentUser.id, recipient_id: selectedOtherAdmin.id,
      sender_name: myName, sender_avatar_url: myAvatar,
    })
    if (error) {
      setAdminDmMessages(prev => prev.filter(m => m.id !== optId))
      setNewMessage(content); toast.error(error.message)
    }
  }, [newMessage, currentUser, selectedOtherAdmin, adminProfile, isUploading])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return
    const partner = selectedMode === "admin_dm" ? selectedOtherAdmin : selectedTeacher
    if (!partner) return
    if (file.size > MAX_FILE_SIZE) { toast.error("File exceeds 30MB limit."); e.target.value = ""; return }
    setIsUploading(true)
    const toastId = toast.loading("Uploading…")
    try {
      const ext = file.name.split(".").pop()
      const prefix = selectedMode === "admin_dm" ? "adm" : "tc"
      const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`
      const { error: up } = await supabase.storage.from("chat-attachments").upload(fileName, file)
      if (up) throw up
      const { data: { publicUrl } } = supabase.storage.from("chat-attachments").getPublicUrl(fileName)
      let error: any
      if (selectedMode === "admin_dm") {
        const myName   = adminProfile?.full_name || currentUser.user_metadata?.full_name || "Admin"
        const myAvatar = adminProfile?.avatar_url ?? currentUser.user_metadata?.avatar_url ?? null
        ;({ error } = await supabase.from("admin_dm_messages").insert({
          content: "", sender_id: currentUser.id, recipient_id: partner.id,
          sender_name: myName, sender_avatar_url: myAvatar,
          attachment_url: publicUrl, attachment_name: file.name, attachment_type: file.type, attachment_size: file.size,
        }))
      } else {
        ;({ error } = await supabase.from("teacher_chat_messages").insert({
          content: "", sender_id: currentUser.id, sender_type: "admin",
          sender_name: isAnonymous ? "Admin" : (adminProfile?.full_name || currentUser.user_metadata?.full_name || "Admin"),
          sender_avatar_url: isAnonymous ? null : (adminProfile?.avatar_url ?? currentUser.user_metadata?.avatar_url ?? null),
          teacher_id: partner.id, admin_id: currentUser.id,
          attachment_url: publicUrl, attachment_name: file.name, attachment_type: file.type, attachment_size: file.size,
        }))
      }
      if (error) throw error
      toast.success("Attachment sent.", { id: toastId })
    } catch (err: any) {
      toast.error("Upload failed: " + err.message, { id: toastId })
    } finally { setIsUploading(false); e.target.value = "" }
  }

  const startEdit  = useCallback((msg: any) => { setEditingId(String(msg.id)); setEditContent(msg.content) }, [])
  const cancelEdit = useCallback(() => { setEditingId(null); setEditContent("") }, [])
  const saveEdit   = useCallback(async () => {
    if (!editingId || !editContent.trim()) return
    const table = selectedMode === "admin_dm" ? "admin_dm_messages" : "teacher_chat_messages"
    const { error } = await supabase.from(table).update({ content: editContent.trim() }).eq("id", editingId)
    if (error) { toast.error("Failed to edit."); return }
    setEditingId(null); setEditContent("")
  }, [editingId, editContent, selectedMode])

  const deleteMsg = useCallback(async (id: any) => {
    const table = selectedMode === "admin_dm" ? "admin_dm_messages" : "teacher_chat_messages"
    const { error } = await supabase.from(table).delete().eq("id", id)
    if (error) toast.error("Failed to delete.")
  }, [selectedMode])

  const toggleReaction = useCallback(async (msgId: any, emoji: string) => {
    if (!currentUser) return
    const isAdminDm = selectedMode === "admin_dm"
    const targetMsgs = isAdminDm ? adminDmMessages : messages
    const msgReactions = targetMsgs.find(m => String(m.id) === String(msgId))?.reactions ?? []
    const myReaction = msgReactions.find((r: any) => String(r.user_id) === String(currentUser.id))
    if (myReaction) {
      const { error } = await supabase.from("teacher_message_reactions").delete().eq("id", myReaction.id)
      if (error) { toast.error("Failed to remove reaction."); return }
      if (myReaction.emoji === emoji) return
    }
    const { error } = await supabase.from("teacher_message_reactions").insert({
      message_type: isAdminDm ? "admin_admin_dm" : "admin_dm",
      message_id: String(msgId), emoji,
      user_id: currentUser.id,
      user_name: isAdminDm
        ? (adminProfile?.full_name || currentUser.user_metadata?.full_name || "Admin")
        : (isAnonymous ? "Admin" : (adminProfile?.full_name || currentUser.user_metadata?.full_name || "Admin")),
    })
    if (error) toast.error("Reaction failed: " + error.message)
  }, [currentUser, selectedMode, messages, adminDmMessages, isAnonymous, adminProfile])

  const filtered = teachers.filter(t =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  )
  const byRecency = (a: any, b: any) => {
    const aAt = lastMessageMap[a.id]?.lastAt ?? ""
    const bAt = lastMessageMap[b.id]?.lastAt ?? ""
    return bAt > aAt ? 1 : bAt < aAt ? -1 : 0
  }
  const byAdminRecency = (a: any, b: any) => {
    const aAt = lastMessageMap[`admin_${a.id}`]?.lastAt ?? ""
    const bAt = lastMessageMap[`admin_${b.id}`]?.lastAt ?? ""
    return bAt > aAt ? 1 : bAt < aAt ? -1 : 0
  }
  const pinnedList   = filtered.filter(t => pinnedIds.includes(t.id)).sort(byRecency)
  const unpinnedList = filtered.filter(t => !pinnedIds.includes(t.id)).sort(byRecency)

  const bg     = isDarkMode ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.9)"
  const border = isDarkMode ? "rgba(255,255,255,0.05)" : "rgb(241,245,249)"

  return (
    <div className="flex-1 rounded-[32px] md:rounded-[48px] shadow-2xl backdrop-blur-xl overflow-hidden flex relative transition-colors duration-500"
      style={{ backgroundColor: bg, border: "1px solid", borderColor: border }}>

      {/* ── Left: list ──────────────────────────────────────────────────────── */}
      <div className={cn("w-full md:w-72 shrink-0 flex flex-col border-r transition-colors duration-500",
        isDarkMode ? "border-white/5" : "border-slate-100",
        showChatOnMobile ? "hidden md:flex" : "flex"
      )}>
        <div className={cn("p-4 border-b shrink-0", isDarkMode ? "border-white/5" : "border-slate-100")}>
          <p className={cn("text-[9px] font-black uppercase tracking-[0.3em] mb-3", isDarkMode ? "text-blue-400" : "text-blue-600")}>Messenger</p>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              className={cn("w-full pl-8 pr-3 py-2 rounded-xl text-xs font-medium border outline-none transition-colors",
                isDarkMode ? "bg-slate-800/60 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-blue-500/50"
                  : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-400")} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {/* Global Chat */}
          <button type="button" onClick={selectGlobal}
            className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 rounded-2xl",
              selectedMode === "global"
                ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-500/20"
                : isDarkMode ? "hover:bg-slate-800/70 text-slate-300" : "hover:bg-slate-100 text-slate-700"
            )}>
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2",
              selectedMode === "global"
                ? "bg-white/20 border-white/30"
                : isDarkMode ? "bg-slate-800 border-slate-700" : "bg-violet-50 border-violet-200"
            )}>
              <Globe size={16} className={selectedMode === "global" ? "text-white" : "text-violet-500"} />
            </div>
            <div className="min-w-0">
              <p className={cn("text-xs font-black", selectedMode === "global" ? "text-white" : "")}>Global Chat</p>
              <p className={cn("text-[10px] mt-0.5", selectedMode === "global" ? "text-white/60" : isDarkMode ? "text-slate-500" : "text-slate-400")}>
                All admins & teachers
              </p>
            </div>
          </button>

          {/* Admin Chat (admins only) */}
          <button type="button" onClick={selectAdminGlobal}
            className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 rounded-2xl",
              selectedMode === "admin_global"
                ? "bg-gradient-to-r from-blue-700 to-blue-500 text-white shadow-lg shadow-blue-500/20"
                : isDarkMode ? "hover:bg-slate-800/70 text-slate-300" : "hover:bg-slate-100 text-slate-700"
            )}>
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2",
              selectedMode === "admin_global"
                ? "bg-white/20 border-white/30"
                : isDarkMode ? "bg-slate-800 border-slate-700" : "bg-blue-50 border-blue-200"
            )}>
              <ShieldCheck size={16} className={selectedMode === "admin_global" ? "text-white" : "text-blue-500"} />
            </div>
            <div className="min-w-0">
              <p className={cn("text-xs font-black", selectedMode === "admin_global" ? "text-white" : "")}>Admin Chat</p>
              <p className={cn("text-[10px] mt-0.5", selectedMode === "admin_global" ? "text-white/60" : isDarkMode ? "text-slate-500" : "text-slate-400")}>
                Admins only · Private
              </p>
            </div>
          </button>

          <div className={cn("mx-3 my-1 border-t", isDarkMode ? "border-slate-800" : "border-slate-100")} />

          {/* Admins section */}
          <p className={cn("text-[9px] font-black uppercase tracking-widest px-4 pt-1 pb-0.5 flex items-center gap-1", isDarkMode ? "text-blue-400/60" : "text-blue-500/70")}>
            <ShieldCheck size={8} /> Admins
          </p>
          {loadingOtherAdmins ? (
            <div className="flex items-center justify-center py-4"><Loader2 size={16} className="animate-spin text-blue-500" /></div>
          ) : otherAdmins.length === 0 ? (
            <p className={cn("text-[10px] px-4 py-2 opacity-40", isDarkMode ? "text-slate-500" : "text-slate-400")}>No other admins</p>
          ) : (
            [...otherAdmins].filter(a =>
              a.full_name.toLowerCase().includes(search.toLowerCase())
            ).sort(byAdminRecency).map(a => (
              <TeacherListItem key={a.id} teacher={a}
                selected={selectedMode === "admin_dm" && selectedOtherAdmin?.id === a.id}
                pinned={false} isDarkMode={isDarkMode}
                unread={lastMessageMap[`admin_${a.id}`]?.unread}
                lastPreview={lastMessageMap[`admin_${a.id}`]?.preview}
                onClick={() => selectOtherAdmin(a)} onTogglePin={() => {}} />
            ))
          )}

          <div className={cn("mx-3 my-1 border-t", isDarkMode ? "border-slate-800" : "border-slate-100")} />

          <p className={cn("text-[9px] font-black uppercase tracking-widest px-4 pt-1 pb-0.5 flex items-center gap-1", isDarkMode ? "text-emerald-400/60" : "text-emerald-500/70")}>
            <GraduationCap size={8} /> Teachers
          </p>

          {loadingTeachers ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={18} className="animate-spin text-blue-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 opacity-40">
              <UserIcon size={24} className="text-slate-400" />
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">No teachers found</p>
            </div>
          ) : (
            <>
              {pinnedList.length > 0 && (
                <>
                  <p className={cn("text-[9px] font-black uppercase tracking-widest px-4 pt-1 pb-0.5 flex items-center gap-1", isDarkMode ? "text-amber-400/60" : "text-amber-500/70")}>
                    <Pin size={8} className="fill-current" /> Pinned
                  </p>
                  {pinnedList.map(teacher => (
                    <TeacherListItem key={teacher.id} teacher={teacher}
                      selected={selectedMode === "dm" && selectedTeacher?.id === teacher.id}
                      pinned isDarkMode={isDarkMode}
                      unread={lastMessageMap[teacher.id]?.unread}
                      lastPreview={lastMessageMap[teacher.id]?.preview}
                      onClick={() => selectTeacher(teacher)} onTogglePin={togglePin} />
                  ))}
                  <div className={cn("mx-3 my-1 border-t", isDarkMode ? "border-slate-800" : "border-slate-100")} />
                </>
              )}
              {unpinnedList.map(teacher => (
                <TeacherListItem key={teacher.id} teacher={teacher}
                  selected={selectedMode === "dm" && selectedTeacher?.id === teacher.id}
                  pinned={false} isDarkMode={isDarkMode}
                  unread={lastMessageMap[teacher.id]?.unread}
                  lastPreview={lastMessageMap[teacher.id]?.preview}
                  onClick={() => selectTeacher(teacher)} onTogglePin={togglePin} />
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Right: chat panel ───────────────────────────────────────────────── */}
      <div className={cn("flex-1 flex flex-col min-w-0", !showChatOnMobile && "hidden md:flex")}>

        {showChatOnMobile && (
          <button type="button" onClick={() => setShowChatOnMobile(false)}
            className={cn("md:hidden flex items-center gap-2 px-4 py-3 text-xs font-bold border-b shrink-0",
              isDarkMode ? "border-white/5 text-slate-400 hover:text-white" : "border-slate-100 text-slate-500 hover:text-slate-800")}>
            ← Back
          </button>
        )}

        {selectedMode === "global" && currentUser && (
          <GlobalChatPanel currentUser={currentUser} />
        )}

        {selectedMode === "admin_global" && currentUser && (
          <AdminChatPanel currentUser={currentUser} />
        )}

        {selectedMode === "admin_dm" && !selectedOtherAdmin && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-25 p-8">
            <ShieldCheck size={44} className="text-blue-500" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">Select an Admin</p>
          </div>
        )}

        {selectedMode === "admin_dm" && selectedOtherAdmin && (
          <>
            {/* Admin DM header */}
            <div className={cn("flex items-center gap-3 px-4 py-3 border-b shrink-0", isDarkMode ? "border-white/5" : "border-slate-100")}>
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {selectedOtherAdmin.avatar_url
                  ? <img src={selectedOtherAdmin.avatar_url} alt={selectedOtherAdmin.full_name} className="w-full h-full object-cover" />
                  : <ShieldCheck size={15} className="text-blue-400" />
                }
              </div>
              <div className="min-w-0">
                <p className={cn("text-sm font-black truncate", isDarkMode ? "text-white" : "text-slate-900")}>{selectedOtherAdmin.full_name}</p>
                <p className={cn("text-[10px] truncate", isDarkMode ? "text-slate-500" : "text-slate-400")}>Admin</p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar">
              {adminDmLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-blue-500" /></div>
              ) : adminDmMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-25">
                  <MessageSquare size={36} className="text-blue-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No messages yet</p>
                </div>
              ) : (
                adminDmMessages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg}
                    currentUserId={currentUser?.id ?? ""} isDarkMode={isDarkMode}
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
              <form onSubmit={sendAdminDm} className="flex gap-2 items-center">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                  className={cn("h-12 w-12 flex items-center justify-center rounded-[20px] active:scale-95 transition-all shrink-0",
                    isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-400" : "bg-slate-100 hover:bg-slate-200 text-slate-500")}>
                  {isUploading ? <Loader2 size={18} className="animate-spin text-blue-500" /> : <Paperclip size={17} className="-rotate-45" />}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

                <Input
                  placeholder={isUploading ? "Uploading…" : `Message ${selectedOtherAdmin.full_name}…`}
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
          </>
        )}

        {selectedMode === "dm" && !selectedTeacher && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-25 p-8">
            <MessageSquare size={44} className="text-blue-500" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">Select a Teacher</p>
          </div>
        )}

        {selectedMode === "dm" && selectedTeacher && (
          <>
            {/* DM header */}
            <div className={cn("flex items-center gap-3 px-4 py-3 border-b shrink-0", isDarkMode ? "border-white/5" : "border-slate-100")}>
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {selectedTeacher.avatar_url
                  ? <img src={selectedTeacher.avatar_url} alt={selectedTeacher.full_name} className="w-full h-full object-cover" />
                  : <UserIcon size={15} className="text-slate-400" />
                }
              </div>
              <div className="min-w-0">
                <p className={cn("text-sm font-black truncate", isDarkMode ? "text-white" : "text-slate-900")}>{selectedTeacher.full_name}</p>
                <p className={cn("text-[10px] truncate", isDarkMode ? "text-slate-500" : "text-slate-400")}>{selectedTeacher.email}</p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-blue-500" /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-25">
                  <MessageSquare size={36} className="text-blue-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No messages yet</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isOwn = String(msg.sender_id) === String(currentUser?.id)
                  const avatar = msg.sender_avatar_url
                    || (isOwn ? currentUser?.user_metadata?.avatar_url : selectedTeacher?.avatar_url)
                    || null
                  return (
                    <MessageBubble key={msg.id} msg={{ ...msg, sender_avatar_url: avatar }}
                      currentUserId={currentUser?.id ?? ""} isDarkMode={isDarkMode}
                      editingId={editingId} editContent={editContent} setEditContent={setEditContent}
                      onSaveEdit={saveEdit} onStartEdit={startEdit} onCancelEdit={cancelEdit}
                      onDelete={deleteMsg} onToggleReaction={toggleReaction}
                    />
                  )
                })
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
                  placeholder={isUploading ? "Uploading…" : `Message ${selectedTeacher.full_name}…`}
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
          </>
        )}
      </div>
    </div>
  )
}
