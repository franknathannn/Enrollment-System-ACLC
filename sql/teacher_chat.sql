-- ============================================================
-- Teacher ↔ Admin Chat
-- Run this entire script in your Supabase SQL editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS teacher_chat_messages (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  content         text        NOT NULL DEFAULT '',
  sender_id       uuid        NOT NULL,                         -- auth.uid() of whoever sent
  sender_type     text        NOT NULL CHECK (sender_type IN ('admin', 'teacher')),
  sender_name     text        NOT NULL DEFAULT '',
  teacher_id      uuid        NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  attachment_url  text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  created_at      timestamptz DEFAULT now()
);

-- Required for realtime to broadcast old/new rows
ALTER TABLE teacher_chat_messages REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE teacher_chat_messages;

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE teacher_chat_messages ENABLE ROW LEVEL SECURITY;

-- Admins: any user with a record in admin_profiles can read/write all threads
CREATE POLICY "admins_full_access"
ON teacher_chat_messages
FOR ALL
TO authenticated
USING   (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

-- Teachers: can only read/write their own thread (matched by email → teachers.id)
CREATE POLICY "teachers_own_thread"
ON teacher_chat_messages
FOR ALL
TO authenticated
USING (
  teacher_id IN (
    SELECT id FROM teachers
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
)
WITH CHECK (
  teacher_id IN (
    SELECT id FROM teachers
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);
