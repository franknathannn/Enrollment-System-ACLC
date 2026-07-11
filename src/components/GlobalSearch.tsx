"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X, BookOpen, FileText, Beaker, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"

export default function GlobalSearch({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setQuery("")
      setResults([])
    } else {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', handleEsc)
      return () => window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const term = `%${query}%`
        
        // Search Programs
        const { data: programs } = await supabase
          .from('programs')
          .select('id, name, slug, department')
          .ilike('name', term)
          .limit(3)
          
        // Search News
        const { data: news } = await supabase
          .from('announcements_landing')
          .select('id, title, slug')
          .ilike('title', term)
          .limit(3)
          
        // Search Research
        const { data: research } = await supabase
          .from('research_landing')
          .select('id, title, slug')
          .ilike('title', term)
          .limit(3)

        const combined = [
          ...(programs || []).map(p => ({ ...p, type: 'program' })),
          ...(news || []).map(n => ({ ...n, type: 'news' })),
          ...(research || []).map(r => ({ ...r, type: 'research' }))
        ]
        
        setResults(combined)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center px-6 py-4 border-b border-slate-100">
              <Search className="text-slate-400 mr-4" size={24} />
              <input 
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search programs, news, research..."
                className="flex-1 text-xl outline-none bg-transparent font-medium text-slate-800 placeholder:text-slate-300"
              />
              {loading && <Loader2 className="animate-spin text-blue-500 mx-2" size={20} />}
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {!query.trim() ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                  <Search size={48} className="mb-4 opacity-20" />
                  <p className="font-medium">What are you looking for?</p>
                  <p className="text-sm mt-1">Start typing to search across the campus.</p>
                </div>
              ) : results.length === 0 && !loading ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                  <p className="font-medium">No results found for "{query}"</p>
                  <p className="text-sm mt-1">Try checking your spelling or using different keywords.</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {results.map((item) => (
                    <Link 
                      key={`${item.type}-${item.id}`} 
                      href={item.type === 'program' ? `/programs/${item.slug}` : item.type === 'news' ? `/news/${item.slug}` : `/research/${item.slug}`}
                      onClick={onClose}
                      className="group flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          item.type === 'program' ? 'bg-blue-50 text-blue-600' :
                          item.type === 'news' ? 'bg-amber-50 text-amber-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {item.type === 'program' && <BookOpen size={18} />}
                          {item.type === 'news' && <FileText size={18} />}
                          {item.type === 'research' && <Beaker size={18} />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                            {item.title || item.name}
                          </p>
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">
                            {item.type} {item.department && `• ${item.department}`}
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:-translate-x-2 transition-all" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-slate-50 p-4 border-t border-slate-100 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
              Press ESC to close
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
