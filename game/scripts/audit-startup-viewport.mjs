import assert from 'node:assert/strict';
import { chromium } from 'playwright';

/**
 * Exercise the critical inline splash before the Vite game bundle is available.
 * The overlay must fit even on small phones, landscape, or a stalled boot.
 */
const origin = process.argv[2] ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({ args: ['--no-sandbox'] });

async function inspect(width, height, errorState) {
  const context = await browser.newContext({
    viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 1
  });
  try {
    const page = await context.newPage();
    const failures = [];
    page.on('pageerror', (error) => failures.push(error.message));

    // Keep the real startup document in view; the game shouldn't finish loading.
    await page.route('**/*', (route) => {
      if (route.request().resourceType() === 'script') return route.abort();
      return route.continue();
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.locator('#startup-screen').waitFor({ state: 'visible' });

    if (errorState) {
      await page.evaluate(() => {
        const stage = document.querySelector('#startup-stage');
        const detail = document.querySelector('#startup-detail');
        const retry = document.querySelector('#startup-retry');
        if (stage) stage.textContent = 'راه‌اندازی بازی با مشکل مواجه شد. برای تلاش دوباره، صفحه را بارگذاری کنید.';
        if (detail) detail.textContent = 'بارگذاری بیشتر از حد معمول طول کشیده است. می‌توانید دوباره تلاش کنید.';
        if (retry) retry.hidden = false;
      });
    }
    await page.waitForTimeout(120); // ResizeObserver and a layout frame.
    const layout = await page.evaluate(() => {
      const splash = document.querySelector('#startup-screen');
      const shell = document.querySelector('.startup-shell');
      const screen = splash.getBoundingClientRect();
      const bounds = shell.getBoundingClientRect();
      const ids = ['.startup-kicker', '.startup-brand', '.startup-caption', '.startup-graphic',
        '#startup-stage', '.startup-progress-head', '#startup-meter', '#startup-detail'];
      if (!document.querySelector('#startup-retry').hidden) ids.push('#startup-retry');
      const contained = ids.map((selector) => {
        const box = document.querySelector(selector).getBoundingClientRect();
        return {
          selector, top: box.top, bottom: box.bottom, left: box.left, right: box.right,
          visible: box.width > 0 && box.height > 0
        };
      });
      return {
        overflow: getComputedStyle(splash).overflowY,
        screen: { top: screen.top, bottom: screen.bottom, left: screen.left, right: screen.right },
        shell: { top: bounds.top, bottom: bounds.bottom, left: bounds.left, right: bounds.right },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        contained
      };
    });
    const tolerance = 2;
    assert.equal(layout.overflow, 'hidden', 'Startup overlay must not scroll');
    for (const block of [layout.shell, ...layout.contained]) {
      assert.ok(block.top >= -tolerance && block.bottom <= layout.viewport.height + tolerance &&
        block.left >= -tolerance && block.right <= layout.viewport.width + tolerance,
      'Clipped startup content at ' + width + 'x' + height + (errorState ? ' (error)' : '') +
      ': ' + JSON.stringify(block));
      if ('visible' in block) assert.ok(block.visible, block.selector + ' is hidden');
    }
    await page.mouse.wheel(0, 200);
    const scroll = await page.evaluate(() => ({
      page: window.scrollY,
      splash: document.querySelector('#startup-screen').scrollTop
    }));
    assert.equal(scroll.page, 0);
    assert.equal(scroll.splash, 0);
    assert.deepEqual(failures, [], 'Startup inline JavaScript errors');
    process.stdout.write('Startup fitted: ' + width + 'x' + height +
      (errorState ? ' with retry' : '') + '\n');
  } finally {
    await context.close();
  }
}

try {
  for (const [w, h] of [[280, 420], [320, 568], [390, 844], [768, 1024], [844, 390], [568, 320]]) {
    await inspect(w, h, false);
    await inspect(w, h, true);
  }
} finally {
  await browser.close();
}
