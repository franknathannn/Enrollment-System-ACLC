-- ============================================================
-- Fix RLS policies for all chat tables.
-- Uses auth.jwt() ->> 'email' instead of querying auth.users
-- (auth.users is not accessible to the authenticated role).
-- Run this in your Supabase SQL editor.
-- ============================================================

-- ── teacher_chat_messages ───────────────────────────────────
DROP POLICY IF EXISTS "admins_full_access"  ON teacher_chat_messages;
DROP POLICY IF EXISTS "teachers_own_thread" ON teacher_chat_messages;

-- Admins: authenticated users whose email is NOT in the teachers table
CREATE POLICY "admins_full_access"
ON teacher_chat_messages FOR ALL TO authenticated
USING (
  NOT EXISTS (
    SELECT 1 FROM teachers WHERE email = auth.jwt() ->> 'email'
  )
)
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM teachers WHERE email = auth.jwt() ->> 'email'
  )
);

-- Teachers: can only read/write their own thread
CREATE POLICY "teachers_own_thread"
ON teacher_chat_messages FOR ALL TO authenticated
USING (
  teacher_id IN (
    SELECT id FROM teachers WHERE email = auth.jwt() ->> 'email'
  )
)
WITH CHECK (
  teacher_id IN (
    SELECT id FROM teachers WHERE email = auth.jwt() ->> 'email'
  )
);

-- ── teacher_global_chat_messages ────────────────────────────
DROP POLICY IF EXISTS "admins_global_chat"   ON teacher_global_chat_messages;
DROP POLICY IF EXISTS "teachers_global_chat" ON teacher_global_chat_messages;

CREATE POLICY "admins_global_chat"
ON teacher_global_chat_messages FOR ALL TO authenticated
USING (
  NOT EXISTS (
    SELECT 1 FROM teachers WHERE email = auth.jwt() ->> 'email'
  )
)
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM teachers WHERE email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "teachers_global_chat"
ON teacher_global_chat_messages FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teachers WHERE email = auth.jwt() ->> 'email'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teachers WHERE email = auth.jwt() ->> 'email'
  )
);

-- ── teacher_dm_messages ─────────────────────────────────────
DROP POLICY IF EXISTS "admins_view_dms"  ON teacher_dm_messages;
DROP POLICY IF EXISTS "teachers_own_dms" ON teacher_dm_messages;

CREATE POLICY "admins_view_dms"
ON teacher_dm_messages FOR ALL TO authenticated
USING (
  NOT EXISTS (
    SELECT 1 FROM teachers WHERE email = auth.jwt() ->> 'email'
  )
)
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM teachers WHERE email = auth.jwt() ->> 'email'
  )
);

CREATE POLICY "teachers_own_dms"
ON teacher_dm_messages FOR ALL TO authenticated
USING (
  sender_teacher_id IN (
    SELECT id FROM teachers WHERE email = auth.jwt() ->> 'email'
  )
  OR
  recipient_teacher_id IN (
    SELECT id FROM teachers WHERE email = auth.jwt() ->> 'email'
  )
)
WITH CHECK (
  sender_teacher_id IN (
    SELECT id FROM teachers WHERE email = auth.jwt() ->> 'email'
  )
);
