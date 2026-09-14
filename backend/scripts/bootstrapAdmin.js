import { supabase } from '../config/supabase.js';

// Local bootstrap utility. It is deliberately not exposed through an HTTP route.
const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

if (!email || !password) {
  throw new Error('ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD are required.');
}

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    full_name: 'AEGIS System Administrator',
    role: 'admin',
    department: 'AEGIS Administration',
    jurisdiction: 'National',
    badge_number: 'AEGIS-ADMIN-001',
  },
});
if (error) throw error;
const user = data.user;

const { error: profileError } = await supabase.from('profiles').update({
  role: 'admin',
  full_name: 'AEGIS System Administrator',
  name: 'AEGIS System Administrator',
  email,
  department: 'AEGIS Administration',
  jurisdiction: 'National',
  badge_number: 'AEGIS-ADMIN-001',
  badge_id: 'AEGIS-ADMIN-001',
}).eq('id', user.id);
if (profileError) throw profileError;

console.log(`Bootstrap administrator is ready: ${email}`);
