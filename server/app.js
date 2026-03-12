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

app.set('trust proxy', 1);

// Explicit CORS configuration for Vercel
const corsOptions = {
  origin: true, // Allow any origin (or configure specific domains in production)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
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
  app.use(express.static(distPath, {
    etag: true,
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      const normalizedPath = filePath.replace(/\\/g, '/');

      if (normalizedPath.endsWith('/index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
        return;
      }

      if (normalizedPath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return;
      }

      res.setHeader('Cache-Control', 'public, max-age=3600');
    },
  }));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/webhook/')) return next();
    if (path.extname(req.path)) {
      return res.status(404).end();
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

async function registerRoutes() {
  console.log('[Server] Registering routes', {
    vercel: Boolean(process.env.VERCEL),
    nodeEnv: process.env.NODE_ENV || 'development',
  });

  const [
    { default: authRouter },
    { default: servicesRouter },
    { default: publicServicesRouter },
    { default: webhookRouter },
    { default: integrationsRouter },
    { default: fastpayRouter },
    { default: adminRouter },
    { default: paymentsRouter },
    { default: providerRouter },
  ] = await Promise.all([
    import('./routes/auth.js'),
    import('./routes/services.js'),
    import('./routes/publicServices.js'),
    import('./routes/webhook.js'),
    import('./routes/integrations.js'),
    import('./routes/fastpay.js'),
    import('./routes/admin.js'),
    import('./routes/payments.js'),
    import('./routes/provider.js'),
  ]);

  app.use('/api/auth', authRouter);
  app.use('/api/services', publicServicesRouter);
  app.use('/api/admin/services', servicesRouter);
  app.use('/webhook/fastpay', webhookRouter);
  app.use('/api/webhook/fastpay', webhookRouter);
  app.use('/api/integrations', integrationsRouter);
  app.use('/api/fastpay', fastpayRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/provider', providerRouter);

  // health check
  app.get('/', (_req, res) => res.send('BulkFollows backend running'));

  // global error handler (should be last middleware)
  const { errorHandler } = await import('./lib/apiResponse.js');
  app.use(errorHandler);

  return app;
}

let cachedApp = null;

export const appReady = registerRoutes().then((app) => {
  cachedApp = app;
  return app;
});

export async function handleRequest(req, res) {
  if (!cachedApp) {
    await appReady;
  }
  return cachedApp(req, res);
}

export default cachedApp;
