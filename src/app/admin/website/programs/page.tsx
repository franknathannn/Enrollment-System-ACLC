"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import { useTheme } from "@/hooks/useTheme"
import { Plus, Trash2, Image as ImageIcon, Loader2, Clock, Building, FileText, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MarkdownEditor } from "@/components/ui/markdown-editor"

export default function ProgramsAdminPage() {
  const { isDarkMode } = useTheme()
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Selection state
  const [selectedId, setSelectedId] = useState<string | null>(null)
  
  // Form state for currently selected item
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [duration, setDuration] = useState("")
  const [department, setDepartment] = useState("")
  const [icon, setIcon] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [slugModified, setSlugModified] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchPrograms()

    const channel = supabase.channel('public_refresh_programs')
    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchPrograms = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) {
      toast.error("Failed to fetch programs")
      console.error(error)
    } else {
      setPrograms(data || [])
      // Auto-select first item if none selected and items exist
      if (!selectedId && data && data.length > 0) {
        selectProgram(data[0])
      }
    }
    setLoading(false)
  }

  const selectProgram = (program: any) => {
    setSelectedId(program.id)
    setName(program.name)
    setSlug(program.slug || "")
    setDescription(program.description || "")
    setDuration(program.duration || "")
    setDepartment(program.department || "")
    setIcon(program.icon || "")
    setImageUrl(program.image_url || "")
    setSlugModified(false)
  }

  const handleNew = () => {
    setSelectedId("new")
    setName("")
    setSlug("")
    setDescription("")
    setDuration("")
    setDepartment("College")
    setIcon("")
    setImageUrl("")
    setImageFile(null)
    setSlugModified(false)
  }

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsUploading(true)
    const toastId = toast.loading("Uploading image...")
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `landing-prog-${Date.now()}.${fileExt}`
      const filePath = `programs/${fileName}`
      
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setImageUrl(publicUrl)
      toast.success("Image uploaded successfully", { id: toastId })
    } catch (error: any) {
      toast.error(error.message, { id: toastId })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    if (!name || !slug || !description || !duration || !department) {
      toast.error("Please fill all required fields (Name, Slug, Description, Duration, Department)")
      return
    }

    const payload = {
      name,
      slug,
      description,
      duration,
      department,
      icon,
      image_url: imageUrl
    }

    const toastId = toast.loading("Saving program...")
    try {
      if (selectedId && selectedId !== "new") {
        const { error } = await supabase.from('programs').update(payload).eq('id', selectedId)
        if (error) throw error
      } else {
        const { error, data } = await supabase.from('programs').insert([payload]).select()
        if (error) throw error
        if (data && data.length > 0) {
          setSelectedId(data[0].id)
        }
      }
      
      toast.success("Saved successfully", { id: toastId })
      
      supabase.channel('public_refresh_programs').send({
        type: 'broadcast',
        event: 'refresh',
        payload: { source: 'programs' }
      })

      fetchPrograms()
    } catch (error: any) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this program?")) return
    const toastId = toast.loading("Deleting...")
    const { error } = await supabase.from('programs').delete().eq('id', id)
    if (error) {
      toast.error(error.message, { id: toastId })
    } else {
      toast.success("Deleted successfully", { id: toastId })
      if (selectedId === id) {
        setSelectedId(null)
      }
      fetchPrograms()
    }
  }

  return (
    <div className={`h-[calc(100vh-8rem)] flex overflow-hidden rounded-2xl border shadow-sm ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
      
      {/* Sidebar - Article List */}
      <div className={`w-1/3 flex flex-col border-r ${isDarkMode ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
        <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Programs</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Manage Offerings</p>
          </div>
          <Button onClick={handleNew} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-8 w-8 p-0 shrink-0 shadow-md">
            <Plus size={16} />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2 fancy-scroll">
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
          ) : programs.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-500 font-bold uppercase tracking-widest">No programs found</div>
          ) : (
            programs.map((item) => (
              <div 
                key={item.id} 
                onClick={() => selectProgram(item)}
                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                  selectedId === item.id 
                    ? (isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200 shadow-sm')
                    : (isDarkMode ? 'border-transparent hover:bg-slate-800' : 'border-transparent hover:bg-slate-100')
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className={`font-bold text-sm line-clamp-1 leading-tight ${selectedId === item.id ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {item.name || "Untitled Program"}
                  </h3>
                </div>
                <div className="flex flex-col gap-1 text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-2">
                  <span className="flex items-center gap-1"><Building size={10} /> {item.department}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {item.duration}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content - Editor */}
      <div className={`flex-1 flex flex-col ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <FileText size={48} className="mb-4 opacity-20" />
            <h2 className="text-xl font-bold uppercase tracking-wider mb-2">Select a Program</h2>
            <p className="text-sm max-w-sm">Choose a program from the sidebar to edit its details and description.</p>
          </div>
        ) : (
          <>
            {/* Editor Topbar */}
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Always Published
                </span>
              </div>
              <div className="flex items-center gap-3">
                {selectedId !== "new" && (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(selectedId)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                    <Trash2 size={14} className="mr-2" /> Delete
                  </Button>
                )}
                <Button onClick={handleSave} size="sm" className="bg-[#003399] hover:bg-blue-800 text-white rounded-full px-6 shadow-md">
                  Save Program
                </Button>
              </div>
            </div>

            {/* Editor Body */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-10 fancy-scroll">
              <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Program Name</label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (selectedId === "new" && !slugModified) setSlug(generateSlug(e.target.value))
                    }}
                    placeholder="e.g. Bachelor of Science in Information Technology..."
                    className={`h-12 text-lg font-bold rounded-xl shadow-inner border-none ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5 flex-col flex col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">URL Slug</label>
                    <Input 
                      value={slug} onChange={(e) => { setSlug(e.target.value); setSlugModified(true); }}
                      className={`h-9 border rounded-lg text-sm placeholder:text-slate-400 ${isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}
                      placeholder="e.g. computer-science"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Duration</label>
                    <Input 
                      value={duration} onChange={(e) => setDuration(e.target.value)}
                      className={`h-9 border rounded-lg text-sm placeholder:text-slate-400 ${isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}
                      placeholder="e.g. 4 Years"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Department</label>
                    <select
                      value={department} onChange={(e) => setDepartment(e.target.value)}
                      className={`h-9 border rounded-lg text-sm px-2 ${isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}
                    >
                      <option value="Nursery">Nursery</option>
                      <option value="Kindergarten">Kindergarten</option>
                      <option value="Elementary">Elementary</option>
                      <option value="Highschool">Highschool</option>
                      <option value="SHS">SHS</option>
                      <option value="College">College</option>
                    </select>
                  </div>
                </div>

                {/* Cover Image Upload (Notion style) */}
                <div className={`group relative rounded-2xl overflow-hidden border-2 border-dashed flex flex-col items-center justify-center transition-all ${isDarkMode ? 'border-slate-700 bg-slate-900 hover:bg-slate-800' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                  {imageUrl ? (
                    <div className="relative w-full h-[250px]">
                      <img src={imageUrl} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="outline" className="bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20" onClick={() => fileInputRef.current?.click()}>
                          Change Cover Image
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-[150px] flex items-center justify-center">
                      <Button variant="ghost" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                        Add Cover Image
                      </Button>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                </div>

                {/* Markdown Editor */}
                <div className="space-y-2 h-[500px] flex flex-col">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Program Article / Description</label>
                  <MarkdownEditor 
                    value={description} 
                    onChange={setDescription} 
                    isDarkMode={isDarkMode}
                    placeholder="Start writing your program description here..."
                    className="flex-1 shadow-inner border-none"
                  />
                </div>
                
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
