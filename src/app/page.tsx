import { createClient } from "@/lib/supabase/server"
import LandingClient from "./LandingClient"

export const revalidate = 60 // Revalidate every 60 seconds

export default async function HomePage() {
  const supabase = await createClient()
  console.log("Changed");

  // Fetch site settings
  const { data: settingsData } = await supabase.from('site_settings').select('*')
  const settings: any = {}
  if (settingsData) {
    settingsData.forEach(row => { settings[row.key] = row.value })
  }

  // Fetch programs
  const { data: programs } = await supabase.from('programs').select('*').order('created_at', { ascending: true })

  // Fetch announcements
  const { data: announcements } = await supabase.from('announcements_landing')
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(6)

  // Fetch stats
  const { data: stats } = await supabase.from('campus_stats').select('*').order('display_order', { ascending: true })

  // Fetch system config (for portal status)
  const { data: systemConfigData } = await supabase.from('system_config').select('*').order('updated_at', { ascending: false }).limit(1).single()
  const systemConfig = systemConfigData || null

  return (
    <LandingClient
      settings={settings}
      programs={programs || []}
      announcements={announcements || []}
      stats={stats || []}
      systemConfig={systemConfig}
    />
  )
}
