#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env.local');
const serverEnvPath = path.resolve(process.cwd(), 'server', '.env.local');
let fileEnv = {};
let serverFileEnv = {};
try {
  if (fs.existsSync(envPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envPath));
    fileEnv = parsed;
  }
} catch (err) {
  console.error('Error loading .env.local:', err.message || err);
}

try {
  if (fs.existsSync(serverEnvPath)) {
    const parsedServer = dotenv.parse(fs.readFileSync(serverEnvPath));
    serverFileEnv = parsedServer;
  }
} catch (err) {
  console.error('Error loading server/.env.local:', err.message || err);
}

const shellEnv = process.env;

// VITE_* keys that are obviously secrets or server-only (should not be present)
const suspiciousViteKeys = [
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'VITE_FASTPAY_SECRET_KEY',
  'VITE_FASTPAY_API_KEY',
  'VITE_FASTPAY_WEBHOOK_SECRET',
  'VITE_AZURE_AD_CLIENT_SECRET',
  'VITE_PRIVATE_KEY',
];

// Whitelisted VITE_* keys allowed in client bundles (safe/expected)
const allowedViteKeys = new Set([
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_FASTPAY_MERCHANT_ID',
  'VITE_FASTPAY_BASE_URL',
  'VITE_GEMINI_API_KEY', // If this is intended to be public or optional
]);

const serverSecretNames = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'FASTPAY_API_KEY',
  'AZURE_AD_CLIENT_SECRET',
  'GEMINI_API_KEY',
];

let problems = [];

function checkKeyInObject(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }

// Check for Vite secret keys in .env.local
for (const key of suspiciousViteKeys) {
  if (checkKeyInObject(fileEnv, key) || checkKeyInObject(shellEnv, key)) {
    problems.push(`Found client-visible secret: ${key}. Remove it from .env.local and only set server-side (e.g., SUPABASE_SERVICE_ROLE_KEY).`);
  }
}

// Check for server secrets present in .env.local (unprefixed keys)
for (const key of serverSecretNames) {
  if (checkKeyInObject(fileEnv, key)) {
    problems.push(`Server secret ${key} appears in .env.local — move it to server environment variables and remove from .env.local`);
  }
}

// Check server/.env.local for presence of expected server secrets and warn if missing
for (const key of serverSecretNames) {
  if (!checkKeyInObject(serverFileEnv, key) && !checkKeyInObject(process.env, key)) {
    problems.push(`Server secret ${key} is not present in server/.env.local or in environment variables — ensure you created server/.env.local or set the key in your host environment.`);
  }
}

// Detect general suspicious keys in VITE_ naming (but allow safe ones)
Object.keys(fileEnv).forEach(k => {
  if (k.startsWith('VITE_') && !allowedViteKeys.has(k) && (k.includes('KEY') || k.includes('SECRET') || k.includes('SERVICE_ROLE') || k.includes('TOKEN'))) {
    problems.push(`Potential secret in VITE_: ${k} — don't expose secrets as Vite envs`);
  }
});

// Also scan process.env (shell) for VITE_* secrets that shouldn't be present
Object.keys(shellEnv).forEach(k => {
  if (k.startsWith('VITE_') && !allowedViteKeys.has(k) && (k.includes('KEY') || k.includes('SECRET') || k.includes('SERVICE_ROLE') || k.includes('TOKEN'))) {
    problems.push(`Potential secret in runtime env (VITE_*): ${k} — remove from environment if it's a server secret`);
  }
});

if (problems.length === 0) {
  console.log('No issues found. .env.local and environment look good for client vs server secrets.');
  process.exit(0);
}

console.warn('\n⚠️ Configuration issues detected:');
problems.forEach(p => console.warn(' - ' + p));

console.log(`\nFix suggestions:`);
console.log(` - Remove the key(s) from .env.local and set them in your server/global environment.`);
console.log(` - For Supabase service role key, set SUPABASE_SERVICE_ROLE_KEY in server environment variables, not as VITE_*.`);
console.log(` - If keys were committed, rotate them and purge them from Git history (see README for steps).`);
process.exit(1);
