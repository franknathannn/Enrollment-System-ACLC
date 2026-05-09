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
    logActivityHelper + '\n  const loadSettings = useCallback(async () => {'
  );

  // Use a generic details message since the admin just wants to know they updated config
  const logCode = `await logActivity("Updated system config parameters.");`;

  const replacements = [
    [/toast\.success\(`Control mode set to \$\{newMode\.toUpperCase\(\)\}\. Portal state unchanged\.`\)/, \`toast.success(\\\`Control mode set to \${newMode.toUpperCase()}. Portal state unchanged.\\\`); \${logCode}\`],
    [/toast\.success\(`Override: Portal \$\{checked \? 'OPEN' : 'CLOSED'\}`\)/, \`toast.success(\\\`Override: Portal \${checked ? 'OPEN' : 'CLOSED'}\\\`); \${logCode}\`],
    [/toast\.success\(`Pre-Enrollment Mode \$\{checked \? 'ENABLED' : 'DISABLED'\}`\)/, \`toast.success(\\\`Pre-Enrollment Mode \${checked ? 'ENABLED' : 'DISABLED'}\\\`); \${logCode}\`],
    [/toast\.success\(`Grade 12 enrollment \$\{checked \? 'ENABLED' : 'DISABLED'\}`\)/, \`toast.success(\\\`Grade 12 enrollment \${checked ? 'ENABLED' : 'DISABLED'}\\\`); \${logCode}\`],
    [/toast\.warning\("Guardian Critical: Limit reached\. Portal shutdown complete\."\)/, \`toast.warning("Guardian Critical: Limit reached. Portal shutdown complete."); \${logCode}\`],
    [/toast\.success\("Configuration Committed Successfully"\)/, \`toast.success("Configuration Committed Successfully"); \${logCode}\`],
    [/toast\.success\("Enrollment Changes committed\."\)/, \`toast.success("Enrollment Changes committed."); \${logCode}\`],
    [/toast\.warning\("Auto-Trigger: Capacity limit reached\. Portal automatically closed\."\)/, \`toast.warning("Auto-Trigger: Capacity limit reached. Portal automatically closed."); \${logCode}\`],
    [/toast\.success\("Auto-Trigger: Slot freed up! Portal automatically re-opened\."\)/, \`toast.success("Auto-Trigger: Slot freed up! Portal automatically re-opened."); \${logCode}\`],
    [/toast\.success\(`Enrollment Status notifications \$\{v \? 'ENABLED' : 'DISABLED'\}`\)/, \`toast.success(\\\`Enrollment Status notifications \${v ? 'ENABLED' : 'DISABLED'}\\\`); \${logCode}\`],
    [/toast\.success\(`Attendance Arrival notifications \$\{v \? 'ENABLED' : 'DISABLED'\}`\)/, \`toast.success(\\\`Attendance Arrival notifications \${v ? 'ENABLED' : 'DISABLED'}\\\`); \${logCode}\`],
    [/toast\.success\(`Daily Summary notifications \$\{v \? 'ENABLED' : 'DISABLED'\}`\)/, \`toast.success(\\\`Daily Summary notifications \${v ? 'ENABLED' : 'DISABLED'}\\\`); \${logCode}\`],
    [/toast\.success\(`Student self-edit \$\{v \? 'ENABLED' : 'DISABLED'\}`\)/, \`toast.success(\\\`Student self-edit \${v ? 'ENABLED' : 'DISABLED'}\\\`); \${logCode}\`],
    [/toast\.success\(`Auto-close portal \$\{v \? 'ENABLED' : 'DISABLED'\}`\)/, \`toast.success(\\\`Auto-close portal \${v ? 'ENABLED' : 'DISABLED'}\\\`); \${logCode}\`],
    [/toast\.success\(`Slot display mode updated to \$\{v\.toUpperCase\(\)\}`\)/, \`toast.success(\\\`Slot display mode updated to \${v.toUpperCase()}\\\`); \${logCode}\`]
  ];

  for (const [regex, replacement] of replacements) {
    content = content.replace(regex, replacement);
  }

  fs.writeFileSync(path, content);
  console.log("Success");
} else {
  console.log("Already added");
}
