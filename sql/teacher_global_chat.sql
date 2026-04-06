-- ============================================================
-- Global Teacher ↔ Admin Chat (all admins + all teachers)
-- Run this in your Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS teacher_global_chat_messages (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  content         text        NOT NULL DEFAULT '',
  sender_id       uuid        NOT NULL,          -- auth.uid() of sender
  sender_type     text        NOT NULL CHECK (sender_type IN ('admin', 'teacher')),
  sender_name     text        NOT NULL DEFAULT '',
  attachment_url  text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE teacher_global_chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE teacher_global_chat_messages;

ALTER TABLE teacher_global_chat_messages ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admins_global_chat"
ON teacher_global_chat_messages
FOR ALL
TO authenticated
USING   (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- Any authenticated teacher can read/write the global chat
CREATE POLICY "teachers_global_chat"
ON teacher_global_chat_messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teachers
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teachers
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);
