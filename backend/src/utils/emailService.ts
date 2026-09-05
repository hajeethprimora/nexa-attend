import nodemailer from 'nodemailer';
import logger from './logger';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || '"SOFTNIX Attend" <noreply@softnix.com>';

const createTransporter = () => {
  if (!SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
};

export const sendLeaveRequestNotification = async ({
  adminEmail,
  employeeName,
  leaveType,
  startDate,
  endDate,
  reason
}: {
  adminEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
}) => {
  try {
    const transporter = createTransporter();
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
          <h2 style="color: #4F46E5; margin: 0;">SOFTNIX Attend</h2>
          <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Leave Application Pending Review</p>
        </div>
        <div style="padding: 20px 0;">
          <p style="font-size: 16px; color: #111827;">Hello Administrator,</p>
          <p style="font-size: 14px; color: #374151;"><strong>${employeeName}</strong> has submitted a new leave application that requires your approval.</p>
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>Category:</strong> ${leaveType.toUpperCase()}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Duration:</strong> ${startDate} to ${endDate}</p>
            ${reason ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Reason:</strong> "${reason}"</p>` : ''}
          </div>
          <p style="font-size: 14px; color: #374151;">Please log in to the Softnix Admin Portal to review and approve or reject this request.</p>
        </div>
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #f3f4f6; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Softnix Enterprise Workforce Management</p>
        </div>
      </div>
    `;

    if (transporter) {
      await transporter.sendMail({
        from: FROM_EMAIL,
        to: adminEmail,
        subject: `[Leave Request] ${employeeName} - ${leaveType.toUpperCase()} Leave`,
        html
      });
      logger.info(`Leave request notification email sent to ${adminEmail}`);
    } else {
      logger.info(`[Email Simulation] Leave request alert for ${employeeName} -> Admin (${adminEmail})`);
    }
  } catch (err) {
    logger.error('Failed to send leave request email:', err);
  }
};

export const sendLeaveDecisionNotification = async ({
  employeeEmail,
  employeeName,
  leaveType,
  status,
  adminComment
}: {
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  status: 'approved' | 'rejected';
  adminComment?: string;
}) => {
  try {
    const transporter = createTransporter();
    const isApproved = status === 'approved';
    const statusColor = isApproved ? '#10B981' : '#EF4444';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
          <h2 style="color: #4F46E5; margin: 0;">SOFTNIX Attend</h2>
          <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Leave Application Status Update</p>
        </div>
        <div style="padding: 20px 0;">
          <p style="font-size: 16px; color: #111827;">Hello ${employeeName},</p>
          <p style="font-size: 14px; color: #374151;">Your <strong>${leaveType.toUpperCase()}</strong> leave request has been reviewed by management.</p>
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <span style="display: inline-block; padding: 6px 16px; border-radius: 9999px; background-color: ${statusColor}15; color: ${statusColor}; font-weight: bold; font-size: 14px;">
              ${status.toUpperCase()}
            </span>
            ${adminComment ? `<p style="margin-top: 12px; font-size: 13px; color: #4b5563; font-style: italic;">Note from Admin: "${adminComment}"</p>` : ''}
          </div>
        </div>
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #f3f4f6; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Softnix Enterprise Workforce Management</p>
        </div>
      </div>
    `;

    if (transporter) {
      await transporter.sendMail({
        from: FROM_EMAIL,
        to: employeeEmail,
        subject: `[Leave ${status.toUpperCase()}] Your ${leaveType.toUpperCase()} Leave Request`,
        html
      });
      logger.info(`Leave decision email sent to ${employeeEmail}`);
    } else {
      logger.info(`[Email Simulation] Leave ${status} notification sent to ${employeeEmail}`);
    }
  } catch (err) {
    logger.error('Failed to send leave decision email:', err);
  }
};
