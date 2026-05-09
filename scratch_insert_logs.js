const fs = require('fs');

const path = 'c:/Users/Frank/Documents/Enrollment System/enrollment-system/src/app/admin/settings/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const logActivityHelper = `
  const logActivity = useCallback(async (details: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      await supabase.from('activity_logs').insert([{
        admin_id: user.id,
        admin_name: user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Authorized Admin',
        action_type: 'UPDATED',
        student_name: 'N/A',
        details
      }]);
    } catch (e) { console.error("Log failed", e) }
  }, []);
`;

// Insert helper before loadSettings
content = content.replace(
  '  const loadSettings = useCallback(async () => {',
  logActivityHelper + '\n  const loadSettings = useCallback(async () => {'
);

// Replace toast.success with await logActivity
content = content.replace(/toast\.success\((.*?)\)/g, 'toast.success($1); await logActivity($1)');

fs.writeFileSync(path, content);
console.log("Done");
