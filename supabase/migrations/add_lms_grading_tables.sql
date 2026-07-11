-- -----------------------------------------------------------------------------
-- MIGRATION: Dual-Curriculum LMS Schema (K-12 Strand System & SSHS)
-- -----------------------------------------------------------------------------

CREATE TABLE public.curricula (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  curriculum_id UUID NOT NULL REFERENCES public.curricula(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  units NUMERIC(3,1) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(curriculum_id, code)
);

CREATE TABLE public.student_subject_enrollment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  school_year TEXT NOT NULL,
  term TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, school_year, term)
);

CREATE TABLE public.teacher_subject_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  school_year TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, section_id, school_year)
);

CREATE TABLE public.grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.student_subject_enrollment(id) ON DELETE CASCADE,
  q1 NUMERIC(5,2),
  q2 NUMERIC(5,2),
  q3 NUMERIC(5,2),
  q4 NUMERIC(5,2),
  final_rating NUMERIC(5,2),
  remarks TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id)
);

CREATE TABLE public.lms_core_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_year TEXT NOT NULL,
  core_value TEXT NOT NULL,
  behavior_statement TEXT NOT NULL,
  q1 TEXT,
  q2 TEXT,
  q3 TEXT,
  q4 TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, school_year, core_value, behavior_statement)
);

-- RLS
ALTER TABLE public.curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subject_enrollment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_core_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.curricula FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.student_subject_enrollment FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.teacher_subject_assignments FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.grades FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.lms_core_values FOR SELECT USING (true);
