import assert from 'node:assert/strict';
import { chromium } from 'playwright';

/** Check actual tap targets and a complete critical-path touch journey. */
const base = process.argv[2] ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({ args: ['--no-sandbox'] });

async function checkTapTargets(page, state, width, height) {
  const failures = await page.evaluate(() => {
    const candidates = document.querySelectorAll('button');
    return [...candidates].flatMap((button) => {
      if (button.disabled || button.hidden || button.closest('[inert]')) return [];
      const style = getComputedStyle(button);
      const rect = button.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || !rect.width || !rect.height) return [];
      // A partially scrolled card is still a valid target; measure its actual box.
      const id = button.id || button.dataset.tool || button.dataset.room || button.textContent?.trim().slice(0, 25) || '(unnamed)';
      return rect.width < 43.5 || rect.height < 43.5
        ? [id + ': ' + Math.round(rect.width) + 'x' + Math.round(rect.height)]
        : [];
    });
  });
  assert.deepEqual(failures, [], `Touch target sizes at ${width}x${height} (${state})`);
}

async function run(width, height) {
  const context = await browser.newContext({
    viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await page.goto(base);
  await page.locator('#menu-continue').tap();
  await page.locator('#game-canvas canvas').waitFor({ state: 'visible' });
  await checkTapTargets(page, 'playing', width, height);

  // Build gallery: room selection and explicit confirmation.
  await page.locator('#dock-build').tap();
  assert.equal(await page.locator('#game-sheet').getAttribute('data-sheet'), 'rooms');
  await checkTapTargets(page, 'rooms', width, height);
  await page.locator('[data-room="generator"]').tap();
  assert.equal(await page.locator('[data-room="generator"]').getAttribute('aria-pressed'), 'true');
  await page.locator('#confirm-room-placement').tap();
  assert.equal(await page.locator('#game-sheet').isVisible(), false);

  // Tools -> More must be a single tap, even with the sheet scrim present.
  await page.locator('#dock-tools').tap();
  assert.equal(await page.locator('#game-sheet').getAttribute('data-sheet'), 'tools');
  await checkTapTargets(page, 'tools', width, height);
  await page.locator('#zoom-in').tap();
  await page.locator('#open-more').tap();
  assert.equal(await page.locator('#game-sheet').getAttribute('data-sheet'), 'more');
  await checkTapTargets(page, 'more', width, height);

  // Reset is destructive: cancel must never change saved progress.
  await page.locator('.advanced-controls > summary').tap();
  await page.locator('#reset-layout').tap();
  await page.locator('.game-confirm-dialog').waitFor({ state: 'visible' });
  await checkTapTargets(page, 'confirm', width, height);
  await page.locator('.game-confirm-cancel').tap();
  await page.locator('.game-confirm-dialog').waitFor({ state: 'detached' });
  assert.equal(await page.locator('#game-sheet').getAttribute('data-sheet'), 'more');

  // Other dialogs have functioning close controls.
  await page.locator('#achievements-open').tap();
  await page.locator('#achievements-dialog').waitFor({ state: 'visible' });
  await checkTapTargets(page, 'achievements', width, height);
  await page.locator('#achievements-close').tap();
  await page.locator('#open-more').tap();
  assert.equal(await page.locator('#game-sheet').isVisible(), false);
  await page.locator('#menu-toggle').tap();
  await page.locator('#game-menu-dialog').waitFor({ state: 'visible' });
  await page.locator('[data-menu-screen="pause"] [data-menu-action="settings"]').tap();
  await checkTapTargets(page, 'settings', width, height);
  await page.locator('[data-menu-screen="settings"] [data-menu-action="back"]').tap();
  await page.locator('[data-menu-screen="pause"] .menu-choice[data-menu-action="resume"]').tap();
  assert.equal(await page.locator('#game-menu-dialog').isVisible(), false);
  assert.deepEqual(pageErrors, [], `Browser errors at ${width}x${height}`);
  await context.close();
}

try {
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390]]) {
    await run(width, height);
    process.stdout.write(`Touch UX verified: ${width}x${height}\n`);
  }
} finally {
  await browser.close();
}
