import { useState, useCallback, useRef, useEffect } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { updateApplicantStatus, deleteApplicant, bulkUpdateApplicantStatus, bulkDeleteApplicants } from "@/lib/actions/applicants"

interface ActionDependencies {
  students: any[]
  setStudents: React.Dispatch<React.SetStateAction<any[]>>
  modals: {
    setDeclineModalOpen: (open: boolean) => void
    setDeleteModalOpen: (open: boolean) => void
    setBulkDeclineModalOpen: (open: boolean) => void
    setBulkDeleteModalOpen: (open: boolean) => void
    setActiveDeclineStudent: (student: any) => void
    setActiveDeleteStudent: (student: any) => void
    setDeclineReason: (reason: string) => void
  }
}

export function useStudentActions({ students, setStudents, modals }: ActionDependencies) {
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const processingIdsRef = useRef<Set<string>>(new Set())
  const [exitingRows, setExitingRows] = useState<Record<string, boolean>>({})
  const [hiddenRows, setHiddenRows] = useState<Set<string>>(new Set())

  useEffect(() => {
    processingIdsRef.current = processingIds
  }, [processingIds])

  const handleExit = useCallback((id: string, callback: () => void) => {
    setExitingRows(prev => ({ ...prev, [id]: true }))
    setTimeout(() => {
      setHiddenRows(prev => { const next = new Set(prev); next.add(id); return next })
      callback()
    }, 300)
  }, [])

  const handleStatusChange = useCallback(async (studentId: string, name: string, status: any, feedback?: string) => {
    setProcessingIds(prev => { const next = new Set(prev); next.add(studentId); return next })
    const toastId = toast.loading(`⚡ Processing ...`)
    try {
      setExitingRows(prev => ({ ...prev, [studentId]: true }))
      await new Promise(resolve => setTimeout(resolve, 280))
      setHiddenRows(prev => { const next = new Set(prev); next.add(studentId); return next })
      const result = await updateApplicantStatus(studentId, status, feedback);
      if (result.success) {
        const { data: { user } } = await supabase.auth.getUser();    
        const student = students.find(s => s.id === studentId);
        const assignedSectionId = result.assignedSectionId;
        const assignedSectionName = result.assignedSection || 'Unassigned';
        const previousStatus = student?.status || 'Unknown';
        let description = "";
        if (status === 'Accepted' || status === 'Approved') {
          description = assignedSectionName !== 'Unassigned' 
            ? `Moved ${name} to ${status} status and assigned to ${assignedSectionName}` 
            : `Moved ${name} to ${status} status`;
        } else if (status === 'Rejected') {
          description = feedback 
            ? `Moved ${name} to Rejected status: ${feedback}` 
            : `Moved ${name} to Rejected status`;
        } else if (status === 'Pending') {
          description = `Moved ${name} back to Pending status from ${previousStatus}`;
        } else {
          description = `Changed ${name} status from ${previousStatus} to ${status}`;
        }
        await supabase.from('activity_logs').insert([{
          admin_id: user?.id,
          admin_name: user?.user_metadata?.username || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Authorized Admin',
          action_type: status.toUpperCase(),
          student_name: name,
          student_id: studentId,
          student_image: student?.two_by_two_url || student?.profile_2x2_url || student?.profile_picture,
          details: description
        }]);
        const successMsg = assignedSectionId 
          ? `Moved ${name} to ${status}${assignedSectionName !== 'Unassigned' ? ` → ${assignedSectionName}` : ''}` 
          : `Updated ${name} to ${status}`;
        toast.success(successMsg, { id: toastId })
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: status, section_id: assignedSectionId, section: assignedSectionName } : s))
        modals.setDeclineModalOpen(false); modals.setDeclineReason(""); modals.setActiveDeclineStudent(null)
      }
    } catch (err: any) {
      toast.error(`❌ ${err.message}`, { id: toastId })
      setExitingRows(prev => { const next = { ...prev }; delete next[studentId]; return next })
      setHiddenRows(prev => { const next = new Set(prev); next.delete(studentId); return next })
    } finally {
      setProcessingIds(prev => { const next = new Set(prev); next.delete(studentId); return next })
    }
  }, [students, modals, setStudents])

  const handleConfirmDelete = useCallback(async (activeDeleteStudent: any) => {
    if (!activeDeleteStudent) return;
    const studentId = activeDeleteStudent.id;
    const name = `${activeDeleteStudent.first_name} ${activeDeleteStudent.last_name}`;
    setProcessingIds(prev => { const next = new Set(prev); next.add(studentId); return next })
    const toastId = toast.loading(`🗑️ Purging ...`)
    try {
      setExitingRows(prev => ({ ...prev, [studentId]: true }))
      await new Promise(resolve => setTimeout(resolve, 280))
      setHiddenRows(prev => { const next = new Set(prev); next.add(studentId); return next })
      const result = await deleteApplicant(studentId);
      if (result.success) {
        setStudents(prev => prev.filter(s => s.id !== studentId));
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('activity_logs').insert([{
          admin_id: user?.id,
          admin_name: user?.user_metadata?.username || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Authorized Admin',
          action_type: 'DELETED',
          student_name: name,
          student_id: studentId,
          student_image: activeDeleteStudent?.two_by_two_url || activeDeleteStudent?.profile_2x2_url || activeDeleteStudent?.profile_picture,
          details: `Permanently deleted ${name} from the enrollment system`
        }]);
        toast.success(`Deleted ${name} from the system`, { id: toastId });
        modals.setDeleteModalOpen(false); modals.setActiveDeleteStudent(null);
      }
    } catch (err: any) {
      toast.error("❌ Delete failed", { id: toastId })
      setExitingRows(prev => { const next = { ...prev }; delete next[studentId]; return next })
      setHiddenRows(prev => { const next = new Set(prev); next.delete(studentId); return next })
    } finally {
      setProcessingIds(prev => { const next = new Set(prev); next.delete(studentId); return next })
    }
  }, [students, modals, setStudents])

  const processBulkUpdate = useCallback(async (selectedIds: string[], setSelectedIds: (ids: string[]) => void, newStatus: string, feedback?: string) => {
    setProcessingIds(prev => { const next = new Set(prev); selectedIds.forEach(id => next.add(id)); return next })
    const toastId = toast.loading(`⚡ Processing  students...`)
    try {
      setExitingRows(prev => { const next = { ...prev }; selectedIds.forEach(id => { next[id] = true }); return next })
      await new Promise(resolve => setTimeout(resolve, 280))
      setHiddenRows(prev => { const next = new Set(prev); selectedIds.forEach(id => next.add(id)); return next })
      const targetStatus = newStatus === 'Accepted' ? 'Approved' : newStatus
      const result = await bulkUpdateApplicantStatus(selectedIds, targetStatus, feedback);
      if (result.success) {
        const { data: { user } } = await supabase.auth.getUser();
        const selectedStudents = students.filter(s => selectedIds.includes(s.id));
        const successfulUpdates = result.results.filter(r => r.success);
        const logEntries = selectedStudents.map(s => {
          const update = successfulUpdates.find(u => u.id === s.id);
          const studentName = `${s.first_name} ${s.last_name}`;
          const assignedSection = update?.assignedSection || 'Unassigned';
          let details = "";
          if (newStatus === 'Accepted' || newStatus === 'Approved') {
            details = assignedSection !== 'Unassigned' 
              ? `Bulk moved ${studentName} to ${newStatus} and assigned to ${assignedSection}` 
              : `Bulk moved ${studentName} to ${newStatus} status`;
          } else if (newStatus === 'Pending') {
            details = `Bulk moved ${studentName} back to Pending status`;
          } else if (newStatus === 'Rejected') {
            details = feedback 
              ? `Bulk moved ${studentName} to Rejected: ${feedback}` 
              : `Bulk moved ${studentName} to Rejected status`;
          } else {
            details = `Bulk updated ${studentName} to ${newStatus}`;
          }
          return {
            admin_id: user?.id,
            admin_name: user?.user_metadata?.username || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Authorized Admin',
            action_type: newStatus.toUpperCase(),
            student_name: studentName,
            student_id: s.id,
            student_image: s.two_by_two_url || s.profile_2x2_url,
            details: details
          };
        });
        await supabase.from('activity_logs').insert(logEntries);
        setStudents(prev => prev.map(s => {
          const update = successfulUpdates.find(u => u.id === s.id);
          if (update) return { ...s, status: targetStatus, section_id: update.assignedSectionId || null, section: update.assignedSection || 'Unassigned' };
          return s;
        }));
        const count = successfulUpdates.length;
        const sectionInfo = successfulUpdates.some(u => u.assignedSection && u.assignedSection !== 'Unassigned') 
          ? ` → ${successfulUpdates.filter(u => u.assignedSection && u.assignedSection !== 'Unassigned').length} assigned to sections` 
          : '';
        toast.success(`${count} student${count !== 1 ? 's' : ''} moved to ${newStatus}${sectionInfo}`, { id: toastId })
        modals.setBulkDeclineModalOpen(false); modals.setDeclineReason("")
      }
    } catch (err: any) {
      toast.error("❌ Bulk action failed", { id: toastId })
      setExitingRows(prev => { const next = { ...prev }; selectedIds.forEach(id => delete next[id]); return next })
      setHiddenRows(prev => { const next = new Set(prev); selectedIds.forEach(id => next.delete(id)); return next })
    } finally {
      setSelectedIds([]); setExitingRows(prev => { const next = { ...prev }; selectedIds.forEach(id => delete next[id]); return next }); setHiddenRows(prev => { const next = new Set(prev); selectedIds.forEach(id => next.delete(id)); return next }); setProcessingIds(prev => { const next = new Set(prev); selectedIds.forEach(id => next.delete(id)); return next })
    }
  }, [students, modals, setStudents])

  const processBulkDelete = useCallback(async (selectedIds: string[], setSelectedIds: (ids: string[]) => void) => {
    setProcessingIds(prev => { const next = new Set(prev); selectedIds.forEach(id => next.add(id)); return next })
    const toastId = toast.loading(`🗑️ Purging  records...`)
    try {
      setExitingRows(prev => { const next = { ...prev }; selectedIds.forEach(id => { next[id] = true }); return next })
      await new Promise(resolve => setTimeout(resolve, 280))
      setHiddenRows(prev => { const next = new Set(prev); selectedIds.forEach(id => next.add(id)); return next })
      const { data: { user } } = await supabase.auth.getUser();
      const selectedStudents = students.filter(s => selectedIds.includes(s.id));
      const logEntries = selectedStudents.map(s => ({
        admin_id: user?.id,
        admin_name: user?.user_metadata?.username || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Authorized Admin',
        action_type: 'DELETED',
        student_name: `${s.first_name} ${s.last_name}`,
        student_id: s.id,
        student_image: s.two_by_two_url || s.profile_2x2_url,
        details: `Bulk deleted ${s.first_name} ${s.last_name} from the enrollment system`
      }));
      await Promise.all([bulkDeleteApplicants(selectedIds), supabase.from('activity_logs').insert(logEntries)])
      setStudents(prev => prev.filter(s => !selectedIds.includes(s.id)))
      toast.success(`${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''} permanently deleted`, { id: toastId })
      modals.setBulkDeleteModalOpen(false)
    } catch (err: any) {
      toast.error("❌ Bulk deletion failed", { id: toastId })
      setExitingRows(prev => { const next = { ...prev }; selectedIds.forEach(id => delete next[id]); return next })
      setHiddenRows(prev => { const next = new Set(prev); selectedIds.forEach(id => next.delete(id)); return next })
    } finally {
      setSelectedIds([]); setExitingRows(prev => { const next = { ...prev }; selectedIds.forEach(id => delete next[id]); return next }); setHiddenRows(prev => { const next = new Set(prev); selectedIds.forEach(id => next.delete(id)); return next }); setProcessingIds(prev => { const next = new Set(prev); selectedIds.forEach(id => next.delete(id)); return next })
    }
  }, [students, modals, setStudents])

  return {
    processingIds, processingIdsRef,
    exitingRows, setExitingRows,
    hiddenRows, setHiddenRows,
    handleStatusChange,
    handleConfirmDelete,
    processBulkUpdate,
    processBulkDelete,
    handleExit
  }
}