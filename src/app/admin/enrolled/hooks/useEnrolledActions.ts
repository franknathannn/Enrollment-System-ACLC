import { useCallback } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import { toast } from "sonner"
import { updateApplicantStatus } from "@/lib/actions/applicants"

// ── A "try" is consumed when a request is REVIEWED (Approved OR Rejected).
// ── Pending requests have not been reviewed yet, so they don't count.
const MAX_TRIES = 3

export function useEnrolledActions({ setStudents }: { setStudents: React.Dispatch<React.SetStateAction<any[]>> }) {

  const updateStudentProfile = useCallback(async (id: string, updates: any) => {
    try {
      const {
        id: _id, created_at, updated_at,
        profile_picture, two_by_two_url, profile_2x2_url,
        _file, ...cleanUpdates
      } = updates

      let finalProfileUrl = profile_picture || two_by_two_url || profile_2x2_url

      if (_file) {
        const fileExt = _file.name.split('.').pop()
        const fileName = `${id}-${Math.random()}.${fileExt}`
        const filePath = `profiles/${fileName}`
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, _file)
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
        finalProfileUrl = publicUrl
        ;(cleanUpdates as any).profile_picture = finalProfileUrl
        ;(cleanUpdates as any).two_by_two_url  = finalProfileUrl
      }

      const { error } = await supabase.from('students').update(cleanUpdates).eq('id', id)
      if (error) throw error
      setStudents(prev => prev.map(s => s.id === id ? { ...s, ...cleanUpdates, profile_picture: finalProfileUrl } : s))
      return true
    } catch (error: any) {
      console.error("Update error:", error.message || error)
      throw error
    }
  }, [setStudents])

  const resetStudentToPending = useCallback(async (student: any) => {
    const toastId = toast.loading(`Resetting ${student.first_name}...`)
    try {
      setStudents(prev => prev.filter(s => s.id !== student.id))
      const result = await updateApplicantStatus(student.id, 'Pending')
      if (result.success) {
        toast.success(`Moved ${student.first_name} ${student.last_name} back to Pending queue`, { id: toastId })
      } else {
        throw new Error("Failed to reset student status.")
      }
    } catch {
      toast.error("Failed to reset student.", { id: toastId })
      setStudents(prev => [...prev, student].sort((a, b) => a.last_name.localeCompare(b.last_name)))
    }
  }, [setStudents])



  // ── Approve re-enrollment ─────────────────────────────────────────────────
  // Server-side: count reviewed (Approved+Rejected) requests to guard tries.
  // Uses the `decline_reason` field from the students table to communicate
  // the try number and instructions to the student on their status page.
  const approveEditRequest = useCallback(async (student: any, requestId: string) => {
    const toastId = toast.loading(`Approving re-enrollment for ${student.first_name}…`)
    try {
      // Count ALL reviewed requests (Approved + Rejected = tries consumed)
      const { count, error: countErr } = await supabase
        .from('edit_requests')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', student.id)
        .in('status', ['Approved', 'Rejected'])

      if (countErr) throw countErr

      const consumed   = count ?? 0
      const triesAfter = consumed + 1

      if (consumed >= MAX_TRIES) {
        toast.error(
          `${student.first_name} has already used all ${MAX_TRIES} tries (approvals + rejections combined).`,
          { id: toastId }
        )
        return
      }

      // Mark edit_request as Approved
      const { error: reqErr } = await supabase
        .from('edit_requests')
        .update({ status: 'Approved', updated_at: new Date().toISOString() })
        .eq('id', requestId)
      if (reqErr) throw reqErr

      // Set student → Rejected + unlocked so they can re-submit (data pre-filled).
      // The decline_reason field is shown on the student's status page as feedback.
      const remainingAfter = MAX_TRIES - triesAfter
      const { error: stuErr } = await supabase
        .from('students')
        .update({
          status:         'Rejected',
          is_locked:      false,
          decline_reason: remainingAfter > 0
            ? `Your re-enrollment request has been approved (Try ${triesAfter} of ${MAX_TRIES}). You have ${remainingAfter} tr${remainingAfter===1?"y":"ies"} remaining. Please re-submit your enrollment form — your existing information has been pre-filled. Make the necessary corrections and submit again.`
            : `Your re-enrollment request has been approved (Try ${triesAfter} of ${MAX_TRIES}). This is your LAST try. Please re-submit your enrollment form carefully — your existing information has been pre-filled. No further re-enrollment requests will be accepted after this.`,
        })
        .eq('id', student.id)
      if (stuErr) throw stuErr

      setStudents(prev => prev.filter(s => s.id !== student.id))
      toast.success(
        `Re-enrollment approved — ${student.first_name} can now re-submit (try ${triesAfter}/${MAX_TRIES}).`,
        { id: toastId }
      )
    } catch (err: any) {
      console.error("approveEditRequest:", err)
      toast.error("Failed to approve edit request.", { id: toastId })
    }
  }, [setStudents])

  // ── Reject request — also consumes a try ─────────────────────────────────
  const denyEditRequest = useCallback(async (student: any, requestId: string) => {
    const toastId = toast.loading(`Rejecting request…`)
    try {
      const { error } = await supabase
        .from('edit_requests')
        .update({ status: 'Rejected', updated_at: new Date().toISOString() })
        .eq('id', requestId)
      if (error) throw error
      toast.success(`Request rejected for ${student.first_name}.`, { id: toastId })
    } catch {
      toast.error("Failed to reject request.", { id: toastId })
    }
  }, [])

  return {
    updateStudentProfile,
    resetStudentToPending,
    approveEditRequest,
    denyEditRequest,
  }
}