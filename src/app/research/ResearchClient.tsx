"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, BookOpen, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function ResearchClient({ initialArticles }: { initialArticles: any[] }) {
  const [articles, setArticles] = useState(initialArticles || [])

  useEffect(() => {
    const fetchResearch = () => {
      setTimeout(async () => {
        const { data } = await supabase
          .from('research_landing')
          .select('*')
          .eq('published', true)
          .order('created_at', { ascending: false })
        if (data) setArticles(data)
      }, 500)
    }

    const channel = supabase.channel('research_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'research_landing' }, fetchResearch)
      .subscribe()

    const broadcastChannel = supabase.channel('public_refresh_research')
      .on('broadcast', { event: 'refresh' }, (payload) => {
        if (payload.payload?.source === 'research' || !payload.payload?.source) {
          fetchResearch()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/30">
      
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group text-[#003399]">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold uppercase tracking-widest text-xs">Back to Hub</span>
          </Link>
          <div className="flex items-center gap-2 text-[#003399]">
            <BookOpen size={16} />
            <span className="font-black text-sm uppercase tracking-widest">Research Archive</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="bg-slate-900 text-white py-24 relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-blue-900/20" />
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-secondary font-normal mb-6 leading-tight max-w-4xl mx-auto">
            Discover Our <span className="text-blue-400">Research</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Explore the latest innovations, academic papers, and scientific stories from our campus community.
          </p>
        </div>
      </header>

      {/* Articles Grid */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          {!articles || articles.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
              <h2 className="text-xl font-bold uppercase tracking-widest text-slate-400">No Research Stories Yet</h2>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto">Check back later for new discoveries and academic insights.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article: any) => (
                <Link href={`/research/${article.slug}`} key={article.id}>
                  <div className="group cursor-pointer bg-white rounded-3xl p-4 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all h-full flex flex-col">
                    <div className="w-full aspect-video rounded-2xl overflow-hidden mb-6 bg-slate-100 relative">
                      {article.cover_image ? (
                        <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-200 group-hover:scale-105 transition-transform duration-500">
                          <BookOpen size={48} />
                        </div>
                      )}
                    </div>
                    <div className="px-2 flex-1 flex flex-col">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                        <Calendar size={12} className="text-blue-500" />
                        {new Date(article.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      <h4 className="text-xl font-secondary font-normal mb-3 group-hover:text-blue-600 transition-colors line-clamp-2 text-[#003399]">
                        {article.title}
                      </h4>
                      <p className="text-slate-600 line-clamp-3 text-sm flex-1">{article.body?.substring(0, 150)}...</p>
                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 group-hover:gap-4 transition-all">
                        Read Story <ArrowRight size={12} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  )
}
