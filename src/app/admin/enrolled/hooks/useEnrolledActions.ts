// c:\Users\Nath\Documents\Enrollment System\enrollment-system\src\app\admin\enrolled\hooks\useEnrolledActions.ts

import { useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { updateApplicantStatus } from "@/lib/actions/applicants"

export function useEnrolledActions({ setStudents }: { setStudents: React.Dispatch<React.SetStateAction<any[]>> }) {
  
  const updateStudentProfile = useCallback(async (id: string, updates: any) => {
    try {
      // 1. Sanitize the payload: Remove system fields that shouldn't be manually updated
      //    and ensure we aren't sending the entire object back if it has joined data.
      const { 
        id: _id, 
        created_at, 
        updated_at, 
        profile_picture, 
        two_by_two_url,
        profile_2x2_url,
        _file, // Extract the file object
        ...cleanUpdates 
      } = updates

      let finalProfileUrl = profile_picture || two_by_two_url || profile_2x2_url;

      // 1.5 Handle File Upload if present
      if (_file) {
        const fileExt = _file.name.split('.').pop();
        const fileName = `${id}-${Math.random()}.${fileExt}`;
        const filePath = `profiles/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars') // Assuming 'avatars' bucket exists
          .upload(filePath, _file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
          
        finalProfileUrl = publicUrl;
        
        // Update URL fields
        (cleanUpdates as any).profile_picture = finalProfileUrl;
        (cleanUpdates as any).two_by_two_url = finalProfileUrl;
      }

      // 2. Perform the update
      const { error } = await supabase
        .from('students')
        .update(cleanUpdates)
        .eq('id', id)

      if (error) throw error

      // 3. Optimistic update in local state
      setStudents(prev => prev.map(s => s.id === id ? { ...s, ...cleanUpdates, profile_picture: finalProfileUrl } : s))
      return true
    } catch (error: any) {
      console.error("Update error:", error.message || error)
      throw error // Re-throw to let the UI handle the error state
    }
  }, [setStudents])

  const resetStudentToPending = useCallback(async (student: any) => {
    const toastId = toast.loading(`Resetting ${student.first_name}...`)
    try {
      // Optimistically remove from the 'enrolled' list
      setStudents(prev => prev.filter(s => s.id !== student.id))
      
      const result = await updateApplicantStatus(student.id, 'Pending')
      if (result.success) {
        toast.success(`Moved ${student.first_name} ${student.last_name} back to Pending queue`, { id: toastId })
      } else {
        throw new Error("Failed to reset student status.")
      }
    } catch (error: any) {
      console.error("Reset error:", error.message || error)
      toast.error("Failed to reset student.", { id: toastId })
      // Re-add student if the server action fails
      setStudents(prev => [...prev, student].sort((a, b) => a.last_name.localeCompare(b.last_name)))
    }
  }, [setStudents])

  return { updateStudentProfile, resetStudentToPending }
}
