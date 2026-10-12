export function baseLayout(
  title: string,
  bodyContent: string,
  companyName: string = process.env.APP_NAME || 'ERP Portal',
  footerText?: string | null
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; }
    .header { background-color: #0F172A; padding: 28px 32px; color: #FFFFFF; }
    .logo { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF; }
    .logo span { color: #818CF8; }
    .content { padding: 32px; line-height: 1.6; font-size: 14px; color: #334155; }
    .footer { background-color: #F8FAFC; padding: 20px 32px; text-align: center; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
    .btn { display: inline-block; background-color: #4F46E5; color: #FFFFFF !important; padding: 12px 24px; font-weight: 600; text-decoration: none; border-radius: 8px; margin-top: 16px; }
    .card { background-color: #F1F5F9; border-radius: 12px; padding: 16px; margin: 16px 0; border: 1px solid #E2E8F0; font-size: 13px; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">${companyName}</div>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} ${companyName}. All rights reserved.<br>
      ${footerText ? `${footerText}<br>` : ''}
      This is an automated system notification.
    </div>
  </div>
</body>
</html>`;
}

export function welcomeEmailTemplate(params: {
  employeeName: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
  companyName?: string;
  footerText?: string | null;
}): string {
  const companyName = params.companyName || process.env.APP_NAME || 'ERP Portal';
  const content = `
    <h2 style="color: #0F172A; margin-top: 0;">Welcome to ${companyName}, ${params.employeeName}!</h2>
    <p>Your employee account has been created. You can now log in to the employee portal using the temporary credentials below:</p>
    
    <div class="card">
      <p style="margin: 4px 0;"><strong>Work Email:</strong> ${params.email}</p>
      <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <code style="background: #E2E8F0; padding: 2px 6px; border-radius: 4px;">${params.temporaryPassword}</code></p>
    </div>

    <p style="color: #DC2626; font-size: 12px;"><strong>Important:</strong> You will be required to change your temporary password on your first login.</p>

    <a href="${params.loginUrl}" class="btn">Log In to Portal</a>
  `;
  return baseLayout(`Welcome to ${companyName}`, content, companyName, params.footerText);
}

export function passwordResetEmailTemplate(params: {
  employeeName: string;
  resetUrl: string;
  expiresInMinutes: number;
  companyName?: string;
  footerText?: string | null;
}): string {
  const companyName = params.companyName || process.env.APP_NAME || 'ERP Portal';
  const content = `
    <h2 style="color: #0F172A; margin-top: 0;">Password Reset Request</h2>
    <p>Hello ${params.employeeName},</p>
    <p>We received a request to reset your password for ${companyName}. Click the button below to choose a new password:</p>

    <a href="${params.resetUrl}" class="btn">Reset Password</a>

    <p style="margin-top: 24px; font-size: 12px; color: #64748B;">
      This link will expire in <strong>${params.expiresInMinutes} minutes</strong> and can only be used once.<br>
      If you did not request this reset, you can safely ignore this email.
    </p>
  `;
  return baseLayout('Reset Your Password', content, companyName, params.footerText);
}

export function leaveAppliedEmailTemplate(params: {
  managerName: string;
  employeeName: string;
  leaveType: string;
  days: number;
  fromDate: string;
  toDate: string;
  reason?: string | null;
  reviewUrl: string;
}): string {
  const content = `
    <h2 style="color: #0F172A; margin-top: 0;">New Leave Request</h2>
    <p>Hello ${params.managerName},</p>
    <p><strong>${params.employeeName}</strong> has submitted a leave request awaiting your approval:</p>

    <div class="card">
      <p style="margin: 4px 0;"><strong>Leave Type:</strong> ${params.leaveType}</p>
      <p style="margin: 4px 0;"><strong>Duration:</strong> ${params.days} day(s) (${params.fromDate} to ${params.toDate})</p>
      ${params.reason ? `<p style="margin: 4px 0;"><strong>Reason:</strong> ${params.reason}</p>` : ''}
    </div>

    <a href="${params.reviewUrl}" class="btn">Review Leave Request</a>
  `;
  return baseLayout('New Leave Request Awaiting Approval', content);
}

export function leaveStatusEmailTemplate(params: {
  employeeName: string;
  status: string;
  leaveType: string;
  days: number;
  decisionNote?: string | null;
  portalUrl: string;
}): string {
  const isApproved = params.status === 'approved';
  const color = isApproved ? '#16A34A' : '#DC2626';

  const content = `
    <h2 style="color: #0F172A; margin-top: 0;">Leave Request Update</h2>
    <p>Hello ${params.employeeName},</p>
    <p>Your leave request for <strong>${params.days} day(s) (${params.leaveType})</strong> has been 
      <strong style="color: ${color}; text-transform: uppercase;">${params.status}</strong>.
    </p>

    ${
      params.decisionNote
        ? `<div class="card"><p style="margin: 4px 0;"><strong>Manager Note:</strong> ${params.decisionNote}</p></div>`
        : ''
    }

    <a href="${params.portalUrl}" class="btn">View in Leave Portal</a>
  `;
  return baseLayout(`Leave Request ${params.status.toUpperCase()}`, content);
}

export function payrollGeneratedEmailTemplate(params: {
  employeeName: string;
  month: string;
  netSalary: number;
  payslipUrl: string;
}): string {
  const content = `
    <h2 style="color: #0F172A; margin-top: 0;">Payslip Generated</h2>
    <p>Hello ${params.employeeName},</p>
    <p>Your salary statement for <strong>${params.month}</strong> has been generated and is ready for download.</p>

    <div class="card">
      <p style="margin: 4px 0;"><strong>Payroll Month:</strong> ${params.month}</p>
      <p style="margin: 4px 0;"><strong>Net Pay:</strong> ₹${params.netSalary.toLocaleString()}</p>
    </div>

    <a href="${params.payslipUrl}" class="btn">Download Payslip PDF</a>
  `;
  return baseLayout(`Payslip Ready - ${params.month}`, content);
}
