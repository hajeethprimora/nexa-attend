const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key';

// Initialize Supabase admin client using Service Role Key to bypass RLS for server-side logic
const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;
