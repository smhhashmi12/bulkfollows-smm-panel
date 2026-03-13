const HEALTH_PATHS = new Set(['/api/health', '/health']);
const ENV_CHECK_PATHS = new Set(['/api/env-check', '/env-check']);

const findEnvBySuffix = (suffixes) => {
  const keys = Object.keys(process.env);
  for (const suffix of suffixes) {
    const match = keys.find((key) => key.toUpperCase().endsWith(suffix));
    if (match && process.env[match]) return match;
  }
  return null;
};

export default async function handler(req, res) {
  if (ENV_CHECK_PATHS.has(req.url)) {
    const supabaseUrlKey =
      process.env.SUPABASE_URL
        ? 'SUPABASE_URL'
        : process.env.VITE_SUPABASE_URL
          ? 'VITE_SUPABASE_URL'
          : process.env.NEXT_PUBLIC_SUPABASE_URL
            ? 'NEXT_PUBLIC_SUPABASE_URL'
            : findEnvBySuffix(['_SUPABASE_URL']);

    const supabaseAnonKeyKey =
      process.env.VITE_SUPABASE_ANON_KEY
        ? 'VITE_SUPABASE_ANON_KEY'
        : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
          : findEnvBySuffix(['_SUPABASE_ANON_KEY', '_SUPABASE_PUBLISHABLE_KEY']);

    const supabaseServiceRoleKeyKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY
        ? 'SUPABASE_SERVICE_ROLE_KEY'
        : process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
          ? 'VITE_SUPABASE_SERVICE_ROLE_KEY'
          : process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
            ? 'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'
            : findEnvBySuffix(['_SUPABASE_SERVICE_ROLE_KEY', '_SUPABASE_SECRET_KEY']);

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      serverTime: new Date().toISOString(),
      supabaseUrlKey,
      supabaseAnonKeyKey,
      supabaseServiceRoleKeyKey,
      hasSupabaseUrl: Boolean(supabaseUrlKey),
      hasSupabaseAnonKey: Boolean(supabaseAnonKeyKey),
      hasSupabaseServiceRoleKey: Boolean(supabaseServiceRoleKeyKey),
    }));
    return;
  }

  if (HEALTH_PATHS.has(req.url)) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      serverTime: new Date().toISOString(),
    }));
    return;
  }

  const importWithTimeout = Promise.race([
    import('../server/app.js'),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Server bootstrap timed out')), 8000)
    ),
  ]);

  try {
    const { handleRequest } = await importWithTimeout;
    return handleRequest(req, res);
  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 504;
    res.end(JSON.stringify({
      ok: false,
      error: 'Server bootstrap timed out',
    }));
  }
}
