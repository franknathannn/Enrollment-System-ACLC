"use client"

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { 
  Send, User as UserIcon, Loader2, MoreVertical, 
  Trash2, Edit3, X, Check, Wifi, WifiOff, Eye, MessageSquare 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CommunicationPage() {
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
          profiles:admin_profiles!user_id(full_name)
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
      
      // OPTIMIZATION: Start these in parallel, don't 'await' fetchMessages first
      fetchMessages();

      // OPTIMIZATION: Clean and connect immediately
      await supabase.removeAllChannels();
      
      // Create channel with presence to speed up handshake visibility
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
          // Status becomes 'SUBSCRIBED' almost instantly if RLS is correct
          const live = status === 'SUBSCRIBED';
          setIsConnected(live);
          
          if (status === 'TIMED_OUT') {
            console.warn("Retrying link...");
            setTimeout(() => setupChat(), 1500);
          }
        });
        
      // FAST PATH: Set connected to true immediately to reduce UI flickering
      // The socket is actually opening the moment .subscribe() is called
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    const content = newMessage.trim();
    setNewMessage("");

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg = {
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

    const { error } = await supabase
      .from('admin_messages')
      .insert([{ content, sender_id: currentUser.id }]);

    if (error) {
        toast.error("Handshake failed. Retrying...");
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
        setNewMessage(content);
    }
  };

  const deleteMessage = async (id: string) => {
    await supabase.from('admin_messages').delete().eq('id', id);
  };

  const saveEdit = async () => {
    if (!editContent.trim() || !editingId) return;
    const { error } = await supabase.from('admin_messages').update({ content: editContent }).eq('id', editingId);
    if (!error) {
        setEditingId(null);
    }
  };

  if (loading || !currentUser) return (
    <div className="h-[70vh] flex flex-col items-center justify-center bg-white rounded-[48px]">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-bold">Initializing Matrix Link...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-180px)] flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900 leading-none">Comm Link</h1>
          <p className="text-slate-500 font-medium italic mt-2 opacity-60">Internal Administrative Matrix Channel</p>
        </div>

        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-300 ${
          isConnected ? 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-lg' : 'bg-red-50 border-red-100 text-red-600 shadow-lg'
        }`}>
          {isConnected ? <Wifi size={14} className="animate-pulse" /> : <WifiOff size={14} />}
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isConnected ? 'Link Live' : 'Link Offline'}</span>
        </div>
      </div>

      <Card className="flex-1 rounded-[48px] border-slate-100 shadow-2xl bg-white overflow-hidden flex flex-col relative">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-10 bg-slate-50/30 scroll-smooth custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
              <MessageSquare size={48} className="mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">No transmissions found</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = String(msg.sender_id) === String(currentUser?.id);
              const isOptimistic = msg.id.toString().startsWith('optimistic');
              const displayName = msg.profiles?.full_name || "Staff Member";
              const readers = msg.message_reads?.filter((r: any) => r.user_id !== msg.sender_id);

              return (
                <div key={msg.id} className={`flex gap-4 group animate-in slide-in-from-bottom-2 duration-300 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isOptimistic ? 'opacity-40 grayscale' : ''}`}>
                  <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-sm transition-transform group-hover:scale-110">
                    {msg.profiles?.avatar_url ? (
                      <img src={msg.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100">
                        <UserIcon size={18} className="text-slate-300" />
                      </div>
                    )}
                  </div>

                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest leading-none">
                      {displayName} • {msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : 'Syncing...'}
                    </span>

                    <div className="flex items-center gap-3">
                      {editingId === msg.id ? (
                        <div className="flex items-center gap-2 bg-white p-2 rounded-[24px] border border-blue-200 shadow-xl animate-in zoom-in-95">
                          <Input value={editContent} onChange={(e) => setEditContent(e.target.value)} className="h-10 rounded-xl border-none bg-slate-50 text-sm font-bold min-w-[200px]" autoFocus />
                          <button onClick={saveEdit} className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg hover:scale-105"><Check size={14}/></button>
                          <button onClick={() => setEditingId(null)} className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:scale-105"><X size={14}/></button>
                        </div>
                      ) : (
                        <div className={`p-5 rounded-[28px] text-[13px] font-medium leading-relaxed shadow-sm max-w-[400px] transition-all group-hover:shadow-md ${
                          isMe ? 'bg-slate-900 text-white rounded-tr-none shadow-blue-900/10' : 'bg-white border border-slate-100 text-slate-900 rounded-tl-none'
                        }`}>
                          {msg.content}
                        </div>
                      )}

                      {isMe && !editingId && !isOptimistic && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-8 w-8 flex items-center justify-center rounded-xl text-slate-300 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-90">
                              <MoreVertical size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isMe ? "end" : "start"} className="rounded-2xl border-slate-100 p-2 shadow-2xl bg-white min-w-[150px] z-[100]">
                            <DropdownMenuItem onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }} className="gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors">
                              <Edit3 size={14} className="text-blue-500" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteMessage(msg.id)} className="gap-2 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 px-4 py-3 rounded-xl cursor-pointer transition-colors">
                              <Trash2 size={14} /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {isMe && readers?.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity animate-in fade-in">
                        <Eye size={10} className="text-blue-500" />
                        <span className="text-[8px] font-bold uppercase tracking-tighter">
                          Seen by {readers.map((r: any) => `${r.profiles?.full_name?.split(' ')[0] || "Staff"} at ${format(new Date(r.read_at), 'HH:mm')}`).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={sendMessage} className="p-8 bg-white border-t border-slate-50 flex gap-4 items-center">
          <Input placeholder="Broadcast to Matrix..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="h-16 rounded-[24px] border-slate-200 bg-slate-50 font-black px-8 focus:ring-blue-600 text-base shadow-inner focus:bg-white transition-all" />
          <Button type="submit" className="h-16 w-16 rounded-[24px] bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 shrink-0 active:scale-95 transition-all">
            <Send size={24} />
          </Button>
        </form>
      </Card>
    </div>
  );
}