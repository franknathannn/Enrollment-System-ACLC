// // Follow this setup guide to integrate the Deno language server with your editor:
// // https://deno.land/manual/getting_started/setup_your_environment
// // This enables autocomplete, go to definition, etc.

// // Setup type definitions for built-in Supabase Runtime APIs
// import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

// Deno.serve(async (req) => {
//   // 1. Verify Method
//   if (req.method !== 'POST') {
//     return new Response('Method Not Allowed', { status: 405 })
//   }

//   try {
//     const payload = await req.json()
//     const { record, old_record } = payload
    
//     // 2. Check if status actually changed
//     if (old_record && record.status === old_record.status) {
//       return new Response('Status unchanged', { status: 200 })
//     }

//     // 3. Filter for relevant statuses
//     if (!['Approved', 'Rejected'].includes(record.status)) {
//       return new Response('Status update not relevant for email', { status: 200 })
//     }

//     if (!record.email) {
//       return new Response('No email found for student', { status: 200 })
//     }

//     // 4. Prepare Email Content
//     const isApproved = record.status === 'Approved'
//     const subject = isApproved 
//       ? 'Application Approved - ACLC Northbay' 
//       : 'Action Required: Application Status Update - ACLC Northbay'
    
//     // Handle reason formatting (Check both columns, replace newlines/commas with HTML breaks)
//     const rawReason = record.registrar_feedback || 'Incomplete or Invalid Requirements.'
//     const formattedReason = rawReason
//       .replace(/,\n/g, '<br/>')
//       .replace(/\n/g, '<br/>')
//       .replace(/, /g, '<br/>')

//     const logoUrl = "https://ama-aclc-northbay-es.vercel.app/logo-aclc.png"
//     const statusLink = "https://ama-aclc-northbay-es.vercel.app/status"

//     let htmlContent = ''
    
//     if (isApproved) {
//       htmlContent = `
//         <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
//           <div style="text-align: center; margin-bottom: 30px;">
//             <a href="https://ama-aclc-northbay-es.vercel.app" target="_blank">
//               <img src="${logoUrl}" alt="ACLC Logo" style="width: 80px; height: 80px; object-fit: contain;" />
//             </a>
//             <h2 style="color: #1d4ed8; margin-top: 10px; text-transform: uppercase; letter-spacing: 2px;">ACLC College Northbay</h2>
//           </div>
          
//           <div style="background-color: #ffffff; border-radius: 16px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
//             <h1 style="color: #15803d; margin-top: 0; font-size: 24px; text-align: center;">Congratulations, ${record.first_name}!</h1>
//             <p style="font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
//               We are thrilled to inform you that your application has been <strong>APPROVED</strong>. Welcome to the family!
//             </p>
//             <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; margin: 25px 0; border-radius: 12px; text-align: center;">
//               <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #15803d; font-weight: bold;">Assigned Section</p>
//               <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: 800; color: #166534;">${record.section || 'TBA'}</p>
//             </div>
//             <p style="font-size: 14px; color: #6b7280; text-align: center;">
//               Please visit the campus registrar to finalize your enrollment requirements.
//             </p>
//           </div>
//         </div>
//       `
//     } else {
//       htmlContent = `
//         <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
//           <div style="text-align: center; margin-bottom: 30px;">
//             <a href="https://ama-aclc-northbay-es.vercel.app" target="_blank">
//               <img src="${logoUrl}" alt="ACLC Logo" style="width: 80px; height: 80px; object-fit: contain;" />
//             </a>
//             <h2 style="color: #1d4ed8; margin-top: 10px; text-transform: uppercase; letter-spacing: 2px;">ACLC College Northbay</h2>
//           </div>

//           <div style="background-color: #ffffff; border-radius: 16px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
//             <h1 style="color: #991b1b; margin-top: 0; font-size: 24px; text-align: center;">Application Status Update</h1>
            
//             <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
//               Dear <strong>${record.first_name}</strong>,
//             </p>
            
//             <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
//               Thank you for your interest in joining the ACLC Northbay Community. We have reviewed your application, and we noticed a few things that need your attention before we can proceed.
//             </p>

//             <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 8px;">
//               <p style="margin: 0; font-weight: bold; color: #991b1b; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Registrar Feedback</p>
//               <div style="margin-top: 10px; color: #7f1d1d; font-weight: 600; line-height: 1.8;">
//                 ${formattedReason || 'Please review your submitted documents for clarity and validity.'}
//               </div>
//             </div>

//             <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
//               <strong>Don't worry!</strong> This is just a small bump in the road. You can easily update your application details and re-submit your documents through our status portal.
//             </p>

//             <div style="text-align: center; margin-top: 35px; margin-bottom: 20px;">
//               <a href="${statusLink}" style="background-color: #2563eb; color: #ffffff; padding: 16px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; font-size: 14px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);">
//                 Fix My Application
//               </a>
//             </div>
            
//             <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 30px;">
//               You will need your LRN and Surname to access your application.
//             </p>
//           </div>
          
//           <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
//             <p>&copy; ${new Date().getFullYear()} AMA ACLC Northbay Campus. All rights reserved.</p>
//           </div>
//         </div>
//       `
//     }

//     // 5. Send via Resend
//     // IMPORTANT: 'onboarding@resend.dev' restricts emails to YOUR account only.
//     // To send to real students, verify a domain at https://resend.com/domains.
//     // Once verified, ONLY the 'from' field below needs to be updated. No other code changes are required.
//     const res = await fetch('https://api.resend.com/emails', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${RESEND_API_KEY}`
//       },
//       body: JSON.stringify({
//         from: 'ACLC Admissions <onboarding@resend.dev>', // UPDATE THIS: Change to your verified domain email (e.g. admissions@aclc-northbay.com)
//         to: record.email,
//         subject: subject,
//         html: htmlContent
//       })
//     })

//     const data = await res.json()
//     return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })

//   } catch (error) {
//     return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
//   }
// })
