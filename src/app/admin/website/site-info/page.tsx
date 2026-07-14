"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import { useTheme } from "@/hooks/useTheme"
import { Loader2, Save, Sparkles, MapPin, AlignLeft, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/ui/image-upload"
import { LiveDashboardControl } from "../../settings/components/LiveDashboardControl"

export default function SiteInfoAdminPage() {
  const { isDarkMode } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Settings state
  const [settings, setSettings] = useState({
    hero_tagline: "",
    about_heading: "",
    about_text: "",
    campus_address: "",
    campus_lat: "",
    campus_lng: "",
    contact_email: "",
    contact_phone: "",
    hero_bg_image: "",
    about_image_1: "",
    about_image_2: "",
    research_banner_image: "",
    map_link: ""
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('site_settings').select('*')
    
    if (error) {
      toast.error("Failed to fetch site settings")
      console.error(error)
    } else if (data) {
      const newSettings = { ...settings }
      data.forEach(row => {
        if (row.key in newSettings) {
          (newSettings as any)[row.key] = row.value
        }
      })
      setSettings(newSettings)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const toastId = toast.loading("Saving settings...")
    
    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value: value.toString(),
      updated_at: new Date().toISOString()
    }))
    
    try {
      const { error } = await supabase.from('site_settings').upsert(updates)
      if (error) throw error
      toast.success("Settings saved successfully", { id: toastId })
    } catch (error: any) {
      toast.error(error.message, { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: keyof typeof settings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className={`space-y-6 ${isDarkMode ? 'text-white' : 'text-slate-900'} max-w-5xl mx-auto pb-20`}>
      {/* Sticky Header */}
      <div className={`sticky top-0 z-10 pt-4 pb-6 backdrop-blur-xl border-b mb-8 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Sparkles className="text-blue-500" size={24} />
            <h1 className="text-3xl font-secondary font-bold">Website Core Settings</h1>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold ml-9">Global Configurations & Branding</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={loading || saving} 
          className="bg-[#003399] hover:bg-blue-800 text-white rounded-full px-8 py-6 h-auto shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all w-full sm:w-auto"
        >
          {saving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />} 
          <span className="font-black uppercase tracking-widest text-[10px]">Publish Changes</span>
        </Button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Section: Live Dashboard Visibility */}
          <LiveDashboardControl isDarkMode={isDarkMode} />

          {/* Section: Typography & Content */}
          <div className={`rounded-[32px] overflow-hidden border shadow-sm ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className={`p-6 border-b flex items-center gap-3 ${isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50'}`}>
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><AlignLeft size={20} /></div>
              <div>
                <h2 className="text-lg font-bold">Typography & Copy</h2>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Main headlines and text blocks</p>
              </div>
            </div>
            <div className="p-8 grid gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Hero Tagline</label>
                <Input 
                  value={settings.hero_tagline} 
                  onChange={(e) => handleChange('hero_tagline', e.target.value)}
                  placeholder="e.g. Quality tech education in Northbay"
                  className={`h-14 text-lg font-medium rounded-xl border-none shadow-inner ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">About Campus Heading</label>
                <Input 
                  value={settings.about_heading || ""} 
                  onChange={(e) => handleChange('about_heading', e.target.value)}
                  placeholder="e.g. A Legacy of Excellence in IT."
                  className={`h-14 text-lg font-medium rounded-xl border-none shadow-inner ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">About Campus Text</label>
                <Textarea 
                  value={settings.about_text} 
                  onChange={(e) => handleChange('about_text', e.target.value)}
                  className={`min-h-[160px] text-base leading-relaxed rounded-xl border-none shadow-inner resize-y ${isDarkMode ? 'bg-slate-950 text-slate-300' : 'bg-slate-50 text-slate-700'}`}
                  placeholder="Write the about section content..."
                />
              </div>
            </div>
          </div>

          {/* Section: Imagery */}
          <div className={`rounded-[32px] overflow-hidden border shadow-sm ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className={`p-6 border-b flex items-center gap-3 ${isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50'}`}>
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center"><ImageIcon size={20} /></div>
              <div>
                <h2 className="text-lg font-bold">Site Imagery</h2>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Manage banners and carousels</p>
              </div>
            </div>
            <div className="p-8 grid md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Hero Background</label>
                <div className={`p-2 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <ImageUpload value={settings.hero_bg_image} onChange={(url) => handleChange('hero_bg_image', url)} />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Research Banner</label>
                <div className={`p-2 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <ImageUpload value={settings.research_banner_image} onChange={(url) => handleChange('research_banner_image', url)} />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">About Image (Slide 1)</label>
                <div className={`p-2 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <ImageUpload value={settings.about_image_1} onChange={(url) => handleChange('about_image_1', url)} />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">About Image (Slide 2)</label>
                <div className={`p-2 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <ImageUpload value={settings.about_image_2} onChange={(url) => handleChange('about_image_2', url)} />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Contact */}
          <div className={`rounded-[32px] overflow-hidden border shadow-sm ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className={`p-6 border-b flex items-center gap-3 ${isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50'}`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><MapPin size={20} /></div>
              <div>
                <h2 className="text-lg font-bold">Contact & Location</h2>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Address, email, and map coordinates</p>
              </div>
            </div>
            <div className="p-8 grid gap-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contact Email</label>
                  <Input 
                    value={settings.contact_email} 
                    onChange={(e) => handleChange('contact_email', e.target.value)}
                    placeholder="info@school.edu"
                    className={`h-12 rounded-xl border-none shadow-inner ${isDarkMode ? 'bg-slate-950 text-slate-300' : 'bg-slate-50 text-slate-900'}`}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contact Phone</label>
                  <Input 
                    value={settings.contact_phone} 
                    onChange={(e) => handleChange('contact_phone', e.target.value)}
                    placeholder="+63 123 456 7890"
                    className={`h-12 rounded-xl border-none shadow-inner ${isDarkMode ? 'bg-slate-950 text-slate-300' : 'bg-slate-50 text-slate-900'}`}
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Campus Address</label>
                  <Input 
                    value={settings.campus_address} 
                    onChange={(e) => handleChange('campus_address', e.target.value)}
                    className={`h-12 rounded-xl border-none shadow-inner ${isDarkMode ? 'bg-slate-950 text-slate-300' : 'bg-slate-50 text-slate-900'}`}
                  />
                </div>
              </div>
              <div className={`grid md:grid-cols-2 gap-8 p-6 rounded-2xl border ${isDarkMode ? 'border-slate-800 bg-slate-900/20' : 'border-slate-200 bg-slate-50/50'}`}>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Map Latitude</label>
                  <Input 
                    value={settings.campus_lat} 
                    onChange={(e) => handleChange('campus_lat', e.target.value)}
                    placeholder="e.g. 14.5995"
                    className={`h-12 rounded-xl border-none shadow-inner ${isDarkMode ? 'bg-slate-950 text-slate-300' : 'bg-white text-slate-900'}`}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Map Longitude</label>
                  <Input 
                    value={settings.campus_lng} 
                    onChange={(e) => handleChange('campus_lng', e.target.value)}
                    placeholder="e.g. 120.9842"
                    className={`h-12 rounded-xl border-none shadow-inner ${isDarkMode ? 'bg-slate-950 text-slate-300' : 'bg-white text-slate-900'}`}
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Google Maps Embed Link</label>
                  <Input 
                    value={settings.map_link} 
                    onChange={(e) => handleChange('map_link', e.target.value)}
                    placeholder="e.g. https://maps.google.com/maps?q=..."
                    className={`h-12 rounded-xl border-none shadow-inner ${isDarkMode ? 'bg-slate-950 text-slate-300' : 'bg-white text-slate-900'}`}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
