// Creates (or resets) administrator accounts.
//
// Interactive (recommended), from backend/:
//   npm run create-admin
//   -> asks for email, name, employee ID and password (hidden) for each admin.
//
// Non-interactive (CI / scripts):
//   ADMIN_BOOTSTRAP_EMAIL=you@company.com ADMIN_BOOTSTRAP_PASSWORD='a-strong-password' npm run create-admin
//   Optional: ADMIN_BOOTSTRAP_NAME, ADMIN_BOOTSTRAP_EMPLOYEE_ID, ADMIN_BOOTSTRAP_DEPARTMENT
//
// Credentials are never stored or logged.
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (backend/.env or environment).');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
const ask = (question, fallback = '') =>
  new Promise(resolve => rl.question(fallback ? `${question} [${fallback}]: ` : `${question}: `, a => resolve(a.trim() || fallback)));

/** Prompts without echoing what is typed. */
const askHidden = (question) =>
  new Promise(resolve => {
    const original = rl._writeToOutput;
    rl._writeToOutput = (s) => {
      // Only show the prompt itself, mask everything typed after it
      if (s.includes(question)) original.call(rl, s);
      else original.call(rl, s.replace(/[^\r\n]/g, '*'));
    };
    rl.question(`${question}: `, answer => {
      rl._writeToOutput = original;
      process.stdout.write('\n');
      resolve(answer);
    });
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

async function provision({ email, password, fullName, employeeId, department }) {
  console.log(`\nProvisioning admin ${email} ...`);

  // Employee IDs are unique; refuse to steal one from a different account
  const { data: clash } = await supabaseAdmin.from('users').select('id, email').eq('employee_id', employeeId).limit(1);

  let userId;
  const existing = await findUserByEmail(email);
  if (clash?.[0] && clash[0].id !== existing?.id) {
    throw new Error(`Employee ID ${employeeId} already belongs to ${clash[0].email || 'another user'}. Choose a different ID.`);
  }

  if (existing) {
    userId = existing.id;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      ban_duration: 'none'
    });
    if (error) throw error;
    console.log('Existing account found; password reset.');
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { employee_id: employeeId, full_name: fullName, department }
    });
    if (error) throw error;
    userId = data.user.id;
    console.log('Login account created.');
  }

  const { error: profileError } = await supabaseAdmin
    .from('users')
    .upsert({
      id: userId,
      employee_id: employeeId,
      email,
      full_name: fullName,
      role: 'admin',
      department,
      is_active: true
    });
  if (profileError) throw profileError;

  await supabaseAdmin
    .from('leave_balances')
    .upsert({ user_id: userId, year: new Date().getFullYear() }, { onConflict: 'user_id,year', ignoreDuplicates: true });

  console.log(`Done. ${email} is an active admin (employee ID ${employeeId}).`);
}

async function promptAdmin(index) {
  console.log(`\n--- Admin #${index} ---`);
  let email = '';
  while (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    email = (await ask('Email')).toLowerCase();
  }
  const fullName = await ask('Full name', 'Administrator');
  const employeeId = await ask('Employee ID', `ADM${String(index).padStart(3, '0')}`);
  const department = await ask('Department', 'Management');

  let password = '';
  for (;;) {
    password = await askHidden('Password (min 12 characters, hidden)');
    if (password.length < 12) {
      console.log('Too short, try again.');
      continue;
    }
    const confirm = await askHidden('Confirm password');
    if (confirm === password) break;
    console.log('Passwords do not match, try again.');
  }
  return { email, password, fullName, employeeId, department };
}

async function main() {
  const envEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();

  if (envEmail) {
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || '';
    if (password.length < 12) throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters.');
    await provision({
      email: envEmail,
      password,
      fullName: process.env.ADMIN_BOOTSTRAP_NAME || 'Administrator',
      employeeId: process.env.ADMIN_BOOTSTRAP_EMPLOYEE_ID || 'ADM001',
      department: process.env.ADMIN_BOOTSTRAP_DEPARTMENT || 'Management'
    });
    return;
  }

  console.log('Create administrator accounts (press Ctrl+C to cancel).');
  for (let i = 1; ; i++) {
    const admin = await promptAdmin(i);
    try {
      await provision(admin);
    } catch (err) {
      console.error('Failed:', err.message || err);
    }
    const more = (await ask('\nAdd another admin? (y/N)', 'n')).toLowerCase();
    if (more !== 'y' && more !== 'yes') break;
  }
}

main()
  .catch(err => {
    console.error('Failed:', err.message || err);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
