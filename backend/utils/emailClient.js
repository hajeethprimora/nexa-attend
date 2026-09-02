const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

const sendEmail = async ({ to, subject, html, text }) => {
  // If SMTP credentials aren't provided in development, mock send gracefully
  if (!process.env.SMTP_USER) {
    logger.info(`[MOCK EMAIL SENT] To: ${to} | Subject: ${subject}`);
    return { mock: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'NexaAttend HR'}" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@nexaattend.com'}>`,
      to,
      subject,
      text,
      html
    });

    logger.info(`Email sent to ${to}: MessageId=${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    return null;
  }
};

const sendLeaveStatusNotification = async ({ recipientEmail, employeeName, leaveType, startDate, endDate, status, adminComment }) => {
  const isApproved = status === 'approved';
  const subject = `Leave Request ${isApproved ? 'Approved ✅' : 'Rejected ❌'} - NexaAttend`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: ${isApproved ? '#10B981' : '#EF4444'};">Leave Request ${status.toUpperCase()}</h2>
      <p>Hello <strong>${employeeName}</strong>,</p>
      <p>Your request for <strong>${leaveType} leave</strong> from <strong>${startDate}</strong> to <strong>${endDate}</strong> has been <strong>${status}</strong>.</p>
      ${adminComment ? `<p><strong>Admin Remarks:</strong> <em>"${adminComment}"</em></p>` : ''}
      <br/>
      <p style="font-size: 12px; color: #666;">This is an automated notification from NexaAttend Corporate System.</p>
    </div>
  `;

  return sendEmail({ to: recipientEmail, subject, html });
};

module.exports = {
  sendEmail,
  sendLeaveStatusNotification
};
