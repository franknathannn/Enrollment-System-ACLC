import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

export const revalidate = 60

export default async function ResearchArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { slug } = await params
  
  const { data: article } = await supabase
    .from('research_landing')
    .select('*')
    .eq('slug', slug)
    .single()
    
  if (!article) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/30">
      
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group text-[#003399]">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold uppercase tracking-widest text-xs">Back to Hub</span>
          </Link>
          <div className="flex items-center gap-2 text-[#003399]">
            <FileText size={16} />
            <span className="font-black text-sm uppercase tracking-widest">Research Story</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="bg-white border-b border-slate-200 pt-16 pb-24 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-block bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-bold uppercase tracking-widest text-[10px] mb-8 border border-blue-100 shadow-sm">
            Research & Innovation
          </div>
          <h1 className="text-4xl md:text-6xl font-secondary font-normal mb-8 leading-tight text-[#003399] max-w-3xl mx-auto">
            {article.title}
          </h1>
          
          <div className="flex items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-blue-500" />
              {new Date(article.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      {/* Cover Image */}
      {article.cover_image && (
        <div className="max-w-5xl mx-auto px-6 -mt-12 relative z-20 mb-16">
          <div className="w-full aspect-video rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-white p-2">
            <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-100">
              <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      )}

      {/* Article Content */}
      <article className={`max-w-3xl mx-auto px-6 pb-32 ${!article.cover_image ? 'pt-16' : ''}`}>
        <div className="prose prose-lg prose-slate max-w-none prose-headings:font-secondary prose-headings:font-normal prose-headings:text-[#003399] prose-a:text-blue-600 hover:prose-a:text-blue-500 prose-img:rounded-2xl prose-img:shadow-lg">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkBreaks]}
                components={{
                  a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
                }}
              >
                {article.body}
              </ReactMarkdown>
        </div>
      </article>

    </div>
  )
}
