import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const { type, record } = payload;

    if (type !== 'INSERT' || !record) {
      return new Response('Not an insert event', { status: 200 });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // 1. Verify Global Config
    const { data: config } = await supabaseClient.from('system_config').select('notify_parents_attendance').maybeSingle();
    if (!config?.notify_parents_attendance) {
      return new Response('Attendance notifications are disabled globally', { status: 200 });
    }

    // 2. Anti-Spam (First Scan of the Day)
    const today = new Date().toISOString().split('T')[0];
    const studentId = record.student_id || record.id;

    const { count, error: countErr } = await supabaseClient
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('date', today);

    if (countErr) throw new Error("Count query failed: " + countErr.message);
    if (count && count > 1) {
      return new Response('Silent Logging: Not the first scan of the day', { status: 200 });
    }

    // 3. Fetch Student Context
    const { data: student, error: studentErr } = await supabaseClient
      .from('students')
      .select('first_name, last_name, lrn, section, guardian_email, guardian_first_name, email, school_year')
      .eq('id', studentId)
      .single();

    if (studentErr) throw new Error("Student fetch failed: " + studentErr.message);
    if (!student || !student.guardian_email) {
      return new Response('No student or guardian email found', { status: 200 });
    }

    // 4. Fetch today's schedule for the student's section
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = daysOfWeek[new Date().getDay()];

    const { data: scheds } = await supabaseClient
      .from('schedules')
      .select('subject, start_time, end_time, room, teacher, is_online, gclass_link')
      .eq('section', student.section)
      .eq('day', currentDay)
      .order('start_time', { ascending: true });

    // Time formatting helper
    function fmtT(t: string): string {
      if (!t) return 'N/A';
      const parts = t.slice(0, 5).split(':').map(Number);
      const h = parts[0]; const m = parts[1];
      return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM');
    }

    // Parse arrival time
    let scanTimeFormatted = record.time || 'N/A';
    let arrivalMinutes = 0;
    try {
      if (record.time) {
        const [h, m] = record.time.split(':').map(Number);
        scanTimeFormatted = fmtT(record.time);
        arrivalMinutes = h * 60 + m;
      }
    } catch { /* fallback */ }

    // 5. Build schedule context — what they missed, what they checked into
    let scheduleContextHtml = '';
    const checkedInSubject = record.subject || '';

    if (scheds && scheds.length > 0) {
      // Find the first class start time
      const firstClassStart = scheds[0].start_time;
      const firstClassStartFormatted = fmtT(firstClassStart);

      // Determine which subjects are before the checked-in subject (missed)
      const missedSubjects: any[] = [];
      let foundCheckedIn = false;
      let checkedInOrder = 0;

      for (let i = 0; i < scheds.length; i++) {
        if (scheds[i].subject === checkedInSubject) {
          foundCheckedIn = true;
          checkedInOrder = i + 1;
          break;
        }
        missedSubjects.push(scheds[i]);
      }

      // Build the context block
      scheduleContextHtml = '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;">'
        + '<p style="margin:0 0 12px;font-weight:900;color:#475569;text-transform:uppercase;font-size:11px;letter-spacing:1.5px;">Today\'s Schedule Context</p>';

      // Class start time
      scheduleContextHtml += '<table style="width:100%;border-bottom:1px dashed #cbd5e1;padding:8px 0;"><tr>'
        + '<td style="font-size:13px;color:#64748b;padding:8px 0;">Class Starts</td>'
        + '<td style="font-size:13px;font-weight:800;color:#1e293b;text-align:right;padding:8px 0;">' + firstClassStartFormatted + '</td>'
        + '</tr></table>';

      // Arrival time  
      scheduleContextHtml += '<table style="width:100%;border-bottom:1px dashed #cbd5e1;"><tr>'
        + '<td style="font-size:13px;color:#64748b;padding:8px 0;">Time of Arrival</td>'
        + '<td style="font-size:13px;font-weight:800;color:#b45309;text-align:right;padding:8px 0;">' + scanTimeFormatted + '</td>'
        + '</tr></table>';

      // Departure time (end of last class)
      const lastClassEnd = scheds[scheds.length - 1].end_time;
      const lastClassEndFormatted = fmtT(lastClassEnd);
      scheduleContextHtml += '<table style="width:100%;border-bottom:1px dashed #cbd5e1;"><tr>'
        + '<td style="font-size:13px;color:#64748b;padding:8px 0;">Class Ends </td>'
        + '<td style="font-size:13px;font-weight:800;color:#1e293b;text-align:right;padding:8px 0;">' + lastClassEndFormatted + '</td>'
        + '</tr></table>';

      // Missed subjects
      if (missedSubjects.length > 0) {
        scheduleContextHtml += '<div style="margin-top:12px;">'
          + '<p style="margin:0 0 8px;font-weight:800;color:#dc2626;font-size:11px;text-transform:uppercase;letter-spacing:1px;">⚠ Missed Subjects (' + missedSubjects.length + ')</p>';

        for (const ms of missedSubjects) {
          scheduleContextHtml += '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin-bottom:6px;">'
            + '<span style="font-weight:800;color:#991b1b;font-size:12px;">' + ms.subject + '</span>'
            + (ms.is_online ? '<span style="color:#3b82f6;font-size:10px;font-weight:800;margin-left:6px;">(online)</span>' : '')
            + '<span style="float:right;color:#b91c1c;font-size:11px;font-weight:700;">' + fmtT(ms.start_time) + ' – ' + fmtT(ms.end_time) + '</span>'
            + '<span style="display:block;font-size:10px;color:#dc2626;font-weight:700;margin-top:2px;">(Absent)</span>'
            + '</div>';
        }
        scheduleContextHtml += '</div>';
      }

      // Checked-in subject
      if (foundCheckedIn) {
        const ordinalSuffix = checkedInOrder === 1 ? 'st' : checkedInOrder === 2 ? 'nd' : checkedInOrder === 3 ? 'rd' : 'th';
        scheduleContextHtml += '<div style="margin-top:12px;">'
          + '<p style="margin:0 0 8px;font-weight:800;color:#15803d;font-size:11px;text-transform:uppercase;letter-spacing:1px;">✓ Checked In</p>'
          + '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;">'
          + '<span style="font-weight:800;color:#166534;font-size:12px;">' + checkedInSubject + '</span>'
          + (scheds && scheds.find((s: any) => s.subject === checkedInSubject)?.is_online ? '<span style="color:#3b82f6;font-size:10px;font-weight:800;margin-left:6px;">(online)</span>' : '')
          + '<span style="float:right;color:#15803d;font-size:11px;font-weight:700;">' + checkedInOrder + ordinalSuffix + ' Subject</span>'
          + '<span style="display:block;font-size:10px;color:#16a34a;font-weight:700;margin-top:2px;">' + (record.status || 'PRESENT') + '</span>'
          + '</div></div>';
      }

      // Remaining subjects
      const remainingStart = foundCheckedIn ? (missedSubjects.length + 1) : missedSubjects.length;
      const remaining = scheds.slice(remainingStart);
      if (remaining.length > 0) {
        scheduleContextHtml += '<div style="margin-top:12px;">'
          + '<p style="margin:0 0 8px;font-weight:800;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Upcoming Classes (' + remaining.length + ')</p>';

        for (const rs of remaining) {
          scheduleContextHtml += '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;margin-bottom:4px;">'
            + '<span style="font-weight:700;color:#475569;font-size:12px;">' + rs.subject + '</span>'
            + (rs.is_online ? '<span style="color:#3b82f6;font-size:10px;font-weight:800;margin-left:6px;">(online)</span>' : '')
            + '<span style="float:right;color:#94a3b8;font-size:11px;font-weight:600;">' + fmtT(rs.start_time) + ' – ' + fmtT(rs.end_time) + '</span>'
            + '</div>';
        }
        scheduleContextHtml += '</div>';
      }

      scheduleContextHtml += '</div>';
    }

    // 6. Construct Email
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL');
    const logoUrl = "https://ama-aclc-northbay-es.vercel.app/logo-aclc.png";

    const htmlContent = '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;color:#1f2937;max-width:600px;margin:0 auto;padding:20px;background-color:#f9fafb;">'
      + '<div style="text-align:center;margin-bottom:30px;">'
      + '<a href="https://ama-aclc-northbay-es.vercel.app" target="_blank" style="text-decoration:none;">'
      + '<img src="' + logoUrl + '" alt="ACLC Logo" style="width:80px;height:80px;object-fit:contain;" />'
      + '</a>'
      + '<h2 style="color:#1d4ed8;margin-top:10px;text-transform:uppercase;letter-spacing:2px;font-weight:800;">ACLC NORTHBAY</h2>'
      + '</div>'
      + '<div style="background-color:#ffffff;border-radius:16px;padding:40px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);border:1px solid #e5e7eb;">'
      + '<h1 style="color:#b45309;margin-top:0;font-size:26px;text-align:center;font-weight:800;">Arrival Notification</h1>'
      + '<p style="font-size:16px;line-height:1.6;color:#4b5563;">Dear <strong>' + (student.guardian_first_name || 'Guardian') + '</strong>,</p>'
      + '<p style="font-size:16px;line-height:1.6;color:#4b5563;">This is an automated alert to notify you that <strong>' + student.first_name + ' ' + student.last_name + '</strong> has arrived on campus.</p>'
      + '<div style="background-color:#fffbeb;border-left:5px solid #f59e0b;padding:20px;margin:25px 0;border-radius:8px;">'
      + '<p style="margin:0;font-weight:800;color:#b45309;text-transform:uppercase;font-size:12px;letter-spacing:1px;">Scan Record</p>'
      + '<div style="margin-top:10px;color:#92400e;font-size:15px;">'
      + '<strong>Time of Arrival:</strong> ' + scanTimeFormatted + '<br/>'
      + '<strong>Subject Check-In:</strong> ' + (record.subject || 'Unknown Subject') + '<br/>'
      + '<strong>Status:</strong> ' + (record.status || 'Present')
      + '</div></div>'
      + scheduleContextHtml
      + '<p style="font-size:14px;line-height:1.6;color:#94a3b8;text-align:center;font-style:italic;">A comprehensive attendance summary will be provided at the end of the school day.</p>'
      + '</div>'
      + '<div style="text-align:center;margin-top:35px;color:#9ca3af;font-size:12px;">'
      + '<p style="margin:0;">&copy; ' + new Date().getFullYear() + ' ACLC NORTHBAY Campus. All rights reserved.</p>'
      + '</div></div>';

    // 7. Dispatch via Brevo
    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY || '',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: "ACLC Campus Security", email: SENDER_EMAIL },
        to: [{ email: student.guardian_email, name: student.guardian_first_name || "Guardian" }],
        subject: "Campus Arrival Alert - ACLC Northbay",
        htmlContent: htmlContent
      })
    });

    const emailResult = await emailRes.text();
    console.log(">>> Brevo response:", emailRes.status, emailResult);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error(">>> FATAL ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
});
