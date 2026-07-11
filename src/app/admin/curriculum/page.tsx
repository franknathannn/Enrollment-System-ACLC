"use client"

import { useState, useEffect } from "react"
import { BookOpen, Plus, Loader2, Save, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase/admin-client"
import { toast } from "sonner"
import { useTheme } from "@/hooks/useTheme"

export default function CurriculumPage() {
  const { isDarkMode } = useTheme()
  const [subjects, setSubjects] = useState<any[]>([])
  const [curricula, setCurricula] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCurriculum, setSelectedCurriculum] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [newSubject, setNewSubject] = useState({ code: '', name: '', type: 'Core', units: '1.0' })
  const [saving, setSaving] = useState(false)
  
  const [deletingSubject, setDeletingSubject] = useState<{id: string, name: string} | null>(null)

  // Auto-generate subject code when name changes
  const handleNameChange = (val: string) => {
    let autoCode = val
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .split(' ')
      .map(w => w.substring(0, 3))
      .join('_')
      .substring(0, 10)
    
    // Add prefix based on type
    let prefix = 'CORE'
    if (newSubject.type === 'Applied') prefix = 'APP'
    if (newSubject.type.includes('Specialized')) prefix = 'SPEC'

    autoCode = `${prefix}_${autoCode}`
    
    setNewSubject({ ...newSubject, name: val, code: autoCode })
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: cData } = await supabase.from('curricula').select('*').order('code', { ascending: true })
    if (cData && cData.length > 0) {
      setCurricula(cData)
      setSelectedCurriculum(cData[0].id)
    }

    const { data: sData } = await supabase.from('subjects').select('*, curricula(code)').order('type', { ascending: true })
    if (sData) setSubjects(sData)
    
    setLoading(false)
  }

  const handleAddSubject = async () => {
    if (!selectedCurriculum || !newSubject.code || !newSubject.name) {
      toast.error("Please fill in all required fields.")
      return
    }

    setSaving(true)
    const { data, error } = await supabase.from('subjects').insert([{
      curriculum_id: selectedCurriculum,
      code: newSubject.code,
      name: newSubject.name,
      type: newSubject.type,
      units: parseFloat(newSubject.units)
    }]).select()

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Subject added successfully!")
      setNewSubject({ code: '', name: '', type: 'Core', units: '1.0' })
      fetchData()
    }
    setSaving(false)
  }

  const handleDeleteSubject = async () => {
    if (!deletingSubject) return
    const id = toast.loading(`Deleting ${deletingSubject.name}...`)
    
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', deletingSubject.id)
      if (error) throw error
      
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      
      await supabase.from('activity_logs').insert([{ 
        admin_id: user?.id, 
        admin_name: user?.user_metadata?.username || 'Admin', 
        action_type: 'DELETED', 
        student_name: 'N/A', 
        details: `Deleted subject: ${deletingSubject.name} from Curriculum` 
      }])
      
      setSubjects(prev => prev.filter(s => s.id !== deletingSubject.id))
      toast.success("Subject deleted successfully", { id })
      setDeletingSubject(null)
    } catch (err: any) {
      toast.error(err.message, { id })
    }
  }

  const displayedSubjects = subjects.filter(s => {
    if (s.curriculum_id !== selectedCurriculum) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className={`min-h-screen p-6 md:p-12 transition-colors duration-500 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      
      {/* Header */}
      <div className="mb-12">
        <h1 className={`text-3xl md:text-5xl font-black uppercase tracking-[-0.05em] mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Curriculum <span className={isDarkMode ? 'text-blue-500' : 'text-blue-600'}>Manager</span>
        </h1>
        <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-slate-500">
          Manage Core, Applied, and Specialized Subjects
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sidebar Controls */}
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-sm font-black uppercase tracking-widest mb-4">Select Curriculum</h3>
            <Select value={selectedCurriculum || ''} onValueChange={setSelectedCurriculum}>
              <SelectTrigger className={`w-full font-bold h-12 rounded-xl ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <SelectValue placeholder="Select Curriculum" />
              </SelectTrigger>
              <SelectContent className={isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}>
                {curricula.map(c => (
                  <SelectItem key={c.id} value={c.id} className="font-bold">
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={`p-6 rounded-3xl border shadow-xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-sm font-black uppercase tracking-widest mb-4">Add New Subject</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1 block">Subject Code</label>
                <Input 
                  value={newSubject.code} 
                  onChange={(e) => setNewSubject({...newSubject, code: e.target.value})} 
                  placeholder="e.g. CORE_MATH" 
                  className={`font-bold h-11 rounded-xl ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} 
                />
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1 block">Subject Name</label>
                <Input 
                  value={newSubject.name} 
                  onChange={(e) => handleNameChange(e.target.value)} 
                  placeholder="e.g. General Mathematics" 
                  className={`font-bold h-11 rounded-xl ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} 
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1 block">Type</label>
                <Select value={newSubject.type} onValueChange={(val) => setNewSubject({...newSubject, type: val})}>
                  <SelectTrigger className={`w-full font-bold h-11 rounded-xl ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white'}>
                    <SelectItem value="Core" className="font-bold">Core</SelectItem>
                    <SelectItem value="Applied" className="font-bold">Applied</SelectItem>
                    <SelectItem value="Specialized (ICT)" className="font-bold">Specialized (ICT)</SelectItem>
                    <SelectItem value="Specialized (GAS)" className="font-bold">Specialized (GAS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleAddSubject}
                disabled={saving || !selectedCurriculum}
                className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-xs bg-blue-600 hover:bg-blue-700 text-white mt-2"
              >
                {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Plus className="mr-2" size={16} />}
                Add Subject
              </Button>
            </div>
          </div>
        </div>

        {/* Subject List */}
        <div className="lg:col-span-2">
          <div className={`p-6 rounded-3xl border shadow-xl flex flex-col h-[700px] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <BookOpen className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} size={24} />
                <h2 className={`text-xl font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Subject Roster
                </h2>
              </div>
              <Input 
                placeholder="Search subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full md:w-64 font-bold h-11 rounded-xl ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {loading ? (
              <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
            ) : displayedSubjects.length === 0 ? (
              <div className="text-center p-12 border border-dashed rounded-2xl dark:border-slate-800 text-slate-500">
                <p className="font-bold uppercase tracking-widest text-xs">No subjects found.</p>
                <p className="text-[10px] mt-2 opacity-60">Run the SQL Seed Script to auto-populate the standard SHS Curriculum.</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto pr-2 flex-1" style={{ scrollbarWidth: "thin" }}>
                {displayedSubjects.map(sub => (
                  <div key={sub.id} className={`group flex items-center justify-between p-4 rounded-2xl border transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                    <div>
                      <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{sub.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">{sub.code}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">•</span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{sub.type}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">•</span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{sub.units} UNITS</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setDeletingSubject({id: sub.id, name: sub.name})}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>)}
          </div>
        </div>

      </div>
      {/* Delete Confirmation Dialog */}
      {deletingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-sm rounded-[24px] p-6 shadow-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className={`text-xl font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Delete Subject
            </h3>
            <p className="text-sm font-bold text-slate-500 mb-6">
              Are you sure you want to delete <span className="text-red-500">"{deletingSubject.name}"</span>? Any grades associated with this subject will be permanently lost due to cascading rules.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setDeletingSubject(null)} variant="outline" className={`flex-1 rounded-xl font-bold h-12 ${isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'}`}>
                Cancel
              </Button>
              <Button onClick={handleDeleteSubject} className="flex-1 rounded-xl font-bold h-12 bg-red-600 hover:bg-red-700 text-white">
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
