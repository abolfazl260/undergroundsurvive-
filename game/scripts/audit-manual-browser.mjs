import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4173';
const evidence = process.argv[3] ?? 'quality-evidence/browser';
const key = 'underground-survive:game:v2';
await mkdir(evidence, { recursive:true });
const browser = await chromium.launch({ args:['--no-sandbox'] });

async function scenario(width, height) {
  const context = await browser.newContext({
    viewport:{width,height}, hasTouch:true, isMobile:true, deviceScaleFactor:1
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(baseUrl);
    await page.locator('#menu-continue').tap();
    await page.locator('#game-canvas canvas').waitFor({state:'visible'});
    await page.screenshot({path:`${evidence}/${width}x${height}-running.png`});
    const initial = await page.evaluate(k => localStorage.getItem(k), key);
    assert.ok(initial, 'Initial save missing after the scene creates');
    const parsed = JSON.parse(initial);
    assert.ok(parsed.base?.rooms?.length >= 4);
    const walletBefore = parsed.wallet.balance;

    // Exercise touch interaction and persistence without assuming a free cell.
    await page.locator('#open-more').tap();
    await page.locator('#game-sheet').waitFor({state:'visible'});
    await page.locator('#achievements-open').tap();
    await page.locator('#achievements-dialog').waitFor({state:'visible'});
    await page.locator('#achievements-close').tap();
    await page.reload();
    await page.locator('#menu-continue').tap();
    await page.locator('#game-canvas canvas').waitFor({state:'visible'});
    const afterReload = JSON.parse((await page.evaluate(k => localStorage.getItem(k), key)) ?? 'null');
    assert.equal(afterReload.wallet.balance, walletBefore, 'Reload changed coin balance');

    // A corrupt user save must never crash the game. Raw bytes are preserved
    // under the recovery key when the clean replacement is stored.
    await page.evaluate(k => localStorage.setItem(k, '{"schemaVersion":16,'), key);
    await page.reload();
    await page.locator('#menu-continue').tap();
    await page.locator('#game-canvas canvas').waitFor({state:'visible'});
    const recovered = await page.evaluate(k => ({
      recovery:localStorage.getItem('underground-survive:recovery'),
      fresh:localStorage.getItem(k)
    }), key);
    assert.equal(recovered.recovery, '{"schemaVersion":16,');
    assert.ok(recovered.fresh && JSON.parse(recovered.fresh).base.rooms.length > 0);
    assert.deepEqual(errors, [], 'Uncaught browser errors');
    await page.screenshot({path:`${evidence}/${width}x${height}-after-corrupt-save.png`});
    console.log('Touch, reload and corrupt-save recovery passed: ' + width + 'x' + height);
  } finally {
    await context.close();
  }
}

try {
  for (const [w,h] of [[390,844],[844,390]]) await scenario(w,h);
} finally {
  await browser.close();
}
