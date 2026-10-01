import supabase from '../utils/supabaseClient';
import config from '../config';
import { dbError } from '../middleware/errorHandler';
import { UserProfile } from '../types';
import { addDays, todayInZone } from '../utils/time';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  link?: string;
}

const LOOKBACK_DAYS = 30;

/** Builds notifications from live data (no separate table needed). Read state is kept client-side. */
export class NotificationService {
  static async forUser(user: UserProfile): Promise<AppNotification[]> {
    const since = addDays(todayInZone(config.timeZone), -LOOKBACK_DAYS);
    const sinceISO = `${since}T00:00:00Z`;
    const items: AppNotification[] = [];

    const [{ data: decided, error: leaveError }, { data: flagged, error: attError }] = await Promise.all([
      supabase
        .from('leaves')
        .select('id, type, start_date, end_date, status, admin_comment, updated_at')
        .eq('user_id', user.id)
        .in('status', ['approved', 'rejected'])
        .gte('updated_at', sinceISO),
      supabase
        .from('attendance')
        .select('id, date, auto_closed, edited_at, edit_reason, updated_at')
        .eq('user_id', user.id)
        .gte('date', since)
        .or('auto_closed.eq.true,edited_at.not.is.null')
    ]);
    if (leaveError) throw dbError(leaveError, 'notifications leaves');
    if (attError) throw dbError(attError, 'notifications attendance');

    (decided || []).forEach(l => items.push({
      id: `leave-${l.id}-${l.status}`,
      title: `Leave ${l.status}`,
      message: `Your ${l.type} leave (${l.start_date} to ${l.end_date}) was ${l.status}.${l.admin_comment ? ` Note: ${l.admin_comment}` : ''}`,
      created_at: l.updated_at,
      type: l.status === 'approved' ? 'success' : 'alert',
      link: '/dashboard'
    }));

    (flagged || []).forEach(a => {
      if (a.auto_closed) {
        items.push({
          id: `autoclose-${a.id}`,
          title: 'Missed clock-out',
          message: `Your session on ${a.date} was closed automatically at shift end. Ask an admin to correct it if needed.`,
          created_at: a.updated_at,
          type: 'warning',
          link: '/dashboard'
        });
      } else if (a.edited_at) {
        items.push({
          id: `edit-${a.id}-${a.edited_at}`,
          title: 'Attendance corrected',
          message: `An admin updated your attendance for ${a.date}.${a.edit_reason ? ` Reason: ${a.edit_reason}` : ''}`,
          created_at: a.edited_at,
          type: 'info',
          link: '/dashboard'
        });
      }
    });

    if (user.role === 'admin') {
      const [{ count: pending }, { count: autoClosed }] = await Promise.all([
        supabase.from('leaves').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('auto_closed', true).gte('date', addDays(todayInZone(config.timeZone), -7))
      ]);

      if (pending) {
        items.push({
          id: `admin-pending-${pending}`,
          title: 'Leave requests waiting',
          message: `${pending} leave request${pending === 1 ? '' : 's'} need your review.`,
          created_at: new Date().toISOString(),
          type: 'warning',
          link: '/admin'
        });
      }
      if (autoClosed) {
        items.push({
          id: `admin-autoclosed-${autoClosed}-${todayInZone(config.timeZone)}`,
          title: 'Missed clock-outs to review',
          message: `${autoClosed} session${autoClosed === 1 ? ' was' : 's were'} auto-closed in the last 7 days. Review them in the Attendance Editor.`,
          created_at: new Date().toISOString(),
          type: 'alert',
          link: '/admin/attendance'
        });
      }
    }

    return items.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30);
  }
}
