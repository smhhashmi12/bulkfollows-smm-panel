import React, { useEffect, useState } from 'react';
import { withTimeout } from '../../lib/withTimeout';

type HealthState = {
  ok: boolean;
  supabaseConfigured?: boolean;
  supabaseAdminConfigured?: boolean;
  serverTime?: string;
};

const DEFAULT_INTERVAL_MS = 30000;
const REQUEST_TIMEOUT_MS = 8000;

export const ServerHealthBanner: React.FC = () => {
  const [health, setHealth] = useState<HealthState | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const checkHealth = async () => {
      setLoading(true);
      try {
        const response = await withTimeout<Response | null>(
          fetch('/api/health'),
          REQUEST_TIMEOUT_MS,
          null,
          'server health'
        );
        if (!response) {
          if (isMounted) setHealth({ ok: false });
          return;
        }

        const raw = await withTimeout<string>(
          response.text(),
          REQUEST_TIMEOUT_MS,
          '',
          'server health body'
        );
        let payload: HealthState = { ok: false };
        try {
          payload = raw ? JSON.parse(raw) : { ok: false };
        } catch {
          payload = { ok: false };
        }

        if (isMounted) {
          setHealth(payload);
        }
      } catch {
        if (isMounted) setHealth({ ok: false });
      } finally {
        if (isMounted) {
          setLastChecked(new Date().toLocaleTimeString());
          setLoading(false);
        }
      }
    };

    checkHealth();
    intervalId = setInterval(checkHealth, DEFAULT_INTERVAL_MS);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  if (!health || health.ok) {
    return null;
  }

  const adminConfigIssue = health.supabaseAdminConfigured === false;
  const publicConfigIssue = health.supabaseConfigured === false;
  const statusText = adminConfigIssue || publicConfigIssue
    ? 'Server is up, but Supabase config is missing.'
    : 'Server is unreachable or unhealthy.';

  return (
    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-200 rounded-2xl px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">Backend issue:</span>
        <span>{statusText}</span>
        {lastChecked && (
          <span className="text-rose-300/70">Last check: {lastChecked}</span>
        )}
        {loading && <span className="text-rose-300/70">Checking…</span>}
      </div>
    </div>
  );
};

