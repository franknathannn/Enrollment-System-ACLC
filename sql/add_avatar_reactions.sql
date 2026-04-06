-- ============================================================
-- Add avatar column + teacher_message_reactions table.
-- Run this in your Supabase SQL editor AFTER fix_chat_rls.sql.
-- ============================================================

-- ── Add sender_avatar_url to all teacher chat tables ────────
ALTER TABLE teacher_chat_messages
  ADD COLUMN IF NOT EXISTS sender_avatar_url TEXT;

ALTER TABLE teacher_global_chat_messages
  ADD COLUMN IF NOT EXISTS sender_avatar_url TEXT;

ALTER TABLE teacher_dm_messages
  ADD COLUMN IF NOT EXISTS sender_avatar_url TEXT;

-- ── Reactions table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_message_reactions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message_type TEXT   NOT NULL CHECK (message_type IN ('global', 'admin_dm', 'teacher_dm')),
  message_id  BIGINT NOT NULL,
  emoji       TEXT   NOT NULL,
  user_id     UUID   NOT NULL,
  user_name   TEXT   NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (message_type, message_id, emoji, user_id)
);

ALTER TABLE teacher_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_read_reactions"  ON teacher_message_reactions;
DROP POLICY IF EXISTS "insert_own_reaction"    ON teacher_message_reactions;
DROP POLICY IF EXISTS "delete_own_reaction"    ON teacher_message_reactions;

-- All authenticated users can read reactions
CREATE POLICY "anyone_read_reactions"
ON teacher_message_reactions FOR SELECT TO authenticated
USING (true);

-- Users can only insert their own reactions
CREATE POLICY "insert_own_reaction"
ON teacher_message_reactions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can only delete their own reactions
CREATE POLICY "delete_own_reaction"
ON teacher_message_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid());
