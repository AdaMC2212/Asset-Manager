const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { build } = require('esbuild');
const postcss = require('postcss');
const tailwind = require('tailwindcss');
const { chromium } = require('playwright');
const { checkOverview } = require('./check-overview.cjs');

const root = path.resolve(__dirname, '..');
const fixtures = path.join(__dirname, 'fixtures');
const output = process.env.UI_SCREENSHOT_DIR || path.join(os.tmpdir(), 'asset-manager-ui-checks');
let server;
let browser;

const visibleBox = async (locator, viewport) => {
  const box = await locator.boundingBox();
  assert.ok(box && box.width > 0 && box.height > 0, 'Control has visible dimensions');
  assert.ok(box.x >= -1 && box.x + box.width <= viewport.width + 1, 'Control fits horizontally');
  assert.ok(box.y >= -1 && box.y + box.height <= viewport.height + 1, 'Control is reachable vertically');
  return box;
};

const checkOverlay = async (page, viewport) => {
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  const geometry = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, portaled: element.parentElement === document.body };
  });
  assert.deepEqual(geometry, { x: 0, y: 0, ...viewport, portaled: true });
  const panel = dialog.locator(':scope > div').first();
  const bounds = await panel.boundingBox();
  assert.ok(bounds.y >= 0, 'Panel does not start above the viewport');
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width, 'Panel fits the viewport width');
  assert.ok(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1), 'Dialog has no horizontal overflow');
  return dialog;
};

const search = async (page, query) => {
  await page.getByRole('button', { name: /^Search/ }).click();
  await page.getByPlaceholder('Search modules, assets, and actions...').fill(query);
  await page.getByRole('dialog', { name: 'Search' }).getByRole('button').filter({ hasText: query }).first().click();
};

