"use client"

import { useEffect, useState, useRef, useCallback, memo } from "react";
import { supabase } from "@/lib/supabase/client";
import { 
  Send, User as UserIcon, Loader2, MoreVertical, 
  Trash2, Edit3, X, Check, Wifi, WifiOff, Eye, MessageSquare, ShieldCheck, Sparkles 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { themeColors } from "@/lib/themeColors";

// Optimized Background
const StarConstellation = memo(function StarConstellation() {
  const [stars, setStars] = useState<Array<{x: number, y: number, size: number}>>([])
  useEffect(() => {
    const newStars = Array.from({ length: 30 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1
    }))
    setStars(newStars)
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <svg className="w-full h-full opacity-20">
        {stars.map((star, i) => (
          <circle key={i} cx={`${star.x}%`} cy={`${star.y}%`} r={star.size} fill="rgb(59 130 246)" className="animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </svg>
    </div>
  )
})

export default function CommunicationPage() {
  const { isDarkMode } = useTheme()
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('admin_messages')
      .select(`
        *, 
        profiles:admin_profiles!sender_id(full_name, avatar_url),
        message_reads(
          user_id, 
          read_at, 
          profiles:admin_profiles!user_id(full_name, avatar_url)
        )
      `)
      .order('created_at', { ascending: true });
    
    if (!error) setMessages(data || []);
    setLoading(false);
  }, []);

  const markAsSeen = async (messageId: string) => {
    if (!currentUser || messageId.toString().startsWith('optimistic')) return;
    await supabase.from('message_reads').upsert({ 
      message_id: messageId, 
      user_id: currentUser.id 
    }, { onConflict: 'message_id,user_id' });
  };

  useEffect(() => {
    let channel: any;

    const setupChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      setCurrentUser(session.user);
      fetchMessages();

      await supabase.removeAllChannels();
      channel = supabase.channel('matrix_v20_ultra_fast', {
        config: { presence: { key: session.user.id } }
      });

      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_messages' }, () => {
          fetchMessages();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reads' }, () => {
          fetchMessages();
        })
        .subscribe(async (status: string) => {
          const live = status === 'SUBSCRIBED';
          setIsConnected(live);
          if (status === 'TIMED_OUT') {
            setTimeout(() => setupChat(), 1500);
          }
        });
      setIsConnected(true); 
    };

    setupChat();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    
    if (messages.length > 0 && currentUser) {
      const lastMsg = messages[messages.length - 1];
      const alreadyRead = lastMsg.message_reads?.some((r: any) => r.user_id === currentUser.id);
      if (!alreadyRead && lastMsg.sender_id !== currentUser.id && !lastMsg.id.toString().startsWith('optimistic')) {
        markAsSeen(lastMsg.id);
      }
    }
  }, [messages, currentUser]);

  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    const content = newMessage.trim();
    setNewMessage("");

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: any = {
      id: optimisticId,
      content,
      sender_id: currentUser.id,
      created_at: new Date().toISOString(),
      profiles: { 
        full_name: currentUser.user_metadata?.full_name || "Admin Staff", 
        avatar_url: currentUser.user_metadata?.avatar_url || null 
      },
      message_reads: []
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    const { error } = await supabase.from('admin_messages').insert([{ content, sender_id: currentUser.id }]);
    if (error) {
        toast.error("Handshake failed.");
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
        setNewMessage(content);
    }
  }, [newMessage, currentUser]);

  const deleteMessage = useCallback(async (id: string) => {
    await supabase.from('admin_messages').delete().eq('id', id);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editContent.trim() || !editingId) return;
    const { error } = await supabase.from('admin_messages').update({ content: editContent }).eq('id', editingId);
    if (!error) setEditingId(null);
  }, [editingId, editContent]);

  const startEditing = useCallback((msg: any) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  }, []);

  if (loading || !currentUser) return (
    <div className="h-[70vh] flex flex-col items-center justify-center rounded-[48px] border shadow-2xl relative overflow-hidden"
      style={{ backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : '#ffffff', borderColor: isDarkMode ? 'rgba(30,41,59,0.6)' : '#e2e8f0' }}>
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />
      <div className="relative flex items-center justify-center mb-5">
        <div className="absolute w-20 h-20 rounded-full border border-blue-500/20 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute w-14 h-14 rounded-full border border-blue-500/30 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/30 flex items-center justify-center">
          <MessageSquare size={16} className="text-white" />
        </div>
      </div>
      <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Retrieving Chats...</p>
    </div>
  );

  return (
    <div 
      className="relative h-[calc(100vh-140px)] flex flex-col gap-6 animate-in fade-in duration-700 transition-colors duration-500"
    >
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
      `}</style>
      <StarConstellation />
      
      {/* HEADER NODES */}
      <div
        className="relative overflow-hidden flex flex-col md:flex-row items-start md:items-end justify-between p-6 md:p-8 rounded-[40px] border shadow-2xl transition-colors duration-500"
        style={{ backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.85)' : '#ffffff', borderColor: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : '#e2e8f0' }}
      >
        {/* Top accent strip */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" />
        {/* Ambient glow */}
        <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-[60px] pointer-events-none ${isDarkMode ? 'bg-blue-500/6' : 'bg-blue-400/5'}`} />

        <div className="relative flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${isDarkMode ? 'bg-blue-400' : 'bg-blue-500'}`} />
            <p className={`text-[9px] font-black uppercase tracking-[0.4em] ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Admin Channel</p>
          </div>
          <h1 className={`text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Messenger</h1>
          <p className={`text-[11px] font-semibold italic mt-1.5 flex items-center gap-2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            <ShieldCheck size={12} className="text-blue-500 shrink-0" />
            Administrative Chat
          </p>
        </div>

        <div 
          className={cn(
            "flex items-center gap-3 px-6 py-3 rounded-2xl border transition-colors duration-500 shadow-lg",
            isConnected 
              ? 'text-emerald-600 dark:text-emerald-400 shadow-emerald-500/10' 
              : 'text-red-600 dark:text-red-400 shadow-red-500/10'
          )}
          style={isConnected ? {
            backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.1)' : '#ffffff',
            borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgb(187 247 208)'
          } : {
            backgroundColor: isDarkMode ? 'rgba(153, 27, 27, 0.1)' : 'rgb(254 242 242)',
            borderColor: isDarkMode ? 'rgba(185, 28, 28, 0.2)' : 'rgb(254 202 202)'
          }}
        >
          {isConnected ? <Wifi size={16} className="animate-pulse" /> : <WifiOff size={16} />}
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">{isConnected ? 'System Live' : 'Link Offline'}</span>
        </div>
      </div>

      {/* CHAT TERMINAL */}
      <Card 
        className="flex-1 rounded-[48px] shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col relative transition-colors duration-500"
        style={{ backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)', borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgb(241 245 249)' }}
      >
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
              <MessageSquare size={48} className="mb-4 text-blue-500" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Listening for Transmissions...</p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageItem
                key={msg.id}
                msg={msg}
                currentUser={currentUser}
                isDarkMode={isDarkMode}
                editingId={editingId}
                editContent={editContent}
                setEditContent={setEditContent}
                onSaveEdit={saveEdit}
                onStartEdit={startEditing}
                onCancelEdit={() => setEditingId(null)}
                onDelete={deleteMessage}
              />
            ))
          )}
        </div>

        {/* INPUT COMMANDER */}
        <form onSubmit={sendMessage} 
          className="p-6 md:p-10 border-t flex gap-4 items-center relative z-20 transition-colors duration-500"
          style={{ backgroundColor: isDarkMode ? 'rgb(2, 6, 23)' : 'rgb(241, 245, 249)', borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgb(226, 232, 240)' }}
        >
          <div className="relative flex-1 group">
            <MessageSquare className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 transition-colors group-focus-within:text-blue-500" size={20} />
            <Input 
              placeholder="Message..." 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)} 
              className="h-16 rounded-[28px] border-slate-200 dark:border-white/10 font-black pl-14 pr-8 focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white transition-all text-sm shadow-inner" 
              style={{ backgroundColor: isDarkMode ? 'rgb(15 23 42)' : '#ffffff', color: isDarkMode ? themeColors.dark.text.primary : themeColors.light.text.primary }}
            />
          </div>
          <Button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="h-16 w-16 rounded-[28px] bg-blue-600 hover:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 shrink-0 active:scale-90 transition-all group"
          >
            <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </Button>
        </form>
      </Card>
    </div>
  );
}

const MessageItem = memo(({ msg, currentUser, isDarkMode, editingId, editContent, setEditContent, onSaveEdit, onStartEdit, onCancelEdit, onDelete }: any) => {
  const isMe = String(msg.sender_id) === String(currentUser?.id);
  const isOptimistic = msg.id.toString().startsWith('optimistic');
  const displayName = msg.profiles?.full_name || "Admin Staff";
  const readers = msg.message_reads?.filter((r: any) => r.user_id !== msg.sender_id);
  const formattedDate = msg.created_at ? format(new Date(msg.created_at), 'MMMM d, yyyy || h:mma') : 'Syncing...';

  return (
    <div className={cn(
      "flex gap-3 group animate-in slide-in-from-bottom-2 duration-500",
      isMe ? 'flex-row-reverse' : 'flex-row',
      isOptimistic && 'opacity-40 grayscale blur-[1px]'
    )}>
      <div className="relative shrink-0 self-end mb-1">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-800 overflow-hidden shadow-md transition-transform group-hover:scale-110">
          {msg.profiles?.avatar_url ? (
            <img src={msg.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><UserIcon size={18} className="text-slate-400" /></div>
          )}
        </div>
      </div>

      <div className={cn("flex flex-col max-w-[85%] md:max-w-[60%]", isMe ? 'items-end' : 'items-start')}>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 px-1 opacity-70">
          {displayName} • {formattedDate}
        </span>

        <div className={cn("flex items-center gap-2 group/controls", isMe ? "flex-row-reverse" : "flex-row")}>
          {editingId === msg.id ? (
            <div 
              className="flex items-center gap-2 p-2 rounded-[24px] border border-blue-500/50 shadow-2xl animate-in zoom-in-95 w-full"
              style={{ backgroundColor: isDarkMode ? themeColors.dark.surface : themeColors.light.surface }}
            >
              <Input value={editContent} onChange={(e) => setEditContent(e.target.value)} className="h-10 rounded-xl border-none text-sm font-bold" style={{ backgroundColor: isDarkMode ? 'rgb(15 23 42)' : 'rgb(241 245 249)', color: isDarkMode ? themeColors.dark.text.primary : themeColors.light.text.primary }} autoFocus />
              <button onClick={onSaveEdit} className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg hover:scale-110 transition-transform"><Check size={14}/></button>
              <button onClick={onCancelEdit} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl hover:scale-110 transition-transform"><X size={14}/></button>
            </div>
          ) : (
            <div className={cn(
              "p-4 md:p-5 rounded-[24px] text-[13px] font-bold leading-relaxed shadow-sm transition-all duration-300 relative overflow-hidden border",
              isMe 
                ? 'bg-slate-900 text-white rounded-tr-sm shadow-blue-500/10' 
                : 'rounded-tl-sm'
            )}
            style={isMe ? 
              { backgroundColor: isDarkMode ? themeColors.dark.primary : 'rgb(37, 99, 235)', border: 'none' } : 
              { backgroundColor: isDarkMode ? themeColors.dark.surface : themeColors.light.surface, color: isDarkMode ? themeColors.dark.text.primary : themeColors.light.text.primary, borderColor: isDarkMode ? themeColors.dark.border : themeColors.light.border }
            }>
              {msg.content}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-20 transition-opacity">
                <Sparkles size={12} />
              </div>
            </div>
          )}

          {isMe && !editingId && !isOptimistic && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90">
                  <MoreVertical size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align={isMe ? "end" : "start"} 
                className="rounded-2xl p-2 shadow-2xl min-w-[150px] z-[100] transition-colors duration-500"
                style={{ backgroundColor: isDarkMode ? themeColors.dark.surface : themeColors.light.surface, borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgb(241 245 249)' }}
              >
                <DropdownMenuItem onClick={() => onStartEdit(msg)} className="gap-3 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                  <Edit3 size={14} className="text-blue-500" /> Edit Message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(msg.id)} className="gap-3 text-[10px] font-black uppercase tracking-widest text-red-600 hover:!text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 px-4 py-3 rounded-xl cursor-pointer transition-colors">
                  <Trash2 size={14} /> Delete Message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isMe && readers?.length > 0 && (
          <div className="mt-1.5 flex items-center justify-end gap-1 flex-wrap px-1 animate-in fade-in">
            {readers.map((r: any, i: number) => (
              <TooltipProvider key={i}>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="w-4 h-4 rounded-full border border-white dark:border-slate-900 overflow-hidden shadow-sm cursor-help ring-1 ring-slate-100 dark:ring-slate-800 transition-transform hover:scale-125 hover:z-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                      {r.profiles?.avatar_url ? (
                        <img src={r.profiles.avatar_url} alt="Seen by" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon size={10} className="text-slate-400" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white border-slate-800">
                    {r.profiles?.full_name || "Admin Staff"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
MessageItem.displayName = "MessageItem";