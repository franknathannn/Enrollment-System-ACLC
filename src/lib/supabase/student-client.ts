import { createBrowserClient } from '@supabase/ssr'

export const studentSupabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { storageKey: 'sb-aclc-student-auth' } }
)
