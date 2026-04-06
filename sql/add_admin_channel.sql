-- ============================================================
-- Admin-Only Group Chat Channel
-- Run this in your Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_messages (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  content         text        NOT NULL DEFAULT '',
  sender_id       uuid        NOT NULL,
  sender_name     text        NOT NULL DEFAULT '',
  sender_avatar_url text,
  attachment_url  text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE admin_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'admin_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE admin_messages;
  END IF;
END $$;
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- Only users who have an admin_profiles record may read or write
CREATE POLICY "admin_channel_read"
ON admin_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

CREATE POLICY "admin_channel_write"
ON admin_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid())
);

CREATE POLICY "admin_channel_modify"
ON admin_messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "admin_channel_delete"
ON admin_messages FOR DELETE TO authenticated
USING (sender_id = auth.uid());

-- Add 'admin_global' to the reactions message_type check
ALTER TABLE teacher_message_reactions
  DROP CONSTRAINT IF EXISTS teacher_message_reactions_message_type_check;
ALTER TABLE teacher_message_reactions
  ADD CONSTRAINT teacher_message_reactions_message_type_check
  CHECK (message_type IN ('global', 'admin_dm', 'teacher_dm', 'admin_admin_dm', 'admin_global'));
