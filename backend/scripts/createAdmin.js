const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('your-supabase-project')) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured properly in backend/.env');
  console.error(`URL: ${supabaseUrl}`);
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const adminEmail = 'admin@softnix.com';
  const adminPassword = 'Softnix@01/11/25';
  const employeeId = 'ADM001';
  const fullName = 'Softnix Administrator';
  const role = 'admin';
  const department = 'Management';

  console.log(`⏳ Provisioning Admin user in Supabase Auth (${adminEmail})...`);

  // 1. Check if user already exists
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  let userId;
  const existing = (users || []).find(u => u.email === adminEmail);

  if (existing) {
    console.log(`ℹ️ Admin user already exists in Auth. ID: ${existing.id}. Updating password...`);
    userId = existing.id;
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: adminPassword,
      email_confirm: true,
      user_metadata: { employee_id: employeeId, full_name: fullName, role, department }
    });
    if (updateError) {
      console.error('❌ Failed to update auth user password:', updateError.message);
    } else {
      console.log('✅ Admin password updated successfully!');
    }
  } else {
    // Create User in auth.users
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { employee_id: employeeId, full_name: fullName, role, department }
    });

    if (createError) {
      console.error('❌ Failed to create auth user:', createError.message);
      process.exit(1);
    }
    userId = newUser.user.id;
    console.log(`✅ Auth user created successfully! UUID: ${userId}`);
  }

  // 2. Insert into public.users
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .upsert({
      id: userId,
      employee_id: employeeId,
      full_name: fullName,
      role: role,
      department: department,
      is_active: true
    })
    .select()
    .single();

  if (profileError) {
    console.error('❌ Failed to create public.users profile:', profileError.message);
  } else {
    console.log(`✅ User profile inserted into public.users:`, userProfile);
  }

  // 3. Insert leave balance for current year
  const currentYear = new Date().getFullYear();
  await supabaseAdmin
    .from('leave_balances')
    .upsert({
      user_id: userId,
      year: currentYear,
      sick_quota: 10,
      casual_quota: 12,
      vacation_quota: 15,
      sick_used: 0,
      casual_used: 0,
      vacation_used: 0
    });

  console.log(`\n🎉 SOFTNIX ADMIN CREATION COMPLETE!`);
  console.log(`========================================`);
  console.log(`📧 Email:    ${adminEmail}`);
  console.log(`🔑 Password: ${adminPassword}`);
  console.log(`🆔 User UID: ${userId}`);
  console.log(`========================================`);
}

main();
