ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('Male', 'Female'));
