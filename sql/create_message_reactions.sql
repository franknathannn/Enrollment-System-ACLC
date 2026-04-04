-- Run this in Supabase SQL Editor to create the message_reactions table

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.admin_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('heart', 'thumbs_up', 'haha', 'wow', 'angry')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all reactions
CREATE POLICY "Authenticated users can read reactions"
  ON public.message_reactions FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert their own reactions
CREATE POLICY "Users can add their own reactions"
  ON public.message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own reactions
CREATE POLICY "Users can remove their own reactions"
  ON public.message_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
