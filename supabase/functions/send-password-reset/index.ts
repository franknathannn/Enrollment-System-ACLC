import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const { type, record } = payload;

    // We only care about new tokens being created
    if (type !== 'INSERT' || !record) {
      return new Response('Not an insert event', { status: 200 });
    }

    // Only handle 'reset' types (setup tokens might be handled differently or we can add them later)
    if (record.type !== 'reset') {
      return new Response('Not a reset token', { status: 200 });
    }

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL');
    const BASE_URL = Deno.env.get('NEXT_PUBLIC_BASE_URL') || 'https://enrollment-system-aclc.vercel.app';

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get student details
    const { data: student, error: studentError } = await supabaseClient
      .from('students')
      .select('first_name, last_name, email, guardian_email')
      .eq('id', record.student_id)
      .single();

    if (studentError || !student) {
      console.error("Student not found:", studentError);
      return new Response('Student not found', { status: 200 });
    }

    const targetEmail = student.email || student.guardian_email;
    if (!targetEmail) {
      return new Response('No email address found for student', { status: 200 });
    }

    // 2. Build the email
    const resetLink = `${BASE_URL}/student/reset-password?token=${record.token}`;
    const logoUrl = `${BASE_URL}/logo-aclc.png`;

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${logoUrl}" alt="ACLC Logo" style="width: 80px; height: 80px; object-fit: contain;" />
          <h2 style="color: #1d4ed8; margin-top: 10px; text-transform: uppercase; letter-spacing: 2px; font-weight: 800;">ACLC NORTHBAY</h2>
        </div>
        
        <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
          <h1 style="color: #1d4ed8; font-size: 24px; text-align: center; font-weight: 800; margin-top: 0;">Password Reset Request</h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
            Hi <strong>${student.first_name}</strong>, we received a request to reset your Student Portal password.
          </p>

          <p style="font-size: 14px; line-height: 1.6; color: #4b5563;">
            Click the button below to set a new password. This link will expire in <strong>1 hour</strong> and can only be used once.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 18px 35px; border-radius: 50px; text-decoration: none; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; font-size: 14px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37,99,235,0.4);">
              Reset My Password
            </a>
          </div>

          <div style="background-color: #fef3c7; border: 1px solid #fde68a; padding: 16px; border-radius: 12px; margin-top: 20px;">
            <p style="margin: 0; font-size: 12px; color: #92400e; font-weight: bold;">⚠️ Didn't request this?</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #92400e;">
              If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
        </div>

        <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 30px;">
          This is an automated message from the ACLC Enrollment System. Do not reply.
        </p>
      </div>
    `;

    // 3. Send email via Brevo
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY || '',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: "ACLC Registrar", email: SENDER_EMAIL },
        to: [{ email: targetEmail, name: student.first_name }],
        subject: "Password Reset Request - ACLC Student Portal",
        htmlContent: htmlContent
      })
    });

    if (response.ok) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      const errorText = await response.text();
      console.error("Brevo error:", errorText);
      return new Response(JSON.stringify({ error: errorText }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

  } catch (err: any) {
    console.error("Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
});
