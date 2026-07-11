-- -----------------------------------------------------------------------------
-- MIGRATION: Add INSERT/UPDATE/DELETE policies for LMS tables
-- -----------------------------------------------------------------------------

-- Allow authenticated users (Admins/Teachers) to insert, update, and delete.
-- In a real production app, you might want to restrict this further (e.g., only admins can add subjects).

CREATE POLICY "Enable insert access for all users" ON public.curricula FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.curricula FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.curricula FOR DELETE USING (true);

CREATE POLICY "Enable insert access for all users" ON public.subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.subjects FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.subjects FOR DELETE USING (true);

CREATE POLICY "Enable insert access for all users" ON public.student_subject_enrollment FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.student_subject_enrollment FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.student_subject_enrollment FOR DELETE USING (true);

CREATE POLICY "Enable insert access for all users" ON public.teacher_subject_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.teacher_subject_assignments FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.teacher_subject_assignments FOR DELETE USING (true);

CREATE POLICY "Enable insert access for all users" ON public.grades FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.grades FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.grades FOR DELETE USING (true);

CREATE POLICY "Enable insert access for all users" ON public.lms_core_values FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.lms_core_values FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.lms_core_values FOR DELETE USING (true);
