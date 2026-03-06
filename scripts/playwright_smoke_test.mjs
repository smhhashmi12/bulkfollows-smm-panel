import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.TEST_URL || 'http://192.168.100.135:3000';
const artifactsDir = path.resolve('artifacts', 'qa');

const report = {
  baseUrl,
  startedAt: new Date().toISOString(),
  checks: [],
  consoleErrors: [],
  pageErrors: [],
  responseErrors: [],
  requestFailures: [],
  screenshots: [],
};

const userCredentials = {
  email: process.env.TEST_USER_EMAIL || 'user@example.com',
  password: process.env.TEST_USER_PASSWORD || 'password',
};

const adminCredentials = {
  email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
  password: process.env.TEST_ADMIN_PASSWORD || 'password',
};

const userRoutes = [
  { hash: '#/dashboard', name: 'user-dashboard', expected: /Popular Services|Recent Announcements/i },
  { hash: '#/dashboard/new-order', name: 'user-new-order', expected: /Browse Social Platforms|Service Details/i },
  { hash: '#/dashboard/add-funds', name: 'user-add-funds', expected: /Select Payment Method|Minimum deposit/i },
  { hash: '#/dashboard/orders', name: 'user-orders', expected: /No orders yet|Order ID/i },
  { hash: '#/dashboard/api', name: 'user-api', expected: /Your API Key|API Documentation/i },
  { hash: '#/dashboard/support', name: 'user-support', expected: /New Ticket|Create New Support Ticket|No support tickets yet|Ticket ID/i },
];

const adminRoutes = [
  { hash: '#/admin/dashboard', name: 'admin-dashboard', expected: /Recent Orders|Support Tickets/i },
  { hash: '#/admin/users', name: 'admin-users', expected: /Loading users|No users found|Username/i },
  { hash: '#/admin/services', name: 'admin-services', expected: /Add New Service|No services found|Rate \(per 1k\)/i },
  { hash: '#/admin/providers', name: 'admin-providers', expected: /Add New Provider|No providers found|Provider Name/i },
  { hash: '#/admin/provider-services', name: 'admin-provider-services', expected: /Sync All Providers|Visible Services|Provider Service ID/i },
  { hash: '#/admin/orders', name: 'admin-orders', expected: /Order Details|No orders found|Search orders|All Statuses|Order ID/i },
  { hash: '#/admin/earnings', name: 'admin-earnings', expected: /Daily Financial Summary|Provider-wise Earnings Split/i },
  { hash: '#/admin/payouts', name: 'admin-payouts', expected: /Create New Payout|Payout History/i },
  { hash: '#/admin/payments', name: 'admin-payments', expected: /Transaction ID|Credit Card|Completed/i },
  { hash: '#/admin/support', name: 'admin-support', expected: /Ticket Details|No support tickets|Reply|Filter by Status|Select a ticket to view details/i },
  { hash: '#/admin/chat', name: 'admin-chat', expected: /Live Chat Inbox|No chats found/i },
  { hash: '#/admin/announcements', name: 'admin-announcements', expected: /New Announcement|Create New Announcement|No announcements yet/i },
  { hash: '#/admin/settings', name: 'admin-settings', expected: /Save Settings|Website Title|Loading settings/i },
];

function pushCheck(name, passed, details = {}) {
  report.checks.push({
    name,
    passed,
    ...details,
  });
}

async function ensureArtifactsDir() {
  await fs.mkdir(artifactsDir, { recursive: true });
}

async function saveScreenshot(page, filename, fullPage = false) {
  const target = path.join(artifactsDir, filename);
  await page.screenshot({ path: target, fullPage });
  report.screenshots.push(target);
}

function attachPageLogging(page) {
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/installHook\.js/i.test(text)) return;
    report.consoleErrors.push(text);
  });

  page.on('pageerror', (error) => {
    report.pageErrors.push(error.message);
  });

  page.on('response', (response) => {
    const status = response.status();
    if (status < 400) return;
    report.responseErrors.push({
      status,
      url: response.url(),
    });
  });

  page.on('requestfailed', (request) => {
    report.requestFailures.push({
      url: request.url(),
      errorText: request.failure()?.errorText || 'Unknown request failure',
    });
  });
}

async function settle(page, delay = 1200) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(delay);
}

async function gotoHash(page, hash = '') {
  const target = hash ? `${baseUrl}/${hash}` : baseUrl;
  await page.goto(target, { waitUntil: 'domcontentloaded' });
  await settle(page);
}

async function waitForBodyText(page, expression, timeout = 10000) {
  await page.waitForFunction(
    ({ source, flags }) => new RegExp(source, flags).test(document.body.innerText),
    { source: expression.source, flags: expression.flags },
    { timeout }
  );
}

async function elementFitsViewport(locator) {
  return locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      withinViewport:
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.right <= window.innerWidth &&
        rect.bottom <= window.innerHeight,
    };
  });
}

