-- Fix Row Level Security policies for the attendance table
-- This ensures teachers and other authenticated clients can SELECT the records they just INSERTed,
-- preventing them from "poofing away" in the React UI after real-time events fire.

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.attendance;
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON public.attendance;
DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON public.attendance;
DROP POLICY IF EXISTS "Enable delete access for all authenticated users" ON public.attendance;

CREATE POLICY "Enable read access for all authenticated users" 
ON public.attendance FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert access for all authenticated users" 
ON public.attendance FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update access for all authenticated users" 
ON public.attendance FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Enable delete access for all authenticated users" 
ON public.attendance FOR DELETE 
TO authenticated 
USING (true);
