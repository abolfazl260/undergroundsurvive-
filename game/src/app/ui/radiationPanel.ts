import { TerrainMap } from '../../modules/world/terrain';
import type { GameSnapshot } from '../../modules/economy/session';
import { RadiationField, RADIATION_CONFIG, contaminationState } from '../../modules/radiation/radiation';
import type { GridPosition } from '../../modules/world/grid';
import { getLocale } from '../../i18n';
export function mountRadiationPanel(root:HTMLElement,toggle:()=>void,view:()=>{enabled:boolean;cell:GridPosition},cleanup:()=>void,filter:()=>void) {
 return (s:GameSnapshot)=>{
  const en=getLocale()==='en',v=view(),field=RadiationField.restore(s.radiation)!,risk=field.getRiskForLocation(v.cell.x,v.cell.y);
  const title=document.createElement('h3'),legend=document.createElement('p'),info=document.createElement('p');
  title.textContent=en?'Radiation · game risk points':'تشعشع · امتیاز خطر بازی';legend.textContent=en?'Low <20 · Medium 20–49 · High ≥50':'کم: زیر ۲۰ · متوسط: ۲۰ تا ۴۹ · زیاد: ۵۰ به بالا';
  const state=contaminationState(risk),labels={low:en?'Low':'کم',medium:en?'Medium':'متوسط',high:en?'High · Mitigate now':'زیاد · اکنون خطر را کاهش دهید'};
  const room=s.base.rooms.find(r=>v.cell.x>=r.x&&v.cell.x<r.x+r.width&&v.cell.y===r.y);
  info.textContent=`(${v.cell.x}, ${v.cell.y}) · ${risk.toFixed(1)} · ${labels[state]}${room?' · '+room.id+' · '+(en?'Shielding multiplier':'ضریب عبور از حفاظ')+' '+field.roomStatus(room,field.world(new TerrainMap(s.base.terrain),s.base.rooms)).ShieldingFactor.toFixed(2):''}`;
  const help=document.createElement('p');help.textContent=en?'Enable overlay, tap a cell, then reopen shelter actions. Filters lower exposure and local contamination; cleanup halves current risk. Active sources can recontaminate. Existing health is unchanged.':'نقشهٔ خطر را روشن کنید، خانه را لمس کنید و امکانات را باز کنید. فیلتر مواجهه و آلودگی محلی را کم می‌کند؛ پاکسازی خطر فعلی را نصف می‌کند. منبع فعال دوباره آلوده می‌کند. سلامت فعلی تغییر نمی‌کند.';
  root.replaceChildren(title,legend,info,help);
  for(const [label,action,disabled] of [[en?(v.enabled?'Hide overlay':'Show overlay'):(v.enabled?'پنهان کردن نقشهٔ خطر':'نمایش نقشهٔ خطر'),toggle,false],[`${en?'Confirm cleanup':'تأیید پاکسازی'} · ${RADIATION_CONFIG.cleanupCost} ${en?'coins':'سکه'}`,cleanup,s.wallet.balance<RADIATION_CONFIG.cleanupCost],[`${en?'Confirm filter':'تأیید نصب فیلتر'} · ${RADIATION_CONFIG.filterCost} ${en?'coins':'سکه'}`,filter,!room||s.radiation.filters.includes(room.id)||s.wallet.balance<RADIATION_CONFIG.filterCost]] as const) {
   const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=disabled;b.onclick=action;root.append(b);
  }
  const doses=document.createElement('p');doses.textContent=(en?'Cumulative exposure: ':'مواجههٔ تجمعی: ')+s.radiation.exposures.map(e=>`${e.id}: ${e.dose.toFixed(1)}`).join(' · ');root.append(doses);
 };
}
