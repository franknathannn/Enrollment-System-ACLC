import re

with open("src/app/admin/teachers/page.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Remove AdminAllSectionsReport
code = re.sub(r'// ── Admin-wide attendance report.*?export default function TeachersPage', 'export default function TeachersPage', code, flags=re.DOTALL)

# 2. Import AdminReportsTab
code = code.replace(
    'import { QuarterlyUpdatesAdminTab } from "./components/QuarterlyUpdatesAdminTab"',
    'import { QuarterlyUpdatesAdminTab } from "./components/QuarterlyUpdatesAdminTab"\nimport { AdminReportsTab } from "./components/AdminReportsTab"'
)

# 3. Update tab state
code = code.replace(
    'useState<"list" | "announcements" | "quarterly" | "calendar">',
    'useState<"list" | "announcements" | "quarterly" | "calendar" | "reports">'
)
code = code.replace(
    'if (s === "list" || s === "announcements" || s === "quarterly" || s === "calendar") return s',
    'if (s === "list" || s === "announcements" || s === "quarterly" || s === "calendar" || s === "reports") return s'
)

# 4. Add Reports tab button
code = code.replace(
    '<button className={`${tabBase} justify-center ${tab === "calendar" ? tabAct : tabInact}`} onClick={() => setTab("calendar")}>\n            <CalendarDays size={12} /> <span>Calendar</span>\n          </button>',
    '<button className={`${tabBase} justify-center ${tab === "calendar" ? tabAct : tabInact}`} onClick={() => setTab("calendar")}>\n            <CalendarDays size={12} /> <span>Calendar</span>\n          </button>\n          <button className={`${tabBase} justify-center ${tab === "reports" ? tabAct : tabInact}`} onClick={() => setTab("reports")}>\n            <BarChart2 size={12} /> <span>Reports</span>\n          </button>'
)

# 5. Add Reports tab content
code = code.replace(
    '{tab === "calendar" && (\n          <AcademicCalendarTab dm={dm} schoolYear={schoolYear} />\n        )}',
    '{tab === "calendar" && (\n          <AcademicCalendarTab dm={dm} schoolYear={schoolYear} />\n        )}\n\n        {/* Reports */}\n        {tab === "reports" && (\n          <AdminReportsTab dm={dm} schoolYear={schoolYear} session={{ full_name: "Administrator" }} />\n        )}'
)

with open("src/app/admin/teachers/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)
