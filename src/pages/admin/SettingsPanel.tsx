import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../lib/api';

type AppSettings = {
  siteTitle?: string;
  logoUrl?: string;
  homepageContent?: string;
  smtp?: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    fromEmail?: string;
  };
  payment?: {
    fastpayApiKey?: string;
    stripeSecret?: string;
    paypalClientId?: string;
  };
  maintenanceMode?: boolean;
  currency?: string;
  minimumDeposit?: number;
};

const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    adminAPI.getSettings()
      .then((res: any) => {
        if (!mounted) return;
        // If API returns null it likely means the settings table is missing or empty
        setSettings(res ?? null);
      })
      .catch(err => {
        console.error('Error loading settings:', err);
        setError(err?.message || String(err));
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, []);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function saveSettings() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await adminAPI.saveSettings(settings);
      setSuccess('Settings saved');
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  }

  if (loading) return <div className="p-6">Loading settings...</div>;

  const tableMissing = settings === null && !error;

  return (
    <div>
      <div className="flex justify-end items-center mb-6">
        <div className="flex items-center gap-3">
          <button onClick={saveSettings} disabled={saving || tableMissing} className="bg-gradient-to-r from-brand-accent to-brand-purple hover:opacity-90 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Saving...' : 'Save Settings'}</button>
          <button onClick={() => window.location.reload()} className="px-4 py-2 border border-brand-border rounded-lg">Reset</button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {tableMissing && (
        <div className="mb-4 p-4 bg-yellow-500/10 text-yellow-300 rounded-lg">
          <div className="font-medium">Missing database table</div>
          <div className="text-sm mt-1">Could not find <code className="font-mono">public.app_settings</code> in your database. Create the table using the SQL below, then refresh this page.</div>
          <pre className="mt-3 bg-black/10 p-3 rounded font-mono text-sm overflow-auto ds-scrollbar">{`create table if not exists app_settings (
  id text primary key,
  config jsonb,
  updated_at timestamptz default now()
);

insert into app_settings (id, config) values ('default', '{}'::jsonb) on conflict (id) do nothing;`}</pre>
        </div>
      )}

      <div className="bg-brand-container border border-brand-border rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="settings-site-title" className="block text-sm font-medium">Website Title</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L20 6V18L12 22L4 18V6L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <input
                id="settings-site-title"
                name="siteTitle"
                className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                value={(settings as any)?.siteTitle || ''}
                onChange={e => update('siteTitle', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="settings-logo-url" className="block text-sm font-medium">Logo URL</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7H21V17H3V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 11L10 14L14 10L18 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <input
                id="settings-logo-url"
                name="logoUrl"
                className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                value={(settings as any)?.logoUrl || ''}
                onChange={e => update('logoUrl', e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="settings-homepage-content" className="block text-sm font-medium">Homepage Content (HTML)</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7H21V17H3V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 11L10 14L14 10L18 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <textarea
                id="settings-homepage-content"
                name="homepageContent"
                className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                rows={6}
                value={(settings as any)?.homepageContent || ''}
                onChange={e => update('homepageContent', e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="font-semibold">SMTP / Email</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4H20V8H4V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 12H20V20H4V12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <input
                  id="settings-smtp-host"
                  name="smtpHost"
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                  placeholder="Host"
                  value={(settings as any)?.smtp?.host || ''}
                  onChange={e => setSettings(prev => ({ ...(prev || {}), smtp: { ...((prev as any)?.smtp || {}), host: e.target.value } }))}
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <input
                  id="settings-smtp-port"
                  name="smtpPort"
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                  placeholder="Port"
                  type="number"
                  value={(settings as any)?.smtp?.port ?? ''}
                  onChange={e => setSettings(prev => ({ ...(prev || {}), smtp: { ...((prev as any)?.smtp || {}), port: Number(e.target.value) || 0 } }))}
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 8L12 13L21 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 16V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <input
                  id="settings-smtp-from-email"
                  name="smtpFromEmail"
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                  placeholder="From Email"
                  value={(settings as any)?.smtp?.fromEmail || ''}
                  onChange={e => setSettings(prev => ({ ...(prev || {}), smtp: { ...((prev as any)?.smtp || {}), fromEmail: e.target.value } }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 14C13.6569 14 15 12.6569 15 11C15 9.34315 13.6569 8 12 8C10.3431 8 9 9.34315 9 11C9 12.6569 10.3431 14 12 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 21V19C4 16.7909 5.79086 15 8 15H16C18.2091 15 20 16.7909 20 19V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <input
                  id="settings-smtp-username"
                  name="smtpUsername"
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                  placeholder="Username"
                  value={(settings as any)?.smtp?.username || ''}
                  onChange={e => setSettings(prev => ({ ...(prev || {}), smtp: { ...((prev as any)?.smtp || {}), username: e.target.value } }))}
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 11V7C7 4.79086 8.79086 3 11 3H13C15.2091 3 17 4.79086 17 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <input
                  id="settings-smtp-password"
                  name="smtpPassword"
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                  placeholder="Password"
                  type="password"
                  value={(settings as any)?.smtp?.password || ''}
                  onChange={e => setSettings(prev => ({ ...(prev || {}), smtp: { ...((prev as any)?.smtp || {}), password: e.target.value } }))}
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <h3 className="font-semibold">Payment Gateway Keys</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 12H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 6H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <input
                  id="settings-fastpay-api-key"
                  name="fastpayApiKey"
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                  placeholder="FastPay API Key"
                  value={(settings as any)?.payment?.fastpayApiKey || ''}
                  onChange={e => setSettings(prev => ({ ...(prev || {}), payment: { ...((prev as any)?.payment || {}), fastpayApiKey: e.target.value } }))}
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 7L9 19L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <input
                  id="settings-stripe-secret"
                  name="stripeSecret"
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                  placeholder="Stripe Secret"
                  value={(settings as any)?.payment?.stripeSecret || ''}
                  onChange={e => setSettings(prev => ({ ...(prev || {}), payment: { ...((prev as any)?.payment || {}), stripeSecret: e.target.value } }))}
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 12H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 6H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <input
                  id="settings-paypal-client-id"
                  name="paypalClientId"
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                  placeholder="PayPal Client ID"
                  value={(settings as any)?.payment?.paypalClientId || ''}
                  onChange={e => setSettings(prev => ({ ...(prev || {}), payment: { ...((prev as any)?.payment || {}), paypalClientId: e.target.value } }))}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium" htmlFor="settings-maintenance-mode">Maintenance Mode</label>
            <div className="mt-1">
              <label className="inline-flex items-center" htmlFor="settings-maintenance-mode">
                <input
                  id="settings-maintenance-mode"
                  name="maintenanceMode"
                  type="checkbox"
                  checked={!!(settings as any)?.maintenanceMode}
                  onChange={e => update('maintenanceMode', e.target.checked)}
                />
                <span className="ml-2">Enable maintenance mode</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="settings-currency" className="block text-sm font-medium">Currency</label>
            <input
              id="settings-currency"
              name="currency"
              className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
              value={(settings as any)?.currency || 'USD'}
              onChange={e => update('currency', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="settings-minimum-deposit" className="block text-sm font-medium">Minimum Deposit</label>
            <input
              id="settings-minimum-deposit"
              name="minimumDeposit"
              className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
              type="number"
              value={(settings as any)?.minimumDeposit ?? 0}
              onChange={e => update('minimumDeposit', Number(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
