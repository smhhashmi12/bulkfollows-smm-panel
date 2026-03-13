const HEALTH_PATHS = new Set(['/api/health', '/health']);

export default async function handler(req, res) {
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
