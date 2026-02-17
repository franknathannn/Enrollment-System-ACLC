import { useState, useCallback } from "react"

export function useStudentSelection(filteredStudents: any[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const toggleSelect = useCallback((id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]), [])
  
  const toggleSelectAll = useCallback((ids: string[]) => {
    // If there are ANY selections at all, clear everything
    if (selectedIds.length > 0) {
      setSelectedIds([]);
      return;
    }
    
    // Otherwise, select the current page
    setSelectedIds(ids);
  }, [selectedIds])

  return { selectedIds, setSelectedIds, toggleSelect, toggleSelectAll }
}