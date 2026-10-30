import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const [base = 'http://127.0.0.1:4173', output = 'ui-evidence', mode = 'after'] = process.argv.slice(2);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
for (const [width,height] of [[390,844],[768,1024],[1440,900],[844,390]]) {
  const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror', error=>errors.push(error.message));
  await page.goto(base);
  await page.locator('#menu-continue').click();
  await page.locator('canvas').waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({path:`${output}/${mode}-${width}x${height}-scene.png`});
  await page.locator('[data-tool="upgrade"]').click();
  await page.locator('#upgrade-panel').waitFor({state:'visible'});
  if(mode==='after') {
    const fits=await page.evaluate(()=>{
      const p=document.querySelector('#upgrade-panel').getBoundingClientRect();
      const d=document.querySelector('#action-dock').getBoundingClientRect();
      return p.bottom<=d.top && p.top>=0 && p.left>=0 && p.right<=innerWidth;
    });
    if(!fits) throw new Error(`Room panel overlaps HUD at ${width}x${height}`);
    if(errors.length) throw new Error(errors.join('\n'));
  }
  await page.screenshot({path:`${output}/${mode}-${width}x${height}-panel.png`});
  await page.close();
}
await browser.close();
