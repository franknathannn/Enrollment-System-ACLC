"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, Calendar, ChevronRight, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

export default function NewsClient({ announcements: initialAnnouncements }: { announcements: any[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [announcements, setAnnouncements] = useState(initialAnnouncements || [])
  
  useEffect(() => {
    const fetchAnnouncements = () => {
      setTimeout(async () => {
        const { data } = await supabase
          .from('announcements_landing')
          .select('*')
          .eq('published', true)
          .order('published_at', { ascending: false })
        if (data) setAnnouncements(data)
      }, 500)
    }

    const channel = supabase.channel('news_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements_landing' }, fetchAnnouncements)
      .subscribe()

    const broadcastChannel = supabase.channel('public_refresh_news')
      .on('broadcast', { event: 'refresh' }, (payload) => {
        if (payload.payload?.source === 'announcements' || !payload.payload?.source) {
          fetchAnnouncements()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
  
  // Filter logic
  const filteredAnnouncements = announcements.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.body.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Pagination could be added here, but keeping it simple for this implementation
  const recentPosts = announcements.slice(0, 5)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/30 pb-24">
      {/* Navigation Header */}
      <nav className="bg-[#003399] py-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo-aclc.png" alt="AMA ACLC" className="w-8 h-8 object-contain" />
            <span className="font-black text-lg tracking-tighter uppercase text-white">ACLC <span className="text-white font-normal">Northbay</span></span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/80 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </nav>

      {/* Page Header */}
      <header className="bg-white border-b border-slate-200 py-16 mb-12 relative">
        <div className="absolute inset-0 z-0 opacity-10">
          <img src="/smspic_2.webp" alt="Background" className="w-full h-full object-cover" />
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-secondary font-normal mb-4 text-[#003399]">News & Announcements</h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">Stay up to date with the latest campus events, academic updates, and school news from AMA ACLC Northbay.</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-4 gap-12">
        
        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-10">
          {/* Search */}
          <div>
            <h3 className="font-black uppercase tracking-widest text-sm mb-4 text-[#003399]">Search</h3>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search news..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#003399] transition-all"
              />
              <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-black uppercase tracking-widest text-sm mb-4 text-[#003399]">Categories</h3>
            <div className="flex flex-col gap-2">
              {['all', 'news', 'event', 'academic', 'management'].map((cat) => (
                <button 
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-left px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors ${
                    categoryFilter === cat 
                      ? 'bg-blue-100 text-[#003399]' 
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Posts */}
          <div className="hidden lg:block">
            <h3 className="font-black uppercase tracking-widest text-sm mb-4 text-[#003399]">Recent Posts</h3>
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <Link href={`/news/${post.slug}`} key={`recent-${post.id}`} className="block group bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors">
                  <h4 className="font-bold text-sm leading-tight mb-1 group-hover:text-[#003399] transition-colors line-clamp-2">{post.title}</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    {new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3">
          <div className="grid gap-8 md:grid-cols-2">
            {filteredAnnouncements.map((news) => (
              <Link href={`/news/${news.slug}`} key={news.id} className="group bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
                <div className="aspect-[16/9] bg-slate-100 relative overflow-hidden">
                  {news.cover_image ? (
                    <img src={news.cover_image} alt={news.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <img src={(filteredAnnouncements.indexOf(news)) % 2 === 0 ? "/smspic_1.webp" : "/smspic_2.webp"} alt={news.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-[#003399] shadow-sm">
                    {news.category}
                  </div>
                </div>
                <div className="p-6 md:p-8 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-slate-500 mb-3">
                    <Calendar size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {new Date(news.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-secondary font-normal mb-4 group-hover:text-red-600 transition-colors line-clamp-2">{news.title}</h2>
                  <p className="text-slate-600 line-clamp-3 mb-6 text-sm">{news.body}</p>
                  
                  <div className="mt-auto flex items-center text-red-600 font-bold uppercase tracking-widest text-xs gap-1 group-hover:gap-3 transition-all">
                    Read Article <ChevronRight size={16} />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredAnnouncements.length === 0 && (
            <div className="text-center py-24 bg-white rounded-3xl border border-slate-200">
              <h3 className="text-2xl font-secondary font-normal mb-2 text-[#003399]">No results found</h3>
              <p className="text-slate-500">Try adjusting your search or category filter.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
