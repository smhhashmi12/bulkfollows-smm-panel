import express from 'express';
import {
  supabase,
  supabaseAdmin,
  supabaseConfigured,
  supabaseAdminConfigured,
} from '../lib/supabaseServer.js';
import {
  clearAuthCookies,
  getAuthCookieConfig,
  readAuthCookies,
  setAuthCookies,
} from '../lib/authCookies.js';

const router = express.Router();

const getAuthClient = () => {
  if (supabaseConfigured && supabase) {
    return supabase;
  }

  if (supabaseAdminConfigured && supabaseAdmin) {
    return supabaseAdmin;
  }

  return null;
};

router.post('/session', async (req, res) => {
  try {
    const accessToken = String(req.body?.accessToken || '').trim();
    const refreshToken = String(req.body?.refreshToken || '').trim();
    const expiresAt = Number.parseInt(String(req.body?.expiresAt || ''), 10);
    const expiresIn = Number.parseInt(String(req.body?.expiresIn || ''), 10);

    if (!accessToken || !refreshToken) {
      clearAuthCookies(res);
      return res.status(400).json({
        error: 'Missing accessToken or refreshToken',
        cookieConfig: getAuthCookieConfig(),
      });
    }

    const authClient = getAuthClient();
    if (authClient) {
      const { data, error } = await authClient.auth.getUser(accessToken);
      if (error || !data?.user) {
        clearAuthCookies(res);
        return res.status(401).json({
          error: 'Invalid access token',
          cookieConfig: getAuthCookieConfig(),
        });
      }
    }

    setAuthCookies(res, {
      accessToken,
      refreshToken,
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined,
      expiresIn: Number.isFinite(expiresIn) ? expiresIn : undefined,
    });

    return res.status(200).json({
      success: true,
      cookieConfig: getAuthCookieConfig(),
    });
  } catch (error) {
    console.error('[auth] failed to persist session cookies:', error);
    clearAuthCookies(res);
    return res.status(500).json({
      error: 'Failed to persist session cookies',
      cookieConfig: getAuthCookieConfig(),
    });
  }
});

router.post('/clear', (_req, res) => {
  clearAuthCookies(res);
  return res.status(200).json({
    success: true,
    cookieConfig: getAuthCookieConfig(),
  });
});

router.get('/session', async (req, res) => {
  try {
    const { accessToken, refreshToken, expiresAt } = readAuthCookies(req);

    if (!accessToken || !refreshToken) {
      return res.status(200).json({
        sessionPresent: false,
        cookieConfig: getAuthCookieConfig(),
      });
    }

    const authClient = getAuthClient();
    if (!authClient) {
      return res.status(200).json({
        sessionPresent: true,
        expiresAt,
        cookieConfig: getAuthCookieConfig(),
      });
    }

    const { data, error } = await authClient.auth.getUser(accessToken);
    if (error || !data?.user) {
      clearAuthCookies(res);
      return res.status(200).json({
        sessionPresent: false,
        cookieConfig: getAuthCookieConfig(),
      });
    }

    return res.status(200).json({
      sessionPresent: true,
      expiresAt,
      cookieConfig: getAuthCookieConfig(),
      user: {
        id: data.user.id,
        email: data.user.email || null,
      },
    });
  } catch (error) {
    console.error('[auth] failed to inspect session cookies:', error);
    clearAuthCookies(res);
    return res.status(500).json({
      error: 'Failed to inspect session cookies',
      cookieConfig: getAuthCookieConfig(),
    });
  }
});

export default router;
