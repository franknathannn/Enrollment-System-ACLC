import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { addSection, deleteAndCollapseSection } from "@/lib/actions/sections"
import { updateApplicantStatus, deleteApplicant, updateStudentSection } from "@/lib/actions/applicants"
import { toast } from "sonner"
import { useTheme } from "@/hooks/useTheme"
import { downloadSectionRecord } from "../api/exportSectionRecord"

export function useSections() {
  const [config, setConfig] = useState<any>(null)
  const { isDarkMode: themeDarkMode } = useTheme()
  const [isDarkMode, setIsDarkMode] = useState(themeDarkMode)
  const [sections, setSections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedSectionName, setSelectedSectionName] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [strandFilter, setStrandFilter] = useState<"ALL" | "ICT" | "GAS">("ALL")
  
  const [sectionSelection, setSectionSelection] = useState<Set<string>>(new Set())
  const [confirmAdd, setConfirmAdd] = useState<{isOpen: boolean, strand: "ICT" | "GAS" | null}>({isOpen: false, strand: null})
  const [confirmDeleteSelect, setConfirmDeleteSelect] = useState(false)

  const [ictExpanded, setIctExpanded] = useState(true)
  const [gasExpanded, setGasExpanded] = useState(true)

  const [exitingRows, setExitingRows] = useState<Record<string, boolean>>({})
  const [hiddenRows, setHiddenRows] = useState<Set<string>>(new Set())
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set())
  const prevStudentIdsRef = useRef<Set<string>>(new Set())
  const prevStudentsMapRef = useRef<Map<string, any>>(new Map())
  const [ghostStudents, setGhostStudents] = useState<any[]>([])
  const prevSectionRef = useRef<string | null>(null)

  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewingFile, setViewingFile] = useState<{url: string, label: string} | null>(null)
  const [docList, setDocList] = useState<{url: string, label: string}[]>([])
  const [rotation, setRotation] = useState(0)

  const [unenrollOpen, setUnenrollOpen] = useState(false)
  const [activeUnenrollStudent, setActiveUnenrollStudent] = useState<any>(null)

  const [profileOpen, setProfileOpen] = useState(false)
  const [activeProfile, setActiveProfile] = useState<any>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<string>('Initializing...')
  const [lastUpdate, setLastUpdate] = useState<string>('')

  useEffect(() => {
    const savedIct = localStorage.getItem("section_ict_expanded")
    const savedGas = localStorage.getItem("section_gas_expanded")
    if (savedIct !== null) setIctExpanded(savedIct === "true")
    if (savedGas !== null) setGasExpanded(savedGas === "true")

    const savedScroll = sessionStorage.getItem("sections_scroll_pos")
    if (savedScroll) {
      setTimeout(() => window.scrollTo({ top: parseInt(savedScroll), behavior: 'instant' }), 100)
    }

    const handleScroll = () => {
      sessionStorage.setItem("sections_scroll_pos", window.scrollY.toString())
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => { localStorage.setItem("section_ict_expanded", ictExpanded.toString()) }, [ictExpanded])
  useEffect(() => { localStorage.setItem("section_gas_expanded", gasExpanded.toString()) }, [gasExpanded])

  useEffect(() => {
    const savedFilter = localStorage.getItem("sections_strand_filter")
    if (savedFilter) setStrandFilter(savedFilter as any)
  }, [])

  useEffect(() => {
    localStorage.setItem("sections_strand_filter", strandFilter)
  }, [strandFilter])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    const saved = localStorage.getItem("registrar_active_matrix")
    if (saved) setSelectedSectionName(saved)
  }, [])

  useEffect(() => {
    if (selectedSectionName) localStorage.setItem("registrar_active_matrix", selectedSectionName)
    else localStorage.removeItem("registrar_active_matrix")
  }, [selectedSectionName])

  useEffect(() => {
    setHiddenRows(new Set())
    setExitingRows({})
    setGhostStudents([])
  }, [selectedSectionName])

  useEffect(() => {
    setExitingRows({})
  }, [sections])

  useEffect(() => {
    setIsDarkMode(themeDarkMode)
  }, [themeDarkMode])

  useEffect(() => {
    const handleThemeChange = (e: any) => {
      setIsDarkMode(e.detail.mode === 'dark')
    }
    window.addEventListener('theme-change', handleThemeChange)
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('system_config').select('*').single()
      if (error) throw error
      setConfig(data)
    } catch (err) {
      console.error("Config fetch error:", err)
    }
  }, [])

  const fetchSections = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    try {
      const { data, error } = await supabase.from('sections').select(`*, students ( * )`).order('section_name', { ascending: true })
      if (error) throw error
      setSections(data || [])
    } catch (err) {
      if (!isBackground) toast.error("Registrar Sync Error")
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, [])

  useEffect(() => { 
    fetchSections() 
    fetchConfig()
    const channel = supabase.channel('sections_realtime_complete')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
        setRealtimeStatus(`🔄 ${payload.eventType}`)
        setLastUpdate(new Date().toLocaleTimeString())
        fetchSections(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sections' }, (payload) => {
        setRealtimeStatus(`📋 Section ${payload.eventType}`)
        setLastUpdate(new Date().toLocaleTimeString())
        fetchSections(true)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { setRealtimeStatus('🟢 Live'); setLastUpdate(new Date().toLocaleTimeString()) }
        else if (status === 'CHANNEL_ERROR') { setRealtimeStatus('🔴 Error'); setTimeout(() => fetchSections(true), 2000) }
        else if (status === 'TIMED_OUT') { setRealtimeStatus('⏱️ Timeout'); setTimeout(() => fetchSections(true), 2000) }
        else { setRealtimeStatus(`⚠️ ${status}`) }
      })
    return () => { supabase.removeChannel(channel) }
  }, [fetchConfig, fetchSections])

  const ictSections = useMemo(() => sections.filter(s => s.strand === 'ICT'), [sections])
  const gasSections = useMemo(() => sections.filter(s => s.strand === 'GAS'), [sections])

  const calculateStrandLoad = useCallback((strandSections: any[]) => {
    const totalCapacity = strandSections.reduce((acc, s) => acc + (s.capacity || 40), 0)
    const totalEnrolled = strandSections.reduce((acc, s) => {
      const active = s.students?.filter((st: any) => st.status === 'Accepted' || st.status === 'Approved').length || 0
      return acc + active
    }, 0)
    return { totalCapacity, totalEnrolled, percent: totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0 }
  }, [])

  const ictLoad = useMemo(() => calculateStrandLoad(ictSections), [ictSections, calculateStrandLoad])
  const gasLoad = useMemo(() => calculateStrandLoad(gasSections), [gasSections, calculateStrandLoad])

  const currentSection = useMemo(() => sections.find(s => s.section_name === selectedSectionName), [sections, selectedSectionName])
  const activeStudents = useMemo(() => currentSection?.students ? currentSection.students.filter((s: any) => s.status === 'Accepted' || s.status === 'Approved') : [], [currentSection?.students])

  useLayoutEffect(() => {
    if (!selectedSectionName) {
      prevStudentIdsRef.current = new Set(); prevSectionRef.current = null; prevStudentsMapRef.current = new Map(); setGhostStudents([]); return
    }
    if (selectedSectionName !== prevSectionRef.current) {
      prevSectionRef.current = selectedSectionName; prevStudentIdsRef.current = new Set(activeStudents.map((s: any) => s.id)); prevStudentsMapRef.current = new Map(activeStudents.map((s: any) => [s.id, s])); setGhostStudents([]); return
    }
    const currentIds = new Set(activeStudents.map((s: any) => s.id))
    const newIds = activeStudents.filter((s: any) => !prevStudentIdsRef.current.has(s.id)).map((s: any) => s.id)
    if (newIds.length > 0) {
      setHiddenRows(prev => { const next = new Set(prev); newIds.forEach((id: string) => next.delete(id)); return next })
      setExitingRows(prev => { const next = { ...prev }; newIds.forEach((id: string) => delete next[id]); return next })
      setAnimatingIds(prev => { const next = new Set(prev); newIds.forEach((id: string) => next.add(id)); return next })
      setTimeout(() => { setAnimatingIds(prev => { const next = new Set(prev); newIds.forEach((id: string) => next.delete(id)); return next }) }, 500)
    }
    const removedStudents: any[] = []
    prevStudentsMapRef.current.forEach((s, id) => { if (!currentIds.has(id)) removedStudents.push(s) })
    if (removedStudents.length > 0) {
      setGhostStudents(prev => [...prev, ...removedStudents])
      setExitingRows(prev => { const next = { ...prev }; removedStudents.forEach((s: any) => { next[s.id] = true }); return next })
      setTimeout(() => {
        setGhostStudents(prev => prev.filter(g => !removedStudents.find(r => r.id === g.id)))
        setExitingRows(prev => { const next = { ...prev }; removedStudents.forEach((s: any) => { delete next[s.id] }); return next })
      }, 300)
    }
    prevStudentIdsRef.current = new Set(activeStudents.map((s: any) => s.id))
    prevStudentsMapRef.current = new Map(activeStudents.map((s: any) => [s.id, s]))
  }, [activeStudents, selectedSectionName])

  const currentSectionData = useMemo(() => {
    if (!selectedSectionName || !currentSection) return null;
    const activeIds = new Set(activeStudents.map((s: any) => s.id))
    const uniqueGhosts = ghostStudents.filter(g => !activeIds.has(g.id))
    const sortedStudents = [...activeStudents, ...uniqueGhosts].sort((a: any, b: any) => a.last_name.localeCompare(b.last_name))
    const mCount = activeStudents.filter((s: any) => s.gender === 'Male').length
    const fCount = activeStudents.filter((s: any) => s.gender === 'Female').length
    const capacity = currentSection?.capacity || 40
    const fillPercent = (activeStudents.length / capacity) * 100
    return { sortedStudents, mCount, fCount, capacity, fillPercent }
  }, [selectedSectionName, currentSection, activeStudents, ghostStudents])

  const handleExit = useCallback((id: string, callback: () => void) => {
    setExitingRows(prev => ({ ...prev, [id]: true }))
    setTimeout(() => { setHiddenRows(prev => { const next = new Set(prev); next.add(id); return next }); callback() }, 300)
  }, [])

  const handleOpenFile = useCallback((url: string, label: string, allDocs: {url: string, label: string}[] = []) => { 
    setViewingFile({ url, label }); 
    setDocList(allDocs.length > 0 ? allDocs : [{url, label}]);
    setRotation(0); 
    setViewerOpen(true) 
  }, [])

  const navigateDocument = useCallback((direction: number) => {
    if (!viewingFile || docList.length === 0) return;
    const currentIndex = docList.findIndex(d => d.url === viewingFile.url && d.label === viewingFile.label);
    if (currentIndex === -1) return;
    
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < docList.length) {
      setViewingFile(docList[newIndex]);
      setRotation(0);
    }
  }, [viewingFile, docList]);

  const currentIndex = viewingFile ? docList.findIndex(d => d.url === viewingFile.url && d.label === viewingFile.label) : -1;
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex !== -1 && currentIndex < docList.length - 1;

  const handleViewProfile = useCallback((student: any) => { setActiveProfile(student); setProfileOpen(true) }, [])
  const handleUnenroll = useCallback((student: any) => { setActiveUnenrollStudent(student); setUnenrollOpen(true) }, [])
  const initiateAdd = useCallback((strand: "ICT" | "GAS") => { setConfirmAdd({ isOpen: true, strand }) }, [])
  const toggleSelection = useCallback((id: string) => { setSectionSelection(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next }) }, [])
  const handleSelectAll = useCallback((ids: string[]) => { setSectionSelection(prev => { const next = new Set(prev); const allSelected = ids.every(id => prev.has(id)); if (allSelected) ids.forEach(id => next.delete(id)); else ids.forEach(id => next.add(id)); return next }) }, [])

  const executeAdd = useCallback(async () => {
    if (!confirmAdd.strand) return
    setIsProcessing(true)
    try {
      const result = await addSection(confirmAdd.strand)
      toast.success(`Generated ${result.name}`)
      
      // Optimistic update
      setSections(prev => {
        const newSection = { ...result, section_name: result.name, students: [] }
        return [...prev, newSection].sort((a, b) => (a.section_name || '').localeCompare(b.section_name || ''))
      })

      const { data: { user } } = await supabase.auth.getUser()
      supabase.from('activity_logs').insert([{ admin_id: user?.id, admin_name: user?.user_metadata?.username || 'Admin', action_type: 'APPROVED', student_name: 'N/A', details: `Created new ${confirmAdd.strand} section: ${result.name}` }]).then()
      
      setConfirmAdd({ isOpen: false, strand: null }); 
      fetchSections(true)
    } catch (err: any) { toast.error(err.message) } finally { setIsProcessing(false) }
  }, [confirmAdd.strand, fetchSections])

  const executeBulkDelete = useCallback(async () => {
    setConfirmDeleteSelect(false);
    
    // Optimistic update
    const targets = sections.filter(s => sectionSelection.has(s.id))
    setSections(prev => prev.filter(s => !sectionSelection.has(s.id)))
    setSectionSelection(new Set())

    try {
      for (const t of targets) await deleteAndCollapseSection(t.id, t.strand)
      const { data: { user } } = await supabase.auth.getUser()
      supabase.from('activity_logs').insert([{ admin_id: user?.id, admin_name: user?.user_metadata?.username || 'Admin', action_type: 'DELETED', student_name: 'N/A', details: `Bulk deleted ${targets.length} section matrices` }]).then()
      toast.success(`Removed ${targets.length} matrices.`); 
      fetchSections(true)
    } catch (e) { toast.error("Bulk delete failed"); fetchSections() }
  }, [sectionSelection, sections, fetchSections])

  const handleDeleteSection = useCallback(async (id: string, name: string, strand: "ICT" | "GAS") => {
    if (!confirm(`WARNING: Deleting ${name} shifts matrix sequence. Proceed?`)) return
    
    // Optimistic update
    setSections(prev => prev.filter(s => s.id !== id))

    try {
      await deleteAndCollapseSection(id, strand)
      const { data: { user } } = await supabase.auth.getUser()
      supabase.from('activity_logs').insert([{ admin_id: user?.id, admin_name: user?.user_metadata?.username || 'Admin', action_type: 'DELETED', student_name: 'N/A', details: `Deleted section matrix: ${name} (${strand})` }]).then()
      toast.success(`Matrix Sequence Updated.`); 
      fetchSections(true)
    } catch (err: any) { toast.error(err.message); fetchSections() }
  }, [fetchSections])

  const handleClearAllStudents = useCallback(async () => {
    const confirmName = prompt("Type 'DELETE ALL' to PERMANENTLY wipe the student database.")
    if (confirmName !== "DELETE ALL") return
    
    // Optimistic update
    setSections(prev => prev.map(s => ({ ...s, students: [] })))

    try {
      await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      const { data: { user } } = await supabase.auth.getUser()
      supabase.from('activity_logs').insert([{ admin_id: user?.id, admin_name: user?.user_metadata?.username || 'Admin', action_type: 'DELETED', student_name: 'ALL STUDENTS', details: "Executed complete registry wipe (Factory Reset)" }]).then()
      toast.success("Student database purged."); 
      fetchSections(true)
    } catch (err: any) { toast.error(err.message); fetchSections() }
  }, [fetchSections])

  const handleReturnToPending = useCallback(async (id: string, name: string) => {
    try {
      await updateApplicantStatus(id, 'Pending')
      const { data: { user } } = await supabase.auth.getUser()
      const student = sections.flatMap(s => s.students).find((s: any) => s.id === id)
      await supabase.from('activity_logs').insert([{ admin_id: user?.id, admin_name: user?.user_metadata?.username || 'Admin', action_type: 'PENDING', student_name: name, student_id: id, student_image: student?.two_by_two_url || student?.profile_2x2_url, details: "Student Returned to Pending" }])
      toast.success(`${name} returned to Pending queue.`); fetchSections()
    } catch (err) { toast.error("Action failed") }
  }, [sections, fetchSections])

  const handleConfirmUnenroll = useCallback(async () => {
    if (!activeUnenrollStudent) return
    setUnenrollOpen(false)
    handleExit(activeUnenrollStudent.id, async () => {
      const toastId = toast.loading(`Purging ${activeUnenrollStudent.first_name}...`)
      try {
        const result = await deleteApplicant(activeUnenrollStudent.id)
        if (result.success) {
          const { data: { user } } = await supabase.auth.getUser()
          await supabase.from('activity_logs').insert([{ admin_id: user?.id, admin_name: user?.user_metadata?.username || 'Admin', action_type: 'DELETED', student_name: `${activeUnenrollStudent.first_name} ${activeUnenrollStudent.last_name}`, student_id: null, student_image: activeUnenrollStudent.two_by_two_url || activeUnenrollStudent.profile_2x2_url, details: "Deleted from the list" }])
          toast.success(`Record Erased Successfully`, { id: toastId }); setActiveUnenrollStudent(null); fetchSections()
        }
      } catch (err) { toast.error("Database purge failed") }
    })
  }, [activeUnenrollStudent, fetchSections, handleExit])

  const handleSwitch = useCallback(async (id: string, newSectionName: string) => {
    try {
      const targetSec = sections.find(s => s.section_name === newSectionName)
      if (!targetSec) return
      await updateStudentSection(id, targetSec.id)
      const { data: { user } } = await supabase.auth.getUser()
      const student = sections.flatMap(s => s.students).find((s: any) => s.id === id)
      await supabase.from('activity_logs').insert([{ admin_id: user?.id, admin_name: user?.user_metadata?.username || 'Admin', action_type: 'SWITCHED', student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown Student', student_id: id, student_image: student?.two_by_two_url || student?.profile_2x2_url, details: `Transferred to matrix ${newSectionName}` }])
      toast.success(`Moved to ${newSectionName}`); fetchSections()
    } catch (err) { toast.error("Transfer failed") }
  }, [sections, fetchSections])

  const exportSectionCSV = useCallback((sectionName: string, students: any[]) => {
    downloadSectionRecord(sectionName, students, config?.school_year)
  }, [config])
  
  return {
    config, isDarkMode, sections, loading, isProcessing, selectedSectionName, setSelectedSectionName,
    searchTerm, setSearchTerm, debouncedSearch, strandFilter, setStrandFilter, sectionSelection,
    confirmAdd, setConfirmAdd, confirmDeleteSelect, setConfirmDeleteSelect, ictExpanded, setIctExpanded,
    gasExpanded, setGasExpanded, exitingRows, hiddenRows, animatingIds, ghostStudents, viewerOpen, setViewerOpen,
    viewingFile, rotation, setRotation, unenrollOpen, setUnenrollOpen, activeUnenrollStudent, profileOpen, setProfileOpen,
    activeProfile, realtimeStatus, lastUpdate, ictSections, gasSections, ictLoad, gasLoad, currentSection, activeStudents,
    currentSectionData, handleExit, handleOpenFile, handleViewProfile, handleUnenroll, initiateAdd, toggleSelection,
    handleSelectAll, executeAdd, executeBulkDelete, handleDeleteSection, handleClearAllStudents, handleReturnToPending,
    handleConfirmUnenroll, handleSwitch, exportSectionCSV, fetchSections,
    navigateDocument, canNavigatePrev, canNavigateNext
  }
}