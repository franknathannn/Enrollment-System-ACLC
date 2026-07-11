-- -----------------------------------------------------------------------------
-- SEED SCRIPT: DepEd Senior High School Curriculum
-- This script safely injects the standard SHS subjects into the database.
-- -----------------------------------------------------------------------------

-- 1. Insert Curricula
INSERT INTO public.curricula (code, name) VALUES
  ('k12_2016', 'K-12 Strand System (2016)'),
  ('sshs_2026', 'Senior High School (2026)')
ON CONFLICT (code) DO NOTHING;

-- Retrieve the curriculum UUIDs
DO $$
DECLARE
  k12_id UUID;
  sshs_id UUID;
BEGIN
  SELECT id INTO k12_id FROM public.curricula WHERE code = 'k12_2016';
  SELECT id INTO sshs_id FROM public.curricula WHERE code = 'sshs_2026';

  -- 2. Insert Core Subjects (Common for all strands)
  INSERT INTO public.subjects (curriculum_id, code, name, type, units) VALUES
    (k12_id, 'CORE_ORAL', 'Oral Communication in Context', 'Core', 1.0),
    (k12_id, 'CORE_KWF', 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', 'Core', 1.0),
    (k12_id, 'CORE_GMATH', 'General Mathematics', 'Core', 1.0),
    (k12_id, 'CORE_EARTH', 'Earth and Life Science', 'Core', 1.0),
    (k12_id, 'CORE_UCSP', 'Understanding Culture, Society, and Politics', 'Core', 1.0),
    (k12_id, 'CORE_PEH1', 'Physical Education and Health 1', 'Core', 1.0),
    (k12_id, 'CORE_RW', 'Reading and Writing Skills', 'Core', 1.0),
    (k12_id, 'CORE_STAT', 'Statistics and Probability', 'Core', 1.0)
  ON CONFLICT (curriculum_id, code) DO NOTHING;

  -- 3. Insert Applied Subjects
  INSERT INTO public.subjects (curriculum_id, code, name, type, units) VALUES
    (k12_id, 'APP_EAPP', 'English for Academic and Professional Purposes', 'Applied', 1.0),
    (k12_id, 'APP_PR1', 'Practical Research 1', 'Applied', 1.0),
    (k12_id, 'APP_PR2', 'Practical Research 2', 'Applied', 1.0),
    (k12_id, 'APP_ENTREP', 'Entrepreneurship', 'Applied', 1.0),
    (k12_id, 'APP_ICT', 'Empowerment Technologies', 'Applied', 1.0)
  ON CONFLICT (curriculum_id, code) DO NOTHING;

  -- 4. Insert Specialized Subjects (ICT)
  INSERT INTO public.subjects (curriculum_id, code, name, type, units) VALUES
    (k12_id, 'SPEC_ICT_PROG', 'Computer Programming', 'Specialized (ICT)', 1.0),
    (k12_id, 'SPEC_ICT_CSS', 'Computer Systems Servicing', 'Specialized (ICT)', 1.0),
    (k12_id, 'SPEC_ICT_ANIM', 'Animation', 'Specialized (ICT)', 1.0)
  ON CONFLICT (curriculum_id, code) DO NOTHING;

  -- 5. Insert Specialized Subjects (GAS)
  INSERT INTO public.subjects (curriculum_id, code, name, type, units) VALUES
    (k12_id, 'SPEC_GAS_HUM', 'Humanities 1', 'Specialized (GAS)', 1.0),
    (k12_id, 'SPEC_GAS_SS', 'Social Science 1', 'Specialized (GAS)', 1.0),
    (k12_id, 'SPEC_GAS_ORG', 'Organization and Management', 'Specialized (GAS)', 1.0),
    (k12_id, 'SPEC_GAS_DRRR', 'Disaster Readiness and Risk Reduction', 'Specialized (GAS)', 1.0)
  ON CONFLICT (curriculum_id, code) DO NOTHING;

END $$;
