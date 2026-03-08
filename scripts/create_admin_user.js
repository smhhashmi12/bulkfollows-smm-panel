import dotenv from 'dotenv';
import dns from 'dns';
import { createClient } from '@supabase/supabase-js';
import { promisify } from 'util';

// Load server-specific env first (if set), then Vite `.env.local`, and fallback to `.env`.
dotenv.config({ path: 'server/.env.local' });
dotenv.config({ path: '.env.local' });
dotenv.config();
const lookup = promisify(dns.lookup);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

async function preflightChecks() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment to create an admin user.');
    console.error('You can set these in PowerShell for the current session:');
    console.error("$env:SUPABASE_URL='https://your.supabase.co'");
    console.error("$env:SUPABASE_SERVICE_ROLE_KEY='your_service_role_key'");
    process.exit(1);
  }

  // Basic check that url looks valid
  let hostname;
  try {
    const u = new URL(SUPABASE_URL);
    hostname = u.hostname;
  } catch (err) {
    console.error('SUPABASE_URL is not a valid URL:', SUPABASE_URL);
    process.exit(1);
  }

  // Avoid the placeholder host name usage
  if (/your\.supabase\.co/.test(hostname) || /your_supabase/.test(SUPABASE_URL)) {
    console.error('It looks like you are still using the placeholder SUPABASE_URL; replace it with your real project URL from the Supabase dashboard.');
    process.exit(1);
  }

  // DNS lookup - ensure host resolves
  try {
    await lookup(hostname);
  } catch (err) {
    console.error(`DNS lookup failed for ${hostname}:`, err.message || err);
    console.error('Check your SUPABASE_URL value or network connectivity.');
    process.exit(1);
  }

  // Quick admin API test to confirm the key is valid and not revoked
  try {
    const testClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    // Use a minimal GET to avoid heavy operations
    await testClient.auth.admin.listUsers({ per_page: 1 });
  } catch (err) {
    console.error('Failed to validate SUPABASE_SERVICE_ROLE_KEY with the Admin API:', err.message || err);
    console.error('Verify that the service role key is correct and has not been rotated or revoked.');
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createAdmin(email, password, username) {
  // create an auth user (server-side, using service role key)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
    app_metadata: { role: 'admin' },
  });

  if (error) {
    // If the user already exists, log and proceed to update role if necessary
    console.error('Error creating auth user:', error.message || error);
    // Try to lookup existing auth user by email
    const { data: found, error: findError } = await supabase.auth.admin.listUsers({ search: email });
    if (findError) throw findError;
    const user = (found && found.users && found.users.length && found.users[0]) || null;
    if (!user) throw new Error('Failed to create and could not find existing user');
    console.log('Using existing user', user.id);
    const profile = await ensureUserProfile(user.id, email, username);
    await syncAdminAuthMetadata(user.id, profile?.username || username || email.split('@')[0]);
    await setAdminRole(user.id);
    return user;
  }

  const user = data?.user || data; // supabase-js shape varies
  if (!user) throw new Error('Failed to create user (no user returned)');
  const profile = await ensureUserProfile(user.id, email, username);
  await syncAdminAuthMetadata(user.id, profile?.username || username || email.split('@')[0]);
  await setAdminRole(user.id);
  return user;
}

async function ensureUserProfile(userId, email, username) {
  // Insert or update the user_profiles table entry for this user
  // Make sure username is unique; if conflict, append a suffix
  const baseUsername = username || email.split('@')[0];
  let candidate = baseUsername;
  let counter = 0;
  while (true) {
    const { data: existing } = await supabase.from('user_profiles').select('id').eq('username', candidate).limit(1);
    if (!existing || existing.length === 0) break;
    counter += 1;
    candidate = `${baseUsername}_${counter}`;
  }

  const { data, error } = await supabase.from('user_profiles').upsert({ id: userId, email, username: candidate }, { onConflict: 'id' }).select();
  if (error) throw error;
  return data?.[0] || { id: userId, email, username: candidate };
}

async function syncAdminAuthMetadata(userId, username) {
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { username },
    app_metadata: { role: 'admin' },
  });
  if (error) throw error;
  return data;
}

async function setAdminRole(userId) {
  const { data, error } = await supabase.from('user_profiles').update({ role: 'admin' }).eq('id', userId).select();
  if (error) throw error;
  console.log('Updated role to admin for user id', userId);
  return data;
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const username = process.argv[4];
  if (!email || !password) {
    console.error('Usage: node scripts/create_admin_user.js <email> <password> [username]');
    process.exit(1);
  }
  await preflightChecks();
  try {
    const user = await createAdmin(email, password, username);
    console.log('Admin user created/updated:', user?.id || user);
  } catch (err) {
    console.error('Failed to create admin:', err.message || err);
    process.exit(1);
  }
}

main();
