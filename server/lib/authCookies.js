const AUTH_ACCESS_COOKIE_NAME = 'bf_access_token';
const AUTH_REFRESH_COOKIE_NAME = 'bf_refresh_token';
const AUTH_EXPIRES_AT_COOKIE_NAME = 'bf_session_expires_at';
const DEFAULT_REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const parseBoolean = (value, fallback = false) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const isLocalhost = () => {
  const serverUrl = process.env.SERVER_URL || process.env.VERCEL_URL || 'http://localhost:4000';
  try {
    const url = new URL(serverUrl);
    const hostname = url.hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
};

const getCookieSameSite = () => {
  const value = String(process.env.AUTH_COOKIE_SAME_SITE || 'lax').trim().toLowerCase();
  if (value === 'strict' || value === 'none') {
    return value;
  }
  return 'lax';
};

const getCookiePath = () => {
  const value = String(process.env.AUTH_COOKIE_PATH || '/').trim();
  return value || '/';
};

const getCookieDomain = () => {
  const value = String(process.env.AUTH_COOKIE_DOMAIN || '').trim();
  return value || undefined;
};

const isSecureCookieEnabled = (sameSite = getCookieSameSite()) => {
  const explicitValue = String(process.env.AUTH_COOKIE_SECURE || '').trim();
  if (explicitValue) {
    return parseBoolean(explicitValue, false);
  }

  // Allow insecure cookies for localhost in development
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev && isLocalhost()) {
    return false;  // Allow http in dev
  }

  if (sameSite === 'none') {
    return true;
  }

  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
};

const getRefreshCookieMaxAgeMs = () => {
  const parsed = Number.parseInt(String(process.env.AUTH_REFRESH_COOKIE_MAX_AGE_MS || ''), 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_REFRESH_COOKIE_MAX_AGE_MS;
};

const getCookieOptions = (maxAge) => {
  const sameSite = getCookieSameSite();
  const options = {
    httpOnly: true,
    sameSite,
    secure: isSecureCookieEnabled(sameSite),
    path: getCookiePath(),
  };

  const domain = getCookieDomain();
  if (domain) {
    options.domain = domain;
  }

  if (typeof maxAge === 'number' && Number.isFinite(maxAge)) {
    options.maxAge = Math.max(0, maxAge);
  }

  return options;
};

const parseCookieHeader = (cookieHeader = '') => {
  const cookies = {};

  cookieHeader.split(';').forEach((entry) => {
    const index = entry.indexOf('=');
    if (index <= 0) return;

    const key = entry.slice(0, index).trim();
    const value = entry.slice(index + 1).trim();
    if (!key) return;

    cookies[key] = decodeURIComponent(value);
  });

  return cookies;
};

export const AUTH_COOKIE_NAMES = {
  accessToken: AUTH_ACCESS_COOKIE_NAME,
  refreshToken: AUTH_REFRESH_COOKIE_NAME,
  expiresAt: AUTH_EXPIRES_AT_COOKIE_NAME,
};

export const getAuthCookieConfig = () => {
  const sameSite = getCookieSameSite();

  return {
    domain: getCookieDomain() || null,
    path: getCookiePath(),
    sameSite,
    secure: isSecureCookieEnabled(sameSite),
    refreshMaxAgeMs: getRefreshCookieMaxAgeMs(),
  };
};

export const readAuthCookies = (req) => {
  const cookieHeader = req.headers.cookie || req.headers.Cookie || '';
  const cookies = parseCookieHeader(cookieHeader);
  const rawExpiresAt = Number.parseInt(String(cookies[AUTH_EXPIRES_AT_COOKIE_NAME] || ''), 10);

  return {
    accessToken: String(cookies[AUTH_ACCESS_COOKIE_NAME] || '').trim(),
    refreshToken: String(cookies[AUTH_REFRESH_COOKIE_NAME] || '').trim(),
    expiresAt: Number.isFinite(rawExpiresAt) ? rawExpiresAt : null,
  };
};

export const clearAuthCookies = (res) => {
  res.clearCookie(AUTH_ACCESS_COOKIE_NAME, getCookieOptions());
  res.clearCookie(AUTH_REFRESH_COOKIE_NAME, getCookieOptions());
  res.clearCookie(AUTH_EXPIRES_AT_COOKIE_NAME, getCookieOptions());
};

export const setAuthCookies = (res, session) => {
  const accessToken = String(session?.accessToken || '').trim();
  const refreshToken = String(session?.refreshToken || '').trim();

  if (!accessToken || !refreshToken) {
    clearAuthCookies(res);
    return;
  }

  const expiresAt = Number.parseInt(String(session?.expiresAt || ''), 10);
  const expiresIn = Number.parseInt(String(session?.expiresIn || ''), 10);

  const accessCookieMaxAge =
    Number.isFinite(expiresAt)
      ? Math.max(0, expiresAt * 1000 - Date.now())
      : Number.isFinite(expiresIn)
        ? Math.max(0, expiresIn * 1000)
        : 60 * 60 * 1000;

  res.cookie(AUTH_ACCESS_COOKIE_NAME, accessToken, getCookieOptions(accessCookieMaxAge));
  res.cookie(AUTH_REFRESH_COOKIE_NAME, refreshToken, getCookieOptions(getRefreshCookieMaxAgeMs()));

  if (Number.isFinite(expiresAt)) {
    res.cookie(AUTH_EXPIRES_AT_COOKIE_NAME, String(expiresAt), getCookieOptions(accessCookieMaxAge));
  } else {
    res.clearCookie(AUTH_EXPIRES_AT_COOKIE_NAME, getCookieOptions());
  }
};
