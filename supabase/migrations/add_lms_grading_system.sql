-- -----------------------------------------------------------------------------
-- MIGRATION: Add lms_grading_system to sections
-- -----------------------------------------------------------------------------

ALTER TABLE public.sections 
ADD COLUMN IF NOT EXISTS lms_grading_system TEXT DEFAULT 'Quarterly';

-- Update any existing sections to ensure they have the default value
UPDATE public.sections 
SET lms_grading_system = 'Quarterly' 
WHERE lms_grading_system IS NULL;
