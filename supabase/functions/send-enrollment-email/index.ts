import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const { record, old_record } = payload;

    // 1. Silent Guard: Only send on status change to Approved or Rejected
    if (old_record && record.status === old_record.status) {
      return new Response('Status unchanged', { status: 200 });
    }
    if (!['Approved', 'Rejected'].includes(record.status)) {
      return new Response('Status update not relevant for email', { status: 200 });
    }

    // --- DEFINE VARIABLES BEFORE HTML ---
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL');
    const isApproved = record.status === 'Approved';
    const logoUrl = "https://ama-aclc-northbay-es.vercel.app/logo-aclc.png";
    const statusLink = "https://ama-aclc-northbay-es.vercel.app/status";
    
    // Formatting Logic
    const subject = isApproved 
      ? 'Application Approved - ACLC Northbay' 
      : 'Action Required: Application Status Update - ACLC Northbay';

    const rawReason = record.registrar_feedback || 'Incomplete or Invalid Requirements.';
    const formattedReason = rawReason
      .replace(/,\n/g, '<br/>')
      .replace(/\n/g, '<br/>')
      .replace(/, /g, '<br/>');

    // 2. THE BEAUTIFIED HTML TEMPLATE
    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="https://ama-aclc-northbay-es.vercel.app" target="_blank" style="text-decoration: none;">
            <img src="${logoUrl}" alt="ACLC Logo" style="width: 80px; height: 80px; object-fit: contain;" />
          </a>
          <h2 style="color: #1d4ed8; margin-top: 10px; text-transform: uppercase; letter-spacing: 2px; font-weight: 800;">ACLC College Northbay</h2>
        </div>

        <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
          ${isApproved ? `
            <h1 style="color: #15803d; margin-top: 0; font-size: 28px; text-align: center; font-weight: 800;">Congratulations, ${record.first_name}!</h1>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
              We are thrilled to inform you that your application has been <strong>APPROVED</strong>. Welcome to the family!
            </p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 25px; margin: 30px 0; border-radius: 12px; text-align: center;">
              <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #15803d; font-weight: 700;">Assigned Section</p>
              <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: 900; color: #166534;">${record.section || 'TBA'}</p>
            </div>
            <p style="font-size: 14px; color: #6b7280; text-align: center; font-style: italic;">
              Please visit the campus registrar to finalize your enrollment requirements.
            </p>
          ` : `
            <h1 style="color: #991b1b; margin-top: 0; font-size: 26px; text-align: center; font-weight: 800;">Application Status Update</h1>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
              Dear <strong>${record.first_name}</strong>,
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
              Thank you for your interest in joining the ACLC Northbay Community. We have reviewed your application, and we noticed a few things that need your attention before we can proceed.
            </p>

            <div style="background-color: #fef2f2; border-left: 5px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 8px;">
              <p style="margin: 0; font-weight: 800; color: #991b1b; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Registrar Feedback</p>
              <div style="margin-top: 10px; color: #7f1d1d; font-weight: 600; line-height: 1.8; font-size: 15px;">
                ${formattedReason}
              </div>
            </div>

            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
              <strong>Don't worry!</strong> This is just a small bump in the road. You can easily update your application details and re-submit your documents through our status portal.
            </p>

            <div style="text-align: center; margin-top: 35px; margin-bottom: 20px;">
              <a href="${statusLink}" style="background-color: #2563eb; color: #ffffff; padding: 18px 35px; border-radius: 50px; text-decoration: none; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; font-size: 14px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4);">
                Fix My Application
              </a>
            </div>
          `}
        </div>

        <div style="text-align: center; margin-top: 35px; color: #9ca3af; font-size: 12px;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} AMA ACLC Northbay Campus. All rights reserved.</p>
        </div>
      </div>
    `;

    // 3. THE BREVO SEND-OFF
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY || '',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: "ACLC Registrar", email: SENDER_EMAIL },
        to: [{ email: record.email, name: record.first_name }],
        subject: subject,
        htmlContent: htmlContent
      })
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