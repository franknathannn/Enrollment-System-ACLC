-- Run this in Supabase SQL Editor to add attachment support to admin_messages

ALTER TABLE public.admin_messages
  ADD COLUMN IF NOT EXISTS attachment_url  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attachment_size BIGINT DEFAULT NULL;

-- Storage bucket RLS policies (run AFTER creating the 'chat-attachments' bucket in dashboard)
-- Bucket settings: Public = Yes, File size limit = 30MB

-- Allow authenticated users to upload
CREATE POLICY "Admins can upload chat attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments');

-- Allow authenticated users to read
CREATE POLICY "Admins can view chat attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments');

-- Allow users to delete their own uploads
CREATE POLICY "Admins can delete own chat attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-attachments');