async function main() {
  await fs.mkdir(output, { recursive: true });
  const bundle = await build({
    entryPoints: [path.join(fixtures, 'ui-browser.tsx')], bundle: true, write: false, format: 'iife',
    define: { 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_APP_PASSWORD': '"ui-test"' },
    plugins: [{
      name: 'isolated-ui',
      setup(builder) {
        builder.onResolve({ filter: /(^|\/)actions$/ }, (args) =>
          path.resolve(args.resolveDir, `${args.path}.ts`) === path.join(root, 'app/actions.ts')
            ? { path: path.join(fixtures, 'ui-actions.ts') } : null);
        builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'next-link', namespace: 'stub' }));
        builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
          contents: 'import React from "react"; export default function Link({children,...props}) { return <a {...props}>{children}</a>; }',
          loader: 'jsx', resolveDir: root,
        }));
      },
    }],
  });
  const css = await postcss([tailwind({
    ...require('../tailwind.config.js'),
    content: [path.join(root, 'app/**/*.{ts,tsx}'), path.join(root, 'components/**/*.{ts,tsx}')],
  })]).process(await fs.readFile(path.join(root, 'app/globals.css'), 'utf8'), { from: undefined });
  const overviewCss = await fs.readFile(path.join(root, 'app/overview.css'), 'utf8');
  const fontFile = process.env.UI_FONT_FILE;
  const fontData = fontFile ? await fs.readFile(fontFile) : null;
  const fontCss = fontFile ? '@font-face {font-family: Manrope; src: url(/font.woff2) format("woff2"); font-weight: 200 800; font-style: normal;}' : '';
  server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    response.setHeader('Cache-Control', 'no-store');
    if (pathname === '/font.woff2' && fontFile) {
      response.setHeader('Content-Type', 'font/woff2');
      response.end(fontData);
    } else if (pathname === '/test.js') {
      response.setHeader('Content-Type', 'application/javascript');
      response.end(bundle.outputFiles[0].text);
    } else if (pathname === '/test.css') {
      response.setHeader('Content-Type', 'text/css');
      response.end(css.css + '\n' + overviewCss + '\n' + fontCss);
    } else {
      response.setHeader('Content-Type', 'text/html');
      response.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/test.css"></head><body class="font-body" style="--font-body:${fontFile ? 'Manrope' : 'Arial'};--font-display:Arial"><div id="root"></div><script src="/test.js"></script></body></html>`);
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  const errors = [];
  await checkOverview(browser, base, output);
  if (process.env.UI_OVERVIEW_ONLY) return;

  for (const viewport of [
    { width: 390, height: 844 }, { width: 375, height: 667 }, { width: 320, height: 568 },
    { width: 390, height: 420 }, { width: 844, height: 390 }, { width: 1440, height: 900 },
  ]) {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const context = await browser.newContext({ viewport, reducedMotion, hasTouch: viewport.width < 1000 });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      // These forms are the production components; their actions are replaced at bundle time.
      for (const form of ['auto', 'money', 'settlement', 'trade', 'funding']) {
        await page.goto(`${base}/?form=${form}`);
        const dialog = await checkOverlay(page, viewport);
        const firstInput = dialog.locator('input').first();
        await firstInput.scrollIntoViewIfNeeded();
        await visibleBox(firstInput, viewport);
        await firstInput.focus();
        const submit = dialog.locator('button[type="submit"]');
        await submit.scrollIntoViewIfNeeded();
        await visibleBox(submit, viewport);
        if (form === 'auto' && viewport.width === 390 && viewport.height === 420) {
          await page.screenshot({ path: path.join(output, `auto-debit-${reducedMotion}.png`) });
        }
        const close = dialog.getByRole('button', { name: /^Close/ });
        await close.scrollIntoViewIfNeeded();
        await visibleBox(close, viewport);
        await close.click();
        await page.getByRole('button', { name: 'Unlock Workspace' }).waitFor();
      }

      await page.locator('input[type="password"]').fill('ui-test');
      await page.getByRole('button', { name: 'Unlock Workspace' }).click();
      await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name: 'Money', exact: true }).click();
      await page.getByRole('button', { name: 'View cards' }).click();
      let dialog = await checkOverlay(page, viewport);
      if (viewport.width === 390 && viewport.height === 844 && reducedMotion === 'reduce') {
        await page.screenshot({ path: path.join(output, 'cards-mobile.png') });
      }
      await dialog.getByRole('button', { name: 'Close card details' }).click();
      await page.getByText('Total Balance', { exact: true }).click();
      dialog = await checkOverlay(page, viewport);
      await dialog.getByRole('button', { name: 'Close wallet snapshot' }).click();

      const edit = page.getByRole('button', { name: 'Edit transaction', exact: true }).first();
      await edit.scrollIntoViewIfNeeded();
      const editBox = await visibleBox(edit, viewport);
      assert.ok(editBox.width >= 44 && editBox.height >= 44, 'Activity touch target is at least 44px');
      if (viewport.width < 1000) await edit.tap();
      else await edit.click();
      await checkOverlay(page, viewport);
      await page.getByRole('button', { name: 'Close transaction form' }).click();
      await page.getByRole('button', { name: /View All 3 Records/ }).click();
      dialog = await checkOverlay(page, viewport);
      await dialog.getByRole('button', { name: 'Edit transaction', exact: true }).first().click();
      await page.getByRole('button', { name: 'Close transaction form' }).click();
      await page.getByRole('button', { name: /^Bills RM/ }).click();
      dialog = await checkOverlay(page, viewport);
      await dialog.getByRole('button', { name: 'Edit transaction', exact: true }).first().click();
      await page.getByRole('button', { name: 'Close transaction form' }).click();

      await search(page, 'Cash Flow');
      await page.getByRole('heading', { name: 'Funding Intelligence' }).waitFor();
      const converted = page.locator('.kpi-card').filter({ has: page.getByText('Net Converted USD', { exact: true }) });
      assert.match(await converted.innerText(), /\$7,000\.00/);
      assert.match(await page.locator('.kpi-card').filter({ has: page.getByText('Real Cash Balance', { exact: true }) }).innerText(), /\$5,000\.00/);
      await page.getByRole('heading', { name: 'Deposit / Withdrawal History (MYR)' }).waitFor();
      if (reducedMotion === 'reduce' && (viewport.width === 390 || viewport.width === 1440) && viewport.height > 800) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(output, `funding-${viewport.width}.png`), fullPage: true });
      }
      await search(page, 'AAPL');
      await page.getByRole('heading', { name: 'Active Holdings' }).waitFor();
      await page.getByRole('button', { name: 'Hide values', exact: true }).click();
      const allocation = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Allocation Mix' }) });
      assert.doesNotMatch(await allocation.innerText(), /\$5,000|\$2,500|\d+\.\d+%/);
      const chart = allocation.locator('.recharts-surface');
      await chart.scrollIntoViewIfNeeded();
      const chartBox = await chart.boundingBox();
      await chart.hover({ position: { x: chartBox.width / 2 + 50, y: chartBox.height / 2 - 50 } });
      await allocation.locator('.recharts-tooltip-wrapper').waitFor({ state: 'visible' });
      assert.doesNotMatch(await allocation.innerText(), /\$5,000|\$2,500|\d+\.\d+%/);
      const story = page.locator('.kpi-card').filter({ has: page.getByRole('heading', { name: 'Insight Story' }) });
      assert.doesNotMatch(await story.innerText(), /\d+\.\d+%/);
      if (reducedMotion === 'reduce' && (viewport.width === 390 || viewport.width === 1440) && viewport.height > 800) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(output, `portfolio-${viewport.width}.png`), fullPage: true });
      }
      await search(page, 'Add Transaction');
      await checkOverlay(page, viewport);
      await page.getByRole('button', { name: 'Close transaction form' }).click();
      await context.close();
      console.log(`PASS ${viewport.width}x${viewport.height}, motion=${reducedMotion}: forms, details, touch actions, search, privacy`);
    }
  }
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log(`Screenshots: ${output}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});
