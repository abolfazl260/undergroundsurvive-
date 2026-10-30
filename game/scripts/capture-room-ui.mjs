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
  await page.locator('#game-canvas canvas').waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({path:`${output}/${mode}-${width}x${height}-scene.png`});
  // Both the current view and the baseline may hide tools in the mobile dock.
  const upgradeTool = page.locator('[data-tool="upgrade"]');
  if (!(await upgradeTool.isVisible())) await page.locator('#dock-tools').click();
  await upgradeTool.click();
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
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('underground-survive:game:v2')).survivors.assignments.length===1);
    await page.locator('#survivor-panel').scrollIntoViewIfNeeded();
    await page.screenshot({path:`${output}/${mode}-guard-assigned.png`});
    await page.locator('[data-release]').first().click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('underground-survive:game:v2')).survivors.assignments.length===0);
  }
  await page.close();
}
await browser.close();
