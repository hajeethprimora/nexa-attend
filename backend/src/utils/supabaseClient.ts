import { createClient } from '@supabase/supabase-js';
import logger from './logger';
import config from '../config';

if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
  logger.warn('Supabase credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not configured');
}

// Service-role client: bypasses RLS, so it must only ever be used server-side.
// A placeholder URL keeps the module importable in tests without credentials.
export const supabase = createClient(
  config.supabaseUrl || 'http://localhost:54321',
  config.supabaseServiceRoleKey || 'missing-service-role-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

export default supabase;
