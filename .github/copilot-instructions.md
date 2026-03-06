# BulkFollows SMM Panel - AI Copilot Instructions

## Project Overview
**BulkFollows** is a Social Media Marketing (SMM) reseller panel with dual frontend (React/Vite), backend (Express), and payment integration (FastPay). Built for multi-currency support, admin dashboards, and provider management.

## Architecture

### Core Stack
- **Frontend**: React 19 + TypeScript + Vite (port 3000)
- **Backend**: Express.js (port 4000) — serves API & static assets in prod
- **Database**: Supabase PostgreSQL with Row-Level Security (RLS)
- **Auth**: Supabase Auth with PKCE flow, persistent session storage
- **Payments**: FastPay integration via webhook reconciliation

### Key Folders
- `pages/` — React route pages (landing, login, dashboard, admin)
- `components/` — Reusable UI components (Header, Sidebar, StatCard, etc.)
- `lib/` — Core utilities (Supabase client, API functions, contexts)
- `server/routes/` — Express API routes (admin, payments, fastpay, integrations)
- `supabase/` — Database schema, migrations, RLS policies

### Data Model
**Core Tables** (all with RLS):
- `user_profiles` — Extends auth.users; username, email, role (user|admin), balance, total_spent
- `services` — SMM services with rate_per_1000, min/max quantity, status
- `orders` — User orders linked to services; tracks status & provider_order_id
- `payments` — FastPay transactions; stores fastpay_order_id for webhook reconciliation
- `providers` — External SMM providers (API key, status, balance)
- `platform_earnings`, `provider_payouts`, `provider_transactions` — Earnings tracking (admin-only)

**RLS Pattern**: 
- Users see own data (`auth.uid() = user_id`)
- Admins see all via `is_admin()` helper function (avoids infinite recursion)
- Services publicly readable if active; admin-only modifications

## Development Workflows

### Build & Run
```bash
npm run dev              # Frontend only (Vite dev server, port 3000)
npm run start:server     # Backend only (Express, port 4000)
npm run dev:full        # RECOMMENDED: Both frontend + backend concurrently
npm run build           # Production build (outputs to dist/)
npm start               # Production: Node server at port 4000
npm start:prod          # Production with SERVE_STATIC=1 (static file serving)
```

### Admin & Config
```bash
npm run create-admin -- email@example.com password username
  # Create admin user via server (requires SUPABASE_SERVICE_ROLE_KEY)

npm run check-config    # Verify env vars (detects accidental secret leakage)
npm test               # Run Jest tests (runs in-band)
```

### Environment Setup
**Client-side** (`.env.local`, prefixed `VITE_`):
```
VITE_SUPABASE_URL=https://your.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_FASTPAY_MERCHANT_ID=...
VITE_FASTPAY_BASE_URL=https://api.fastpay.com/v1
```

