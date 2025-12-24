"use client"

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { 
  History, UserCheck, UserX, Search, Shield, Loader2, ExternalLink
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setLogs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('realtime_audit_trail')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'activity_logs' 
      }, (payload) => {
        setLogs(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => 
    log.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.admin_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="h-[70vh] flex flex-col items-center justify-center bg-white rounded-[48px] border border-slate-100 shadow-sm">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Opening System Ledger...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900 leading-none">Activity Matrix</h1>
          <p className="text-slate-500 font-medium italic mt-2 opacity-60">Audit trail of all administrative student processing</p>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
          <Input 
            placeholder="Search activity..." 
            className="pl-12 h-14 w-full md:w-[350px] rounded-2xl border-slate-100 bg-white shadow-sm focus:ring-blue-600 font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="rounded-[40px] border-slate-100 shadow-2xl bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Timestamp</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Authorized Admin</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Decision</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Student Target</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="group hover:bg-slate-50/80 transition-colors">
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{format(new Date(log.created_at), 'MMM dd, yyyy')}</span>
                      <span className="text-[10px] font-medium text-slate-400">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Shield size={14} />
                      </div>
                      <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{log.admin_name || 'System Admin'}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      log.action_type === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                      log.action_type === 'DECLINED' ? 'bg-red-50 text-red-600 border border-red-100' : 
                      'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {log.action_type === 'ACCEPTED' ? <UserCheck size={12}/> : <UserX size={12}/>}
                      {log.action_type}
                    </span>
                  </td>
                  <td className="p-6 text-sm font-bold text-slate-600 italic">{log.student_name}</td>
                  <td className="p-6 text-right">
                    <code className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-400 font-mono">
                        {log.id.slice(0, 8)}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredLogs.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-300 italic">
              <History size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest">No matching activities found</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}