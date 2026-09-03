import nodemailer from 'nodemailer';
import logger from './logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525'),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

interface LeaveNotificationOptions {
  recipientEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: 'approved' | 'rejected';
  adminComment?: string;
}

export const sendLeaveStatusNotification = async (options: LeaveNotificationOptions) => {
  const { recipientEmail, employeeName, leaveType, startDate, endDate, status, adminComment } = options;

  const mailOptions = {
    from: '"Softnix Workforce Systems" <no-reply@softnix.com>',
    to: recipientEmail,
    subject: `Leave Request ${status.toUpperCase()} - Softnix Attend`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; rounded: 12px;">
        <h2 style="color: ${status === 'approved' ? '#10B981' : '#EF4444'}; text-transform: uppercase;">
          Leave Request ${status}
        </h2>
        <p>Dear <strong>${employeeName}</strong>,</p>
        <p>Your request for <strong>${leaveType}</strong> leave from <strong>${startDate}</strong> to <strong>${endDate}</strong> has been <strong>${status}</strong>.</p>
        ${adminComment ? `<p><strong>Administrator Note:</strong> ${adminComment}</p>` : ''}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748B;">This is an automated notification from Softnix Attendance & Workforce Management Platform.</p>
      </div>
    `
  };

  try {
    if (process.env.SMTP_USER) {
      await transporter.sendMail(mailOptions);
      logger.info(`Email notification sent to ${recipientEmail} for leave status: ${status}`);
    } else {
      logger.info(`[SMTP Mock] Leave notification to ${recipientEmail}: Status = ${status}`);
    }
  } catch (error) {
    logger.error('Error sending leave notification email:', error);
  }
};
