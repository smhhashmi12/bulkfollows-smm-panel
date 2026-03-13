import { createClient } from '@supabase/supabase-js';

const findEnvBySuffix = (suffixes) => {
  const keys = Object.keys(process.env);
  for (const suffix of suffixes) {
    const match = keys.find((key) => key.toUpperCase().endsWith(suffix));
    if (match && process.env[match]) return process.env[match];
  }
  return undefined;
};

process.env.SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  findEnvBySuffix(['_SUPABASE_URL']);

process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  findEnvBySuffix(['_SUPABASE_SERVICE_ROLE_KEY', '_SUPABASE_SECRET_KEY']);

process.env.VITE_SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  findEnvBySuffix(['_SUPABASE_ANON_KEY', '_SUPABASE_PUBLISHABLE_KEY']);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client-side Vite envs (useful for local dev fallback)
const VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient = null;
let supabaseAdminClient = null;
let isConfigured = false;
let isAdminConfigured = false;

if (SUPABASE_URL && VITE_SUPABASE_ANON_KEY) {
  supabaseClient = createClient(SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
  isConfigured = true;
} else if (VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY) {
  supabaseClient = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
  isConfigured = true;
} else {
  console.warn('No public Supabase environment variables found. Public server client not configured.');
  supabaseClient = null;
  isConfigured = false;
}

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
  isAdminConfigured = true;
} else {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not configured. Admin server routes will be unavailable.');
  supabaseAdminClient = null;
  isAdminConfigured = false;
}

export const supabase = supabaseClient;
export const supabaseAdmin = supabaseAdminClient;
export const supabaseConfigured = isConfigured;
export const supabaseAdminConfigured = isAdminConfigured;
