<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# BulkFollows SMM Panel

A modern Social Media Marketing (SMM) reseller panel built with React, TypeScript, Supabase, and FastPay integration.

## Features

- ðŸ” **User Authentication** - Secure authentication system with Supabase
- ðŸ’³ **FastPay Integration** - Payment processing with FastPay
- ðŸ“Š **Dashboard** - Real-time statistics and order management
- ðŸ›’ **Order Management** - Create and track orders
- ðŸ‘¥ **Admin Panel** - Complete admin dashboard for managing users, services, and orders
- ðŸ’° **Balance Management** - Add funds and track spending
- ðŸŽ¨ **Modern UI** - Beautiful dark-themed interface with purple accents

## Prerequisites

- Node.js (v18 or higher)
- A Supabase account ([sign up here](https://supabase.com))
- A FastPay merchant account (for payment processing)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [Supabase](https://supabase.com)
2. Go to **Settings** â†’ **API** to get your project URL and anon key
3. In the Supabase SQL Editor, run the schema from `supabase/schema.sql` to create all necessary tables and policies

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# FastPay Configuration
VITE_FASTPAY_MERCHANT_ID=your_fastpay_merchant_id
VITE_FASTPAY_BASE_URL=https://api.fastpay.com/v1

# Optional: Gemini API (if needed)
GEMINI_API_KEY=your_gemini_api_key

### Troubleshooting: "Failed to create user: Database error creating new user"

If you're seeing this error when creating users from the Supabase dashboard, it's often due to the automatic profile trigger hitting a UNIQUE constraint (username or email conflict) during the `auth.users` -> `user_profiles` insertion. Here's how to diagnose and resolve it:

- Open your Supabase project and go to SQL Editor.
- Run the following queries to inspect duplicates (replace the example email/username):

-- Check by email
SELECT id, username, email FROM public.user_profiles WHERE email = 'smh.hashmi12@gmail.com';

-- Check by username base
SELECT id, username, email FROM public.user_profiles WHERE username ILIKE 'smh.hashmi12%';
```

- If you find a conflicting row, update or rename the profile to free up the username or email. Example:
SET username = username || '_' || 'old'
WHERE id = '<conflicting-profile-id>';
```

- The trigger that creates profiles automatically (on auth.user insert) has been updated to be more robust and will attempt to generate a unique username. However, duplicate emails (which should not happen) are skipped by the trigger to prevent dashboard signup failures. If you need to create a specific test user, you can safely create them again after resolving the conflict.
```

### 4. Create Your First Admin User

After setting up the database, you'll need to manually set a user as admin:

1. Sign up through the registration page
2. In Supabase Dashboard â†’ **Table Editor** â†’ `user_profiles`
3. Find your user and change the `role` field from `user` to `admin`

Or, use a command-line helper that creates a server-side user and sets the role to admin (requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in your environment):


```powershell
 $env:SUPABASE_URL='https://your.supabase.co'  # NB: Replace with the real project host, NOT the placeholder.
 npm run create-admin -- some.admin@example.com StrongP@ssw0rd adminuser
```

If you see `Error: You are not an admin.` in the admin login UI after setting the role, do the following:
1. Confirm that `user_profiles.role` for your admin user is `admin` in Supabase SQL Editor.
2. Sign out from the application and sign in again (sessions cache the profile info; re-login refreshes it).
3. If the role is set and re-login still triggers the error, run the `create-admin` script to upsert the profile and set the role:
```powershell
$env:SUPABASE_URL='https://your.supabase.co'; $env:SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'
npm run create-admin -- some.admin@example.com StrongP@ssw0rd adminuser
```
4. For debugging, you can request your profile via the debug endpoint (requires a Bearer session token):
```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" https://your-server-domain/api/admin/me
```
Replace `<ACCESS_TOKEN>` with your valid session access token (or use the browser dev tools and fetch using the session cookie).

Note: The debug endpoint is restricted in production by default. To enable it in a production deployment (not recommended unless needed), set `ALLOW_ADMIN_DEBUG=1` in your server environment. Otherwise, it will only work when `NODE_ENV` is not `production`.

Browser example (same-origin; will include cookies by default - use credentials option if needed):
```js
// In your browser console, run:
fetch('/api/admin/me', { credentials: 'include' })
    .then(r => r.json())
    .then(data => console.log(data))
    .catch(err => console.error(err));
```


This script will:
- create an auth user server-side with `email` and `password` (using the service role key),
- create or upsert a `user_profiles` row for that user,
- set `role = 'admin'` for that user.

If you prefer a pure SQL approach to set an existing user as admin, you can run this in Supabase SQL Editor (replace email):

```sql
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'some.admin@example.com';


Note about `.env.local` and `.env`: The `create-admin` script will load `.env.local` first (this matches the frontend Vite file if you're running locally). If you rather set env vars in the shell, you can do that instead (PowerShell example above). The script performs a DNS lookup before calling the Supabase Admin API and will error out with helpful messages if the `SUPABASE_URL` is invalid or unresolved.

### 5. Run the Application

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Server: Important environment variables

- The server uses a Supabase service role key for privileged operations. **Set the following env variables for the server** (do not publish the service role key):

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

Local dev: If you prefer storing server env values per-service, create a `server/.env.local` file in the project root with server-only environment variables (this file is ignored by the repo by default). Example format:
```
# server/.env.local (DO NOT COMMIT)
SUPABASE_URL=https://exqvkorurrssfoccsbvk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...full_service_role_key...
FASTPAY_API_KEY=sk_...your_fastpay_key...
FASTPAY_WEBHOOK_SECRET=your_fastpay_webhook_secret
```
```

- The repo ships a `.env.local` with VITE_* variables for the frontend; the server should be configured with `SUPABASE_*` keys. If you want to use `.env.local`, export or copy the `VITE_SUPABASE_*` values into `SUPABASE_*` for the server.
 - The repo ships a `.env.local` with VITE_* variables for the frontend; the server should be configured with `SUPABASE_*` keys. If you want to use `.env.local`, export or copy the `VITE_SUPABASE_*` values into `SUPABASE_*` for the server.
  
    Allowed VITE variables (client-safe):
    - `VITE_SUPABASE_URL` â€” the public project URL.
    - `VITE_SUPABASE_ANON_KEY` â€” the public anon key for client calls.
    - `VITE_FASTPAY_MERCHANT_ID` â€” public merchant ID used to initialize fastpay flows.
    - `VITE_FASTPAY_BASE_URL` â€” base URL for client payment flows.

    Server secrets that MUST NOT appear in `VITE_*` or `/.env.local` thatâ€™s included by your build:
    - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
    - FastPay private keys and webhook secrets (`FASTPAY_API_KEY`, `FASTPAY_WEBHOOK_SECRET`) â€” keep server-only.
        If you previously had `VITE_FASTPAY_SECRET_KEY` or `VITE_FASTPAY_WEBHOOK_SECRET` in `.env.local`, remove them and put them in `server/.env.local` as `FASTPAY_API_KEY` and `FASTPAY_WEBHOOK_SECRET` instead.
    - Other secrets such as `AZURE_AD_CLIENT_SECRET`, `GEMINI_API_KEY` â€” keep them server-side.
    - If you have `VITE_SUPABASE_SERVICE_ROLE_KEY` in your `.env.local` (or `VITE_SUPABASE_ANON_KEY`), the server will automatically fall back to using these during local development. However, production runtimes should use `SUPABASE_*` env variables and NOT the Vite-prefixed keys.

- Example: using PowerShell to run the server with env vars (Windows):

```powershell
#$env:SUPABASE_URL = 'https://your.supabase.co'
#$env:SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key'
#$env:FASTPAY_WEBHOOK_SECRET = 'your_webhook_secret'
npm run start:server

Before running any server scripts (or creating admin users), you can validate your local `.env.local` and environment with:

```bash
npm run check-config
```

### Production / Deployment

To deploy a single-server that hosts both the frontend and the server API, you can build the front-end and serve it from the Node server that ships with this project.

1) Build the frontend

```bash
npm run build
```

2) Start the server and serve static build artifacts (on a production host):

Linux/Mac (Bash):
```bash
SERVE_STATIC=1 NODE_ENV=production npm start
```
Note: If you're using PowerShell on Windows set `SERVE_STATIC` and other envs using `$env:` statements as shown above.

Windows PowerShell (one-liners):
```powershell
# Set env variables in PowerShell before starting the server. This is one way to export them for the current shell.
$env:SUPABASE_URL = 'https://your.supabase.co';
$env:SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key';
$env:FASTPAY_API_KEY = 'sk_...your_fastpay_key...';
$env:FASTPAY_WEBHOOK_SECRET = 'whsec_...';
$env:NODE_ENV = 'production';
npm start
```

If you'd rather host the frontend and backend separately, build the frontend with `npm run build` and deploy the `dist/` output to a static host while running the API server behind the scenes.


This command will warn if client-visible `VITE_*` variables contain server-only secrets (like the service role key) and will list any potential issues to fix.
```

## Database Schema

The application uses the following main tables:

- **user_profiles** - User account information and balances
- **services** - Available SMM services
- **orders** - User orders
- **payments** - Payment transactions
- **providers** - Service providers integration
- **payment_logs** - Payment activity logs

See `supabase/schema.sql` for the complete schema with Row Level Security (RLS) policies.

## Project Structure

```text
src/
  components/
  lib/
    api.ts
    fastpay.ts
    supabase.ts
  pages/
    LandingPage.tsx
    UserLogin.tsx
    RegistrationPage.tsx
    dashboard/
    admin/
  types/
server/
supabase/
```

## Features Overview

### User Features
- Register and login
- View account balance and statistics
- Create new orders
- View order history
- Add funds via FastPay
- API access for integrations

### Admin Features
- User management
- Service management
- Order management
- Provider management
- Payment logs and tracking

## Payment Integration

The app integrates with FastPay for payment processing. When a user adds funds:

1. Payment record is created in the database
2. FastPay order is initiated
3. User is redirected to FastPay payment page
4. On successful payment, balance is updated automatically

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Admins have elevated permissions
- Secure authentication via Supabase Auth

### Rotating and removing a leaked Service Role Key

If you accidentally committed the Supabase Service Role Key (or any other secret) into the repository, do the following:

1) Rotate the key in the Supabase Console (immediately):
    - Supabase Dashboard â†’ Project â†’ Settings â†’ API â†’ **Service Role Key** â†’ Rotate Key (or generate new key)
    - Update your server environment variables with the new key value (do NOT put it into `.env.local` or client files).

2) Remove the secret from the repository and history. Note: rewriting Git history is destructive â€” coordinate with your team and prefer to rotate keys first.

Recommended methods:

- Using git-filter-repo (recommended because it's faster and safer than older tools):

```bash
# Install git-filter-repo (python) if needed (Linux/Mac pip example)
pip3 install git-filter-repo

# Create a mirror clone of your repo to operate on history safely
git clone --mirror git@github.com:your-org/your-repo.git
cd your-repo.git

# Remove the .env.local file from all commits
git filter-repo --invert-paths --path .env.local

# Push rewritten history (force). Everyone else must re-clone.
git push --force --all
git push --force --tags
```

- Using the BFG Repo-Cleaner (alternative):

```bash
git clone --mirror git@github.com:your-org/your-repo.git
cd your-repo.git
# Download BFG (https://rtyley.github.io/bfg-repo-cleaner/)
java -jar bfg.jar --delete-files .env.local
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

3) Inform your team to re-clone the repository because history has been rewritten.

4) Verify you restarted your deployments and updated all server environment variables with the new key. You may need to set `SUPABASE_SERVICE_ROLE_KEY` as an environment variable in your hosting environment (e.g., Vercel, Netlify, Docker, or your server host).

Note: Once a secret appears in a public Git repo or a shared remote, it should be considered compromised and rotated immediately even if removed from history.

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## License

This project is private and proprietary.

## Support

For issues and questions, please contact the development team.

