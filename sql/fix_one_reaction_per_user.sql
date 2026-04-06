-- ============================================================
-- Change unique constraint so each user can only have ONE
-- reaction per message (not one per emoji per message).
--
-- Run this in your Supabase SQL editor.
-- ============================================================

-- Drop the old per-emoji constraint (auto-generated name)
ALTER TABLE teacher_message_reactions
  DROP CONSTRAINT IF EXISTS "teacher_message_reactions_message_type_message_id_emoji_user__key";

-- One reaction per user per message (regardless of emoji)
ALTER TABLE teacher_message_reactions
  ADD CONSTRAINT teacher_message_reactions_one_per_user
  UNIQUE (message_type, message_id, user_id);
