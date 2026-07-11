import { createClient } from "@/lib/supabase/server"
import NewsClient from "./NewsClient"

export const revalidate = 60

export default async function NewsPage() {
  const supabase = await createClient()
  
  // Fetch all published announcements
  const { data: announcements } = await supabase.from('announcements_landing')
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false })
    
  return <NewsClient announcements={announcements || []} />
}
