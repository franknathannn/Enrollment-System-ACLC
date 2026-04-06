-- ============================================================
-- Fix: teacher_message_reactions.message_id was BIGINT but
-- all chat tables (teacher_chat_messages, teacher_dm_messages,
-- teacher_global_chat_messages) use UUID primary keys.
-- Number(uuid_string) = NaN → null → NOT NULL violation.
--
-- Run this in your Supabase SQL editor.
-- ============================================================

ALTER TABLE teacher_message_reactions
  ALTER COLUMN message_id TYPE TEXT;
