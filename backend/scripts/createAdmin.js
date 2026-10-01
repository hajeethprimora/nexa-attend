// Bootstraps (or resets) the first administrator account.
//
// Usage (from backend/):
//   ADMIN_BOOTSTRAP_EMAIL=you@company.com ADMIN_BOOTSTRAP_PASSWORD='a-strong-password' node scripts/createAdmin.js
// Optional: ADMIN_BOOTSTRAP_NAME, ADMIN_BOOTSTRAP_EMPLOYEE_ID, ADMIN_BOOTSTRAP_DEPARTMENT
//
// Credentials are read from the environment only; never commit them.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || '';
const fullName = process.env.ADMIN_BOOTSTRAP_NAME || 'Administrator';
const employeeId = process.env.ADMIN_BOOTSTRAP_EMPLOYEE_ID || 'ADM001';
const department = process.env.ADMIN_BOOTSTRAP_DEPARTMENT || 'Management';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (backend/.env or environment).');
  process.exit(1);
}
if (!adminEmail || adminPassword.length < 12) {
  console.error('Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD (min 12 characters).');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function findUserByEmail(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find(u => (u.email || '').toLowerCase() === email);
    if (match || data.users.length < 200) return match || null;
  }
  return null;
}

async function main() {
  console.log(`Provisioning admin ${adminEmail} ...`);

  let userId;
  const existing = await findUserByEmail(adminEmail);

  if (existing) {
    userId = existing.id;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: adminPassword,
      email_confirm: true,
      ban_duration: 'none'
    });
    if (error) throw error;
    console.log('Existing auth user found; password reset.');
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { employee_id: employeeId, full_name: fullName, department }
    });
    if (error) throw error;
    userId = data.user.id;
    console.log('Auth user created.');
  }

  const { error: profileError } = await supabaseAdmin
    .from('users')
    .upsert({
      id: userId,
      employee_id: employeeId,
      email: adminEmail,
      full_name: fullName,
      role: 'admin',
      department,
      is_active: true
    });
  if (profileError) throw profileError;

  await supabaseAdmin
    .from('leave_balances')
    .upsert({ user_id: userId, year: new Date().getFullYear() }, { onConflict: 'user_id,year', ignoreDuplicates: true });

  console.log(`Done. ${adminEmail} is an active admin (user id ${userId}).`);
}

main().catch(err => {
  console.error('Failed:', err.message || err);
  process.exit(1);
});
