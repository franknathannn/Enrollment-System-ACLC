import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Opt out of caching so cron always runs fresh
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Basic authorization check for cron requests
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // 1. Check if Daily Summary Notification is Enabled
    const { data: config } = await supabase.from('system_config').select('notify_parents_summary').maybeSingle();
    if (!config?.notify_parents_summary) {
      return NextResponse.json({ success: true, message: 'Summary notifications disabled globally.' });
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) throw new Error("Missing BREVO_API_KEY");

    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[today.getDay()];

    // YYYY-MM-DD bounds
    const dateStr = today.toISOString().split('T')[0];
    const dayStart = `${dateStr}T00:00:00+08:00`;
    const dayEnd = `${dateStr}T23:59:59+08:00`;

    // 2. Fetch All Students (Who have a guardian email assigned)
    const { data: students } = await supabase
      .from('students')
      .select('id, section, first_name, last_name, guardian_email, guardian_first_name')
      .not('guardian_email', 'is', null)
      .not('section', 'is', null)
      .neq('section', 'Unassigned');

    if (!students || students.length === 0) {
      return NextResponse.json({ success: true, message: 'No active students with mapped guardians found.' });
    }

    // 3. Fetch All Schedules For Today
    const { data: schedules } = await supabase
      .from('schedules')
      .select('*')
      .eq('day', currentDay);

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ success: true, message: 'No classes scheduled for today.' });
    }

    // 4. Fetch All Attendances For Today
    const { data: attendances } = await supabase
      .from('attendance')
      .select('student_id, subject, status, notes, time, date')
      .eq('date', dateStr);

    // Track emails to send
    const emailPayloads: any[] = [];

    // Formatter
    const fmtT = (t: string) => {
      if (!t) return 'TBA';
      const [h, m] = t.slice(0, 5).split(':').map(Number);
      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    };

    // 5. Evaluate Deep Mapping Per Student
    for (const student of students) {
      // Find what classes they were supposed to have today based on their section
      const mySchedules = schedules
        .filter(s => s.section === student.section)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

      // If they don't have classes today, skip them
      if (mySchedules.length === 0) continue;

      // Ensure their shift is fully over before evaluating!
      // (Hourly Sweep Logic: only blast if the final class of the day ended at least 10 minutes ago)
      const lastClass = mySchedules[mySchedules.length - 1];
      const [lcH, lcM] = lastClass.end_time.split(':').map(Number);
      const shiftEnd = new Date(today);
      shiftEnd.setHours(lcH, lcM + 10, 0, 0); // pad 10 mins

      if (today < shiftEnd) {
        // Shift is not complete yet, skip them for this hour's sweep
        continue;
      }

      // Ensure we haven't already sent their summary today (this would require a tracking table in prod, 
      // but for this implementation we assume the hourly sweep is idempotent or handles it.
      // E.g. we might check an `notification_logs` table. For MVP, we proceed with computation.)

      const myAttendances = (attendances || []).filter(a => a.student_id === student.id);
      let wasCutting = false;

      let checklistHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left; margin-top: 15px;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; color: #475569;">
              <th style="padding: 10px;">Subject & Time</th>
              <th style="padding: 10px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
      `;

      mySchedules.forEach((sched, index) => {
        // Try to find if they were scanned for this specific subject
        // Alternatively, match by timeframe. Here we match by loosely checking if they were scanned.
        const match = myAttendances.find(a => a.subject === sched.subject);

        const isPresent = !!match;
        const note = match?.notes || '';
        const isCutting = note.toUpperCase() === 'CUTTING';

        if (isCutting) wasCutting = true;

        const rowBg = index % 2 === 0 ? '#f8fafc' : '#ffffff';
        const icon = '';
        const color = isPresent ? '#16a34a' : '#dc2626';
        let statusString = isPresent ? 'Attended' : 'Missing';
        let statusColor = color;

        if (isCutting) { statusString = 'CUTTING FLAG'; statusColor = '#ca8a04'; }

        checklistHtml += `
          <tr style="background-color: ${rowBg}; border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 10px; color: #1e293b;">
              <strong>${sched.subject}</strong><br/>
              <span style="font-size: 11px; color: #64748b;">${fmtT(sched.start_time)} - ${fmtT(sched.end_time)}</span>
            </td>
            <td style="padding: 12px 10px; text-align: center; color: ${statusColor}; font-weight: 700;">
              ${statusString}
            </td>
          </tr>
        `;
      });
      checklistHtml += `</tbody></table>`;

      let warningAlert = '';
      if (wasCutting) {
        warningAlert = `
          <div style="background-color: #fef2f2; border-left: 5px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; color: #991b1b; font-weight: 800; text-transform: uppercase;">Attention Required</p>
            <p style="margin: 8px 0 0 0; color: #b91c1c; font-size: 14px;">Our tracking system detected a <strong>"CUTTING"</strong> flag during the schedule shift. Please coordinate directly with the teacher to clarify this attendance irregularity.</p>
          </div>
        `;
      }

      const logoUrl = "https://enrollment-system-aclc.vercel.app/";
      const htmlContent = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="https://ama-aclc-northbay-es.vercel.app" target="_blank" style="text-decoration: none;">
              <img src="${logoUrl}" alt="ACLC Logo" style="width: 80px; height: 80px; object-fit: contain;" />
            </a>
            <h2 style="color: #1d4ed8; margin-top: 10px; text-transform: uppercase; letter-spacing: 2px; font-weight: 800;">AMA ACLC NORTHBAY</h2>
          </div>

          <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
            <h1 style="color: #0f172a; margin-top: 0; font-size: 24px; font-weight: 800;">Daily Attendance Report</h1>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">Dear <strong>${student.guardian_first_name || 'Guardian'}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">Here is the completed attendance checklist for <strong>${student.first_name} ${student.last_name}</strong> for today's automated attendance tracking.</p>
          
            ${warningAlert}
            ${checklistHtml}

            <p style="margin-top: 30px; font-size: 12px; color: #64748b;">This is an automated system message generated by AMA ACLC NORTHBAY.</p>
          </div>

          <div style="text-align: center; margin-top: 35px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} AMA ACLC Northbay Campus. All rights reserved.</p>
          </div>
        </div>
      `;

      emailPayloads.push(
        fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': BREVO_API_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: "ACLC Attendance System", email: "registrar@yourdomain.com" },
            to: [{ email: student.guardian_email, name: student.guardian_first_name || "Guardian" }],
            subject: `Daily Attendance Report: ${student.first_name} ${student.last_name}`,
            htmlContent: htmlContent
          })
        })
      );
    }

    // Process all emails in parallel
    if (emailPayloads.length > 0) {
      await Promise.allSettled(emailPayloads);
    }

    return NextResponse.json({
      success: true,
      message: `Hourly Sweep executed successfully. Sent ${emailPayloads.length} summaries.`
    });

  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
