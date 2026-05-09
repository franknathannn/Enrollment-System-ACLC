const fs = require('fs');
const path = 'c:/Users/Frank/Documents/Enrollment System/enrollment-system/src/app/admin/settings/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  {
    toast: 'toast.success(`Control mode set to ${newMode.toUpperCase()}. Portal state unchanged.`)',
    logStr: '`Control mode set to ${newMode.toUpperCase()}. Portal state unchanged.`'
  },
  {
    toast: "toast.success(`Override: Portal ${checked ? 'OPEN' : 'CLOSED'}`)",
    logStr: "`Override: Portal ${checked ? 'OPEN' : 'CLOSED'}`"
  },
  {
    toast: "toast.success(`Pre-Enrollment Mode ${checked ? 'ENABLED' : 'DISABLED'}`)",
    logStr: "`Pre-Enrollment Mode ${checked ? 'ENABLED' : 'DISABLED'}`"
  },
  {
    toast: "toast.success(`Grade 12 enrollment ${checked ? 'ENABLED' : 'DISABLED'}`)",
    logStr: "`Grade 12 enrollment ${checked ? 'ENABLED' : 'DISABLED'}`"
  },
  {
    toast: 'toast.warning("Guardian Critical: Limit reached. Portal shutdown complete.")',
    logStr: '"Guardian Critical: Limit reached. Portal shutdown complete."'
  },
  {
    toast: 'toast.success("Configuration Committed Successfully")',
    logStr: '"Configuration Committed Successfully"'
  },
  {
    toast: 'toast.success("Enrollment Changes committed.")',
    logStr: '"Enrollment Changes committed."'
  },
  {
    toast: 'toast.warning("Auto-Trigger: Capacity limit reached. Portal automatically closed.")',
    logStr: '"Auto-Trigger: Capacity limit reached. Portal automatically closed."'
  },
  {
    toast: 'toast.success("Auto-Trigger: Slot freed up! Portal automatically re-opened.")',
    logStr: '"Auto-Trigger: Slot freed up! Portal automatically re-opened."'
  },
  {
    toast: "toast.success(`Enrollment Status notifications ${v ? 'ENABLED' : 'DISABLED'}`)",
    logStr: "`Enrollment Status notifications ${v ? 'ENABLED' : 'DISABLED'}`"
  },
  {
    toast: "toast.success(`Attendance Arrival notifications ${v ? 'ENABLED' : 'DISABLED'}`)",
    logStr: "`Attendance Arrival notifications ${v ? 'ENABLED' : 'DISABLED'}`"
  },
  {
    toast: "toast.success(`Daily Summary notifications ${v ? 'ENABLED' : 'DISABLED'}`)",
    logStr: "`Daily Summary notifications ${v ? 'ENABLED' : 'DISABLED'}`"
  },
  {
    toast: "toast.success(`Student self-edit ${v ? 'ENABLED' : 'DISABLED'}`)",
    logStr: "`Student self-edit ${v ? 'ENABLED' : 'DISABLED'}`"
  },
  {
    toast: "toast.success(`Auto-close portal ${v ? 'ENABLED' : 'DISABLED'}`)",
    logStr: "`Auto-close portal ${v ? 'ENABLED' : 'DISABLED'}`"
  },
  {
    toast: 'toast.success(`Slot display mode updated to ${v.toUpperCase()}`)',
    logStr: '`Slot display mode updated to ${v.toUpperCase()}`'
  },
  {
    toast: 'toast.success("Recalibrated Successfully.")',
    logStr: '"Recalibrated Successfully."'
  }
];

for (const r of replacements) {
  // we replace the generic log with the specific one
  const target = r.toast + '; await logActivity("Updated system config parameters.");';
  const newText = r.toast + '; await logActivity(' + r.logStr + ');';
  content = content.split(target).join(newText);
}

fs.writeFileSync(path, content);
console.log("Success");
