-- Add allow_student_edit toggle to system_config
ALTER TABLE public.system_config
  ADD COLUMN IF NOT EXISTS allow_student_edit boolean NOT NULL DEFAULT false;

-- Allow students to update their own record in the students table.
-- Students authenticate via Supabase Auth; their auth.uid() matches students.id.
-- Only the fields the student dashboard exposes are sent in the payload —
-- admin-only fields (status, section, grade_level, etc.) are never touched by the client code.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'students'
      AND policyname = 'Students can update their own record'
  ) THEN
    CREATE POLICY "Students can update their own record"
      ON public.students
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END
$$;
