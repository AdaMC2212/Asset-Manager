const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.argv[2] || 'http://127.0.0.1:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) {
  throw new Error('Offline verification must target a local test server.');
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/demo`);
    await page.getByRole('heading', { level: 1, name: /Overview/ }).waitFor();
    await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name: 'Money', exact: true }).click();
    await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated');
    const registration = await page.evaluate(async () => {
      const worker = await navigator.serviceWorker.ready;
      const cache = await caches.open('asset-manager-offline-v2');
      return { scriptURL: worker.active.scriptURL, resources: (await cache.keys()).map((request) => new URL(request.url).pathname).sort() };
    });
    assert.equal(registration.scriptURL, `${base}/sw.js`);
    assert.deepEqual(registration.resources, ['/favicon.ico', '/manifest.webmanifest', '/offline.html']);
    for (const resource of ['/sw.js', ...registration.resources]) {
      assert.equal((await context.request.get(`${base}${resource}`)).status(), 200, resource);
    }

    await page.getByRole('button', { name: 'View cards' }).click();
    const dialog = page.getByRole('dialog', { name: 'Unpaid card balances' });
    assert.deepEqual(await dialog.boundingBox(), { x: 0, y: 0, width: 390, height: 844 });
    const output = process.env.UI_SCREENSHOT_DIR || path.join(os.tmpdir(), 'asset-manager-ui-checks');
    await fs.mkdir(output, { recursive: true });
    await page.screenshot({ path: path.join(output, 'next-demo-cards.png') });
    await page.getByRole('button', { name: 'Close card details' }).click();

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: "You're offline" }).waitFor();
    assert.match(await page.locator('body').innerText(), /No cached financial data is shown/);
    assert.doesNotMatch(await page.locator('body').innerText(), /Synced|RM \d|\$\d/);
    await page.screenshot({ path: path.join(output, 'offline-mobile.png') });
    await context.setOffline(false);
    await page.goto(`${base}/demo`);
    await page.getByRole('heading', { level: 1, name: /Overview/ }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS real Next.js demo: viewport dialog, worker install/activation, static-only cache, offline fallback, online recovery');
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
