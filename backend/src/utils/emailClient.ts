import nodemailer from 'nodemailer';
import logger from './logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

export interface LeaveNotificationParams {
  recipientEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: 'approved' | 'rejected';
  adminComment?: string;
}

export const sendLeaveStatusNotification = async (params: LeaveNotificationParams): Promise<boolean> => {
  try {
    if (!params.recipientEmail) return false;

    const subject = `Leave Request ${params.status.toUpperCase()} - NexaAttend`;
    const text = `Hi ${params.employeeName},\n\nYour ${params.leaveType} leave request (${params.startDate} to ${params.endDate}) has been ${params.status.toUpperCase()}.\n\nComments: ${params.adminComment || 'None'}\n\nRegards,\nHR Operations`;

    if (process.env.NODE_ENV === 'test' || !process.env.SMTP_USER) {
      logger.info(`[Email Dispatch Mock] To: ${params.recipientEmail} | Subject: ${subject}`);
      return true;
    }

    await transporter.sendMail({
      from: `"NexaAttend HR" <${process.env.SMTP_FROM || 'noreply@company.com'}>`,
      to: params.recipientEmail,
      subject,
      text
    });

    logger.info(`Email sent to ${params.recipientEmail}`);
    return true;
  } catch (error) {
    logger.error('Error sending email notification:', error);
    return false;
  }
};
