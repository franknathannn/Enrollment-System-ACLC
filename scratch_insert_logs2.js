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

if (!content.includes('const logActivity')) {
  content = content.replace(
    /const loadSettings = useCallback\(async \(\) => {/g,
    logActivityHelper + '\n  const loadSettings = useCallback(async () => {'
  );
  
  // Custom replacements to preserve strings correctly
  content = content.replace(/toast\.success\((`[^`]+`)\)/g, 'toast.success($1); await logActivity($1)');
  content = content.replace(/toast\.success\((("[^"]+")|('[^']+'))\)/g, 'toast.success($1); await logActivity($1)');
  
  // also handle some warnings if needed, but user just wants success updates mostly.
  content = content.replace(/toast\.warning\((`[^`]+`)\)/g, 'toast.warning($1); await logActivity($1)');
  content = content.replace(/toast\.warning\((("[^"]+")|('[^']+'))\)/g, 'toast.warning($1); await logActivity($1)');
  
  fs.writeFileSync(path, content);
  console.log("Replaced successfully!");
} else {
  console.log("Already replaced");
}
