import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  logger.warn('⚠️ Supabase credentials not fully configured in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export default supabase;
