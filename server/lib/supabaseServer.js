import { createClient } from '@supabase/supabase-js';

// Server-side expected envs. If the server-side SUPABASE_* variables aren't set
// in local dev, allow a development fallback from VITE environment variables
// that may have been created in `.env.local` by the frontend developer.
// Copy these early to ensure the rest of this module uses the correct values.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client-side Vite envs (useful for local dev fallback)
const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient = null;
let isConfigured = false;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  // Preferred: service role key for privileged server operations
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
  isConfigured = true;
} else if (VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY) {
  // Development fallback: use anon key (read-only in most RLS setups)
  console.warn('Supabase service role key not configured; falling back to VITE_SUPABASE_ANON_KEY (read-only). Ensure SUPABASE_SERVICE_ROLE_KEY is set for server-side operations.');
  supabaseClient = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
  isConfigured = true;
} else {
  console.warn('No Supabase environment variables found. Supabase client not configured.');
  supabaseClient = null;
  isConfigured = false;
}

export const supabase = supabaseClient;
export const supabaseAdmin = supabaseClient; // Admin client uses service role key
export const supabaseConfigured = isConfigured;
