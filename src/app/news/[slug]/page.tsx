import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Calendar, ArrowLeft, Share2 } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import ArticleActions from "@/components/ArticleActions"

export const revalidate = 60

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { slug } = await params
  
  // Fetch article
  
  const { data: article } = await supabase
    .from('announcements_landing')
    .select('*')
    .eq('slug', slug)
    .single()
    
  if (!article) {
    notFound()
  }

  // Fetch recent posts for sidebar
  const { data: recentPosts } = await supabase
    .from('announcements_landing')
    .select('id, title, slug, published_at')
    .eq('published', true)
    .neq('id', article.id)
    .order('published_at', { ascending: false })
    .limit(3)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/30 pb-24">
      {/* Navigation Header */}
      <nav className="bg-[#003399] py-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo-aclc.png" alt="AMA ACLC" className="w-8 h-8 object-contain" />
            <span className="font-black text-lg tracking-tighter uppercase text-white">ACLC <span className="text-white font-normal">Northbay</span></span>
          </Link>
          <Link href="/news" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/80 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back to News
          </Link>
        </div>
      </nav>

      {/* Hero Image */}
      {article.cover_image && (
        <div className="w-full h-[40vh] md:h-[50vh] relative">
          <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
        </div>
      )}

      <div className={`max-w-7xl mx-auto px-6 grid lg:grid-cols-4 gap-12 ${article.cover_image ? '-mt-24 relative z-10' : 'pt-16'}`}>
        
        {/* Main Content */}
        <main className="lg:col-span-3">
          <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl border border-slate-200">
            <div className="flex items-center gap-4 mb-6">
              <span className="bg-blue-100 text-[#003399] px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                {article.category}
              </span>
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {new Date(article.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-secondary font-normal leading-tight mb-8 text-[#003399]">
              {article.title}
            </h1>
            
            <div className="prose prose-lg prose-blue max-w-none prose-headings:font-secondary prose-headings:font-normal prose-a:text-[#003399]">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
                }}
              >
                {article.body}
              </ReactMarkdown>
            </div>
            
            <ArticleActions />
          </div>
        </main>
        
        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-black uppercase tracking-widest text-sm mb-6 pb-4 border-b border-slate-200 text-[#003399]">More News</h3>
            <div className="space-y-6">
              {recentPosts?.map((post) => (
                <Link href={`/news/${post.slug}`} key={post.id} className="block group">
                  <h4 className="font-bold text-sm leading-tight mb-2 group-hover:text-red-600 transition-colors">{post.title}</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    {new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </Link>
              ))}
              {(!recentPosts || recentPosts.length === 0) && (
                <p className="text-sm text-slate-500">No other news available.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
