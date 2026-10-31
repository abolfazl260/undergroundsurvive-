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

/** Primary actions stay inside a two-row HUD; secondary shortcuts stay
 * reachable in More on compact layouts, not hidden or clipped elsewhere. */
async function checkUnifiedTopControls(page, width, height) {
  const result = await page.evaluate(() => {
    const topbar = document.querySelector('.topbar');
    const header = topbar.getBoundingClientRect();
    const compact = matchMedia('(max-width: 1160px)').matches;
    const extra = document.querySelector('#game-sheet .mobile-secondary-actions');
    const primaryIds = [
      '#menu-toggle', '#dock-build', '#dock-tools',
      '#zoom-in', '#zoom-out', '#zoom-reset',
      '#resource-details-toggle', '#open-more'
    ];
    const secondaryIds = [
      '#story-open', '#achievements-open', '#screen-fullscreen',
      '#online-leaderboard-open'
    ];
    const problems = [];
    if (compact && header.height > 125) problems.push('compact header exceeds two-row height: ' + header.height);
    for (const id of [...primaryIds, ...secondaryIds]) {
      const button = document.querySelector(id);
      if (!button) { problems.push(id + ': missing'); continue; }
      const secondaryInMore = compact && secondaryIds.includes(id);
      if (secondaryInMore) {
        if (!extra?.contains(button)) problems.push(id + ': missing from More sheet');
        continue; // Tested for visibility and tap size once More opens.
      }
      if (!topbar.contains(button)) { problems.push(id + ': not part of topbar'); continue; }
      if (getComputedStyle(button).display === 'none' || !button.getClientRects().length) continue;
      const rect = button.getBoundingClientRect();
      if (rect.top < header.top - 2 || rect.bottom > header.bottom + 2 ||
          rect.left < -1 || rect.right > window.innerWidth + 1) {
        problems.push(id + ': outside header ' + JSON.stringify({
          top:rect.top, bottom:rect.bottom, left:rect.left, right:rect.right,
          headerBottom:header.bottom
        }));
      }
    }
    return problems;
  });
  assert.deepEqual(result, [], `Compact header and reachable shortcuts at ${width}x${height}`);
}

async function checkPopoverBelowTopbar(page, selector) {
  const geometry = await page.evaluate((target) => {
    const header = document.querySelector('.topbar').getBoundingClientRect();
    const panel = document.querySelector(target).getBoundingClientRect();
    return { headerBottom: header.bottom, panelTop: panel.top, panelBottom: panel.bottom, viewport: innerHeight };
  }, selector);
  assert.ok(geometry.panelTop >= geometry.headerBottom - 3,
    `${selector} must open below the header: ${JSON.stringify(geometry)}`);
  assert.ok(geometry.panelBottom <= geometry.viewport + 2,
    `${selector} must fit the viewport: ${JSON.stringify(geometry)}`);
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
  await checkUnifiedTopControls(page, width, height);

  // Resource details are a popover below the topbar, never a bottom-right drawer.
  await page.locator('#resource-details-toggle').tap();
  assert.equal(await page.locator('.resource-panel').getAttribute('data-expanded'), 'true');
  await checkPopoverBelowTopbar(page, '.resource-panel');
  await page.locator('#resource-details-toggle').tap();
  assert.equal(await page.locator('.resource-panel').getAttribute('data-expanded'), 'false');

  // Build gallery: room selection and explicit confirmation.
  await page.locator('#dock-build').tap();
  assert.equal(await page.locator('#game-sheet').getAttribute('data-sheet'), 'rooms');
  await checkPopoverBelowTopbar(page, '#game-sheet');
  await checkTapTargets(page, 'rooms', width, height);
  await page.locator('[data-room="generator"]').tap();
  assert.equal(await page.locator('[data-room="generator"]').getAttribute('aria-pressed'), 'true');
  await page.locator('#confirm-room-placement').tap();
  assert.equal(await page.locator('#game-sheet').isVisible(), false);

  // Tools -> More must be a single tap, even with the sheet scrim present.
  await page.locator('#dock-tools').tap();
  assert.equal(await page.locator('#game-sheet').getAttribute('data-sheet'), 'tools');
  await checkPopoverBelowTopbar(page, '#game-sheet');
  await checkTapTargets(page, 'tools', width, height);
  await page.locator('#zoom-in').tap();

  // The grid toggle must accept real touch taps, dismiss the sheet, and expose
  // an obvious persistent state even when a saved shelter has no visible wiring.
  await page.locator('#power-overlay-toggle').tap();
  assert.equal(await page.locator('#power-overlay-toggle').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#game-sheet').isVisible(), false);
  assert.equal(await page.locator('#power-overlay-indicator').isVisible(), true);
  await page.locator('#dock-tools').tap();
  await page.locator('#power-overlay-toggle').tap();
  assert.equal(await page.locator('#power-overlay-toggle').getAttribute('aria-pressed'), 'false');
  assert.equal(await page.locator('#power-overlay-indicator').isVisible(), false);
  assert.equal(await page.locator('#game-sheet').isVisible(), false);

  await page.locator('#open-more').tap();
  assert.equal(await page.locator('#game-sheet').getAttribute('data-sheet'), 'more');
  await checkTapTargets(page, 'more', width, height);
  // The original story/achievement buttons must remain visible and clickable
  // after reparenting; fullscreen and online actions remain conditional.
  const shortcutsInMore = width <= 1160;
  if (shortcutsInMore) {
    for (const selector of ['#story-open', '#achievements-open']) {
      assert.equal(await page.locator(selector).isVisible(), true, selector + ' reachable in More');
      const bounds = await page.locator(selector).boundingBox();
      assert.ok(bounds && bounds.width >= 44 && bounds.height >= 44, selector + ' tap target');
    }
  }

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
