import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const { type, record, old_record } = payload;

    // ── MOCK GUARD — bail immediately, no email ever sent for mock rows ──────
    if (record?.mock === true) {
      return new Response('Mock record — email suppressed', { status: 200 });
    }

    const isInsert = type === 'INSERT' || !old_record;
    const isUpdate = type === 'UPDATE' || !!old_record;

    // Logic to detect section switch (From one valid section to another)
    const isSectionSwitch = isUpdate &&
      old_record &&
      record.section !== old_record.section &&
      old_record.section &&
      old_record.section !== 'Unassigned' &&
      record.section &&
      record.section !== 'Unassigned';

    // 1. Silent Guard: Route logic based on Insert vs Update
    if (isUpdate) {
      const isStatusChange = record.status !== old_record?.status;
      const isRelevantStatus = ['Approved', 'Rejected'].includes(record.status);
      if (!isSectionSwitch && (!isStatusChange || !isRelevantStatus)) {
        return new Response('Status unchanged, not a relevant status, or not a section switch', { status: 200 });
      }
    }

    // --- DEFINE VARIABLES ---
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: config } = await supabaseClient.from('system_config').select('notify_parents_status').maybeSingle();
    const shouldNotifyParents = config?.notify_parents_status ?? true;

    const isApproved = record.status === 'Approved';
    const logoUrl = "https://enrollment-system-aclc.vercel.app/logo-aclc.png";
    const statusLink = "https://enrollment-system-aclc.vercel.app/status";
    const portalLink = record.id ? 'https://enrollment-system-aclc.vercel.app/portal/' + record.id : statusLink;
    const studentUuid = record.id ? record.id.split('-')[0].toUpperCase() : '';

    // QR Code URLs — dark and light themed matching the status page StudentQRCard
    const qrDarkUrl = record.id ? 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + record.id + '&color=e2e8f0&bgcolor=0a0f1e' : '';
    const qrLightUrl = record.id ? 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + record.id + '&color=0a0f1e&bgcolor=ffffff' : '';

    let subject = '';
    if (isInsert) {
      subject = 'Application Received - ACLC Northbay';
    } else if (isSectionSwitch) {
      subject = 'Section Transfer Notice - ACLC Northbay';
    } else {
      subject = isApproved
        ? 'Application Approved - ACLC Northbay'
        : 'Action Required: Application Status Update - ACLC Northbay';
    }

    const rawReason = record.registrar_feedback || 'Incomplete or Invalid Requirements.';
    const formattedReason = rawReason
      .replace(/,\n/g, '<br/>')
      .replace(/\n/g, '<br/>')
      .replace(/, /g, '<br/>');

    // Format times helper
    function fmtT(t: string): string {
      const parts = t.slice(0, 5).split(':').map(Number);
      const h = parts[0];
      const m = parts[1];
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr = h % 12 || 12;
      return hr + ':' + String(m).padStart(2, '0') + ' ' + ampm;
    }

    // ── Build QR Card HTML (dark + light, matching StudentQRCard) ──
    const studentName = (record.first_name || '') + ' ' + (record.last_name || '');
    const sectionBadge = record.section || '';

    let qrCardHtml = '';
    if (isApproved || isSectionSwitch) {
      const sectionPill = sectionBadge
        ? '<div style="text-align:center;padding-top:16px;"><span style="display:inline-block;background:#dbeafe;color:#1d4ed8;padding:6px 20px;border-radius:99px;font-size:10px;font-weight:900;letter-spacing:1px;text-transform:uppercase;">' + sectionBadge + '</span></div>'
        : '';

      qrCardHtml = [
        '<div style="margin-top:30px;">',
        '<p style="margin:0 0 15px 0;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#64748b;font-weight:800;text-align:center;">Your Attendance QR Code</p>',

        '<div style="background:#f0f4ff;border-radius:24px;border:1.5px solid #c7d7f8;overflow:hidden;position:relative;">',
        '<div style="position:absolute;top:0;left:0;right:0;bottom:0;opacity:0.5;background-image:linear-gradient(#c7d7f8 1px, transparent 1px), linear-gradient(90deg, #c7d7f8 1px, transparent 1px);background-size:20px 20px;"></div>',
        
        // Header
        '<div style="position:relative;background:linear-gradient(135deg,#1d4ed8,#1e40af);padding:16px 20px;">',
        '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>',
        '<td width="50" valign="middle">',
        '<div style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.22);text-align:center;padding:2px;box-sizing:border-box;"><img src="' + logoUrl + '" alt="ACLC" style="width:100%;height:100%;object-fit:contain;border-radius:6px;" /></div>',
        '</td>',
        '<td valign="middle">',
        '<p style="margin:0;color:#fff;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;line-height:1.1;">AMA ACLC</p>',
        '<p style="margin:2px 0 0;color:#bfdbfe;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:2px;line-height:1.1;opacity:0.9;">Northbay College</p>',
        '</td>',
        '<td align="right" valign="bottom">',
        '<p style="margin:0;color:rgba(255,255,255,0.4);font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:1px;line-height:1.2;">Student</p>',
        '<p style="margin:1px 0 0;color:rgba(255,255,255,0.4);font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:1px;line-height:1.2;">Attendance QR</p>',
        '</td>',
        '</tr></table>',
        '</div>',

        '<div style="position:relative;text-align:center;padding:24px 0 0;">',
        '<div style="display:inline-block;background:#fff;padding:12px;border-radius:20px;box-shadow:0 10px 25px rgba(0,0,0,0.03);border:1px solid #e2e8f0;">',
        '<img src="' + qrLightUrl + '" alt="QR Code" style="width:220px;height:220px;display:block;" />',
        '</div>',
        '</div>',
        
        sectionPill,
        
        '<div style="position:relative;text-align:center;padding:12px 20px 24px;">',
        '<p style="margin:0;color:#0f172a;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">' + studentName + '</p>',
        '<p style="margin:4px 0 0;color:#64748b;font-size:10px;font-weight:700;">LRN: ' + (record.lrn || 'N/A') + '</p>',
        
        '<div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0;">',
        '<p style="margin:0;color:#64748b;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Scan this QR for attendance · Keep it private</p>',
        '</div>',
        '</div>',

        // Action Button — links to the portal page for full styled download
        '<div style="position:relative;padding:0 20px 24px;">',
        '<a href="' + portalLink + '" target="_blank" style="display:block;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#ffffff;text-decoration:none;text-align:center;padding:14px;border-radius:14px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;box-shadow:0 10px 25px -5px rgba(29,78,216,0.4);">',
        'Download QR Code',
        '</a>',
        '</div>',

        '</div>',
        '</div>'
      ].join('');
    }

    // ── Build Schedule Snippet HTML (color-coded like ScheduleGrid) ──
    const SUBJECT_COLORS = [
      { bg: '#eff6ff', text: '#3b82f6', border: '#bfdbfe' },
      { bg: '#f5f3ff', text: '#8b5cf6', border: '#ddd6fe' },
      { bg: '#ecfdf5', text: '#10b981', border: '#a7f3d0' },
      { bg: '#fffbeb', text: '#f59e0b', border: '#fde68a' },
      { bg: '#fef2f2', text: '#ef4444', border: '#fecaca' },
      { bg: '#ecfeff', text: '#06b6d4', border: '#a5f3fc' },
      { bg: '#fdf4ff', text: '#d946ef', border: '#f0abfc' },
      { bg: '#f0fdfa', text: '#14b8a6', border: '#99f6e4' },
      { bg: '#fff7ed', text: '#f97316', border: '#fed7aa' },
      { bg: '#f7fee7', text: '#84cc16', border: '#bef264' },
    ];

    let scheduleHtml = '';
    if ((isApproved || isSectionSwitch) && record.section) {
      const { data: scheds } = await supabaseClient
        .from('schedules')
        .select('*')
        .eq('section', record.section)
        .eq('school_year', record.school_year || '2025-2026');

      if (scheds && scheds.length > 0) {
        const uniqueSubjects = [...new Set(scheds.map((s: any) => s.subject))] as string[];
        const colorMap: Record<string, typeof SUBJECT_COLORS[0]> = {};
        uniqueSubjects.forEach((sub, i) => { colorMap[sub] = SUBJECT_COLORS[i % SUBJECT_COLORS.length]; });

        const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        scheds.sort((a: any, b: any) => {
          const dDiff = daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day);
          if (dDiff !== 0) return dDiff;
          return a.start_time.localeCompare(b.start_time);
        });

        const groupedByDay: Record<string, any[]> = {};
        for (const s of scheds) {
          if (!groupedByDay[s.day]) groupedByDay[s.day] = [];
          groupedByDay[s.day].push(s);
        }

        let dayRowsHtml = '';
        for (const day of daysOrder) {
          const dayScheds = groupedByDay[day];
          if (!dayScheds || dayScheds.length === 0) continue;

          let subjectsHtml = '';
          for (const s of dayScheds) {
            const col = colorMap[s.subject] || SUBJECT_COLORS[0];
            subjectsHtml += '<div style="display:inline-block;background:' + col.bg + ';border:1px solid ' + col.border + ';border-radius:12px;padding:8px 14px;margin:3px 4px 3px 0;vertical-align:top;">';
            subjectsHtml += '<p style="margin:0;font-size:11px;font-weight:900;color:' + col.text + ';text-transform:uppercase;letter-spacing:0.5px;">' + s.subject + '</p>';
            subjectsHtml += '<p style="margin:3px 0 0;font-size:10px;font-weight:700;color:#64748b;">' + fmtT(s.start_time) + ' – ' + fmtT(s.end_time) + '</p>';
            if (s.room) subjectsHtml += '<p style="margin:2px 0 0;font-size:9px;color:#94a3b8;">' + s.room + '</p>';
            if (s.teacher) subjectsHtml += '<p style="margin:2px 0 0;font-size:9px;color:#94a3b8;">' + s.teacher + '</p>';
            subjectsHtml += '</div>';
          }

          dayRowsHtml += '<tr><td style="padding:10px 14px;font-weight:900;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:1px;vertical-align:top;border-bottom:1px solid #f1f5f9;width:90px;">' + day.slice(0, 3) + '</td>';
          dayRowsHtml += '<td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;vertical-align:top;">' + subjectsHtml + '</td></tr>';
        }

        let legendHtml = '';
        for (const sub of uniqueSubjects) {
          const col = colorMap[sub];
          legendHtml += '<span style="display:inline-block;background:' + col.bg + ';border:1px solid ' + col.border + ';color:' + col.text + ';padding:3px 10px;border-radius:20px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;margin:2px;">' + sub + '</span>';
        }

        scheduleHtml = '<div style="margin-top:30px;">'
          + '<p style="margin:0 0 12px 0;font-size:13px;text-transform:uppercase;letter-spacing:2px;color:#475569;font-weight:900;text-align:center;">Official Schedule</p>'
          + '<table style="width:100%;border-collapse:collapse;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.07);"><tbody>'
          + dayRowsHtml
          + '</tbody></table>'
          + '<div style="margin-top:12px;text-align:center;">' + legendHtml + '</div>'
          + '<div style="margin-top:18px;text-align:center;">'
          + '<a href="' + portalLink + '" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#ea580c,#f97316);color:#ffffff;text-decoration:none;padding:12px 30px;border-radius:14px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;box-shadow:0 10px 25px -5px rgba(234,88,12,0.4);">Download Schedule</a>'
          + '</div>'
          + '</div>';
      }
    }

    // 2. THE BEAUTIFIED HTML TEMPLATE CONTENT
    let contentHtml = '';

    if (isInsert) {
      contentHtml = '<h1 style="color:#4f46e5;margin-top:0;font-size:28px;text-align:center;font-weight:800;">Application Received</h1>'
        + '<p style="font-size:18px;line-height:1.6;color:#4f46e5;text-align:center;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:20px;">HELLO STUDENT ' + studentUuid + '</p>'
        + '<p style="font-size:16px;line-height:1.6;color:#4b5563;text-align:center;">Dear <strong>' + record.last_name + '</strong> LRN <strong>' + record.lrn + '</strong>,</p>'
        + '<p style="font-size:16px;line-height:1.6;color:#4b5563;text-align:center;">We have successfully received your application for enrollment at AMA ACLC NORTHBAY.</p>'
        + '<p style="font-size:14px;color:#6b7280;text-align:center;font-style:italic;margin-top:25px;">Our registrar team is currently reviewing your documents. We will send you another email once your application status changes.</p>';
    } else if (isSectionSwitch) {
      contentHtml = '<h1 style="color:#1d4ed8;margin-top:0;font-size:28px;text-align:center;font-weight:800;">Section Transfer Notice</h1>'
        + '<p style="font-size:18px;line-height:1.6;color:#1d4ed8;text-align:center;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:20px;">HELLO STUDENT ' + studentUuid + '</p>'
        + '<p style="font-size:16px;line-height:1.6;color:#4b5563;text-align:center;">Dear <strong>' + record.last_name + '</strong>,</p>'
        + '<p style="font-size:16px;line-height:1.6;color:#4b5563;text-align:center;">This is to inform you that your section assignment has been updated.</p>'
        + '<div style="background-color:#eff6ff;border:1px solid #bfdbfe;padding:25px;margin:30px 0;border-radius:12px;text-align:center;">'
        + '<p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#1e40af;font-weight:700;">New Section Assignment</p>'
        + '<p style="margin:8px 0 0 0;font-size:32px;font-weight:900;color:#1e3a8a;">' + (record.section || 'TBA') + '</p>'
        + '<p style="margin:8px 0 0 0;font-size:14px;color:#64748b;">(Previously: ' + old_record.section + ')</p>'
        + '</div>'
        + scheduleHtml
        + qrCardHtml;
    } else if (isApproved) {
      contentHtml = '<h1 style="color:#15803d;margin-top:0;font-size:28px;text-align:center;font-weight:800;">Congratulations, ' + record.last_name + '!</h1>'
        + '<p style="font-size:18px;line-height:1.6;color:#15803d;text-align:center;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:20px;">HELLO STUDENT ' + studentUuid + '</p>'
        + '<p style="font-size:16px;line-height:1.6;color:#4b5563;text-align:center;">We are thrilled to inform you that your application has been <strong>APPROVED</strong>. Welcome to the family!</p>'
        + '<div style="background-color:#f0fdf4;border:1px solid #bbf7d0;padding:25px;margin:30px 0;border-radius:12px;text-align:center;">'
        + '<p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#15803d;font-weight:700;">Assigned Section</p>'
        + '<p style="margin:8px 0 0 0;font-size:32px;font-weight:900;color:#166534;">' + (record.section || 'TBA') + '</p>'
        + '</div>'
        + scheduleHtml
        + qrCardHtml;
    } else {
      contentHtml = '<h1 style="color:#991b1b;margin-top:0;font-size:26px;text-align:center;font-weight:800;">Application Status Update</h1>'
        + '<p style="font-size:18px;line-height:1.6;color:#991b1b;text-align:center;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:20px;">HELLO STUDENT ' + studentUuid + '</p>'
        + '<p style="font-size:16px;line-height:1.6;color:#4b5563;">Dear <strong>' + record.last_name + '</strong>,</p>'
        + '<p style="font-size:16px;line-height:1.6;color:#4b5563;">Thank you for your interest in joining the ACLC Northbay Community. We have reviewed your application, and we noticed a few things that need your attention before we can proceed.</p>'
        + '<div style="background-color:#fef2f2;border-left:5px solid #ef4444;padding:20px;margin:25px 0;border-radius:8px;">'
        + '<p style="margin:0;font-weight:800;color:#991b1b;text-transform:uppercase;font-size:12px;letter-spacing:1px;">Registrar Feedback</p>'
        + '<div style="margin-top:10px;color:#7f1d1d;font-weight:600;line-height:1.8;font-size:15px;">' + formattedReason + '</div>'
        + '</div>'
        + '<p style="font-size:16px;line-height:1.6;color:#4b5563;"><strong>Don\'t worry!</strong> This is just a small bump in the road. You can easily update your application details and re-submit your documents through our status portal.</p>'
        + '<div style="text-align:center;margin-top:35px;margin-bottom:20px;">'
        + '<a href="' + statusLink + '" style="background-color:#2563eb;color:#ffffff;padding:18px 35px;border-radius:50px;text-decoration:none;font-weight:800;text-transform:uppercase;letter-spacing:1px;font-size:14px;display:inline-block;box-shadow:0 10px 15px -3px rgba(37,99,235,0.4);">Fix My Application</a>'
        + '</div>';
    }

    // Wrapper
    const htmlContent = '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;color:#1f2937;max-width:600px;margin:0 auto;padding:20px;background-color:#f9fafb;">'
      + '<div style="text-align:center;margin-bottom:30px;">'
      + '<a href="https://enrollment-system-aclc.vercel.app" target="_blank" style="text-decoration:none;">'
      + '<img src="' + logoUrl + '" alt="ACLC Logo" style="width:80px;height:80px;object-fit:contain;" />'
      + '</a>'
      + '<h2 style="color:#1d4ed8;margin-top:10px;text-transform:uppercase;letter-spacing:2px;font-weight:800;">AMA ACLC NORTHBAY</h2>'
      + '</div>'
      + '<div style="background-color:#ffffff;border-radius:16px;padding:40px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);border:1px solid #e5e7eb;">'
      + contentHtml
      + '</div>'
      + '<div style="text-align:center;margin-top:35px;color:#9ca3af;font-size:12px;">'
      + '<p style="margin:0;">&copy; ' + new Date().getFullYear() + ' AMA ACLC Northbay Campus. All rights reserved.</p>'
      + '</div></div>';

    // 3. THE BREVO SEND-OFF
    const emailBody: any = {
      sender: { name: "ACLC Registrar", email: SENDER_EMAIL },
      to: [{ email: record.email, name: record.first_name }],
      subject: subject,
      htmlContent: htmlContent
    };

    if (shouldNotifyParents && record.guardian_email) {
      emailBody.cc = [{ email: record.guardian_email, name: record.guardian_first_name || "Guardian" }];
    }

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY || '',
        'content-type': 'application/json'
      },
      body: JSON.stringify(emailBody)
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
});