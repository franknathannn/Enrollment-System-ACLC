import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Opt out of caching so cron always runs fresh
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Authorization check for cron requests — always enforced
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // 1. Check if Daily Summary Notification is Enabled
    const { data: config } = await supabase.from('system_config').select('notify_parents_summary').maybeSingle();
    if (!config?.notify_parents_summary) {
      return NextResponse.json({ success: true, message: 'Summary notifications disabled globally.' });
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) throw new Error("Missing BREVO_API_KEY");

    // Use Philippine time (UTC+8) — Vercel servers run in UTC
    const PH_OFFSET_MS = 8 * 60 * 60 * 1000;
    const phNow = new Date(Date.now() + PH_OFFSET_MS);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[phNow.getUTCDay()];

    // YYYY-MM-DD in PH time
    const dateStr = phNow.toISOString().split('T')[0];

    // 2. Fetch All Students (Who have a guardian email assigned)
    const { data: students } = await supabase
      .from('students')
      .select('id, section, first_name, last_name, guardian_email, guardian_first_name, lrn, gender')
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

      // Hourly Sweep Logic: only send if the final class of the day ended at least 10 minutes ago
      const lastClass = mySchedules[mySchedules.length - 1];
      const [lcH, lcM] = lastClass.end_time.split(':').map(Number);
      const shiftEnd = new Date(phNow);
      shiftEnd.setUTCHours(lcH, lcM + 10, 0, 0); // pad 10 mins, compare in UTC

      if (phNow < shiftEnd) {
        // Shift is not complete yet, skip for this hour's sweep
        continue;
      }

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
        const arrivalTime = match?.time ? fmtT(match.time) : null;

        if (isCutting) wasCutting = true;

        const rowBg = index % 2 === 0 ? '#f8fafc' : '#ffffff';
        let statusString = isPresent ? 'Present' : 'Missing';
        let statusColor = isPresent ? '#16a34a' : '#dc2626';

        if (isCutting) { statusString = 'CUTTING FLAG'; statusColor = '#ca8a04'; }

        checklistHtml += `
          <tr style="background-color: ${rowBg}; border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 10px; color: #1e293b;">
              <strong>${sched.subject}</strong><br/>
              <span style="font-size: 11px; color: #64748b;">
                Class Starts: ${fmtT(sched.start_time)}<br/>
                ${arrivalTime ? `Time Arrival: <strong style="color: #b45309;">${arrivalTime}</strong><br/>` : ''}
                Class Ends: ${fmtT(sched.end_time)}
              </span>
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

      const logoUrl = "https://enrollment-system-aclc.vercel.app/logo-aclc.png";
      const trackingId = student.id.split('-')[0].toUpperCase();
      const pronoun = student.gender?.toLowerCase() === 'female' ? 'daughter' : 'son';
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
            <p style="margin: 0 0 20px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">${currentDay}, ${new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' })}</p>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">Dear <strong>${student.guardian_first_name || 'Guardian'}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">We would like to inform you that your ${pronoun}, <strong>${student.first_name} ${student.last_name}</strong>, has completed their school day at <strong>AMA ACLC Northbay</strong>. Below is their full attendance summary for today.</p>

            ${warningAlert}
            ${checklistHtml}

            <div style="margin-top: 30px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
              <p style="margin: 0 0 12px; font-size: 11px; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 1.5px;">Student Portal Access</p>
              <p style="margin: 0 0 12px; font-size: 13px; color: #64748b;">You may check your ${pronoun}'s enrollment status and schedule using the following credentials at <a href="https://enrollment-system-aclc.vercel.app/status" style="color: #1d4ed8; font-weight: 700;">enrollment-system-aclc.vercel.app/status</a>:</p>
              <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Surname</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: 800;">${student.last_name}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Tracking ID</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: 800;">${trackingId}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">LRN</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: 800;">${student.lrn || '—'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Section</td>
                  <td style="padding: 8px 0; color: #0f172a; font-weight: 800;">${student.section}</td>
                </tr>
              </table>
            </div>

            <p style="margin-top: 20px; font-size: 12px; color: #64748b;">This is an automated system message generated by AMA ACLC NORTHBAY.</p>
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
            sender: { name: "ACLC Attendance System", email: "franknathan12@gmail.com" },
            to: [{ email: student.guardian_email, name: student.guardian_first_name || "Guardian" }],
            subject: `Daily Attendance Report: ${student.first_name} ${student.last_name} — ${currentDay}, ${dateStr}`,
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
