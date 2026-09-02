import supabase from './supabaseClient';
import logger from './logger';

export interface AuditParams {
  actor_id?: string | null;
  action: string;
  target_id?: string | null;
  details?: Record<string, any>;
  ip_address?: string | null;
}

export const logAuditEvent = async ({
  actor_id,
  action,
  target_id,
  details,
  ip_address
}: AuditParams): Promise<boolean> => {
  try {
    const { error } = await supabase.from('audit_logs').insert([
      {
        actor_id: actor_id || null,
        action,
        target_id: target_id || null,
        details: details || {},
        ip_address: ip_address || null,
        created_at: new Date().toISOString()
      }
    ]);

    if (error) {
      logger.error('Failed to insert audit log:', error);
      return false;
    }
    return true;
  } catch (err) {
    logger.error('Audit Logger Exception:', err);
    return false;
  }
};
