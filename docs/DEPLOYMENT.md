## Deployment checklist & instructions

This checklist helps you deploy the SMM panel safely and correctly.

1) Environment variables
 - Put server-only keys in `server/.env.local` or your host environment:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - FASTPAY_API_KEY
   - FASTPAY_WEBHOOK_SECRET
   - FASTPAY_MERCHANT_ID (optional; used if not in Vite env)
 - Keep client-safe Vite envs in `.env.local` only:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
   - VITE_FASTPAY_MERCHANT_ID
   - VITE_FASTPAY_BASE_URL

2) Build and serve
 - Build the frontend: `npm run build`
 - Serve with Node server: `SERVE_STATIC=1 NODE_ENV=production npm start`

3) Production deployment recommendations
 - Use a hosted DB (Supabase) and set secrets in environment variables.
 - Use a CI pipeline to run `npm run check-config` as a step to ensure no secret leakage into Vite envs.
 - Consider running the Node server behind a reverse proxy (Nginx) to handle TLS and static caching.
 - If you prefer Docker, build a Docker image with `npm run build` and `npm start` in production.

4) Key considerations
 - For FastPay: Keep `FASTPAY_API_KEY` on server only and use webhooks to reconcile transactions.
 - For Supabase: Ensure RLS policies fit your security model and that your `handle_new_user` trigger exists and is robust for both `raw_user_meta_data` and `user_metadata` variants.
 - Rotate keys if ever committed to Git history.

5) Health checks
 - Confirm Admin API key with a curl or PowerShell test to `SUPABASE_URL/auth/v1/admin/users` using `SUPABASE_SERVICE_ROLE_KEY`.
 - Test a full payment flow locally: create user -> create payment -> call `create-order` endpoint -> purchase -> check webhook received.

6) Optional: CI tests & pre-commit hooks
 - Add `npm run check-config` to CI and pre-commit hook to prevent accidental commit of secrets.

If you want, I can add a `Dockerfile`, a `docker-compose.yml`, and/or a GitHub Actions CI workflow to automate building, testing, and deploying this repository.
