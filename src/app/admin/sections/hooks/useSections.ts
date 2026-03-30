import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import { addSection, deleteAndCollapseSection, balanceGenderAcrossSections } from "@/lib/actions/sections"
import { updateApplicantStatus, deleteApplicant, updateStudentSection } from "@/lib/actions/applicants"
import { toast } from "sonner"
import { useTheme } from "@/hooks/useTheme"
import { downloadSectionRecord } from "../api/exportSectionRecord"
import { toggleStudentLock } from "@/lib/actions/enrolled"

export function useSections() {
  const [config, setConfig] = useState<any>(null)
  const { isDarkMode: themeDarkMode } = useTheme()
  const [isDarkMode, setIsDarkMode] = useState(themeDarkMode)
  const [sections, setSections] = useState<any[]>([])
  const [allSchedules, setAllSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedSectionName, setSelectedSectionName] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [strandFilter, setStrandFilter] = useState<"ALL" | "ICT" | "GAS">("ALL")
  const [gradeLevelFilter, setGradeLevelFilter] = useState<"ALL" | "11" | "12">("ALL")
  
  const [sectionSelection, setSectionSelection] = useState<Set<string>>(new Set())
  const [confirmAdd, setConfirmAdd] = useState<{isOpen: boolean, strand: "ICT" | "GAS" | null, gradeLevel: "11" | "12"}>({isOpen: false, strand: null, gradeLevel: "11"})
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

  // FIXED: Use sessionStorage (tab-isolated) instead of localStorage so that
  // opening ICT 11-A in Tab 1 and ICT 11-B in Tab 2 never contaminate each
  // other. localStorage is shared across all tabs of the same origin.
  useEffect(() => {
    const saved = sessionStorage.getItem("registrar_active_matrix")
    if (saved) setSelectedSectionName(saved)
  }, [])

  useEffect(() => {
    if (selectedSectionName) sessionStorage.setItem("registrar_active_matrix", selectedSectionName)
    else sessionStorage.removeItem("registrar_active_matrix")
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
      // Fetch sections + students — use explicit FK hint because students has two FKs to sections
      // (section_id = current section, g11_section_id = historical G11 section)
      const { data, error } = await supabase.from('sections').select(`*, students!students_section_id_fkey ( * )`).order('section_name', { ascending: true })
      if (error) throw error
      setSections(data || [])

      // CRITICAL FIX: fetch ALL schedules across ALL sections so the
      // auto-scheduler wizard has cross-section room/teacher data.
      // Without this allSchedules is always [] and ICT 11-B lands on
      // the same slot as ICT 11-A.
      const { data: schedData } = await supabase.from('schedules').select('*')
      setAllSchedules(schedData || [])
    } catch (err: any) {
      console.error("Registrar Sync Error:", err?.message || err?.code || JSON.stringify(err) || err)
      if (!isBackground) toast.error("Registrar Sync Error — check console for details")
    } finally {
      if (!isBackground) setLoading(false)
    }
  }, [])

  useEffect(() => { 
    fetchSections() 
    fetchConfig()
    // FIXED: Tab-unique channel name to prevent cross-tab event bleed
    const tabId = Math.random().toString(36).slice(2, 8)
    const channel = supabase.channel(`sections_realtime_complete_${tabId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
        setRealtimeStatus(`🔄 ${payload.eventType}`)
        setLastUpdate(new Date().toLocaleTimeString())
        fetchSections(true)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, (payload) => {
        setRealtimeStatus(`📅 Schedule ${payload.eventType}`)
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
        else { setRealtimeStatus(`⚠️ `) }
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
  const initiateAdd = useCallback((strand: "ICT" | "GAS") => { 
    setConfirmAdd({ isOpen: true, strand, gradeLevel: gradeLevelFilter === "ALL" ? "11" : gradeLevelFilter })
  }, [gradeLevelFilter])
  const toggleSelection = useCallback((id: string) => { setSectionSelection(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next }) }, [])
  const handleSelectAll = useCallback((ids: string[]) => { setSectionSelection(prev => { const next = new Set(prev); const allSelected = ids.every(id => prev.has(id)); if (allSelected) ids.forEach(id => next.delete(id)); else ids.forEach(id => next.add(id)); return next }) }, [])

  const executeAdd = useCallback(async () => {
    if (!confirmAdd.strand) return
    setIsProcessing(true)
    try {
      const result = await addSection(confirmAdd.strand, confirmAdd.gradeLevel || "11")
      toast.success(`Generated ${result.data.section_name}`)
      
      // Optimistic update
      setSections(prev => {
        const newSection = { ...result.data, students: [] }
        // Prevent duplicates if it already exists (e.g. from realtime)
        if (prev.some(s => s.id === newSection.id)) return prev;
        
        return [...prev, newSection].sort((a, b) => (a.section_name || '').localeCompare(b.section_name || ''))
      })

      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user;
      supabase.from('activity_logs').insert([{ admin_id: user?.id, admin_name: user?.user_metadata?.username || 'Admin', action_type: 'APPROVED', student_name: 'N/A', details: `Created new ${confirmAdd.strand} section: ${result.data.section_name}` }]).then()
      
      setConfirmAdd({ isOpen: false, strand: null, gradeLevel: "11" }); 
      fetchSections(true)
    } catch (err: any) { toast.error(err.message) } finally { setIsProcessing(false) }
  }, [confirmAdd.strand, confirmAdd.gradeLevel, fetchSections])

  const executeBulkDelete = useCallback(async () => {
    setConfirmDeleteSelect(false);
    
    // Optimistic update
    const targets = sections.filter(s => sectionSelection.has(s.id))
    setSections(prev => prev.filter(s => !sectionSelection.has(s.id)))
    setSectionSelection(new Set())

    try {
      for (const t of targets) await deleteAndCollapseSection(t.id, t.strand, t.grade_level)
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user;
      supabase.from('activity_logs').insert([{ admin_id: user?.id, admin_name: user?.user_metadata?.username || 'Admin', action_type: 'DELETED', student_name: 'N/A', details: `Bulk deleted ${targets.length} section matrices` }]).then()
      toast.success(`Removed ${targets.length} matrices.`); 
      fetchSections(true)
    } catch (e) { toast.error("Bulk delete failed"); fetchSections() }
  }, [sectionSelection, sections, fetchSections])

  const handleDeleteSection = useCallback(async (id: string, name: string, strand: "ICT" | "GAS", gradeLevel?: "11" | "12") => {
    if (!confirm(`WARNING: Deleting ${name} shifts matrix sequence. Proceed?`)) return
    
    // Optimistic update
    setSections(prev => prev.filter(s => s.id !== id))

    try {
      await deleteAndCollapseSection(id, strand, gradeLevel)
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user;
      supabase.from('activity_logs').insert([{ admin_id: user?.id, admin_name: user?.user_metadata?.username || 'Admin', action_type: 'DELETED', student_name: 'N/A', details: `Deleted section matrix: ${name} (${strand})` }]).then()
      toast.success(`Matrix Sequence Updated.`); 
      fetchSections(true)
    } catch (err: any) { toast.error(err.message); fetchSections() }
  }, [fetchSections])

  const handleBalance = useCallback(async (strand: "ICT" | "GAS" | "ALL") => {
    const gradeLabel = gradeLevelFilter === "ALL" ? "All Grades" : `Grade ${gradeLevelFilter}`
    const toastId = toast.loading(`Balancing ${strand} ${gradeLabel} sections...`);
    try {
      await balanceGenderAcrossSections(strand, gradeLevelFilter);
      toast.success(`${strand} ${gradeLabel} sections have been re-balanced.`, { id: toastId });
    } catch (error: any) {
      toast.error(`Failed to balance ${strand}: ${error.message}`, { id: toastId });
    }
  }, [gradeLevelFilter]);

  const handleClearAllStudents = useCallback(async () => {
    const confirmName = prompt("Type 'DELETE ALL' to PERMANENTLY wipe the student database.")
    if (confirmName !== "DELETE ALL") return
    
    // Optimistic update
    setSections(prev => prev.map(s => ({ ...s, students: [] })))

    try {
      await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user;
      supabase.from('activity_logs').insert([{ admin_id: user?.id, admin_name: user?.user_metadata?.username || 'Admin', action_type: 'DELETED', student_name: 'ALL STUDENTS', details: "Executed complete registry wipe (Factory Reset)" }]).then()
      toast.success("Student database purged."); 
      fetchSections(true)
    } catch (err: any) { toast.error(err.message); fetchSections() }
  }, [fetchSections])

  const handleReturnToPending = useCallback(async (id: string, name: string) => {
    try {
      await updateApplicantStatus(id, 'Pending')
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user;
      const student = sections.flatMap(s => s.students).find((s: any) => s.id === id)
      const previousStatus = student?.status || 'Unknown';
      await supabase.from('activity_logs').insert([{ 
        admin_id: user?.id, 
        admin_name: user?.user_metadata?.username || 'Admin', 
        action_type: 'PENDING', 
        student_name: name, 
        student_id: id, 
        student_image: student?.two_by_two_url || student?.profile_2x2_url, 
        details: `Moved  back to Pending status from ` 
      }])
      toast.success(`Moved  back to Pending queue`); fetchSections()
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
          const { data: { session } } = await supabase.auth.getSession(); const user = session?.user;
          const unenrollName = `${activeUnenrollStudent.first_name} ${activeUnenrollStudent.last_name}`;
          await supabase.from('activity_logs').insert([{ 
            admin_id: user?.id, 
            admin_name: user?.user_metadata?.username || 'Admin', 
            action_type: 'DELETED', 
            student_name: unenrollName, 
            student_id: activeUnenrollStudent.id, 
            student_image: activeUnenrollStudent.two_by_two_url || activeUnenrollStudent.profile_2x2_url, 
            details: `Permanently deleted  from section ${currentSection?.section_name || 'Unknown'}` 
          }])
          toast.success(`Deleted  from the system`, { id: toastId }); setActiveUnenrollStudent(null); fetchSections()
        }
      } catch (err) { toast.error("Database purge failed") }
    })
  }, [activeUnenrollStudent, fetchSections, handleExit])

  const handleSwitch = useCallback(async (id: string, newSectionName: string) => {
    try {
      const targetSec = sections.find(s => s.section_name === newSectionName)
      if (!targetSec) return

      // Find student once — used for both grade validation and activity log
      const student = sections.flatMap(s => s.students).find((s: any) => s.id === id)

      // Prevent switching into a section of the wrong grade level
      const studentGrade = student?.grade_level || "11"
      if (targetSec.grade_level && targetSec.grade_level !== studentGrade) {
        toast.error(`Cannot move a Grade ${studentGrade} student into a Grade ${targetSec.grade_level} section.`)
        return
      }

      await updateStudentSection(id, targetSec.id)
      const { data: { session } } = await supabase.auth.getSession(); const user = session?.user;
      const studentName = student ? `${student.first_name} ${student.last_name}` : 'Unknown Student'
      const previousSection = student?.section || 'Unassigned'
      await supabase.from('activity_logs').insert([{ 
        admin_id: user?.id, 
        admin_name: user?.user_metadata?.username || 'Admin', 
        action_type: 'SWITCHED', 
        student_name: studentName, 
        student_id: id, 
        student_image: student?.two_by_two_url || student?.profile_2x2_url, 
        details: `Transferred from ${previousSection} to ${newSectionName}` 
      }])
      toast.success(`Moved ${studentName} to ${newSectionName}`); fetchSections()
    } catch (err) { toast.error("Transfer failed") }
  }, [sections, fetchSections])

  const exportSectionCSV = useCallback((sectionName: string, students: any[]) => {
    downloadSectionRecord(sectionName, students, config?.school_year)
  }, [config])
  
  const handleToggleLock = useCallback(async (id: string, isLocked: boolean) => {
    try {
      // Optimistic update
      setSections(prev => prev.map(sec => ({
        ...sec,
        students: sec.students?.map((s: any) => s.id === id ? { ...s, is_locked: isLocked } : s)
      })))
      await toggleStudentLock(id, isLocked)
      toast.success(isLocked ? "Student locked to section" : "Student unlocked")
    } catch (err) { toast.error("Failed to update lock status"); fetchSections() }
  }, [fetchSections])

  const updateStudentProfile = useCallback(async (id: string, updates: any) => {
    try {
      const { 
        id: _id, 
        created_at, 
        updated_at, 
        profile_picture, 
        two_by_two_url,
        profile_2x2_url,
        _file, 
        ...cleanUpdates 
      } = updates

      let finalProfileUrl = profile_picture || two_by_two_url || profile_2x2_url;

      if (_file) {
        const fileExt = _file.name.split('.').pop();
        const fileName = `${id}-${Math.random()}.${fileExt}`;
        const filePath = `profiles/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, _file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
        finalProfileUrl = publicUrl;
        (cleanUpdates as any).profile_picture = finalProfileUrl;
        (cleanUpdates as any).two_by_two_url = finalProfileUrl;
      }

      // ── Grade level change: auto-assign to correct grade's sections ──────
      if (cleanUpdates.grade_level) {
        const newGrade = cleanUpdates.grade_level as string

        if (newGrade === 'GRADUATED') {
          // Graduating a student: archive and unassign section
          cleanUpdates.is_archived = true
          cleanUpdates.section_id  = null
          cleanUpdates.grade_level = '12' // keep DB constraint happy
        } else {
          // Fetch student's strand + gender to auto-assign
          const { data: student } = await supabase
            .from('students')
            .select('strand, gender, grade_level')
            .eq('id', id)
            .single()

          if (student) {
            // Preserve G11 section before clearing (only when going from 11→12)
            if (student.grade_level === '11' && newGrade === '12') {
              const { data: cur } = await supabase.from('students').select('section, section_id').eq('id', id).single()
              if (cur) {
                cleanUpdates.g11_section    = cur.section || null
                cleanUpdates.g11_section_id = cur.section_id || null
              }
            }
            // Clear current section first — they're changing grade
            cleanUpdates.section_id = null
            cleanUpdates.section    = 'Unassigned'

            // Find best section for new grade level
            const [sectionsRes, occupiedRes] = await Promise.all([
              supabase.from('sections')
                .select('id, section_name, capacity')
                .eq('strand', student.strand)
                .eq('grade_level', newGrade)
                .order('section_name', { ascending: true }),
              supabase.from('students')
                .select('section_id, gender')
                .eq('strand', student.strand)
                .eq('grade_level', newGrade)
                .in('status', ['Accepted', 'Approved'])
                .or('is_archived.is.null,is_archived.eq.false')
                .not('section_id', 'is', null),
            ])

            const secs = sectionsRes.data || []
            if (secs.length > 0) {
              // Build occupancy map
              const occ: Record<string, { male: number; female: number; cap: number }> = {}
              secs.forEach((s: any) => { occ[s.id] = { male: 0, female: 0, cap: s.capacity || 40 } })
              ;(occupiedRes.data || []).forEach((s: any) => {
                if (occ[s.section_id]) {
                  if (s.gender === 'Male') occ[s.section_id].male++
                  else occ[s.section_id].female++
                }
              })
              // Pick section with most room
              const best = secs
                .filter((s: any) => {
                  const o = occ[s.id]
                  return o && (o.male + o.female) < o.cap
                })
                .sort((a: any, b: any) => {
                  const oa = occ[a.id], ob = occ[b.id]
                  return (oa.male + oa.female) - (ob.male + ob.female)
                })[0]

              if (best) {
                cleanUpdates.section_id = best.id
                cleanUpdates.section    = best.section_name
              }
            }
          }
        }
      }

      const { error } = await supabase.from('students').update(cleanUpdates).eq('id', id)
      if (error) throw error

      setSections(prev => prev.map(sec => ({ ...sec, students: sec.students?.map((s: any) => s.id === id ? { ...s, ...cleanUpdates, profile_picture: finalProfileUrl, two_by_two_url: finalProfileUrl } : s) })))
      return true
    } catch (error: any) { console.error("Update error:", error.message || error); throw error }
  }, [])

  return {
    config, isDarkMode, sections, allSchedules, loading, isProcessing, selectedSectionName, setSelectedSectionName,
    searchTerm, setSearchTerm, debouncedSearch, strandFilter, setStrandFilter, gradeLevelFilter, setGradeLevelFilter, sectionSelection,
    confirmAdd, setConfirmAdd, confirmDeleteSelect, setConfirmDeleteSelect, ictExpanded, setIctExpanded,
    gasExpanded, setGasExpanded, exitingRows, hiddenRows, animatingIds, ghostStudents, viewerOpen, setViewerOpen,
    viewingFile, rotation, setRotation, unenrollOpen, setUnenrollOpen, activeUnenrollStudent, profileOpen, setProfileOpen,
    activeProfile, realtimeStatus, lastUpdate, ictSections, gasSections, ictLoad, gasLoad, currentSection, activeStudents,
    currentSectionData, handleExit, handleOpenFile, handleViewProfile, handleUnenroll, initiateAdd, handleBalance, toggleSelection,
    handleSelectAll, executeAdd, executeBulkDelete, handleDeleteSection, handleClearAllStudents, handleReturnToPending,
    handleConfirmUnenroll, handleSwitch, exportSectionCSV, fetchSections, handleToggleLock, updateStudentProfile,
    navigateDocument, canNavigatePrev, canNavigateNext
  }
}