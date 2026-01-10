import { useState, useCallback } from "react"

export function useStudentSelection(filteredStudents: any[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const toggleSelect = useCallback((id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]), [])
  
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === filteredStudents.length) setSelectedIds([])
    else setSelectedIds(filteredStudents.map(s => s.id))
  }, [selectedIds.length, filteredStudents])

  return { selectedIds, setSelectedIds, toggleSelect, toggleSelectAll }
}