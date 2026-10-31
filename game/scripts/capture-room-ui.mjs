import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const [base = 'http://127.0.0.1:4173', output = 'ui-evidence', mode = 'after'] = process.argv.slice(2);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
for (const [width,height] of [[390,844],[768,1024],[1440,900],[844,390]]) {
  process.stdout.write(`Capture ${mode}: ${width}x${height}\n`);
  const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  // This suite audits the regular editor. A separate test covers first-run
  // onboarding; dismiss it via persisted user preference before startup.
  await page.addInitScript(() => localStorage.setItem('underground-survive:first-run:v1', 'done'));
  const errors=[];
  page.on('pageerror', error=>errors.push(error.message));
  await page.goto(base);
  await page.locator('#menu-continue').click();
  await page.locator('#game-canvas canvas').waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({path:`${output}/${mode}-${width}x${height}-scene.png`});
  // The historical base may have a different responsive toolbar. Open the
  // tools dock where available, and never fail a current PR because the old
  // reference UI hides its upgrade button at one viewport size.
  const toolsDock = page.locator('#dock-tools');
  if (await toolsDock.isVisible()) await toolsDock.click();
  const upgradeTool = page.locator('[data-tool="upgrade"]');
  if (mode === 'before' && !(await upgradeTool.isVisible())) {
    await page.screenshot({path:`${output}/${mode}-${width}x${height}-panel.png`});
    await page.close();
    continue;
  }
  await upgradeTool.click();
  await page.locator('#upgrade-panel').waitFor({state:'visible'});
  if(mode==='after') {
    const fits=await page.evaluate(()=>{
      const p=document.querySelector('#upgrade-panel').getBoundingClientRect();
      const header=document.querySelector('.topbar').getBoundingClientRect();
      // Contextual actions now open below the unified TOP HUD, never above a bottom dock.
      return p.top>=header.bottom-3 && p.bottom<=innerHeight+2 &&
        p.left>=-1 && p.right<=innerWidth+1;
    });
    if(!fits) throw new Error(`Room panel overlaps HUD at ${width}x${height}`);
    if(errors.length) throw new Error(errors.join('\n'));
  }
  await page.screenshot({path:`${output}/${mode}-${width}x${height}-panel.png`});
  if(mode==='after' && width===390 && await page.locator('#survivor-panel').count()) {
    // Seed an actual valid room in the existing save; exercise the public touch UI.
    await page.evaluate(()=>{
      const key='underground-survive:game:v2',s=JSON.parse(localStorage.getItem(key));
      s.base.rooms.push({id:'ui-guard',type:'guardPost',x:8,y:-1,width:2,height:1,level:1});
      localStorage.setItem(key,JSON.stringify(s));
    });
    await page.reload();await page.locator('#menu-continue').click();
    await page.locator('#open-more').click();
    await page.locator('[data-assign-room="ui-guard"]').last().click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('underground-survive:game:v2')).survivors.assignments.length===1, null, { timeout:10000 });
    await page.locator('#survivor-panel').scrollIntoViewIfNeeded();
    await page.screenshot({path:`${output}/${mode}-guard-assigned.png`});
    await page.locator('[data-release]').first().click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('underground-survive:game:v2')).survivors.assignments.length===0, null, { timeout:10000 });
    if(await page.locator('[data-assign-room="initial-habitat"]').count()) {
      const fatigue=await page.evaluate(()=>JSON.parse(localStorage.getItem('underground-survive:game:v2')).survivors.survivors[0].fatigue);
      await page.locator('[data-assign-room="initial-habitat"]').first().click();
      await page.waitForFunction((before)=>{
        const s=JSON.parse(localStorage.getItem('underground-survive:game:v2')),bed=s.dormitory.beds[0];
        return !!bed&&s.survivors.assignments.some(a=>a.survivorId===bed.survivorId&&a.kind==='rest'&&a.state==='active')&&s.survivors.survivors.find(p=>p.id===bed.survivorId).fatigue<before;
      },fatigue,{timeout:15000});
      await page.screenshot({path:`${output}/${mode}-rest-active.png`});
      await page.locator('[data-release-bed]').first().click();
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem('underground-survive:game:v2')).dormitory.beds.length===0,null,{timeout:10000});
    }
  }
  await page.close();
}
await browser.close();
