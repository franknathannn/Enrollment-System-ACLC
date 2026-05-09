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
    '  const loadSettings = useCallback(async () => {',
    logActivityHelper + '\\n  const loadSettings = useCallback(async () => {'
  );

  const targets = [
    'toast.success(`Control mode set to ${newMode.toUpperCase()}. Portal state unchanged.`)',
    "toast.success(`Override: Portal ${checked ? 'OPEN' : 'CLOSED'}`)",
    "toast.success(`Pre-Enrollment Mode ${checked ? 'ENABLED' : 'DISABLED'}`)",
    "toast.success(`Grade 12 enrollment ${checked ? 'ENABLED' : 'DISABLED'}`)",
    'toast.warning("Guardian Critical: Limit reached. Portal shutdown complete.")',
    'toast.success("Configuration Committed Successfully")',
    'toast.success("Enrollment Changes committed.")',
    'toast.warning("Auto-Trigger: Capacity limit reached. Portal automatically closed.")',
    'toast.success("Auto-Trigger: Slot freed up! Portal automatically re-opened.")',
    "toast.success(`Enrollment Status notifications ${v ? 'ENABLED' : 'DISABLED'}`)",
    "toast.success(`Attendance Arrival notifications ${v ? 'ENABLED' : 'DISABLED'}`)",
    "toast.success(`Daily Summary notifications ${v ? 'ENABLED' : 'DISABLED'}`)",
    "toast.success(`Student self-edit ${v ? 'ENABLED' : 'DISABLED'}`)",
    "toast.success(`Auto-close portal ${v ? 'ENABLED' : 'DISABLED'}`)",
    'toast.success(`Slot display mode updated to ${v.toUpperCase()}`)',
    'toast.success("Recalibrated Successfully.")'
  ];

  for (const t of targets) {
    // Just inject await logActivity("Updated system config parameters.") after the toast
    const newContent = t + '; await logActivity("Updated system config parameters.");';
    content = content.split(t).join(newContent);
  }

  fs.writeFileSync(path, content);
  console.log("Success");
} else {
  console.log("Already added");
}
