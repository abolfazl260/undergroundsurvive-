import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// A separate end-to-end check for first-time players; do not bypass onboarding.
const origin = process.argv[2] ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({ args: ['--no-sandbox'] });

async function inspect(width, height) {
  const context = await browser.newContext({
    viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 1
  });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.locator('#menu-continue').tap();
    const story = page.locator('.story-dialog');
    await story.waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('.story-counter')?.textContent?.trim() === '1 / 6');
    assert.equal(await page.locator('.story-counter').textContent(), '1 / 6');
    assert.equal(await page.locator('.first-run-coach').isVisible(), false, 'Modal must cover coach');

    // Reopening the prologue must restore the last saved slide, not restart it.
    await page.locator('.story-next').tap();
    assert.equal(await page.locator('.story-counter').textContent(), '2 / 6');
    await page.locator('.story-close').tap();
    await story.waitFor({ state: 'hidden' });
    const coach = page.locator('.first-run-coach');
    await coach.waitFor({ state: 'visible' });
    assert.match(await coach.locator('h2').textContent(), /داستان/);
    await coach.locator('.first-run-coach__action').tap();
    await story.waitFor({ state: 'visible' });
    assert.equal(await page.locator('.story-counter').textContent(), '2 / 6');
    await page.locator('.story-skip').tap();
    await story.waitFor({ state: 'hidden' });
    await coach.waitFor({ state: 'visible' });
    assert.match(await coach.locator('h2').textContent(), /تصفیه/);
    assert.equal(await page.evaluate(() => localStorage.getItem('underground-survive:first-run:v1')), 'water');

    // The action selects the real water-treatment build tool.
    await coach.locator('.first-run-coach__action').tap();
    assert.equal(await page.locator('[data-room="waterTreatment"]').getAttribute('aria-pressed'), 'true');
    const size = await coach.locator('.first-run-coach__skip').boundingBox();
    assert.ok(size && size.width >= 44 && size.height >= 44, 'Skip must meet mobile tap dimensions');

    // A reload retains the objective, without replaying completed narrative.
    await page.reload();
    await page.locator('#menu-continue').tap();
    await coach.waitFor({ state: 'visible' });
    assert.equal(await story.isVisible(), false, 'Story must not replay once skipped');
    assert.match(await coach.locator('h2').textContent(), /تصفیه/);
    await coach.locator('.first-run-coach__skip').tap();
    assert.equal(await coach.isVisible(), false);
    await page.reload();
    await page.locator('#menu-continue').tap();
    assert.equal(await coach.isVisible(), false, 'Completed tutorial must stay dismissed');
    assert.equal(await story.isVisible(), false);
    assert.deepEqual(errors, [], 'No browser errors during guided onboarding');
    process.stdout.write(`First-run tutorial verified: ${width}x${height}\n`);
  } finally {
    await context.close();
  }
}

try {
  for (const [w, h] of [[390, 844], [844, 390]]) await inspect(w, h);
} finally {
  await browser.close();
}
