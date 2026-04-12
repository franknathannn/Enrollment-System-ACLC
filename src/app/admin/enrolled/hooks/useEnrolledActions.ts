import { useCallback } from "react"
import { supabase } from "@/lib/supabase/admin-client"
import { toast } from "sonner"
import { updateApplicantStatus } from "@/lib/actions/applicants"

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

  return {
    updateStudentProfile,
    resetStudentToPending,
  }
}
