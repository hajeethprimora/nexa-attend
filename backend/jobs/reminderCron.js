const supabase = require('../utils/supabaseClient');
const logger = require('../utils/logger');
const { sendEmail } = require('../utils/emailClient');

/**
 * Scan for unclosed attendance records older than 16 hours
 */
const checkUnclosedSessions = async () => {
  try {
    const sixteenHoursAgo = new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString();

    const { data: openRecords, error } = await supabase
      .from('attendance')
      .select('*, users(full_name, employee_id, email)')
      .is('clock_out', null)
      .lt('clock_in', sixteenHoursAgo);

    if (error) throw error;

    if (!openRecords || openRecords.length === 0) return;

    logger.info(`[CRON REMINDER] Found ${openRecords.length} unclosed attendance sessions older than 16h.`);

    for (const record of openRecords) {
      const recipient = record.users?.email || `${record.users?.employee_id}@company.com`;
      const name = record.users?.full_name || 'Employee';

      await sendEmail({
        to: recipient,
        subject: 'Action Required: Missed Clock-Out Reminder - NexaAttend',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h3>Reminder: Open Attendance Session</h3>
            <p>Hello <strong>${name}</strong>,</p>
            <p>You clocked in on <strong>${new Date(record.clock_in).toLocaleString()}</strong> but have not clocked out yet.</p>
            <p>Please log into your NexaAttend dashboard and complete your clock-out to ensure accurate time tracking.</p>
          </div>
        `
      });
    }
  } catch (err) {
    logger.error('CRON checkUnclosedSessions Error:', err);
  }
};

module.exports = { checkUnclosedSessions };
