-- Add mock column to schedules table for DemoTools Fill/Unfill feature
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

ALTER TABLE public.schedules
ADD COLUMN IF NOT EXISTS mock boolean NULL DEFAULT NULL;

-- Optional: index for fast deletion of mock rows
CREATE INDEX IF NOT EXISTS idx_schedules_mock ON public.schedules (mock) WHERE mock = true;
