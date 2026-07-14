-- Create voucher_rates table
CREATE TABLE IF NOT EXISTS public.voucher_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_category text NOT NULL,
  school_year text NOT NULL,
  amount integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT voucher_rates_category_sy_unique UNIQUE (student_category, school_year)
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_year text NOT NULL,
  payee_type text NOT NULL CHECK (payee_type IN ('DepEd', 'Guardian', 'Self-pay')),
  amount integer NOT NULL,
  payment_method text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'disbursed')),
  reference_no text,
  created_at timestamp with time zone DEFAULT now()
);

-- Alter students table to add transferee and voucher details
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS is_transferee boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS prior_voucher_amount integer;

-- Alter enrollment_history to track status and target capacity (revenue goal quota)
ALTER TABLE public.enrollment_history
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'archived' CHECK (status IN ('active', 'archived')),
  ADD COLUMN IF NOT EXISTS target_cap bigint DEFAULT 8100000;

-- Ensure RLS is enabled on new tables
ALTER TABLE public.voucher_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS policies on new tables if they exist
DROP POLICY IF EXISTS "Allow read for admins and registrars" ON public.voucher_rates;
DROP POLICY IF EXISTS "Allow write for admins only" ON public.voucher_rates;
DROP POLICY IF EXISTS "Allow read for admins and registrars" ON public.payments;
DROP POLICY IF EXISTS "Allow write for admins only" ON public.payments;

-- Add RLS policies: read access to admins and registrars, write to admins only
-- We check access by validating auth.uid() exists in public.admin_profiles
CREATE POLICY "Allow read for admins and registrars" 
  ON public.voucher_rates 
  FOR SELECT 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()));

CREATE POLICY "Allow write for admins only" 
  ON public.voucher_rates 
  FOR ALL 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()));

CREATE POLICY "Allow read for admins and registrars" 
  ON public.payments 
  FOR SELECT 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()));

CREATE POLICY "Allow write for admins only" 
  ON public.payments 
  FOR ALL 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_profiles WHERE id = auth.uid()));

-- Insert seed configuration and default rates
INSERT INTO public.site_settings (key, value, updated_at) 
VALUES ('school_voucher_tier', 'NCR', now()) 
ON CONFLICT (key) 
DO UPDATE SET value = 'NCR', updated_at = now();

-- Run dynamic block to configure enrollment history and seed rates based on active school year
DO $$
DECLARE
  v_active_sy text;
  v_prev_sy text;
  v_parts text[];
BEGIN
  -- Get active school year from system_config
  SELECT school_year INTO v_active_sy FROM public.system_config LIMIT 1;
  IF v_active_sy IS NULL THEN
    v_active_sy := '2027-2028';
  END IF;

  -- Calculate previous school year (e.g. '2027-2028' -> '2026-2027')
  v_parts := string_to_array(v_active_sy, '-');
  IF array_length(v_parts, 1) = 2 THEN
    v_prev_sy := (v_parts[1]::int - 1)::text || '-' || (v_parts[2]::int - 1)::text;
  ELSE
    v_prev_sy := '2026-2027';
  END IF;

  -- Insert/update enrollment history for active year
  INSERT INTO public.enrollment_history (school_year, status, target_cap)
  VALUES (v_active_sy, 'active', 8100000)
  ON CONFLICT (school_year)
  DO UPDATE SET status = 'active', target_cap = 8100000;

  -- Set all other school years to archived
  UPDATE public.enrollment_history 
  SET status = 'archived' 
  WHERE school_year != v_active_sy;

  -- Seed rates for active school year
  INSERT INTO public.voucher_rates (student_category, school_year, amount)
  VALUES 
    ('JHS Graduate', v_active_sy, 22500),
    ('ALS Passer', v_active_sy, 18000),
    ('PEPT Passer', v_active_sy, 22500),
    ('Private non-ESC', v_active_sy, 18000)
  ON CONFLICT (student_category, school_year) 
  DO UPDATE SET amount = EXCLUDED.amount;

  -- Seed rates for previous school year
  INSERT INTO public.voucher_rates (student_category, school_year, amount)
  VALUES 
    ('JHS Graduate', v_prev_sy, 22500),
    ('ALS Passer', v_prev_sy, 18000),
    ('PEPT Passer', v_prev_sy, 22500),
    ('Private non-ESC', v_prev_sy, 18000)
  ON CONFLICT (student_category, school_year) 
  DO UPDATE SET amount = EXCLUDED.amount;

END $$;
