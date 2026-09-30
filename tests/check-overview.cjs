const assert = require('node:assert/strict');
const path = require('node:path');

exports.checkOverview = async (browser, base, output) => {
  const errors = [];
  for (const viewport of [
    { width: 390, height: 844 }, { width: 1280, height: 800 },
    { width: 320, height: 568 }, { width: 768, height: 1024 },
    { width: 1024, height: 768 }, { width: 1920, height: 1080 },
  ]) {
    const context = await browser.newContext({ viewport, timezoneId: 'Asia/Kuala_Lumpur', reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-09-30T09:41:00+08:00') });
    await page.goto(`${base}/?overview=reference`);
    await page.getByRole('heading', { level: 1, name: /Overview/ }).waitFor();
    await page.evaluate(() => document.fonts.ready);

    const checkGeometry = async () => {
      const overflow = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth > innerWidth,
        elements: [...document.querySelectorAll('.overview button, .overview strong, .overview-section-heading, .workspace-icon-button, .workspace-nav-item')]
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && (rect.x < -1 || rect.right > innerWidth + 1 || element.scrollWidth > element.clientWidth + 2);
          }).map((element) => element.className),
      }));
      assert.deepEqual(overflow, { page: false, elements: [] }, `No overflow at ${viewport.width}`);
      const icons = await page.locator('.workspace-nav-item svg, .workspace-icon-button svg, .overview-currency-heading svg').evaluateAll((elements) =>
        elements.map((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height, paths: element.childElementCount })));
      assert.ok(icons.every((icon) => icon.width === 20 && icon.height === 20 && icon.paths > 0), 'All Lucide assets have non-empty, correct geometry');
    };
    await checkGeometry();
    await page.screenshot({ path: path.join(output, `overview-${viewport.width}.png`), fullPage: true });
    const overview = page.locator('.overview');
    assert.match(await overview.innerText(), /24,540/);
    assert.match(await overview.innerText(), /24,860/);
    assert.match(await overview.innerText(), /8,500/);
    assert.match(await overview.innerText(), /3,260/);
    await page.getByRole('button', { name: 'Hide values', exact: true }).click();
    assert.doesNotMatch(await overview.innerText(), /24,540|24,860|8,500|3,260|980|4\.2000|9\.54/);
    assert.equal(await page.locator('.overview-flow-bar > span').count(), 0);
    await page.getByRole('button', { name: 'Show values', exact: true }).click();
    const add = page.getByRole('button', { name: 'Add transaction', exact: true });
    await add.click();
    await page.getByRole('dialog', { name: 'Add transaction' }).waitFor();
    await page.getByRole('button', { name: 'Close transaction form' }).click();
    await page.locator('.overview-statement').click();
    await page.getByRole('dialog', { name: 'Unpaid card balances' }).waitFor();
    await page.getByRole('button', { name: 'Close card details' }).click();
    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    await nav.getByRole('button', { name: 'Overview', exact: true }).click();
    await page.getByRole('button', { name: 'History', exact: true }).click();
    await page.getByRole('heading', { name: /Funding Intelligence/ }).waitFor();
    await nav.getByRole('button', { name: 'Invest', exact: true }).click();
    await page.getByRole('heading', { name: 'Active Holdings' }).waitFor();
    await nav.getByRole('button', { name: 'Overview', exact: true }).click();
    await page.locator('.overview-activity').getByRole('button', { name: 'View all', exact: true }).click();
    await page.getByRole('dialog', { name: 'Full Transaction List' }).waitFor();
    await page.getByRole('button', { name: 'Close transaction history' }).click();
    await nav.getByRole('button', { name: 'Overview', exact: true }).click();
    await page.locator('.workspace-sync:visible, .workspace-mobile-sync button:visible').click();
    assert.match(await page.locator('.workspace-topbar').innerText(), /Sync incomplete/);
    assert.match(await overview.innerText(), /24,540/);

    for (const variant of ['empty', 'missing', 'long', 'demo']) {
      await page.goto(`${base}/?overview=${variant}`);
      await page.getByRole('heading', { level: 1, name: /Overview/ }).waitFor();
      await checkGeometry();
      if (variant === 'missing') assert.match(await overview.innerText(), /Unavailable/);
      if (variant === 'demo') assert.equal(await page.getByRole('button', { name: 'Add transaction', exact: true }).isDisabled(), true);
    }
    await page.goto(`${base}/?overview=loading`);
    await page.getByRole('heading', { level: 1, name: /Overview/ }).waitFor();
    assert.equal(await overview.count(), 0, 'Loading shows placeholders instead of financial zeroes');
    assert.equal(await page.locator('.workspace-header-action').isDisabled(), true);
    await context.close();
    console.log(`PASS Overview ${viewport.width}x${viewport.height}: reference, privacy, navigation, forms, empty, unavailable, long values, read-only`);
  }
  assert.deepEqual(errors, [], 'Overview has no browser runtime errors');
};
