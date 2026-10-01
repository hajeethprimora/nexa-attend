import nodemailer, { Transporter } from 'nodemailer';
import logger from './logger';
import config from '../config';

export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

let transporter: Transporter | null | undefined;

const getTransporter = (): Transporter | null => {
  if (transporter !== undefined) return transporter;
  const { host, port, user, pass } = config.smtp;
  transporter = host && user && pass
    ? nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
    : null;
  if (!transporter) logger.info('SMTP not configured: emails will be logged instead of sent');
  return transporter;
};

const layout = (subtitle: string, body: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff;">
    <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
      <h2 style="color: #4F46E5; margin: 0;">${escapeHtml(config.companyName)} Attend</h2>
      <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">${escapeHtml(subtitle)}</p>
    </div>
    <div style="padding: 20px 0;">${body}</div>
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #f3f4f6; color: #9ca3af; font-size: 12px;">
      <p>This is an automated message from ${escapeHtml(config.companyName)} Attend.</p>
    </div>
  </div>
`;

const send = async (to: string | string[], subject: string, html: string) => {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (recipients.length === 0) return;

  const tx = getTransporter();
  if (!tx) {
    logger.info(`[Email not sent: SMTP disabled] to=${recipients.join(',')} subject="${subject}"`);
    return;
  }
  try {
    await tx.sendMail({ from: config.smtp.from, to: recipients, subject, html });
    logger.info(`Email sent to ${recipients.join(',')}: ${subject}`);
  } catch (err) {
    logger.error('Failed to send email:', err);
  }
};

export const sendLeaveRequestNotification = async (params: {
  adminEmails: string[];
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
}) => {
  const { adminEmails, employeeName, leaveType, startDate, endDate, days, reason } = params;
  const html = layout('Leave Application Pending Review', `
    <p style="font-size: 14px; color: #374151;"><strong>${escapeHtml(employeeName)}</strong> has submitted a leave application that requires your approval.</p>
    <div style="background-color: #f9fafb; padding: 16px; border-radius: 12px; margin: 20px 0;">
      <p style="margin: 4px 0; font-size: 14px;"><strong>Category:</strong> ${escapeHtml(leaveType.toUpperCase())}</p>
      <p style="margin: 4px 0; font-size: 14px;"><strong>Duration:</strong> ${escapeHtml(startDate)} to ${escapeHtml(endDate)} (${days} working day${days === 1 ? '' : 's'})</p>
      ${reason ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ''}
    </div>
    <p style="font-size: 14px; color: #374151;">Log in to the admin portal to approve or reject this request.</p>
  `);
  await send(adminEmails, `[Leave Request] ${employeeName} - ${leaveType.toUpperCase()}`, html);
};

export const sendLeaveDecisionNotification = async (params: {
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: 'approved' | 'rejected';
  adminComment?: string;
}) => {
  const { employeeEmail, employeeName, leaveType, startDate, endDate, status, adminComment } = params;
  const color = status === 'approved' ? '#10B981' : '#EF4444';
  const html = layout('Leave Application Status Update', `
    <p style="font-size: 16px; color: #111827;">Hello ${escapeHtml(employeeName)},</p>
    <p style="font-size: 14px; color: #374151;">Your <strong>${escapeHtml(leaveType.toUpperCase())}</strong> leave request for <strong>${escapeHtml(startDate)}</strong> to <strong>${escapeHtml(endDate)}</strong> has been reviewed.</p>
    <div style="background-color: #f9fafb; padding: 16px; border-radius: 12px; margin: 20px 0; text-align: center;">
      <span style="display: inline-block; padding: 6px 16px; border-radius: 9999px; color: ${color}; font-weight: bold; font-size: 14px; border: 1px solid ${color};">
        ${escapeHtml(status.toUpperCase())}
      </span>
      ${adminComment ? `<p style="margin-top: 12px; font-size: 13px; color: #4b5563; font-style: italic;">Note from admin: ${escapeHtml(adminComment)}</p>` : ''}
    </div>
  `);
  await send(employeeEmail, `[Leave ${status.toUpperCase()}] Your ${leaveType.toUpperCase()} leave request`, html);
};

export const sendAttendanceEditedNotification = async (params: {
  employeeEmail: string;
  employeeName: string;
  date: string;
  action: 'created' | 'updated' | 'deleted';
  reason: string;
}) => {
  const { employeeEmail, employeeName, date, action, reason } = params;
  const html = layout('Attendance Record Updated', `
    <p style="font-size: 16px; color: #111827;">Hello ${escapeHtml(employeeName)},</p>
    <p style="font-size: 14px; color: #374151;">An administrator has <strong>${escapeHtml(action)}</strong> your attendance record for <strong>${escapeHtml(date)}</strong>.</p>
    <p style="font-size: 14px; color: #374151;"><strong>Reason:</strong> ${escapeHtml(reason)}</p>
    <p style="font-size: 13px; color: #6b7280;">If this looks wrong, please contact HR.</p>
  `);
  await send(employeeEmail, `Your attendance for ${date} was ${action}`, html);
};
