-- 1. Add tuition_fee column to system_config (defaulting to 22500)
ALTER TABLE public.system_config ADD COLUMN IF NOT EXISTS tuition_fee integer DEFAULT 22500;

-- 2. Add is_payee column to students (defaulting to false)
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_payee boolean DEFAULT false;

-- 3. Create student_balances table for tracking additional fees
CREATE TABLE IF NOT EXISTS public.student_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  fee_name text NOT NULL,
  amount integer NOT NULL,
  school_year text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_balances ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists
DROP POLICY IF EXISTS "Allow read for admins and registrars" ON public.student_balances;
DROP POLICY IF EXISTS "Allow write for admins only" ON public.student_balances;

-- Recreate RLS policies
CREATE POLICY "Allow read for admins and registrars" 
  ON public.student_balances 
  FOR SELECT 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()));

CREATE POLICY "Allow write for admins only" 
  ON public.student_balances 
  FOR ALL 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()));

-- 4. Update sync_student_voucher_ledger trigger to force 0 voucher amount if is_payee is true
CREATE OR REPLACE FUNCTION public.sync_student_voucher_ledger()
RETURNS TRIGGER AS $$
DECLARE
  v_g12_sy text;
  v_rate_11 int;
  v_rate_12 int;
  v_g11_sy text;
  v_existing_g11_sy text;
  v_effective_category text;
BEGIN
  -- Only track accepted/approved students
  IF NEW.status NOT IN ('Accepted', 'Approved') THEN
    DELETE FROM public.voucher_ledger WHERE student_id = NEW.id;
    RETURN NEW;
  END IF;

  -- Use the Admin's verified voucher_status. If null, fallback to their enrollment category.
  v_effective_category := COALESCE(NEW.voucher_status, NEW.student_category, 'JHS Graduate');

  -- 1. If Grade 11
  IF NEW.grade_level = '11' THEN
    IF NEW.is_payee = true THEN
      v_rate_11 := 0;
    ELSE
      SELECT COALESCE(amount, 22500) INTO v_rate_11 
      FROM public.voucher_rates 
      WHERE student_category = v_effective_category AND school_year = NEW.school_year;
      
      IF v_rate_11 IS NULL THEN v_rate_11 := 22500; END IF;
      IF NEW.is_transferee AND NEW.prior_voucher_amount IS NOT NULL THEN
        v_rate_11 := LEAST(v_rate_11, NEW.prior_voucher_amount);
      END IF;
    END IF;

    INSERT INTO public.voucher_ledger (student_id, school_year, grade_level, student_category, voucher_amount, strand)
    VALUES (NEW.id, NEW.school_year, '11', v_effective_category, v_rate_11, NEW.strand)
    ON CONFLICT (student_id, school_year) 
    DO UPDATE SET 
      grade_level = '11', 
      student_category = EXCLUDED.student_category, 
      voucher_amount = EXCLUDED.voucher_amount, 
      strand = EXCLUDED.strand;

  -- 2. If Grade 12
  ELSIF NEW.grade_level = '12' THEN
    SELECT school_year INTO v_existing_g11_sy
    FROM public.voucher_ledger
    WHERE student_id = NEW.id AND grade_level = '11'
    LIMIT 1;

    IF v_existing_g11_sy IS NOT NULL THEN
      v_g12_sy := (split_part(v_existing_g11_sy, '-', 1)::int + 1)::text || '-' || (split_part(v_existing_g11_sy, '-', 2)::int + 1)::text;
      v_g11_sy := v_existing_g11_sy;
    ELSE
      v_g12_sy := NEW.school_year;
      v_g11_sy := NULL;
    END IF;

    IF NEW.is_payee = true THEN
      v_rate_12 := 0;
    ELSE
      SELECT COALESCE(amount, 22500) INTO v_rate_12 
      FROM public.voucher_rates 
      WHERE student_category = v_effective_category AND school_year = v_g12_sy;
      
      IF v_rate_12 IS NULL THEN v_rate_12 := 22500; END IF;
      IF NEW.is_transferee AND NEW.prior_voucher_amount IS NOT NULL THEN
        v_rate_12 := LEAST(v_rate_12, NEW.prior_voucher_amount);
      END IF;
    END IF;

    INSERT INTO public.voucher_ledger (student_id, school_year, grade_level, student_category, voucher_amount, strand)
    VALUES (NEW.id, v_g12_sy, '12', v_effective_category, v_rate_12, NEW.strand)
    ON CONFLICT (student_id, school_year) 
    DO UPDATE SET 
      grade_level = '12', 
      student_category = EXCLUDED.student_category, 
      voucher_amount = EXCLUDED.voucher_amount, 
      strand = EXCLUDED.strand;

    IF v_g11_sy IS NOT NULL THEN
      IF NEW.is_payee = true THEN
        v_rate_11 := 0;
      ELSE
        SELECT COALESCE(amount, 22500) INTO v_rate_11 
        FROM public.voucher_rates 
        WHERE student_category = v_effective_category AND school_year = v_g11_sy;
        
        IF v_rate_11 IS NULL THEN v_rate_11 := 22500; END IF;
        IF NEW.is_transferee AND NEW.prior_voucher_amount IS NOT NULL THEN
          v_rate_11 := LEAST(v_rate_11, NEW.prior_voucher_amount);
        END IF;
      END IF;

      INSERT INTO public.voucher_ledger (student_id, school_year, grade_level, student_category, voucher_amount, strand)
      VALUES (NEW.id, v_g11_sy, '11', v_effective_category, v_rate_11, NEW.strand)
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

-- Update trigger fields
DROP TRIGGER IF EXISTS trg_sync_student_voucher_ledger ON public.students;
CREATE TRIGGER trg_sync_student_voucher_ledger
AFTER INSERT OR UPDATE OF status, grade_level, school_year, student_category, prior_voucher_amount, is_transferee, strand, voucher_status, is_payee
ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_voucher_ledger();

-- Re-fire sync for active students
UPDATE public.students SET status = status WHERE status IN ('Accepted', 'Approved');
