// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\enrolled\hooks\useEnrolledFiltering.ts

import { useState, useMemo, useEffect, useRef } from "react"

export function useEnrolledFiltering({ students }: { students: any[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [strandFilter, setStrandFilter] = useState<string>("ALL")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")
  const [sortBy, setSortBy] = useState<string>("alpha")
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [strandDropdownOpen, setStrandDropdownOpen] = useState(false)
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Animation state
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set())
  const prevStudentsRef = useRef<Set<string>>(new Set())

  const filteredStudents = useMemo(() => {
    const filtered = students.filter(student => {
      // 1. Search Logic (Name or LRN)
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
      const lrn = student.lrn || ""
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = fullName.includes(searchLower) || lrn.includes(searchLower)

      // 2. Strand Logic
      const matchesStrand = strandFilter === "ALL" || student.strand === strandFilter

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

      return matchesSearch && matchesStrand && matchesCategory
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
  }, [students, searchTerm, strandFilter, categoryFilter, sortBy])

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
    
    // Detect new students
    const newIds = Array.from(currentIds).filter(id => !prevIds.has(id))
    
    if (newIds.length > 0) {
      setAnimatingIds(prev => {
        const next = new Set(prev)
        newIds.forEach(id => next.add(id))
        return next
      })
      
      // Remove animation class after duration
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
    categoryFilter, setCategoryFilter,
    filteredStudents,
    sortBy, setSortBy,
    sortDropdownOpen, setSortDropdownOpen,
    strandDropdownOpen, setStrandDropdownOpen,
    categoryDropdownOpen, setCategoryDropdownOpen,
    paginatedStudents,
    totalPages,
    currentPage, setCurrentPage,
    animatingIds
  }
}
