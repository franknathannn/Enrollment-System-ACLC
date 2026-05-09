const fs = require('fs');
let code = fs.readFileSync('src/app/admin/teachers/components/AdminReportsTab.tsx', 'utf8');

code = code.replace(/Failed Threshold/g, 'Failed');
code = code.replace(/STUDENT ROSTER/g, 'STUDENT LIST');
code = code.replace(/Student Roster/g, 'Student List');

code = code.replace(
  /function classifyAttendanceRisk\([\s\S]*?return \{ status, projectedTotal, absencesRemaining, isAtRisk, effectiveAbsences \}\n\}/,
  `function classifyAttendanceRisk(
  pct: number,
  scheduledDays: number
): RiskClassification {
  if (scheduledDays < 20) {
    return { status: "Monitoring", projectedTotal: 0, absencesRemaining: 0, isAtRisk: false, effectiveAbsences: 0 }
  }
  let status: RiskStatus
  let isAtRisk = false
  if (pct < 50) {
    status = "Failed"
    isAtRisk = true
  } else if (pct < 75) {
    status = "Warning"
  } else {
    status = "Safe"
  }
  return { status, projectedTotal: 0, absencesRemaining: 0, isAtRisk, effectiveAbsences: 0 }
}`
);

code = code.replace(/let worstClassification = classifyAttendanceRisk\(0, 0, 0, 0, 0\)/, 'let worstClassification = classifyAttendanceRisk(100, 0)');

code = code.replace(
  /const subjClassification = classifyAttendanceRisk\(subjAbsent, subjLate, subjExcused, subjDistinctDates, subjDistinctDates\)/,
  `const subjTotal = subjDistinctDates;
        const subjPresent = subjRecs.filter(r => r.status === "Present" || r.status === "Late").length;
        const subjPct = subjTotal > 0 ? Math.round((subjPresent / subjTotal) * 100) : 0;
        const subjClassification = classifyAttendanceRisk(subjPct, subjDistinctDates)`
);

code = code.replace(
  /const classification = classifyAttendanceRisk\(absent, late, excused, scheduledDays, totalExpectedDays\)/g,
  `const classification = classifyAttendanceRisk(pct, scheduledDays)`
);

code = code.replace(
  /flaggedStudents\.map\(\(\{ student, classification, pct, cuttingCount \}\) => \{/g,
  `flaggedStudents.map(({ student, classification, pct, cuttingCount, absent }) => {`
);
code = code.replace(
  /const \{ status, effectiveAbsences, absencesRemaining \} = classification;/g,
  `const { status } = classification;`
);
code = code.replace(
  /<td style=\{\{ padding: "5px 8px", color: "#dc2626", fontWeight: 700 \}\}>\{effectiveAbsences\}<\/td>/g,
  `<td style={{ padding: "5px 8px", color: "#dc2626", fontWeight: 700 }}>{absent}</td>`
);
code = code.replace(
  /<span style=\{\{ fontWeight: 700, color: status === "Failed" \? "#dc2626" : "#ea580c" \}\}>\{status\}<\/span> — \{absencesRemaining > 0 \? `\$\{absencesRemaining\} more leads to Failure.` : "Absent cap exceeded."\} \{hasCutting \? `\(\$\{cuttingCount\} cutting incident\(s\)\)` : ""\}<\/td>/g,
  `<span style={{ fontWeight: 700, color: status === "Failed" ? "#dc2626" : "#ea580c" }}>{status}</span> — {(status === "Failed" || status === "Warning") ? "Failed to reach 75%." : ""} {hasCutting ? \`(\${cuttingCount} cutting incident(s))\` : ""}
                            </td>`
);

fs.writeFileSync('src/app/admin/teachers/components/AdminReportsTab.tsx', code);
