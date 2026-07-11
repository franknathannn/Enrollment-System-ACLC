import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, BookOpen, Clock, Building, Share2 } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import ArticleActions from "@/components/ArticleActions"

export const revalidate = 60

export default async function ProgramArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = await createClient()
  const { slug } = await params
  
  const { data: program } = await supabase
    .from('programs')
    .select('*')
    .eq('slug', slug)
    .single()
    
  if (!program) {
    notFound()
  }

  // Fetch other programs for sidebar
  const { data: otherPrograms } = await supabase
    .from('programs')
    .select('id, name, slug, duration, department')
    .neq('id', program.id)
    .order('name', { ascending: true })
    .limit(4)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/30 pb-24">
      {/* Navigation Header */}
      <nav className="bg-[#003399] py-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo-aclc.png" alt="AMA ACLC" className="w-8 h-8 object-contain" />
            <span className="font-black text-lg tracking-tighter uppercase text-white">ACLC <span className="text-white font-normal">Northbay</span></span>
          </Link>
          <Link href="/#programs" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/80 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back to Programs
          </Link>
        </div>
      </nav>

      {/* Hero Image */}
      {program.image_url ? (
        <div className="w-full h-[40vh] md:h-[50vh] relative">
          <img src={program.image_url} alt={program.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
        </div>
      ) : (
        <div className="w-full h-[20vh] bg-[#003399]" />
      )}

      <div className={`max-w-7xl mx-auto px-6 grid lg:grid-cols-4 gap-12 ${program.image_url ? '-mt-24 relative z-10' : '-mt-12 relative z-10'}`}>
        
        {/* Main Content */}
        <main className="lg:col-span-3">
          <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className="bg-blue-100 text-[#003399] px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Building size={12} /> {program.department}
              </span>
              <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Clock size={12} /> {program.duration}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-secondary font-normal leading-tight mb-8 text-[#003399]">
              {program.name}
            </h1>
            
            <div className="prose prose-lg prose-blue max-w-none prose-headings:font-secondary prose-headings:font-normal prose-a:text-[#003399]">
              <ReactMarkdown 
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
              }}
            >
              {program.description}
            </ReactMarkdown>
            </div>
            
            <ArticleActions />
          </div>
        </main>
        
        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-black uppercase tracking-widest text-sm mb-6 pb-4 border-b border-slate-200 text-[#003399]">Other Programs</h3>
            <div className="space-y-6">
              {otherPrograms?.map((prog) => (
                <Link href={`/programs/${prog.slug}`} key={prog.id} className="block group">
                  <h4 className="font-bold text-sm leading-tight mb-2 group-hover:text-red-600 transition-colors flex items-start gap-2">
                    <BookOpen size={16} className="text-[#003399] shrink-0 mt-0.5" />
                    {prog.name}
                  </h4>
                  <div className="flex gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    <span>{prog.duration}</span> &bull; <span>{prog.department}</span>
                  </div>
                </Link>
              ))}
              {(!otherPrograms || otherPrograms.length === 0) && (
                <p className="text-sm text-slate-500">No other programs available.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
