import { createClient } from '@/lib/supabase/server'
import ResearchClient from './ResearchClient'

export const revalidate = 60

export default async function ResearchIndexPage() {
  const supabase = await createClient()
  
  const { data: articles } = await supabase
    .from('research_landing')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })

  return (
    <ResearchClient initialArticles={articles || []} />
  )
}
