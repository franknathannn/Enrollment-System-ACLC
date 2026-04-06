-- ============================================================
-- Admin ↔ Admin Direct Messages
-- Run this in your Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_dm_messages (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  content         text        NOT NULL DEFAULT '',
  sender_id       uuid        NOT NULL,
  recipient_id    uuid        NOT NULL,
  sender_name     text        NOT NULL DEFAULT '',
  sender_avatar_url text,
  attachment_url  text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE admin_dm_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_dm_messages;
ALTER TABLE admin_dm_messages ENABLE ROW LEVEL SECURITY;

-- Admins can only read/write their own conversations
CREATE POLICY "admins_own_dm"
ON admin_dm_messages FOR ALL TO authenticated
USING   (sender_id = auth.uid() OR recipient_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- Allow 'admin_admin_dm' in the reactions message_type check
ALTER TABLE teacher_message_reactions
  DROP CONSTRAINT IF EXISTS teacher_message_reactions_message_type_check;
ALTER TABLE teacher_message_reactions
  ADD CONSTRAINT teacher_message_reactions_message_type_check
  CHECK (message_type IN ('global', 'admin_dm', 'teacher_dm', 'admin_admin_dm'));
