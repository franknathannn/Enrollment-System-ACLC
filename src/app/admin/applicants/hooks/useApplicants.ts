import { supabase } from "@/lib/supabase/client"
import { useEffect, useCallback, useMemo } from "react"
import { downloadApplicantsExcel } from "../api/exportApplicants"
import { useStudentData } from "./useStudentData"
import { useStudentUI } from "./useStudentUI"
import { useStudentFiltering } from "./useStudentFiltering"
import { useStudentSelection } from "./useStudentSelection"
import { useStudentActions } from "./useStudentActions"

export function useApplicants() {
  // 1. Data Layer
  const { students, setStudents, config, loading, fetchStudents, strandStats, fetchStrandStats } = useStudentData()

  // 2. Actions Layer (Needs to be initialized early for processingIds)
  // We'll pass the full dependencies later, but we need the refs/state now
  // Actually, we can just initialize it. It needs selectedIds which comes from Selection Layer.
  // But Selection Layer needs FilteredStudents which comes from Filtering Layer.
  // And Filtering Layer needs ProcessingIds from Actions Layer.
  // This circular dependency is solved by lifting state or careful ordering.
  // Here, we will initialize Actions first, but pass the selection state later via function arguments or by re-rendering.
  // However, hooks must be called in order.
  // Let's use a placeholder for selectedIds in the initial call if needed, but `useStudentActions` uses `selectedIds` in callbacks, so it reads the current value from the closure/ref if we pass it.
  
  // To break the cycle:
  // Actions -> provides processingIds, hiddenRows, exitingRows
  // Filtering -> uses processingIds, hiddenRows, exitingRows -> provides filteredStudents
  // Selection -> uses filteredStudents -> provides selectedIds
  // Actions -> uses selectedIds (for bulk)

  // We can't pass `selectedIds` to `useStudentActions` during initialization if `useStudentSelection` hasn't run.
  // But `useStudentActions` only needs `selectedIds` when a function is CALLED.
  // So we can pass `selectedIds` to the hook, but we need to define `selectedIds` state first?
  // No, `useStudentSelection` defines the state.
  
  // Workaround: Define selection state manually here or split `useStudentSelection`?
  // Better: `useStudentActions` will accept `selectedIds` as a prop.
  // But we can't call `useStudentSelection` before `useStudentFiltering`.
  // And `useStudentFiltering` needs `useStudentActions` state.
  
  // Solution: We will use `useStudentActions` to get the state, then `useStudentFiltering`, then `useStudentSelection`.
  // Then we will pass `selectedIds` to the *functions* returned by `useStudentActions`? 
  // Or we just pass `selectedIds` to `useStudentActions` and accept that on the very first render it might be undefined/empty (which is fine).
  // Wait, we can't use a variable before it's defined.
  
  // Let's split the `useStudentActions` hook? No.
  // We will define `selectedIds` state here in the parent? No, that defeats the purpose.
  // We will use `useStudentActions` *after* selection, but `useStudentFiltering` needs `processingIds`.
  // Okay, we will split `useStudentActions` state (processingIds) from the handlers.
  // Actually, `useStudentActions` manages `processingIds`.
  // Let's just instantiate `useStudentActions` with empty selectedIds initially? No, hooks don't work like that.
  
  // Real Solution: `useStudentActions` does NOT need `selectedIds` to be passed to the hook itself if we pass it to the functions.
  // But `useStudentActions` in my implementation takes `selectedIds` as a prop.
  // I will modify `useStudentActions` to NOT take `selectedIds` in the hook props, but use a ref or pass it to functions?
  // Actually, I'll just use `useStudentSelection` *before* `useStudentActions`?
  // `useStudentSelection` needs `filteredStudents`.
  // `useStudentFiltering` needs `processingIds`.
  // `useStudentActions` provides `processingIds`.
  
  // Okay, the cycle is: Actions(State) -> Filtering -> Selection -> Actions(Handlers).
  // I will instantiate Actions first. It will have access to `selectedIds` because I will pass the `selectedIds` from `useStudentSelection` (which I will call later) to it? No, that's impossible in JS.
  
  // I will modify `useStudentActions` to accept `selectedIds` in the function calls? 
  // Or I will move `processingIds` state to `useApplicants` (here).
  // Let's move `processingIds`, `hiddenRows`, `exitingRows` state here.
  
  // Actually, let's look at `useStudentActions`. It uses `selectedIds` in `processBulkUpdate` and `processBulkDelete`.
  // I can just pass `selectedIds` to those functions when I call them in the UI.
  // But `useStudentActions` is a hook.
  
  // Let's stick to the plan: `useStudentActions` manages the complex state.
  // I will pass `selectedIds` to `useStudentActions`.
  // But I can't define `selectedIds` before `useStudentFiltering`.
  // I will use a dummy variable for `selectedIds` in `useStudentActions`? No.
  
  // Let's re-order:
  // 1. Data (Students)
  // 2. Actions State (ProcessingIds, HiddenRows, ExitingRows) -> I'll extract this part or just use `useStudentActions` but ignore the bulk functions for a moment? No.
  
  // Let's just move `selectedIds` state to `useApplicants` (here) and pass it to both Selection and Actions hooks.
  // That solves the dependency cycle.
  
  // 3. Selection State (SelectedIds) - Lifted here.
  // 4. Actions (Needs Students, SelectedIds)
  // 5. Filtering (Needs Students, ProcessingIds)
  // 6. UI (Needs Students, FilteredStudents)

  // Wait, `useStudentSelection` has logic `toggleSelectAll` which needs `filteredStudents`.
  // So Selection needs Filtering.
  // Filtering needs Actions (ProcessingIds).
  // Actions needs Selection (SelectedIds).
  
  // Cycle: Actions -> Filtering -> Selection -> Actions.
  
  // I will use `useStudentActions` to get `processingIds`. I will pass `selectedIds` (which is undefined initially?)
  // No, I will use a Ref for selectedIds that I pass to Actions?
  
  // Let's go with:
  // 1. Data
  // 2. UI (Modals)
  // 3. Actions (State & Handlers). I will pass `selectedIds` to it. But where do I get `selectedIds`?
  //    I will use `useStudentSelection` *after* `useStudentFiltering`.
  //    So `useStudentActions` needs `selectedIds` but it's defined later.
  //    I will modify `useStudentActions` to NOT take `selectedIds` in the hook params, but accept it in the function calls `processBulkUpdate(selectedIds, ...)`
  
  // Let's modify `useStudentActions` slightly in this file to pass `selectedIds` to the bulk functions.
  // Actually, I'll just keep `selectedIds` state in `useStudentSelection` and pass it to `useStudentActions`? No, I can't.
  
  // Okay, I will use `useStudentActions` *without* `selectedIds` in the hook props.
  // I will update `useStudentActions.ts` to remove `selectedIds` from props and add it to function arguments.
  
  // Wait, I already wrote `useStudentActions.ts` to take `selectedIds` in props.
  // I should rewrite `useStudentActions.ts` to take `selectedIds` in the function args.
  // But `useStudentActions` uses `setSelectedIds` to clear selection.
  
  // Okay, I will lift `selectedIds` state to `useApplicants`.
  // `const [selectedIds, setSelectedIds] = useState<string[]>([])`
  // Then I pass it to `useStudentActions` and `useStudentSelection`.
  // `useStudentSelection` will just contain the logic `toggleSelect` etc.
  
  // But `useStudentSelection` needs `filteredStudents` for `toggleSelectAll`.
  // `filteredStudents` comes from `useStudentFiltering`.
  // `useStudentFiltering` needs `processingIds` from `useStudentActions`.
  // `useStudentActions` needs `selectedIds` (which is now here).
  
  // So:
  // 1. `selectedIds` state (Here).
  // 2. `useStudentActions` (Pass `selectedIds`). Returns `processingIds`.
  // 3. `useStudentFiltering` (Pass `processingIds`). Returns `filteredStudents`.
  // 4. `useStudentSelection` (Pass `selectedIds`, `filteredStudents`). Returns togglers.
  
  // This works!
  // I need to modify `useStudentSelection` to accept `selectedIds` and `setSelectedIds` instead of creating them.
  
  // Let's modify `useStudentSelection.ts` first.
  
  // Wait, I can't modify the files I just created in the previous step in this thought block.
  // I have to assume I can overwrite them or I should have planned better.
  // I will overwrite `useStudentSelection.ts` in this response.

  // 1. `useStudentData`
  // 2. `useStudentUI`
  // 3. `useStudentActions` (Needs `selectedIds` state, which I'll lift).
  // 4. `useStudentFiltering`
  // 5. `useStudentSelection` (Needs `selectedIds` state and `filteredStudents`).

  const { 
    viewerOpen, setViewerOpen, viewingFile, setViewingFile, rotation, setRotation,
    declineModalOpen, setDeclineModalOpen, activeDeclineStudent, setActiveDeclineStudent,
    declineReason, setDeclineReason, bulkDeclineModalOpen, setBulkDeclineModalOpen,
    bulkDeleteModalOpen, setBulkDeleteModalOpen, deleteModalOpen, setDeleteModalOpen,
    activeDeleteStudent, setActiveDeleteStudent, openStudentDialog, setOpenStudentDialog,
    openDocumentViewer, navigateDocument, canNavigatePrev, canNavigateNext
  } = useStudentUI()
  //dsad
  
  // `useStudentUI` uses `filteredStudents` only for `selectedStudentForDialog`.
  // We can pass `filteredStudents` later? No, hooks.
  // We will pass `filteredStudents` to `useStudentUI` but `filteredStudents` is defined later.
  // We can move `selectedStudentForDialog` logic to `useApplicants` or `useStudentUI` but pass filteredStudents as a ref?
  // Or just move `selectedStudentForDialog` to `useApplicants`.
  
  // Let's move `selectedStudentForDialog` logic to `useApplicants` to solve that dependency.
  // `useStudentUI` will just handle the state.

  const modals = {
    setDeclineModalOpen, setDeleteModalOpen, setBulkDeclineModalOpen, setBulkDeleteModalOpen,
    setActiveDeclineStudent, setActiveDeleteStudent, setDeclineReason
  }

  const { 
    processingIds, processingIdsRef, exitingRows, setExitingRows, hiddenRows, setHiddenRows,
    handleStatusChange, handleConfirmDelete, processBulkUpdate, processBulkDelete, handleExit 
  } = useStudentActions({ students, setStudents, modals })

  const { 
    searchTerm, setSearchTerm, filter, setFilter, sortBy, setSortBy,
    sortDropdownOpen, setSortDropdownOpen, currentPage, setCurrentPage,
    filteredStudents, paginatedStudents, totalPages, animatingIds 
  } = useStudentFiltering({ students, processingIds, processingIdsRef, setHiddenRows, setExitingRows })

  const { selectedIds, setSelectedIds, toggleSelect, toggleSelectAll } = useStudentSelection(filteredStudents)

  // Realtime subscription
  useEffect(() => {
    fetchStudents()
    const channel = supabase.channel('admin_applicants_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        fetchStrandStats(); fetchStudents(true)
      })
      .on('broadcast', { event: 'student_update' }, () => {
        fetchStrandStats(); fetchStudents(true)
      })
      .subscribe((status) => { if (status === 'SUBSCRIBED') fetchStudents(true) })
    return () => { supabase.removeChannel(channel) }
  }, [fetchStudents, fetchStrandStats])

  // Derived state for dialog
  const selectedStudentForDialog = useMemo(() => {
    if (!openStudentDialog) return null
    return filteredStudents.find(s => s.id === openStudentDialog) || students.find(s => s.id === openStudentDialog)
  }, [openStudentDialog, filteredStudents, students])

  // Wrappers for bulk actions to inject selectedIds
  const handleBulkUpdateWrapper = useCallback((newStatus: string, feedback?: string) => {
    processBulkUpdate(selectedIds, setSelectedIds, newStatus, feedback)
  }, [processBulkUpdate, selectedIds, setSelectedIds])

  const handleBulkDeleteWrapper = useCallback(() => {
    processBulkDelete(selectedIds, setSelectedIds)
  }, [processBulkDelete, selectedIds, setSelectedIds])

  const handleBulkAction = useCallback((newStatus: string) => {
    if (newStatus === 'Rejected') setBulkDeclineModalOpen(true)
    else handleBulkUpdateWrapper(newStatus)
  }, [handleBulkUpdateWrapper, setBulkDeclineModalOpen])

  const exportToCSV = (type: string) => {
    downloadApplicantsExcel(type)
  }

  // Wrapper for delete confirmation to pass active student
  const handleConfirmDeleteWrapper = useCallback(() => {
    handleConfirmDelete(activeDeleteStudent)
  }, [handleConfirmDelete, activeDeleteStudent])

  return {
    loading, config, searchTerm, setSearchTerm, fetchStudents, exportToCSV,
    filter, setFilter, students, setSelectedIds, sortBy, setSortBy,
    sortDropdownOpen, setSortDropdownOpen, filteredStudents,
    selectedIds, toggleSelect, toggleSelectAll, hiddenRows, exitingRows,
    paginatedStudents, totalPages, currentPage, setCurrentPage,
    animatingIds, setOpenStudentDialog, handleExit, handleStatusChange, 
    setActiveDeclineStudent, setDeclineModalOpen, setActiveDeleteStudent, setDeleteModalOpen,
    strandStats, selectedStudentForDialog, openStudentDialog,
    viewerOpen, setViewerOpen, viewingFile, setViewingFile, rotation, setRotation,
    declineModalOpen, activeDeclineStudent, declineReason, setDeclineReason,
    bulkDeclineModalOpen, setBulkDeclineModalOpen,
    processBulkUpdate: handleBulkUpdateWrapper, deleteModalOpen, activeDeleteStudent, handleConfirmDelete: handleConfirmDeleteWrapper,
    bulkDeleteModalOpen, setBulkDeleteModalOpen, processBulkDelete: handleBulkDeleteWrapper, handleBulkAction,
    openDocumentViewer, navigateDocument, canNavigatePrev, canNavigateNext
  }
}
