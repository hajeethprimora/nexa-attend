const supabase = require('./supabaseClient');
const logger = require('./logger');

/**
 * Log sensitive administrative or system action into public.audit_logs
 */
const logAuditEvent = async ({ actor_id, action, target_id = null, details = {}, ip_address = null }) => {
  try {
    logger.info(`AUDIT EVENT [${action}]: Actor=${actor_id || 'System'}, Target=${target_id || 'N/A'}`);

    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        actor_id,
        action,
        target_id: target_id ? String(target_id) : null,
        details,
        ip_address
      }]);

    if (error) {
      logger.error('Failed to insert audit log into database:', error);
    }
  } catch (err) {
    logger.error('Audit Logging Error:', err);
  }
};

module.exports = { logAuditEvent };
