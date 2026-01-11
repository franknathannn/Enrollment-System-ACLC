export async function sendEnrollmentEmail(student: any, status: string, feedback?: string) {
    // If status is not Approved or Rejected, don't send an email
    if (!['Approved', 'Rejected'].includes(status)) return true;
  
    try {
      const isApproved = status === 'Approved';
      const logoUrl = "https://ama-aclc-northbay-es.vercel.app/logo-aclc.png";
      const statusLink = "https://ama-aclc-northbay-es.vercel.app/status";
      const studentName = `${student.first_name} ${student.last_name}`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${logoUrl}" alt="ACLC Logo" style="width: 80px;" />
            <h2 style="color: #1d4ed8;">ACLC College Northbay</h2>
          </div>
          <div style="background: #fff; border-radius: 8px; padding: 30px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h1 style="color: ${isApproved ? '#15803d' : '#991b1b'}; text-align: center;">
              ${isApproved ? `Congratulations, ${student.first_name}!` : 'Status Update Required'}
            </h1>
            <p>Hi <strong>${studentName}</strong>,</p>
            <p>${isApproved 
              ? 'Welcome to the family! Your application has been <strong>APPROVED</strong>.' 
              : 'Thank you for your application. We reviewed your documents and found some issues that need your attention.'}
            </p>
            ${isApproved ? `
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <p style="margin: 0; font-size: 12px; color: #15803d; text-transform: uppercase;">Assigned Section</p>
                <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #166534;">${student.section || 'TBA'}</p>
              </div>
            ` : `
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #991b1b;">Registrar Feedback:</p>
                <p style="margin-top: 5px; color: #7f1d1d;">${feedback || 'Incomplete or Invalid Requirements.'}</p>
              </div>
            `}
            <div style="text-align: center; margin-top: 30px;">
              <a href="${statusLink}" style="background: #2563eb; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 50px; font-weight: bold;">
                ${isApproved ? 'Check Enrollment' : 'Fix My Application'}
              </a>
            </div>
          </div>
        </div>
      `;
  
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.NEXT_PUBLIC_BREVO_API_KEY || '', // Use NEXT_PUBLIC for browser-side fetch
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: "ACLC Registrar", email: "admissions@aclc-northbay.com" },
          to: [{ email: student.email, name: studentName }],
          subject: isApproved ? 'Application Approved - ACLC Northbay' : 'Action Required - ACLC Northbay',
          htmlContent: htmlContent
        })
      });
  
      return res.ok;
    } catch (error) {
      console.error("Mail Error:", error);
      return false;
    }
  }
    
    // Prepare the HTML content (The same professional format you provided)
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #1f2937;">
        <div style="text-align: center;">
          <img src="${logoUrl}" style="width:80px;" />
          <h2>ACLC College Northbay</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #eee;">
          <h1>${isApproved ? 'Congratulations!' : 'Status Update'}</h1> 
          <p>Dear ${record.first_name},</p>
          <p>${isApproved ? 'You are APPROVED for ' + record.section : record.registrar_feedback}</p>
        </div>
      </div>
    `;
  
    // THE KABOOM: Standard Fetch to Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY as string, // Get this from Brevo Dashboard
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: "ACLC Registrar", email: "your-gmail@gmail.com" },
        to: [{ email: record.email, name: record.first_name }],
        subject: isApproved ? "Application Approved" : "Action Required",
        htmlContent: htmlContent
      })
    });
  
    return response.ok;
  } 