-- Add missing columns to admin_messages if they don't exist
ALTER TABLE admin_messages ADD COLUMN IF NOT EXISTS sender_name       text NOT NULL DEFAULT '';
ALTER TABLE admin_messages ADD COLUMN IF NOT EXISTS sender_avatar_url text;
ALTER TABLE admin_messages ADD COLUMN IF NOT EXISTS attachment_url    text;
ALTER TABLE admin_messages ADD COLUMN IF NOT EXISTS attachment_name   text;
ALTER TABLE admin_messages ADD COLUMN IF NOT EXISTS attachment_type   text;
ALTER TABLE admin_messages ADD COLUMN IF NOT EXISTS attachment_size   bigint;

NOTIFY pgrst, 'reload schema';
