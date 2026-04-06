-- ============================================================
-- Teacher ↔ Teacher Direct Messages
-- Run this in your Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS teacher_dm_messages (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  content             text        NOT NULL DEFAULT '',
  sender_auth_id      uuid        NOT NULL,                           -- auth.uid() of sender
  sender_teacher_id   uuid        NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  recipient_teacher_id uuid       NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  sender_name         text        NOT NULL DEFAULT '',
  attachment_url      text,
  attachment_name     text,
  attachment_type     text,
  attachment_size     bigint,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE teacher_dm_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE teacher_dm_messages;

ALTER TABLE teacher_dm_messages ENABLE ROW LEVEL SECURITY;

-- Teachers can only see messages they sent or received
CREATE POLICY "teachers_own_dms"
ON teacher_dm_messages
FOR ALL
TO authenticated
USING (
  sender_teacher_id IN (
    SELECT id FROM teachers WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  OR
  recipient_teacher_id IN (
    SELECT id FROM teachers WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
)
WITH CHECK (
  sender_teacher_id IN (
    SELECT id FROM teachers WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Admins can see all DMs
CREATE POLICY "admins_view_dms"
ON teacher_dm_messages
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));
