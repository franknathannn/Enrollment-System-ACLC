"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Settings, Loader2, BookOpen, Layers, Users, GraduationCap, LayoutDashboard, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase/admin-client"
import { toast } from "sonner"
import { useTheme } from "@/hooks/useTheme"
import { SubjectManagerModal } from "./components/SubjectManagerModal"

export default function LMSHubPage() {
  const router = useRouter()
  const { isDarkMode } = useTheme()
  const config = { school_year: '2025-2026' } // Default until config hook is located
  const [sections, setSections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('sections')
  const [searchQuery, setSearchQuery] = useState('')
  const [strandFilter, setStrandFilter] = useState('ALL')

  const [openGradebookFor, setOpenGradebookFor] = useState<any | null>(null)
  const [openSubjectsFor, setOpenSubjectsFor] = useState<any | null>(null)

  const [curricula, setCurricula] = useState<any[]>([])
  const [activeCurriculumId, setActiveCurriculumId] = useState<string>('')
  const [availableStrands, setAvailableStrands] = useState<string[]>([])
  const [allowTeacherGrading, setAllowTeacherGrading] = useState<boolean>(false)

  useEffect(() => {
    fetchSections()
    // Keep broadcast channel connected so we can send instantly on save
    const channel = supabase.channel('lms_settings_broadcast')
    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchSections() {
    setLoading(true)
    const { data, error } = await supabase
      .from('sections')
      .select('id, section_name, grade_level, strand, lms_grading_system')
      .order('grade_level', { ascending: true })
      .order('section_name', { ascending: true })

    if (data) setSections(data)

    // Fetch curricula
    const { data: cData } = await supabase.from('curricula').select('*').order('name', { ascending: true })
    if (cData) setCurricula(cData)

    // Fetch system settings for global config
    const { data: sData } = await supabase.from('system_settings').select('*')
    if (sData) {
      const ac = sData.find(s => s.setting_key === 'active_curriculum_id')
      if (ac && ac.value_text) setActiveCurriculumId(ac.value_text)

      const as = sData.find(s => s.setting_key === 'available_strands')
      if (as && as.value_text) {
        try {
          setAvailableStrands(JSON.parse(as.value_text))
        } catch (e) { }
      }

      const atg = sData.find(s => s.setting_key === 'allow_teacher_grading')
      if (atg && atg.value_text) {
        setAllowTeacherGrading(atg.value_text === 'true')
      }
    }

    setLoading(false)
  }

  const displayedSections = sections.filter(sec => {
    if (availableStrands && !availableStrands.includes(sec.strand)) return false
    if (strandFilter !== 'ALL' && sec.strand !== strandFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return sec.section_name.toLowerCase().includes(q)
    }
    return true
  })

  const uniqueStrands = availableStrands

  const saveGlobalSetting = async (key: string, value: string) => {
    const { data: existing } = await supabase.from('system_settings').select('id').eq('setting_key', key)
    if (existing && existing.length > 0) {
      await supabase.from('system_settings').update({ value_text: value }).eq('setting_key', key)
    } else {
      await supabase.from('system_settings').insert([{ setting_key: key, value_text: value }])
    }

    // Cross-tab trigger (Fastest, zero-network latency)
    if (typeof window !== 'undefined') {
      localStorage.setItem('force_sections_refresh', Date.now().toString())
    }

    supabase.channel('lms_settings_broadcast').send({
      type: 'broadcast',
      event: 'settings_update',
      payload: { key }
    })
  }

  const handleCurriculumChange = async (val: string) => {
    setActiveCurriculumId(val)
    await saveGlobalSetting('active_curriculum_id', val)

    // If it's the new strand system, strictly enforce new strands
    const curr = curricula.find(c => c.id === val)
    if (curr && (curr.name.toLowerCase().includes('strengthened') || curr.name.toLowerCase().includes('strand system'))) {
      const newStrands = ['Academic Track', 'TechPro']
      setAvailableStrands(newStrands)
      await saveGlobalSetting('available_strands', JSON.stringify(newStrands))
    } else {
      // Revert to default strands if switching back to K-12 or other curriculum
      const defaultStrands = ['ICT', 'GAS']
      setAvailableStrands(defaultStrands)
      await saveGlobalSetting('available_strands', JSON.stringify(defaultStrands))
    }
  }

  const toggleStrand = (strand: string) => {
    const newStrands = availableStrands.includes(strand)
      ? availableStrands.filter(s => s !== strand)
      : [...availableStrands, strand]
    setAvailableStrands(newStrands)
    saveGlobalSetting('available_strands', JSON.stringify(newStrands))
  }

  const toggleTeacherGrading = () => {
    const newValue = !allowTeacherGrading
    setAllowTeacherGrading(newValue)
    saveGlobalSetting('allow_teacher_grading', newValue.toString())
  }

  const dominantSystem = useMemo(() => {
    if (!sections || sections.length === 0) return 'Quarterly'
    const trimesters = sections.filter(s => s.lms_grading_system === 'Trimester').length
    const quarterlies = sections.length - trimesters
    return trimesters > quarterlies ? 'Trimester' : 'Quarterly'
  }, [sections])

  const handleBulkUpdateGrading = async (system: 'Quarterly' | 'Trimester') => {
    if (!confirm(`Are you sure you want to set ALL sections to ${system}?`)) return

    const toastId = toast.loading(`Updating all sections to ${system}...`)
    try {
      if (sections.length === 0) throw new Error("No sections to update")

      const { error } = await supabase
        .from('sections')
        .update({ lms_grading_system: system })
        .in('id', sections.map(s => s.id))

      if (error) throw error
      toast.success(`Successfully set all sections to ${system}`, { id: toastId })
      fetchSections()
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    }
  }

  return (
    <div className={`min-h-screen p-6 md:p-12 transition-colors duration-500 flex flex-col ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>

      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl md:text-5xl font-black uppercase tracking-[-0.05em] mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Grading <span className={isDarkMode ? 'text-blue-500' : 'text-blue-600'}> System</span>
        </h1>
        <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-slate-500">
          Centralized Grading and Subject Management
        </p>
      </div>

      {/* Pill-shaped Segmented Control */}
      <div className="overflow-x-auto pb-4 mb-4">
        <div className={`inline-flex items-center gap-1 p-1.5 rounded-full border whitespace-nowrap
            ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>

          <button
            onClick={() => setActiveTab('sections')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300
              ${activeTab === 'sections'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : `text-slate-500 hover:text-slate-700 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}`}
          >
            <Users size={14} />
            Gradebooks
          </button>

          <div className={`w-[1px] h-4 shrink-0 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />

          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300
              ${activeTab === 'general'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : `text-slate-500 hover:text-slate-700 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}`}
          >
            <Settings size={14} />
            LMS Settings
          </button>
        </div>
      </div>

      <div className="w-full">

        {activeTab === 'sections' && (
          <div className={`p-6 md:p-8 rounded-[30px] border shadow-xl flex flex-col min-h-[60vh] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div className="flex items-center gap-3">
                <BookOpen className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} size={24} />
                <div>
                  <h2 className={`text-xl font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Section Manager
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
                    Select a section to manage subjects or grades
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  <Input
                    placeholder="Search sections..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`pl-9 h-11 rounded-xl font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>

                <Select value={strandFilter} onValueChange={setStrandFilter}>
                  <SelectTrigger className={`w-full sm:w-[160px] h-11 rounded-xl font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                    <Filter size={14} className="mr-2 opacity-50" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}>
                    <SelectItem value="ALL" className="font-bold">ALL</SelectItem>
                    {uniqueStrands.map(strand => (
                      <SelectItem key={strand} value={strand} className="font-bold">{strand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-1 items-center justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
            ) : displayedSections.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-20 border border-dashed rounded-2xl dark:border-slate-800 text-slate-500 font-bold uppercase tracking-widest text-xs">
                No sections found matching your filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayedSections.map(sec => (
                  <div key={sec.id} className={`flex flex-col p-5 rounded-3xl border transition-all hover:shadow-lg ${isDarkMode ? 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80' : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'}`}>
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-black text-xl uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {sec.section_name}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                          {sec.lms_grading_system || 'Quarterly'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full opacity-60 ${isDarkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                        Grade {sec.grade_level} {sec.strand && `• ${sec.strand}`}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 mt-auto">
                      <Button
                        onClick={() => setOpenSubjectsFor(sec)}
                        variant="outline"
                        className={`w-full rounded-xl font-bold border-2 h-11 ${isDarkMode ? 'border-slate-700 hover:bg-slate-800 hover:border-slate-600' : 'border-slate-200 hover:bg-slate-100 hover:border-slate-300'}`}
                      >
                        <BookOpen size={16} className="mr-2 opacity-50" />
                        Subjects
                      </Button>
                      <Button
                        onClick={() => router.push(`/admin/lms/gradebook/${sec.id}`)}
                        className={`w-full rounded-xl font-bold h-11 shadow-md ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                      >
                        <LayoutDashboard size={16} className="mr-2 opacity-70" />
                        Gradebook
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Placeholders for other tabs */}
        {activeTab === 'general' && (
          <div className={`p-6 md:p-8 rounded-[30px] border shadow-xl flex flex-col min-h-[60vh] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
              <div className="flex items-center gap-3">
                <Settings className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} size={24} />
                <div>
                  <h2 className={`text-xl font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    LMS Global Settings
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
                    Manage grading scales and system-wide configurations
                  </p>
                </div>
              </div>
            </div>

            <div className="max-w-2xl">
              <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className={`text-lg font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Grading System Bulk Updater
                </h3>
                <p className={`text-xs font-bold mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Use this tool to change the grading system for all existing sections at once. This will immediately update the number of grading quarters available in their respective gradebooks.
                </p>

                <div className={`inline-flex items-center gap-1 p-1.5 rounded-full border w-full max-w-sm
                    ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200 shadow-inner'}`}>

                  <button
                    onClick={() => {
                      if (dominantSystem !== 'Quarterly') handleBulkUpdateGrading('Quarterly')
                    }}
                    className={`flex-1 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300
                      ${dominantSystem === 'Quarterly'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : `text-slate-500 hover:text-slate-700 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-200'}`}`}
                  >
                    Quarterly
                  </button>

                  <button
                    onClick={() => {
                      if (dominantSystem !== 'Trimester') handleBulkUpdateGrading('Trimester')
                    }}
                    className={`flex-1 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300
                      ${dominantSystem === 'Trimester'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                        : `text-slate-500 hover:text-slate-700 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-200'}`}`}
                  >
                    Trimester
                  </button>
                </div>
              </div>

              <div className={`mt-8 p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className={`text-lg font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Active Curriculum
                </h3>
                <p className={`text-xs font-bold mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Select the overarching curriculum for the school. This will dictate available strands globally.
                </p>

                <Select value={activeCurriculumId} onValueChange={handleCurriculumChange}>
                  <SelectTrigger className={`w-full max-w-sm h-12 rounded-xl font-bold ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                    <SelectValue placeholder="Select Global Curriculum" />
                  </SelectTrigger>
                  <SelectContent className={isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}>
                    {curricula.map(c => (
                      <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="mt-8">
                  <h3 className={`text-lg font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Available Strands
                  </h3>
                  <p className={`text-xs font-bold mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Select which strands are available for section assignment across the system.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {['ICT', 'GAS', 'STEM', 'HUMSS', 'ABM', 'TechPro', 'Academic Track'].map(strand => {
                      const curr = curricula.find(c => c.id === activeCurriculumId)
                      const isStrandSystem = curr?.name.toLowerCase().includes('strengthened') || curr?.name.toLowerCase().includes('strand system')

                      // If Strand System is active, hide everything except Academic Track and TechPro
                      if (isStrandSystem && !['Academic Track', 'TechPro'].includes(strand)) return null
                      // If NOT Strand System, hide Academic Track and TechPro
                      if (!isStrandSystem && ['Academic Track', 'TechPro'].includes(strand)) return null

                      return (
                        <button
                          key={strand}
                          onClick={() => toggleStrand(strand)}
                          className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-all duration-200
                            ${availableStrands.includes(strand)
                              ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-500/30'
                              : isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                          {strand}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                  <h3 className={`text-lg font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Grading Management
                  </h3>
                  <p className={`text-xs font-bold mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Control whether teachers have the power to edit and save student grades, or if they are restricted to view-only mode.
                  </p>

                  <div className="flex items-center gap-4 mt-4">
                    <button
                      onClick={toggleTeacherGrading}
                      className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${allowTeacherGrading ? 'bg-emerald-500' : isDarkMode ? 'bg-slate-700' : 'bg-slate-300'
                        }`}
                    >
                      <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ${allowTeacherGrading ? 'translate-x-7' : 'translate-x-0'
                        }`} />
                    </button>
                    <span className={`text-sm font-black uppercase tracking-widest ${allowTeacherGrading ? 'text-emerald-500' : isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                      {allowTeacherGrading ? 'Teachers Can Edit Grades' : 'Teachers Can Only View Grades'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODALS */}


      <SubjectManagerModal
        isOpen={!!openSubjectsFor}
        onClose={() => setOpenSubjectsFor(null)}
        section={openSubjectsFor}
        isDarkMode={isDarkMode}
        schoolYear={config?.school_year || '2025-2026'}
        allSections={sections}
      />
    </div>
  )
}


