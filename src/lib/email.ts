export async function sendEnrollmentEmail(record: any) {
    const isApproved = record.status === 'Approved';
    const logoUrl = "https://ama-aclc-northbay-es.vercel.app/logo-aclc.png";
    const statusLink = "https://ama-aclc-northbay-es.vercel.app/status";
    
    // Format the feedback for HTML
    const formattedReason = (record.registrar_feedback || 'Incomplete or Invalid Requirements.')
      .replace(/\n/g, '<br/>');
  
    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${logoUrl}" alt="ACLC Logo" style="width: 80px; height: 80px;" />
          <h2 style="color: #1d4ed8; margin-top: 10px; text-transform: uppercase;">ACLC College Northbay</h2>
        </div>
        
        <div style="background-color: #ffffff; border-radius: 16px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
          <h1 style="color: ${isApproved ? '#15803d' : '#991b1b'}; font-size: 24px; text-align: center;">
            ${isApproved ? `Congratulations, ${record.first_name}!` : 'Application Status Update'}
          </h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
            ${isApproved 
              ? 'We are thrilled to inform you that your application has been <strong>APPROVED</strong>. Welcome to the family!' 
              : `Dear <strong>${record.first_name}</strong>, thank you for your interest. We noticed a few things that need your attention.`}
          </p>
  
          ${isApproved ? `
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; margin: 25px 0; border-radius: 12px; text-align: center;">
              <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #15803d; font-weight: bold;">Assigned Section</p>
              <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: 800; color: #166534;">${record.section || 'TBA'}</p>
            </div>
          ` : `
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 8px;">
              <p style="margin: 0; font-weight: bold; color: #991b1b; text-transform: uppercase; font-size: 12px;">Registrar Feedback</p>
              <div style="margin-top: 10px; color: #7f1d1d;">${formattedReason}</div>
            </div>
          `}
  
          <div style="text-align: center; margin-top: 30px;">
            <a href="${statusLink}" style="background-color: #2563eb; color: #ffffff; padding: 16px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; display: inline-block;">
              ${isApproved ? 'Check Enrollment Status' : 'Fix My Application'}
            </a>
          </div>
        </div>
      </div>
    `;
  
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.NEXT_PUBLIC_BREVO_API_KEY || process.env.BREVO_API_KEY as string,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: "ACLC Registrar", email: "your-verified-email@gmail.com" },
        to: [{ email: record.email, name: record.first_name }],
        subject: isApproved ? 'Application Approved - ACLC Northbay' : 'Action Required: Status Update',
        htmlContent: htmlContent
      })
    });
  
    return response.ok;
}