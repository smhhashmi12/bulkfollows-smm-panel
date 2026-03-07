import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';

// Load production defaults first, then local overrides and default envs.
dotenv.config({ path: '.env.production' });
dotenv.config({ path: 'server/.env.local' });
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const isServerRoute =
    req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/webhook/');

  if (!isServerRoute) {
    return next();
  }

  const startedAt = Date.now();
  const requestId = req.headers['x-vercel-id'] || req.headers['x-request-id'] || '';

  console.log('[HTTP] start', {
    method: req.method,
    path: req.originalUrl,
    requestId,
  });

  res.on('finish', () => {
    console.log('[HTTP] finish', {
      method: req.method,
      path: req.originalUrl,
      requestId,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
});

if (process.env.SERVE_STATIC === '1' || process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/webhook/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

async function registerRoutes() {
  console.log('[Server] Registering routes', {
    vercel: Boolean(process.env.VERCEL),
    nodeEnv: process.env.NODE_ENV || 'development',
  });

  const [
    { default: servicesRouter },
    { default: webhookRouter },
    { default: integrationsRouter },
    { default: fastpayRouter },
    { default: adminRouter },
    { default: paymentsRouter },
    { default: providerRouter },
  ] = await Promise.all([
    import('./routes/services.js'),
    import('./routes/webhook.js'),
    import('./routes/integrations.js'),
    import('./routes/fastpay.js'),
    import('./routes/admin.js'),
    import('./routes/payments.js'),
    import('./routes/provider.js'),
  ]);

  app.use('/api/admin/services', servicesRouter);
  app.use('/webhook/fastpay', webhookRouter);
  app.use('/api/webhook/fastpay', webhookRouter);
  app.use('/api/integrations', integrationsRouter);
  app.use('/api/fastpay', fastpayRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/provider', providerRouter);

  app.get('/', (_req, res) => res.send('BulkFollows backend running'));

  return app;
}

export const appReady = registerRoutes();

export async function handleRequest(req, res) {
  await appReady;
  return app(req, res);
}

export default app;
