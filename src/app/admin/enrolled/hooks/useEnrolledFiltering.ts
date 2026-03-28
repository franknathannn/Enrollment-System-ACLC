// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\enrolled\hooks\useEnrolledFiltering.ts

import { useState, useMemo, useEffect, useRef } from "react"

const STORAGE_KEY = "enrolled_filters"

function loadFilters() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

function saveFilters(data: Record<string, any>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

export function useEnrolledFiltering({ students }: { students: any[] }) {
  const saved = loadFilters()

  const [searchTerm, setSearchTerm] = useState<string>(saved.searchTerm ?? "")
  const [strandFilter, setStrandFilter] = useState<string>(saved.strandFilter ?? "ALL")
  const [gradeLevelFilter, setGradeLevelFilter] = useState<"ALL" | "11" | "12">("ALL")
  const [categoryFilter, setCategoryFilter] = useState<string>(saved.categoryFilter ?? "ALL")
  const [sectionFilter, setSectionFilter] = useState<string>(saved.sectionFilter ?? "ALL")
  const [sortBy, setSortBy] = useState<string>(saved.sortBy ?? "alpha")
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [strandDropdownOpen, setStrandDropdownOpen] = useState(false)
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(saved.currentPage ?? 1)
  const itemsPerPage = 5

  // Animation state
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set())
  const prevStudentsRef = useRef<Set<string>>(new Set())

  // Persist filter state to sessionStorage on change
  useEffect(() => {
    saveFilters({ searchTerm, strandFilter, categoryFilter, sectionFilter, sortBy, currentPage })
  }, [searchTerm, strandFilter, categoryFilter, sectionFilter, sortBy, currentPage])

  const filteredStudents = useMemo(() => {
    const filtered = students.filter(student => {
      // 1. Search Logic (Name, LRN, or UUID)
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
      const lrn = student.lrn || ""
      const id = student.id || ""
      const searchLower = searchTerm.toLowerCase()

      const matchesSearch = 
        fullName.includes(searchLower) || 
        lrn.includes(searchLower) ||
        id.toLowerCase().includes(searchLower)

      // 2. Strand Logic
      const matchesStrand = strandFilter === "ALL" || student.strand === strandFilter

      // 2b. Grade Level Logic (treat null/undefined as '11')
      const studentGradeLevel = student.grade_level || '11'
      const matchesGradeLevel = gradeLevelFilter === "ALL" || studentGradeLevel === gradeLevelFilter

      // 3. Category Logic (JHS vs ALS)
      let matchesCategory = true
      if (categoryFilter !== "ALL") {
        const cat = (student.student_category || "").toLowerCase()
        if (categoryFilter === "JHS") {
          matchesCategory = cat.includes("jhs") || cat.includes("graduate") || cat.includes("standard")
        } else if (categoryFilter === "ALS") {
          matchesCategory = cat.includes("als")
        }
      }

      // 4. Section Logic
      const matchesSection = sectionFilter === "ALL" || student.section === sectionFilter

      return matchesSearch && matchesStrand && matchesGradeLevel && matchesCategory && matchesSection
    })

    // Sorting logic
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_old': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'date_new': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'gwa_desc': return (parseFloat(b.gwa_grade_10) || 0) - (parseFloat(a.gwa_grade_10) || 0);
        case 'gwa_asc': return (parseFloat(a.gwa_grade_10) || 0) - (parseFloat(b.gwa_grade_10) || 0);
        case 'alpha_first': return a.first_name.localeCompare(b.first_name);
        case 'alpha': default: return a.last_name.localeCompare(b.last_name);
      }
    })
  }, [students, searchTerm, strandFilter, gradeLevelFilter, categoryFilter, sectionFilter, sortBy])

  // Pagination Logic
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredStudents.slice(start, start + itemsPerPage)
  }, [filteredStudents, currentPage, itemsPerPage])

  // Animation Logic for Realtime Updates
  useEffect(() => {
    const currentIds = new Set(filteredStudents.map(s => s.id))
    const prevIds = prevStudentsRef.current
    
    const newIds = Array.from(currentIds).filter(id => !prevIds.has(id))
    
    if (newIds.length > 0) {
      setAnimatingIds(prev => {
        const next = new Set(prev)
        newIds.forEach(id => next.add(id))
        return next
      })
      
      setTimeout(() => {
        setAnimatingIds(prev => {
          const next = new Set(prev)
          newIds.forEach(id => next.delete(id))
          return next
        })
      }, 500)
    }
    
    prevStudentsRef.current = currentIds
  }, [filteredStudents])

  return {
    searchTerm, setSearchTerm,
    strandFilter, setStrandFilter,
    gradeLevelFilter, setGradeLevelFilter,
    categoryFilter, setCategoryFilter,
    sectionFilter, setSectionFilter,
    filteredStudents,
    sortBy, setSortBy,
    sortDropdownOpen, setSortDropdownOpen,
    strandDropdownOpen, setStrandDropdownOpen,
    categoryDropdownOpen, setCategoryDropdownOpen,
    sectionDropdownOpen, setSectionDropdownOpen,
    paginatedStudents,
    totalPages,
    currentPage, setCurrentPage,
    animatingIds
  }
}