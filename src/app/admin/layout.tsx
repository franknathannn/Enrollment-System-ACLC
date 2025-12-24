"use client"

import { useEffect, useState, useRef } from "react";
import { 
  GraduationCap, LayoutDashboard, Users, Settings, 
  LogOut, BookOpen, User as UserIcon, Loader2, ShieldCheck, Camera, Sparkles, MessageSquare
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [authorized, setAuthorized] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [adminProfile, setAdminProfile] = useState({
    id: "",
    name: "Loading...",
    email: "",
    avatar: null as string | null
  });

  const fetchAdminIdentity = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user && pathname !== "/admin/login") {
      router.push("/admin/login");
      return;
    }

    if (user) {
      const { data: profile } = await supabase
        .from('admin_profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      setAdminProfile({
        id: user.id,
        name: profile?.full_name || user.email?.split('@')[0] || "Administrator",
        email: user.email || "",
        avatar: profile?.avatar_url || null
      });
      setAuthorized(true);
    }
  };

  useEffect(() => { fetchAdminIdentity() }, [pathname, router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Processing identity image...");

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${adminProfile.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAdminProfile(prev => ({ ...prev, avatar: publicUrl }));
      toast.success("Identity image uploaded.", { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    const toastId = toast.loading("Synchronizing Matrix...");

    const { error } = await supabase
      .from('admin_profiles')
      .upsert({
        id: adminProfile.id,
        full_name: adminProfile.name,
        avatar_url: adminProfile.avatar,
        updated_at: new Date().toISOString(),
      });

    if (error) toast.error(error.message, { id: toastId });
    else {
      toast.success("Identity Confirmed & Synced.", { id: toastId });
      fetchAdminIdentity();
    }
    setUpdating(false);
  };

  const handleLogout = async () => {
    const toastId = toast.loading("Terminating session...");
    await supabase.auth.signOut();
    router.refresh(); 
    setTimeout(() => {
      toast.success("Securely Logged Out", { id: toastId });
      router.push("/admin/login");
    }, 800);
  };

  if (pathname === "/admin/login") return <>{children}</>;

  if (!authorized) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Verifying Admin Access</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col fixed h-full z-20 shadow-sm">
        <div className="p-8 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tighter text-slate-900 uppercase leading-none">ACLC Northbay</span>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Registry Admin</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-6 space-y-1.5">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 ml-2">Main Menu</p>
          <AdminNavLink href="/admin/dashboard" icon={<LayoutDashboard size={18} />} label="Overview" active={pathname === "/admin/dashboard"} />
          <AdminNavLink href="/admin/applicants" icon={<Users size={18} />} label="Applicants" active={pathname === "/admin/applicants"} />
          <AdminNavLink href="/admin/sections" icon={<BookOpen size={18} />} label="Sections" active={pathname === "/admin/sections"} />
          
          {/* CONFIGURATION - ABOVE COMM LINK */}
          <AdminNavLink href="/admin/settings" icon={<Settings size={18} />} label="Configuration" active={pathname === "/admin/settings"} />
          <AdminNavLink href="/admin/activity_logs" icon={<MessageSquare size={18} />} label="Activity Logs" active={pathname === "/admin/activity_logs"} />
          
          {/* COMM LINK - Dedicated Page Tab */}
          <AdminNavLink href="/admin/communication" icon={<MessageSquare size={18} />} label="Communication" active={pathname === "/admin/communication"} />
        </nav>

        {/* BOTTOM IDENTITY STATUS */}
        <div className="p-6 mt-auto space-y-4">
          <div className="bg-slate-50 rounded-[28px] p-4 border border-slate-100 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden shrink-0">
               {adminProfile.avatar ? (
                 <img src={adminProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
               ) : (
                 <UserIcon size={18} className="text-slate-400" />
               )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Authenticated</p>
              <p className="text-sm font-black text-slate-900 truncate uppercase tracking-tighter leading-tight">
                {adminProfile.name}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center justify-center gap-3 text-slate-400 hover:text-red-600 font-black text-[10px] uppercase tracking-[0.2em] px-4 py-4 rounded-2xl transition-all hover:bg-red-50 w-full group">
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" /> Logout Session
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 ml-72 min-h-screen">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-30">
           <div className="flex items-center gap-2">
              <ShieldCheck className="text-emerald-500" size={16} />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Secure root protocol enabled</p>
           </div>

           {/* --- TOPBAR IDENTITY SHEET TRIGGER --- */}
           <Sheet>
             <SheetTrigger asChild>
               <button className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-slate-100 border border-slate-200 hover:bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all group">
                  <div className="w-9 h-9 rounded-full bg-white border border-slate-300 overflow-hidden shadow-sm flex items-center justify-center shrink-0 group-hover:border-blue-400">
                    {adminProfile.avatar ? <img src={adminProfile.avatar} className="w-full h-full object-cover" /> : <UserIcon size={16} className="text-slate-400" />}
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter leading-none">{adminProfile.name}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Administrator</span>
                  </div>
               </button>
             </SheetTrigger>
             <SheetContent className="w-[400px] sm:w-[540px] p-0 border-none shadow-2xl bg-white">
               <div className="h-full flex flex-col">
                  <SheetHeader className="p-10 bg-slate-900 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/30 blur-3xl rounded-full -mr-10 -mt-10 animate-pulse" />
                    <SheetTitle className="text-4xl font-black uppercase tracking-tighter text-white relative z-10">Admin Identity</SheetTitle>
                    <SheetDescription className="text-blue-400 font-bold uppercase text-[10px] tracking-widest relative z-10 opacity-80">Credential Management Matrix</SheetDescription>
                  </SheetHeader>

                  <form onSubmit={handleUpdateProfile} className="p-10 space-y-10">
                    <div className="flex flex-col items-center">
                       <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                          <div className="w-36 h-36 rounded-[48px] bg-slate-50 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95 duration-500">
                             {isUploading ? (
                               <Loader2 className="animate-spin text-blue-500" size={32} />
                             ) : adminProfile.avatar ? (
                               <img src={adminProfile.avatar} className="w-full h-full object-cover" />
                             ) : (
                               <UserIcon size={56} className="text-slate-200" />
                             )}
                          </div>
                          <div className="absolute bottom-1 right-1 p-3 bg-blue-600 text-white rounded-2xl shadow-xl border-4 border-white transform transition-transform group-hover:rotate-12">
                             <Camera size={18} />
                          </div>
                          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                       </div>
                       <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Replace Identification Image</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-5 tracking-widest">Public Matrix Name</label>
                        <Input value={adminProfile.name} onChange={(e) => setAdminProfile({...adminProfile, name: e.target.value})} className="h-14 rounded-3xl border-slate-100 bg-slate-50 font-black px-8 focus:ring-blue-600 text-slate-900 uppercase" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-5 tracking-widest">Admin Email (Static)</label>
                        <Input disabled value={adminProfile.email} className="h-14 rounded-3xl border-slate-100 bg-slate-100/50 opacity-60 px-8 font-bold text-slate-500" />
                      </div>
                    </div>

                    <Button disabled={updating || isUploading} className="w-full h-16 bg-slate-900 hover:bg-blue-600 text-white rounded-3xl font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl transition-all active:scale-95">
                      {updating ? <Loader2 className="animate-spin" /> : <><Sparkles size={16} className="mr-2"/> Synchronize registry profile</>}
                    </Button>
                  </form>
               </div>
             </SheetContent>
           </Sheet>
        </header>
        
        <div className="p-10">{children}</div>
      </main>
    </div>
  );
}

function AdminNavLink({ href, icon, label, active }: { href: string, icon: React.ReactNode, label: string, active: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-4 px-5 py-4 rounded-[22px] font-bold transition-all duration-300 ${active ? "bg-slate-900 text-white shadow-xl shadow-blue-100 translate-x-2" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"}`}>
      <span className={`${active ? "text-blue-400 scale-110" : "text-slate-300"} transition-transform`}>{icon}</span>
      <span className="text-[11px] uppercase tracking-[0.15em]">{label}</span>
    </Link>
  );
}