import { useState, useMemo, useEffect, useRef } from "react"

interface FilteringDependencies {
  students: any[]
  processingIds: Set<string>
  processingIdsRef: React.MutableRefObject<Set<string>>
  setHiddenRows: React.Dispatch<React.SetStateAction<Set<string>>>
  setExitingRows: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}

export function useStudentFiltering({ students, processingIds, processingIdsRef, setHiddenRows, setExitingRows }: FilteringDependencies) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState<"Pending" | "Accepted" | "Rejected">("Pending")
  const [sortBy, setSortBy] = useState<string>("alpha")
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set())
  
  // Track which students have been seen (and potentially animated) in each tab
  const seenInTabRef = useRef<Map<string, Set<string>>>(new Map())
  
  // VIP PASS: Students that were recently transferred - they get ONE animation per tab
  const vipPassMap = useRef<Map<string, { timestamp: number }>>(new Map())
  
  const prevFilterRef = useRef(filter)
  const prevProcessingRef = useRef<Set<string>>(new Set())

  // --- VIP PASS ISSUER ---
  useEffect(() => {
    const current = processingIds
    const prev = prevProcessingRef.current
    
    // Students that just STARTED processing
    const newlyProcessing = Array.from(current).filter(id => !prev.has(id))
    newlyProcessing.forEach(id => {
      vipPassMap.current.set(id, { timestamp: Date.now() })
    })
    
    // Students that just FINISHED processing
    const justFinished = Array.from(prev).filter(id => !current.has(id))
    justFinished.forEach(id => {
      // Update timestamp so they can animate in their new tab
      vipPassMap.current.set(id, { timestamp: Date.now() })
    })
    
    prevProcessingRef.current = current
  }, [processingIds])

  const filteredStudents = useMemo(() => {
    const filtered = students.filter(s => {
      const matchesStatus = s.status === filter || (filter === 'Accepted' && s.status === 'Approved');
      const matchesSearch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || s.lrn.includes(searchTerm);
      return matchesStatus && matchesSearch;
    })

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_old': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'date_new': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'age': return (a.age || 0) - (b.age || 0);
        case 'gender': return a.gender.localeCompare(b.gender);
        case 'strand_ict': return a.strand === b.strand ? a.last_name.localeCompare(b.last_name) : (a.strand === 'ICT' ? -1 : 1);
        case 'strand_gas': return a.strand === b.strand ? a.last_name.localeCompare(b.last_name) : (a.strand === 'GAS' ? -1 : 1);
        case 'gwa_desc': return (parseFloat(b.gwa_grade_10) || 0) - (parseFloat(a.gwa_grade_10) || 0);
        case 'gwa_asc': return (parseFloat(a.gwa_grade_10) || 0) - (parseFloat(b.gwa_grade_10) || 0);
        case 'alpha_first': return a.first_name.localeCompare(b.first_name);
        case 'alpha': default: return a.last_name.localeCompare(b.last_name);
      }
    })
  }, [students, filter, searchTerm, sortBy])

  useEffect(() => {
    setCurrentPage(1)
  }, [filter, searchTerm, sortBy])

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredStudents.slice(start, start + itemsPerPage)
  }, [filteredStudents, currentPage])

  // --- ANIMATION LOGIC ---
  useEffect(() => {
    const isTabSwitch = filter !== prevFilterRef.current

    if (isTabSwitch) {
      const currentProcessing = processingIdsRef.current
      setHiddenRows(prev => {
        const next = new Set<string>()
        prev.forEach(id => { if (currentProcessing.has(id)) next.add(id) })
        return next
      })
      setExitingRows({})
      prevFilterRef.current = filter
    }

    // Get or create "seen" set for this tab
    if (!seenInTabRef.current.has(filter)) {
      seenInTabRef.current.set(filter, new Set())
    }
    const seenInTab = seenInTabRef.current.get(filter)!

    const now = Date.now()
    const toAnimate: string[] = []

    filteredStudents.forEach(s => {
      const hasBeenSeen = seenInTab.has(s.id)
      const vipPass = vipPassMap.current.get(s.id)
      const hasActiveVipPass = vipPass && (now - vipPass.timestamp) < 10000

      // ANIMATION RULE:
      // Animate if: Has VIP pass + Never been seen in this tab
      if (hasActiveVipPass && !hasBeenSeen) {
        toAnimate.push(s.id)
        
        // IMMEDIATELY mark as seen AND revoke VIP pass for this tab
        seenInTab.add(s.id)
        // Don't delete VIP pass globally - just mark as seen in THIS tab
      } else if (!hasBeenSeen) {
        // Student appeared but no VIP pass - just mark as seen, no animation
        seenInTab.add(s.id)
      }
    })

    // Trigger animations
    if (toAnimate.length > 0) {
      setAnimatingIds(prev => {
        const next = new Set(prev)
        toAnimate.forEach(id => next.add(id))
        return next
      })

      const duration = toAnimate.length > 1 ? 600 : 500
      setTimeout(() => {
        setAnimatingIds(prev => {
          const next = new Set(prev)
          toAnimate.forEach(id => next.delete(id))
          return next
        })
      }, duration)
    }

  }, [filteredStudents, filter, processingIdsRef, setHiddenRows, setExitingRows])

  // Cleanup VIP passes
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now()
      const toDelete: string[] = []
      
      vipPassMap.current.forEach((pass, id) => {
        if (now - pass.timestamp > 10000) {
          toDelete.push(id)
        }
      })
      
      toDelete.forEach(id => vipPassMap.current.delete(id))
    }, 5000)
    
    return () => clearInterval(cleanupInterval)
  }, [])

  // Cleanup hidden rows
  useEffect(() => {
    setHiddenRows(prev => {
      if (prev.size === 0) return prev
      const next = new Set(prev)
      let changed = false
      filteredStudents.forEach(s => {
        if (next.has(s.id) && !processingIds.has(s.id)) {
          next.delete(s.id)
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [filteredStudents, processingIds, setHiddenRows])

  return {
    searchTerm, setSearchTerm,
    filter, setFilter,
    sortBy, setSortBy,
    sortDropdownOpen, setSortDropdownOpen,
    currentPage, setCurrentPage,
    filteredStudents, paginatedStudents, totalPages,
    animatingIds
  }
}