-- ============================================================
-- 1. Add admin_id to teacher_chat_messages so each admin has
--    their own private thread with each teacher.
-- 2. Enable REPLICA IDENTITY FULL on reactions table so
--    Supabase Realtime can fire on INSERT/UPDATE/DELETE.
-- 3. Allow authenticated users (teachers) to read admin_profiles
--    so teachers can discover admins in their chat sidebar.
--
-- Run this in your Supabase SQL editor.
-- Then go to: Supabase Dashboard → Database → Replication
--   and enable the table "teacher_message_reactions" in the
--   supabase_realtime publication.
-- ============================================================

-- ── teacher_chat_messages: add admin_id ─────────────────────
ALTER TABLE teacher_chat_messages
  ADD COLUMN IF NOT EXISTS admin_id UUID;

-- ── Reactions: full replica identity for realtime ────────────
ALTER TABLE teacher_message_reactions REPLICA IDENTITY FULL;

-- ── Allow teachers to read admin_profiles ────────────────────
DROP POLICY IF EXISTS "teachers_read_admin_profiles" ON admin_profiles;
CREATE POLICY "teachers_read_admin_profiles"
ON admin_profiles FOR SELECT TO authenticated
USING (true);