async function checkProtectedRedirect(page, hash, expectedHash, expectedText, screenshotName) {
  await gotoHash(page, hash);
  await page.waitForFunction((prefix) => window.location.hash.startsWith(prefix), expectedHash, { timeout: 10000 });
  await waitForBodyText(page, expectedText);
  await saveScreenshot(page, screenshotName);
  pushCheck(`redirect:${hash}`, true, {
    finalHash: await page.evaluate(() => window.location.hash),
  });
}

async function tryLogin(page, hash, credentials, successHashPrefix, successText, failureText, screenshotBase) {
  await gotoHash(page, hash);
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: /sign in|login/i }).click();

  let success = false;
  try {
    await page.waitForFunction((prefix) => window.location.hash.startsWith(prefix), successHashPrefix, { timeout: 12000 });
    await waitForBodyText(page, successText, 12000);
    success = true;
    await saveScreenshot(page, `${screenshotBase}-success.png`);
  } catch {
    await settle(page, 2000);
    await saveScreenshot(page, `${screenshotBase}-failure.png`);
    if (failureText) {
      const body = await page.locator('body').innerText();
      pushCheck(`login:${screenshotBase}`, false, {
        credentials: credentials.email,
        observed: body.slice(0, 500),
      });
    }
  }

  if (success) {
    pushCheck(`login:${screenshotBase}`, true, {
      credentials: credentials.email,
      finalHash: await page.evaluate(() => window.location.hash),
    });
  }

  return success;
}

async function verifyRoute(page, route) {
  try {
    await gotoHash(page, route.hash);
    await page.waitForFunction((expected) => window.location.hash.startsWith(expected), route.hash, { timeout: 10000 });
    await waitForBodyText(page, route.expected, 12000);
    await saveScreenshot(page, `${route.name}.png`);
    pushCheck(`route:${route.name}`, true, {
      finalHash: await page.evaluate(() => window.location.hash),
    });
  } catch (error) {
    await saveScreenshot(page, `${route.name}-failure.png`);
    pushCheck(`route:${route.name}`, false, {
      finalHash: await page.evaluate(() => window.location.hash),
      error: error.message,
      observed: (await page.locator('body').innerText()).slice(0, 1000),
    });
  }
}

async function run() {
  await ensureArtifactsDir();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  attachPageLogging(page);

  try {
    await gotoHash(page);
    await waitForBodyText(page, /BulkFollows/i);
    const chatButton = page.getByRole('button', { name: /live chat/i });
    const chatBox = await elementFitsViewport(chatButton);
    await saveScreenshot(page, 'landing-desktop.png');
    pushCheck('public:landing', true, { chatButton: chatBox });

    await chatButton.click();
    await waitForBodyText(page, /Login required to start a live chat|Send your first message to open this chat/i, 10000);
    await saveScreenshot(page, 'chat-gate-desktop.png');
    pushCheck('public:chat-gate', true);

    await checkProtectedRedirect(page, '#/dashboard', '#/login', /Welcome Back!/i, 'redirect-user-login.png');
    await checkProtectedRedirect(page, '#/admin/dashboard', '#/admin', /Admin Panel Login/i, 'redirect-admin-login.png');

    await gotoHash(page, '#/register');
    await page.getByLabel('Username').fill('qa-smoke');
    await page.getByLabel('Email').fill('qa-smoke@example.com');
    await page.getByLabel(/^Password$/).fill('secret1');
    await page.getByLabel('Confirm Password').fill('secret2');
    await page.getByRole('button', { name: /create account/i }).click();
    await waitForBodyText(page, /Passwords do not match\./i);
    await saveScreenshot(page, 'register-validation.png');
    pushCheck('public:register-validation', true);

    const userLoginWorked = await tryLogin(
      page,
      '#/login',
      userCredentials,
      '#/dashboard',
      /Popular Services|Recent Announcements/i,
      /Invalid email or password|Failed to get user information/i,
      'user-login'
    );

    if (userLoginWorked) {
      for (const route of userRoutes) {
        await verifyRoute(page, route);
      }
    }

    await context.clearCookies();
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await settle(page);

    const adminLoginWorked = await tryLogin(
      page,
      '#/admin',
      adminCredentials,
      '#/admin',
      /Recent Orders|Support Tickets/i,
      /You are not an admin|Invalid email or password/i,
      'admin-login'
    );

    if (adminLoginWorked) {
      for (const route of adminRoutes) {
        await verifyRoute(page, route);
      }
    }

    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    attachPageLogging(mobilePage);
    await gotoHash(mobilePage);
    await waitForBodyText(mobilePage, /BulkFollows/i);
    await saveScreenshot(mobilePage, 'landing-mobile.png');
    const mobileChatButton = mobilePage.getByRole('button', { name: /live chat/i });
    const mobileChatBox = await elementFitsViewport(mobileChatButton);
    pushCheck('mobile:landing', true, { chatButton: mobileChatBox });
    await mobileContext.close();
  } catch (error) {
    pushCheck('runner', false, { error: error.message });
    throw error;
  } finally {
    report.finishedAt = new Date().toISOString();
    await fs.writeFile(path.join(artifactsDir, 'playwright-smoke-report.json'), JSON.stringify(report, null, 2));
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
