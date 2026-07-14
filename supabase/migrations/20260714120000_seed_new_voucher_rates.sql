-- Seed rates for new grouped categories for active school year
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

  v_parts := string_to_array(v_active_sy, '-');
  IF array_length(v_parts, 1) = 2 THEN
    v_prev_sy := (v_parts[1]::int - 1)::text || '-' || (v_parts[2]::int - 1)::text;
  ELSE
    v_prev_sy := '2026-2027';
  END IF;

  -- Seed rates for active school year
  INSERT INTO public.voucher_rates (student_category, school_year, amount)
  VALUES 
    ('CATEGORY A, B, C', v_active_sy, 22500),
    ('CATEGORY D, E', v_active_sy, 18000)
  ON CONFLICT (student_category, school_year) 
  DO UPDATE SET amount = EXCLUDED.amount;

  -- Seed rates for previous school year
  INSERT INTO public.voucher_rates (student_category, school_year, amount)
  VALUES 
    ('CATEGORY A, B, C', v_prev_sy, 22500),
    ('CATEGORY D, E', v_prev_sy, 18000)
  ON CONFLICT (student_category, school_year) 
  DO UPDATE SET amount = EXCLUDED.amount;

END $$;
