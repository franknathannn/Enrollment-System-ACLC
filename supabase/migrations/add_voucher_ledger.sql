-- Create voucher_ledger table
CREATE TABLE IF NOT EXISTS public.voucher_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_year text NOT NULL,
  grade_level text NOT NULL CHECK (grade_level = ANY (ARRAY['11', '12'])),
  student_category text NOT NULL,
  voucher_amount integer NOT NULL,
  strand text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT voucher_ledger_student_year_unique UNIQUE (student_id, school_year)
);

-- Enable RLS
ALTER TABLE public.voucher_ledger ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read for admins and registrars" ON public.voucher_ledger;
DROP POLICY IF EXISTS "Allow write for admins only" ON public.voucher_ledger;

-- Create policies matching standard admin restrictions
CREATE POLICY "Allow read for admins and registrars" 
  ON public.voucher_ledger 
  FOR SELECT 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()));

CREATE POLICY "Allow write for admins only" 
  ON public.voucher_ledger 
  FOR ALL 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()));

-- Sync trigger function to auto-populate the ledger
CREATE OR REPLACE FUNCTION public.sync_student_voucher_ledger()
RETURNS TRIGGER AS $$
DECLARE
  v_g12_sy text;
  v_rate_11 int;
  v_rate_12 int;
  v_g11_sy text;
  v_existing_g11_sy text;
BEGIN
  -- Only track accepted/approved students
  IF NEW.status NOT IN ('Accepted', 'Approved') THEN
    DELETE FROM public.voucher_ledger WHERE student_id = NEW.id;
    RETURN NEW;
  END IF;

  -- 1. If Grade 11
  IF NEW.grade_level = '11' THEN
    -- Resolve rate for G11
    SELECT COALESCE(amount, 22500) INTO v_rate_11 
    FROM public.voucher_rates 
    WHERE student_category = NEW.student_category AND school_year = NEW.school_year;
    
    IF v_rate_11 IS NULL THEN v_rate_11 := 22500; END IF;
    IF NEW.is_transferee AND NEW.prior_voucher_amount IS NOT NULL THEN
      v_rate_11 := LEAST(v_rate_11, NEW.prior_voucher_amount);
    END IF;

    INSERT INTO public.voucher_ledger (student_id, school_year, grade_level, student_category, voucher_amount, strand)
    VALUES (NEW.id, NEW.school_year, '11', COALESCE(NEW.student_category, 'JHS Graduate'), v_rate_11, NEW.strand)
    ON CONFLICT (student_id, school_year) 
    DO UPDATE SET 
      grade_level = '11', 
      student_category = EXCLUDED.student_category, 
      voucher_amount = EXCLUDED.voucher_amount, 
      strand = EXCLUDED.strand;

  -- 2. If Grade 12
  ELSIF NEW.grade_level = '12' THEN
    -- Check if they have an existing G11 ledger row
    SELECT school_year INTO v_existing_g11_sy
    FROM public.voucher_ledger
    WHERE student_id = NEW.id AND grade_level = '11'
    LIMIT 1;

    IF v_existing_g11_sy IS NOT NULL THEN
      -- Promoted G12: their G12 year is G11 year + 1
      v_g12_sy := (split_part(v_existing_g11_sy, '-', 1)::int + 1)::text || '-' || (split_part(v_existing_g11_sy, '-', 2)::int + 1)::text;
      v_g11_sy := v_existing_g11_sy;
    ELSE
      -- Check if they are transferee/entered directly as G12
      v_g12_sy := NEW.school_year;
      v_g11_sy := NULL;
    END IF;

    -- Resolve rate for G12
    SELECT COALESCE(amount, 22500) INTO v_rate_12 
    FROM public.voucher_rates 
    WHERE student_category = NEW.student_category AND school_year = v_g12_sy;
    
    IF v_rate_12 IS NULL THEN v_rate_12 := 22500; END IF;
    IF NEW.is_transferee AND NEW.prior_voucher_amount IS NOT NULL THEN
      v_rate_12 := LEAST(v_rate_12, NEW.prior_voucher_amount);
    END IF;

    -- Upsert G12 record
    INSERT INTO public.voucher_ledger (student_id, school_year, grade_level, student_category, voucher_amount, strand)
    VALUES (NEW.id, v_g12_sy, '12', COALESCE(NEW.student_category, 'JHS Graduate'), v_rate_12, NEW.strand)
    ON CONFLICT (student_id, school_year) 
    DO UPDATE SET 
      grade_level = '12', 
      student_category = EXCLUDED.student_category, 
      voucher_amount = EXCLUDED.voucher_amount, 
      strand = EXCLUDED.strand;

    -- Upsert G11 record if they had one
    IF v_g11_sy IS NOT NULL THEN
      SELECT COALESCE(amount, 22500) INTO v_rate_11 
      FROM public.voucher_rates 
      WHERE student_category = NEW.student_category AND school_year = v_g11_sy;
      
      IF v_rate_11 IS NULL THEN v_rate_11 := 22500; END IF;
      IF NEW.is_transferee AND NEW.prior_voucher_amount IS NOT NULL THEN
        v_rate_11 := LEAST(v_rate_11, NEW.prior_voucher_amount);
      END IF;

      INSERT INTO public.voucher_ledger (student_id, school_year, grade_level, student_category, voucher_amount, strand)
      VALUES (NEW.id, v_g11_sy, '11', COALESCE(NEW.student_category, 'JHS Graduate'), v_rate_11, NEW.strand)
      ON CONFLICT (student_id, school_year) 
      DO UPDATE SET 
        grade_level = '11', 
        student_category = EXCLUDED.student_category, 
        voucher_amount = EXCLUDED.voucher_amount, 
        strand = EXCLUDED.strand;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS trg_sync_student_voucher_ledger ON public.students;
CREATE TRIGGER trg_sync_student_voucher_ledger
AFTER INSERT OR UPDATE OF status, grade_level, school_year, student_category, prior_voucher_amount, is_transferee, strand
ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_voucher_ledger();

-- Backfill/re-fire trigger for all existing active/approved students
UPDATE public.students 
SET status = status 
WHERE status IN ('Accepted', 'Approved');