**Server-side** (`server/.env.local` or host environment):
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
FASTPAY_API_KEY=...
FASTPAY_WEBHOOK_SECRET=...
PORT=4000
NODE_ENV=production
```

## Project Conventions

### Authentication Pattern
- Session persisted in localStorage via custom storage wrapper
- `useAuthCheck()` hook verifies session on mount (prevents unauth redirects)
- `getCurrentUser()` fetches profile from `user_profiles` table after Supabase login
- Admin role checked via `is_admin()` SQL function (fast, avoids RLS recursion)
- Example: [App.tsx](App.tsx#L30-L75) initializes auth; [lib/api.ts](lib/api.ts#L62-L100) handles signUp/signIn

### Context Providers
- **CurrencyContext** — Multi-currency support (USD, EUR, GBP, PKR, INR, AED, CAD, AUD)
  - Exchange rates hardcoded; formats amount via `formatAmount(number): string`
  - Persists selected currency to localStorage
- **NotificationContext** — Client-side notifications with unread count tracking

### API Conventions
- **Client API** ([lib/api.ts](lib/api.ts)) — All Supabase queries via `authAPI`, `orderAPI`, `paymentAPI`, etc.
- **Server Routes** ([server/routes/](server/routes/)) — Handle FastPay webhooks, payment creation, admin operations
  - Routes dynamically imported in [server/index.js](server/index.js) to capture env vars after dotenv loads
  - Payment flow: User creates payment → `/api/payments/create-order` → FastPay → webhook → status update
- **Vite Proxy** ([vite.config.ts](vite.config.ts)) — Dev-time proxy `/api` & `/webhook` to localhost:4000

### Payment Workflow
1. User initiates payment in UI
2. Frontend calls `/api/payments/create-order` (server-side)
3. Server generates FastPay order via `FASTPAY_API_KEY`
4. FastPay redirects user to payment page
5. FastPay sends webhook to `/webhook/fastpay`
6. Server reconciles transaction: validates signature, updates `payments` table status, adds balance to user
7. Frontend polls/subscribes for payment status update

## Critical Integration Points

### Supabase Auth Gotchas
- **Profile Trigger**: `handle_new_user()` fires on `auth.users` INSERT → creates `user_profiles` row
  - Catches duplicate username/email errors to prevent signup dashboard failures
  - Username auto-generated if conflict detected
- **Session Restoration**: Custom storage logs all getItem/setItem/removeItem calls (debugging aid)
- **JWT Token**: Stored in localStorage as `supabase.auth.token` (PKCE flow)

### FastPay Integration
- **Merchant ID**: Can be client-side (`VITE_FASTPAY_MERCHANT_ID`) for form rendering
- **API Key**: Server-side only (`FASTPAY_API_KEY`); never expose in Vite env
- **Webhook Signature**: Verify via `FASTPAY_WEBHOOK_SECRET` before trusting payload
- **Order ID Mapping**: Store `fastpay_order_id` in `payments` table for reconciliation

### RLS Policies
- Admin bypass pattern: `is_admin(auth.uid())` prevents infinite recursion (uses SECURITY DEFINER)
- Each table has explicit SELECT/INSERT/UPDATE/DELETE policies
- Test RLS by querying as anon key in Supabase SQL editor (simulates client requests)

## Testing & Debugging

### Local Testing Checklist
1. Run `npm run dev:full` to start both frontend & backend
2. Register user at `/` → redirects to dashboard
3. Login at `/login` (anon users redirected here)
4. Create test payment: admin sets service, user creates order, initiates payment
5. Check Supabase SQL editor for order/payment records with correct RLS visibility
6. Check server logs for webhook receipt & signature validation

### Common Issues
- **"Error: You are not an admin"** after setting role → re-login (session cache); or run `create-admin` script
- **Auth fails with 400** → Check console logs (`[Auth]` prefixed) for Supabase errors; verify env vars
- **Payment webhook not firing** → Verify `FASTPAY_WEBHOOK_SECRET` matches FastPay dashboard; check server logs
- **RLS blocking queries** → Review RLS policies in schema.sql; test with admin vs anon key separately

## Code Patterns & Examples

### Adding a New Admin API Endpoint
1. Create route handler in `server/routes/admin.js`
2. Export as Express router, use `supabaseAdmin` client (initialized with SERVICE_ROLE_KEY)
3. Wire up in [server/index.js](server/index.js): `app.use('/api/admin/...', adminRouter)`
4. Call from frontend via `fetch('/api/admin/...')` in [lib/api.ts](lib/api.ts)

### Adding a New Service & Pricing Tier
1. Insert into `services` table (Supabase dashboard or via API)
2. Create `ServiceCard` component in `components/` showing rate_per_1000 & quantity inputs
3. Calculate charge: `(quantity / 1000) * rate_per_1000 * time_multiplier` (e.g., 6-hour rush = 2.0x)
4. POST order to `/api/orders` with service_id, quantity, delivery_time

### Multi-Currency Flow
1. User selects currency in header → `CurrencyContext.setCurrency()`
2. All prices displayed via `formatAmount()` (converts USD → target currency)
3. Backend stores all values in USD; frontend converts for display only
4. Example: [CurrencyAmount.tsx](components/CurrencyAmount.tsx) wraps amounts

## Deployment Notes

### Pre-Deploy Checklist
- [ ] Set `VITE_*` env vars (client-safe) — never contain secrets
- [ ] Set server env vars separately (SUPABASE_URL, FASTPAY_API_KEY, etc.)
- [ ] Run `npm run check-config` to audit for secret leakage
- [ ] Test full payment flow locally: user creation → order → FastPay webhook
- [ ] Rotate API keys if ever committed to git (check git history)

### Production Build
```bash
npm run build
SERVE_STATIC=1 NODE_ENV=production npm start
```
- Server serves static `dist/` assets + API routes
- SPA fallback: `/api/*` and `/webhook/*` routes bypass HTML fallback

### Health Checks
- `/` — Returns "BulkFollows backend running" (server alive)
- `/api/admin/users` with valid JWT — Tests Supabase auth
- POST `/webhook/fastpay` with test payload — Tests webhook reception

---

**Last Updated**: January 2026  
**Key Maintainers**: Provider integration, FastPay reconciliation, RLS security
