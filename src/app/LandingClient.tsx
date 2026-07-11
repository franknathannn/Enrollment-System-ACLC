"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Search, Menu, X, ArrowRight, MapPin, Mail, Phone, Send, Building, Clock, BookOpen, ChevronLeft, ChevronRight, Lock, FileText } from "lucide-react"
import GlobalSearch from "@/components/GlobalSearch"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { LiveDashboard } from "@/components/landing/LiveDashboard"

export default function LandingClient({ settings, programs, announcements, stats, systemConfig }: any) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [currentAboutImage, setCurrentAboutImage] = useState(0)
  
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Live state for portal configuration
  const [liveConfig, setLiveConfig] = useState(systemConfig || null)
  const isPortalActive = liveConfig?.is_portal_active ?? true
  
  const [liveSettings, setLiveSettings] = useState(settings || {})
  const [livePrograms, setLivePrograms] = useState(programs || [])
  const [liveAnnouncements, setLiveAnnouncements] = useState(announcements || [])
  const [liveStats, setLiveStats] = useState(stats || [])

  // Live state for dashboard visibility
  const [showLiveDashboard, setShowLiveDashboard] = useState(liveSettings?.show_live_dashboard !== 'false')
  
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    // Setup real-time listener for system_config
    const channel = supabase
      .channel('system_config_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_config' }, (payload) => {
        if (payload.new) {
          setLiveConfig((prev: any) => ({ ...prev, ...payload.new }))
        }
      })
      .subscribe()

    const siteSettingsChannel = supabase
      .channel('site_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        if (payload.new) {
          if (payload.new.key === 'show_live_dashboard') {
            setShowLiveDashboard(payload.new.value !== 'false')
          }
          setLiveSettings((prev: any) => ({ ...prev, [payload.new.key]: payload.new.value }))
        }
      })
      .subscribe()

    const programsChannel = supabase.channel('programs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programs' }, (payload) => {
        setLivePrograms(prev => {
          let next = [...prev]
          if (payload.eventType === 'DELETE') next = next.filter(p => p.id !== payload.old.id)
          else if (payload.eventType === 'UPDATE') {
            const idx = next.findIndex(p => p.id === payload.new.id)
            if (idx > -1) next[idx] = payload.new
            else next.push(payload.new)
          }
          else if (payload.eventType === 'INSERT') next.push(payload.new)
          return next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        })
      }).subscribe()

    const fetchAnnouncements = () => {
      setTimeout(async () => {
        const { data } = await supabase
          .from('announcements_landing')
          .select('*')
          .eq('published', true)
          .order('published_at', { ascending: false })
          .limit(6)
        if (data) setLiveAnnouncements(data)
      }, 500)
    }

    const announcementsChannel = supabase.channel('announcements_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements_landing' }, fetchAnnouncements)
      .subscribe()

    const broadcastChannel = supabase.channel('public_refresh_landing')
      .on('broadcast', { event: 'refresh' }, (payload) => {
        if (payload.payload?.source === 'announcements' || !payload.payload?.source) {
          fetchAnnouncements()
        }
      })
      .subscribe()

    const statsChannel = supabase.channel('stats_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campus_stats' }, (payload) => {
        setLiveStats(prev => {
          let next = [...prev]
          if (payload.eventType === 'DELETE') next = next.filter(s => s.id !== payload.old.id)
          else if (payload.eventType === 'UPDATE') {
            const idx = next.findIndex(s => s.id === payload.new.id)
            if (idx > -1) next[idx] = payload.new
            else next.push(payload.new)
          }
          else if (payload.eventType === 'INSERT') next.push(payload.new)
          return next.sort((a, b) => a.display_order - b.display_order)
        })
      }).subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(siteSettingsChannel)
      supabase.removeChannel(programsChannel)
      supabase.removeChannel(announcementsChannel)
      supabase.removeChannel(statsChannel)
    }
  }, [])

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await supabase.from('contact_messages').insert([contactForm])
    setIsSubmitting(false)
    if (error) {
      toast.error("Failed to send message. Please try again.")
    } else {
      toast.success("Message sent successfully!")
      setContactForm({ name: "", email: "", message: "" })
    }
  }

  // Animation variants
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  }

  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const navIsWhite = isScrolled || isHovered
  
  const aboutImages = [liveSettings.about_image_1 || "/AboutUs.png", liveSettings.about_image_2].filter(Boolean)
  const nextAboutImage = () => setCurrentAboutImage((prev) => (prev + 1) % aboutImages.length)
  const prevAboutImage = () => setCurrentAboutImage((prev) => (prev - 1 + aboutImages.length) % aboutImages.length)

  const getMapUrl = (input: string) => {
    if (!input) return "https://maps.google.com/maps?q=AMA%20Computer%20College%20Northbay&t=&z=15&ie=UTF8&iwloc=&output=embed";
    const iframeMatch = input.match(/src="([^"]+)"/);
    return iframeMatch ? iframeMatch[1] : input;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/30">
      
      {/* --- TOP STRIP --- */}
      <div className="bg-[#003399] text-white py-2 px-6 hidden lg:block relative z-[60]">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
          <div className="flex gap-6">
            <span className="flex items-center gap-1.5"><MapPin size={12} /> {liveSettings.campus_address || "AMA Computer College Northbay"}</span>
          </div>
          <div className="flex gap-6">
            <Link href="/status" className="hover:text-red-400 transition-colors">Track Status</Link>
          </div>
        </div>
      </div>

      {/* --- NAVIGATION --- */}
      <nav 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'top-0' : 'top-0 lg:top-[32px]'
        } ${
          navIsWhite ? 'bg-white shadow-md py-4 text-[#003399]' : 'bg-transparent py-6 text-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/logo-aclc.png" alt="AMA ACLC" className="w-10 h-10 object-contain" />
            <span className={`font-black text-xl tracking-tighter uppercase transition-colors ${navIsWhite ? 'text-[#003399]' : 'text-white'}`}>
              ACLC <span className="font-normal">Northbay</span>
            </span>
          </Link>
          
          <div className="hidden lg:flex items-center gap-8">
            <Link href="#about" className={`relative group text-sm font-bold uppercase tracking-wider transition-colors py-4 ${navIsWhite ? 'text-slate-600 hover:text-[#003399]' : 'text-white/90 hover:text-white'}`}>
              About
              <div className={`absolute bottom-3 left-0 w-full h-[2px] scale-x-0 group-hover:scale-x-100 transition-transform origin-left ${navIsWhite ? 'bg-[#003399]' : 'bg-white'}`} />
            </Link>
            <div className="group">
              <Link href="#programs" className={`relative text-sm font-bold uppercase tracking-wider transition-colors py-4 ${navIsWhite ? 'text-slate-600 hover:text-[#003399]' : 'text-white/90 hover:text-white'}`}>
                Programs
                <div className={`absolute bottom-3 left-0 w-full h-[2px] scale-x-0 group-hover:scale-x-100 transition-transform origin-left ${navIsWhite ? 'bg-[#003399]' : 'bg-white'}`} />
              </Link>
              
              {/* MEGA MENU: Programs */}
              <div className="absolute left-0 w-full top-full opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                <div className="bg-white border-y border-slate-200 shadow-2xl overflow-hidden">
                  <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl">
                      {["SHS", "College"].map(dept => {
                        const deptPrograms = livePrograms.filter((p: any) => p.department === dept);
                        return (
                          <div key={dept}>
                            <h4 className="text-lg font-secondary font-normal text-[#003399] mb-3">{dept}</h4>
                            {deptPrograms.length > 0 ? (
                              <ul className="space-y-3 mt-4">
                                {deptPrograms.map((p: any) => (
                                  <li key={p.id}>
                                    <Link href={`/programs/${p.slug}`} className="text-sm text-slate-500 hover:text-[#003399] transition-colors line-clamp-2">
                                      {p.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-400 mt-4">Coming soon</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="group">
              <Link href="#news" className={`relative text-sm font-bold uppercase tracking-wider transition-colors py-4 ${navIsWhite ? 'text-slate-600 hover:text-[#003399]' : 'text-white/90 hover:text-white'}`}>
                News
                <div className={`absolute bottom-3 left-0 w-full h-[2px] scale-x-0 group-hover:scale-x-100 transition-transform origin-left ${navIsWhite ? 'bg-[#003399]' : 'bg-white'}`} />
              </Link>
              
              {/* MEGA MENU: News */}
              <div className="absolute left-0 w-full top-full opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                <div className="bg-white border-y border-slate-200 shadow-2xl overflow-hidden">
                  <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      {liveAnnouncements && liveAnnouncements.slice(0, 4).map((news: any) => (
                        <div key={news.id} className="flex flex-col">
                          <h4 className="text-xl font-secondary font-normal text-[#003399] mb-2 line-clamp-1">{news.title}</h4>
                          <p className="text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                            {news.description || 'Click to read this campus announcement.'}
                          </p>
                          <Link href={`/news/${news.slug}`} className="text-sm font-bold text-[#003399] hover:underline mt-auto">
                            Read more
                          </Link>
                        </div>
                      ))}
                      {(!liveAnnouncements || liveAnnouncements.length === 0) && (
                        <div className="text-slate-500 text-sm col-span-4">No news available yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Link href="/status" className={`relative group text-sm font-bold uppercase tracking-wider transition-colors py-4 ${navIsWhite ? 'text-slate-600 hover:text-[#003399]' : 'text-white/90 hover:text-white'} lg:hidden`}>
              Track Status
              <div className={`absolute bottom-3 left-0 w-full h-[2px] scale-x-0 group-hover:scale-x-100 transition-transform origin-left ${navIsWhite ? 'bg-[#003399]' : 'bg-white'}`} />
            </Link>
            <Link href="#contact" className={`relative group text-sm font-bold uppercase tracking-wider transition-colors py-4 ${navIsWhite ? 'text-slate-600 hover:text-[#003399]' : 'text-white/90 hover:text-white'}`}>
              Contact
              <div className={`absolute bottom-3 left-0 w-full h-[2px] scale-x-0 group-hover:scale-x-100 transition-transform origin-left ${navIsWhite ? 'bg-[#003399]' : 'bg-white'}`} />
            </Link>
          </div>
          
          <div className="hidden lg:flex items-center gap-4">
            <button onClick={() => setSearchOpen(true)} className={`p-2 transition-colors ${navIsWhite ? 'text-slate-500 hover:text-[#003399]' : 'text-white/80 hover:text-white'}`}>
              <Search size={20} />
            </button>

            <Link href="/student/login">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full font-bold uppercase tracking-wider text-xs transition-all hover:shadow-lg hover:-translate-y-0.5">
                Student Portal
              </button>
            </Link>
          </div>
          
          <button className={`lg:hidden p-2 transition-colors ${navIsWhite ? 'text-[#003399]' : 'text-white'}`} onClick={() => setMobileMenuOpen(true)}>
            <Menu size={24} />
          </button>
        </div>
      </nav>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: "100%" }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-white flex flex-col p-6"
          >
            <div className="flex justify-between items-center mb-12 text-slate-900">
              <span className="font-black text-xl tracking-tighter uppercase text-[#003399]">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2"><X size={24} /></button>
            </div>
            <div className="flex flex-col gap-6 text-2xl font-black uppercase tracking-tighter text-slate-900">
              <Link href="#about" onClick={() => setMobileMenuOpen(false)}>About</Link>
              <Link href="#programs" onClick={() => setMobileMenuOpen(false)}>Programs</Link>
              <Link href="#news" onClick={() => setMobileMenuOpen(false)}>News</Link>
              <Link href="/status" onClick={() => setMobileMenuOpen(false)}>Track Status</Link>
              <Link href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
            </div>
            <div className="mt-auto pt-8 border-t border-slate-200">
              <Link href="/student/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center w-full bg-[#003399] text-white py-4 rounded-2xl font-bold uppercase tracking-wider mb-3">
                Student Portal
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-slate-900">
        {/* Full Bleed Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img src={liveSettings.hero_bg_image || "/smspic_1.webp"} alt="Campus Background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-slate-900/60" /> {/* Dark overlay for text readability */}
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-2xl text-white">
            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3 mb-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md font-bold uppercase tracking-widest text-[10px] border ${isPortalActive ? 'bg-blue-600/30 text-white border-white/20' : 'bg-red-500/20 text-red-100 border-red-500/30'}`}>
                <span className="relative flex h-2 w-2">
                  {isPortalActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isPortalActive ? 'bg-blue-400' : 'bg-red-500'}`}></span>
                </span>
                {isPortalActive ? (
                  liveConfig?.control_mode === 'automatic' && liveConfig?.enrollment_start && liveConfig?.enrollment_end
                    ? `Open From ${new Date(liveConfig.enrollment_start).toLocaleDateString('en-US')} Until ${new Date(liveConfig.enrollment_end).toLocaleDateString('en-US')}`
                    : "Enrollment Open"
                ) : (
                  "Enrollment Closed"
                )}
              </div>
              
              {isPortalActive && liveConfig?.is_pre_enrollment && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md font-bold uppercase tracking-widest text-[10px] border bg-purple-600/30 text-white border-white/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-400"></span>
                  </span>
                  Pre-Enrollment
                </div>
              )}
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-secondary font-normal leading-[1.1] mb-6 drop-shadow-lg text-white">
              Empowering the <br/> <span className="text-red-400 drop-shadow-md">Next Generation</span> of Innovators.
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-white/90 mb-10 max-w-lg leading-relaxed drop-shadow-md">
              {liveSettings.hero_tagline || "Quality tech education in Northbay."}
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
              {isPortalActive ? (
                <Link href="/enroll" className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-black uppercase tracking-wider text-sm transition-all hover:shadow-[0_10px_30px_rgba(237,28,36,0.4)] hover:-translate-y-1 flex items-center gap-2">
                  Enroll Now <ArrowRight size={18} />
                </Link>
              ) : (
                <button disabled className="bg-slate-100/50 backdrop-blur-md text-slate-500 border border-slate-200/50 px-8 py-4 rounded-full font-black uppercase tracking-wider text-sm transition-all flex items-center gap-2 cursor-not-allowed shadow-sm">
                  <Lock size={18} /> Locked
                </button>
              )}
              <Link href="/status" className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/30 px-8 py-4 rounded-full font-black uppercase tracking-wider text-sm transition-all hover:-translate-y-1 flex items-center justify-center min-w-[140px]">
                Track Status
              </Link>
            </motion.div>
          </motion.div>
          
          {showLiveDashboard && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }} 
              animate={{ opacity: 1, scale: 1, rotate: 0 }} 
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              className="hidden lg:block relative"
            >
              <LiveDashboard />
            </motion.div>
          )}
        </div>
      </section>

      {/* --- ABOUT SECTION --- */}
      <section id="about" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
              className="relative w-full max-w-lg mx-auto group aspect-square"
            >
              <AnimatePresence mode="wait">
                  <motion.img 
                    key={currentAboutImage}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.3 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(e, { offset }) => {
                      if (offset.x < -50) nextAboutImage()
                      else if (offset.x > 50) prevAboutImage()
                    }}
                    src={aboutImages[currentAboutImage]} 
                    alt="About AMA ACLC" 
                    className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl rounded-2xl cursor-grab active:cursor-grabbing" 
                  />
              </AnimatePresence>
              
              {aboutImages.length > 1 && (
                <>
                  <button 
                    onClick={prevAboutImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-[#003399] opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110 z-10"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={nextAboutImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-[#003399] opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110 z-10"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {aboutImages.map((_, i) => (
                      <button 
                        key={i} 
                        onClick={() => setCurrentAboutImage(i)}
                        className={`h-2 rounded-full transition-all ${i === currentAboutImage ? 'bg-[#003399] w-8' : 'bg-slate-300 w-2'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
            
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
              <motion.h2 variants={fadeUp} className="text-sm font-black uppercase tracking-[0.3em] text-red-600 mb-4">About the Campus</motion.h2>
              <motion.h3 variants={fadeUp} className="text-4xl md:text-5xl font-secondary font-normal mb-6 text-[#003399]">{liveSettings.about_heading || "A Legacy of Excellence in IT."}</motion.h3>
              <motion.p variants={fadeUp} className="text-lg text-slate-600 mb-8 whitespace-pre-wrap leading-relaxed">
                {liveSettings.about_text}
              </motion.p>
              
              <motion.div variants={fadeUp} className="grid grid-cols-2 gap-6 mt-8">
                {liveStats.map((stat: any) => (
                  <div key={stat.id} className="border-l-4 border-red-500 pl-4">
                    <p className="text-4xl font-secondary font-normal text-red-600">{stat.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- PROGRAMS SECTION --- */}
      <section id="programs" className="py-32 bg-slate-50 relative border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-red-600 mb-4">Academic Programs</h2>
            <h3 className="text-4xl md:text-5xl font-secondary font-normal text-[#003399]">Discover Your Path.</h3>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {livePrograms.map((prog: any, i: number) => (
              <motion.div 
                key={prog.id}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { delay: i * 0.1 } } }}
                className="group bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col"
              >
                <div className="w-full h-48 rounded-2xl overflow-hidden mb-6 bg-slate-100">
                  <img src={prog.image_url || (i % 2 === 0 ? "/smspic_1.webp" : "/smspic_2.webp")} alt={prog.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#003399] text-2xl mb-4 group-hover:scale-110 transition-transform">
                  {prog.icon || <Building size={24} />}
                </div>
                <h4 className="text-2xl font-secondary font-normal mb-2 text-[#003399]">{prog.name}</h4>
                <div className="flex items-center gap-2 mb-4 text-slate-500">
                  <Clock size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{prog.duration}</span>
                </div>
                <p className="text-slate-600 mb-8 line-clamp-3 group-hover:line-clamp-none transition-all flex-1">{prog.description}</p>
                <Link href={`/programs/${prog.slug}`} className="mt-auto text-red-600 font-bold text-sm flex items-center gap-2 group-hover:gap-4 transition-all uppercase tracking-wider mt-4 w-fit">
                  Learn More <ArrowRight size={16} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- RESEARCH / HIGHLIGHT BANNER --- */}
      <section className="py-24 bg-white relative border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
            className="w-full rounded-3xl overflow-hidden shadow-2xl relative min-h-[400px] flex items-center bg-slate-900"
          >
            {/* Background image covering right side */}
            <div className="absolute inset-0 w-full h-full bg-slate-100">
              <img src={liveSettings.research_banner_image || "/smspic_2.webp"} alt="Research Highlight" className="w-full h-full object-cover object-right" />
            </div>
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#003399] via-[#003399]/95 to-transparent w-full md:w-[85%] lg:w-3/4" />
            
            {/* Content */}
            <div className="relative z-10 p-8 md:p-16 max-w-xl text-white">
              <p className="font-bold uppercase tracking-widest text-xs mb-3 text-white/80">Research Stories</p>
              <h3 className="text-4xl md:text-5xl font-secondary font-normal mb-8 leading-tight">For a Better Tomorrow</h3>
              <Link href="/research">
                <button className="bg-white text-[#003399] hover:bg-slate-100 px-6 py-2.5 rounded-full font-bold uppercase tracking-wider text-xs flex items-center gap-3 transition-all hover:gap-5 shadow-lg group">
                  Explore <span className="bg-[#003399] text-white rounded-full p-1"><ArrowRight size={12} strokeWidth={3} /></span>
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- NEWS SECTION --- */}
      <section id="news" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-red-600 mb-4">Latest Updates</h2>
              <h3 className="text-4xl md:text-5xl font-secondary font-normal text-[#003399]">Campus News & Events.</h3>
            </motion.div>
            <Link href="/news">
              <button className="bg-slate-100 hover:bg-slate-200 text-[#003399] px-6 py-3 rounded-full font-bold uppercase tracking-wider text-xs transition-colors">
                View All News
              </button>
            </Link>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {liveAnnouncements.map((news: any, i: number) => (
              <Link href={`/news/${news.slug}`} key={news.id}>
                <motion.div 
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { delay: i * 0.1 } } }}
                  className="group cursor-pointer"
                >
                  <div className="w-full aspect-[4/3] rounded-3xl overflow-hidden mb-6 bg-slate-100 relative">
                    {news.cover_image ? (
                      <img src={news.cover_image} alt={news.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <img src={i % 2 !== 0 ? "/smspic_1.webp" : "/smspic_2.webp"} alt={news.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    )}
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-[#003399] shadow-sm">
                      {news.category}
                    </div>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                    {new Date(news.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <h4 className="text-xl font-secondary font-normal mb-3 group-hover:text-red-600 transition-colors line-clamp-2 text-[#003399]">{news.title}</h4>
                  <p className="text-slate-600 line-clamp-2 text-sm">{news.body}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --- CONTACT SECTION --- */}
      <section id="contact" className="py-32 bg-slate-50 relative border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-sm font-black uppercase tracking-[0.3em] text-red-600 mb-4">Get In Touch</motion.h2>
            <motion.h3 variants={fadeUp} className="text-4xl md:text-5xl font-secondary font-normal mb-8 text-[#003399]">Ready to start your journey?</motion.h3>
            
            <motion.div variants={fadeUp} className="space-y-6 mb-12">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <MapPin size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Visit Us</p>
                  <p className="font-bold">{liveSettings.campus_address}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <Mail size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Email Us</p>
                  <p className="font-bold">{liveSettings.contact_email}</p>
                </div>
              </div>
              
              {liveSettings.contact_phone && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    <Phone size={20} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Call Us</p>
                    <p className="font-bold">{liveSettings.contact_phone}</p>
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div variants={fadeUp} className="w-full h-64 bg-slate-200 rounded-3xl overflow-hidden relative border border-slate-200 shadow-md">
              <iframe 
                width="100%" 
                height="100%" 
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={getMapUrl(liveSettings?.map_link)}
              ></iframe>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="bg-white p-8 md:p-12 rounded-[40px] shadow-xl border border-slate-100"
          >
            <h4 className="text-2xl font-secondary font-normal mb-8 text-[#003399]">Send us a message</h4>
            <form onSubmit={handleContactSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Your Name</label>
                <input 
                  type="text" required
                  value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#003399] focus:ring-1 focus:ring-[#003399] transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Email Address</label>
                <input 
                  type="email" required
                  value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#003399] focus:ring-1 focus:ring-[#003399] transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Message</label>
                <textarea 
                  required rows={4}
                  value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#003399] focus:ring-1 focus:ring-[#003399] transition-all resize-none"
                />
              </div>
              <button 
                type="submit" disabled={isSubmitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-4 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md hover:shadow-lg"
              >
                {isSubmitting ? "Sending..." : <><Send size={16} /> Send Message</>}
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-[#003399] text-white py-16">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <img src="/logo-aclc.png" alt="AMA ACLC" className="w-8 h-8 object-contain brightness-0 invert" />
              <span className="font-black text-xl tracking-tighter uppercase text-white">ACLC <span className="text-white font-normal">Northbay</span></span>
            </Link>
            <p className="max-w-sm text-sm mb-6 text-white/80">{liveSettings.hero_tagline}</p>
            <p className="text-xs uppercase tracking-widest text-white/60">© {new Date().getFullYear()} AMA ACLC Northbay. All rights reserved.</p>
          </div>
          
          <div>
            <h5 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Quick Links</h5>
            <ul className="space-y-3 text-sm text-white/80">
              <li><Link href="#about" className="hover:text-red-400 transition-colors">About Us</Link></li>
              <li><Link href="#programs" className="hover:text-red-400 transition-colors">Programs</Link></li>
              <li><Link href="#news" className="hover:text-red-400 transition-colors">News & Events</Link></li>
              <li><Link href="#contact" className="hover:text-red-400 transition-colors">Contact</Link></li>
            </ul>
          </div>
          
          <div>
            <h5 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Portal Access</h5>
            <Link href="/student/login">
              <button className="bg-white hover:bg-slate-100 text-[#003399] w-full max-w-[260px] py-2 rounded-lg font-bold uppercase tracking-wider text-[10px] transition-colors shadow-sm">
                Student Login
              </button>
            </Link>
            <Link href="/teacher">
              <button className="bg-white hover:bg-slate-100 text-[#003399] w-full max-w-[260px] py-2 rounded-lg font-bold uppercase tracking-wider text-[10px] transition-colors mt-2 shadow-sm">
                Teacher Login
              </button>
            </Link>
            <Link href="/admin/login">
              <button className="bg-white hover:bg-slate-100 text-[#003399] w-full max-w-[260px] py-2 rounded-lg font-bold uppercase tracking-wider text-[10px] transition-colors mt-2 shadow-sm">
                Admin Login
              </button>
            </Link>
          </div>
        </div>
      </footer>
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
