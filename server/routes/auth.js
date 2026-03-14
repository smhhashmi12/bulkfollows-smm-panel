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
import { successResponse, errorResponse, asyncHandler } from '../lib/apiResponse.js';

const router = express.Router();
const AUTH_VERIFY_TIMEOUT_MS = 1500;

const withTimeout = (promise, timeoutMs, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);

const getAuthClient = () => {
  if (supabaseConfigured && supabase) {
    return supabase;
  }

  if (supabaseAdminConfigured && supabaseAdmin) {
    return supabaseAdmin;
  }

  return null;
};

router.post('/session', asyncHandler(async (req, res) => {
  const accessToken = String(req.body?.accessToken || '').trim();
  const refreshToken = String(req.body?.refreshToken || '').trim();
  const expiresAt = Number.parseInt(String(req.body?.expiresAt || ''), 10);
  const expiresIn = Number.parseInt(String(req.body?.expiresIn || ''), 10);

  if (!accessToken || !refreshToken) {
    clearAuthCookies(res);
    return res.status(400).json(
      errorResponse('MISSING_TOKENS', 'Missing accessToken or refreshToken', { cookieConfig: getAuthCookieConfig() })
    );
  }

  const authClient = getAuthClient();
  if (authClient) {
    try {
      const { data, error } = await withTimeout(
        authClient.auth.getUser(accessToken),
        AUTH_VERIFY_TIMEOUT_MS,
        'auth getUser'
      );
      if (error || !data?.user) {
        clearAuthCookies(res);
        return res.status(401).json(
          errorResponse('INVALID_TOKEN', 'Invalid access token', { cookieConfig: getAuthCookieConfig() })
        );
      }
    } catch (error) {
      console.warn('[Auth] Skipping token verification due to timeout.', error);
      setAuthCookies(res, {
        accessToken,
        refreshToken,
        expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined,
        expiresIn: Number.isFinite(expiresIn) ? expiresIn : undefined,
      });
      return res.status(200).json(
        successResponse({
          cookieConfig: getAuthCookieConfig(),
          verified: false,
          warning: 'Token verification timed out; cookies set without server-side validation.',
        })
      );
    }
  }

  setAuthCookies(res, {
    accessToken,
    refreshToken,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined,
    expiresIn: Number.isFinite(expiresIn) ? expiresIn : undefined,
  });

  return res.status(200).json(
    successResponse({ cookieConfig: getAuthCookieConfig(), verified: true })
  );
}));

router.post('/clear', (_req, res) => {
  clearAuthCookies(res);
  return res.status(200).json(
    successResponse({ cookieConfig: getAuthCookieConfig() })
  );
});

router.get('/session', asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, expiresAt } = readAuthCookies(req);

  if (!accessToken || !refreshToken) {
    return res.status(200).json(
      successResponse({ sessionPresent: false, cookieConfig: getAuthCookieConfig() })
    );
  }

  const authClient = getAuthClient();
  if (!authClient) {
    return res.status(200).json(
      successResponse({ sessionPresent: true, expiresAt, cookieConfig: getAuthCookieConfig() })
    );
  }

  try {
    const { data, error } = await withTimeout(
      authClient.auth.getUser(accessToken),
      AUTH_VERIFY_TIMEOUT_MS,
      'auth getUser'
    );
    if (error || !data?.user) {
      clearAuthCookies(res);
      return res.status(200).json(
        successResponse({ sessionPresent: false, cookieConfig: getAuthCookieConfig() })
      );
    }

    return res.status(200).json(
      successResponse({
        sessionPresent: true,
        expiresAt,
        cookieConfig: getAuthCookieConfig(),
        user: { id: data.user.id, email: data.user.email || null },
        verified: true,
      })
    );
  } catch (error) {
    console.warn('[Auth] Session verification timed out, returning cached session.', error);
    return res.status(200).json(
      successResponse({
        sessionPresent: true,
        expiresAt,
        cookieConfig: getAuthCookieConfig(),
        verified: false,
      })
    );
  }

}));

export default router;
