import type { GameSnapshot } from '../../modules/economy/session';
import { CapabilityGate, COMMAND_CENTER_DEFINITION, CAPABILITY_REASONS } from '../../modules/command/commandCenter';
import { getUpgradeCost } from '../../modules/economy/pricing';
import { MAX_ROOM_LEVEL } from '../../modules/building/upgrades';
import { getLocale,t } from '../../i18n';
/** Read-only adapters project the existing layout/economy/population; no duplicate economy. */
export function mountCommandPanel(root:HTMLElement,population:()=>number,upgrade:()=>void) {
 return (s:GameSnapshot)=>{
  const en=getLocale()==='en',gate=CapabilityGate.restore(s.commandCenter)!,status=gate.status(s.base.rooms,s.resources.stock.power);
  const title=document.createElement('h3'),summary=document.createElement('p'),power=document.createElement('p');
  title.textContent=en?'Command center':'اتاق فرماندهی';summary.textContent=`${en?'Level / Residents / Rooms / Coins':'سطح / جمعیت / اتاق‌ها / سکه'}: ${status.level} / ${population()} / ${s.base.rooms.length} / ${s.wallet.balance}`;
  power.textContent=status.activeRoomId?(en?(status.powered?'Operational':'No power'):(status.powered?'عملیاتی':'بدون برق')):(en?'No command center: rebuild to use management actions':'فرماندهی وجود ندارد؛ برای اقدامات مدیریتی دوباره بسازید');
  root.replaceChildren(title,summary,power);
  const resources=document.createElement('p');resources.textContent=(en?'Power / Food / Ore / Supplies / Raw water / Clean water':'برق / غذا / معدن / تجهیزات / آب خام / آب تمیز')+`: ${s.resources.stock.power} / ${s.resources.stock.food} / ${s.resources.stock.ore} / ${s.resources.stock.supplies} / ${s.water.raw} / ${s.water.clean}`;root.append(resources);
  for(const rule of COMMAND_CENTER_DEFINITION.unlocksAtLevel) {
   const block=gate.block(rule.id,s.base.rooms,s.resources.stock.power),p=document.createElement('p');
   p.textContent=`${rule.name[en?'en':'fa']} · ${en?'Level':'سطح'} ${rule.level} · ${block?t(CAPABILITY_REASONS[block]):(en?'Unlocked':'باز')} ${status.earned.includes(rule.id)?(en?'· Earned':'· کسب‌شده'):''}`;root.append(p);
  }
  const cost=status.level>0&&status.level<MAX_ROOM_LEVEL?getUpgradeCost('command',status.level):null;
  const button=document.createElement('button');button.type='button';button.disabled=cost===null||!status.powered||s.wallet.balance<cost;
  button.textContent=cost===null?(en?'Upgrade unavailable':'ارتقا در دسترس نیست'):`${en?'Confirm command upgrade':'تأیید ارتقای فرماندهی'} · ${cost} ${en?'coins':'سکه'}`;button.onclick=upgrade;root.append(button);
  const policy=document.createElement('p');policy.textContent=en?'Earned permissions survive demolition. New industry actions require an operational command center. Existing rooms and research keep working. Research permissions are independent.':'مجوزهای کسب‌شده پس از تخریب حفظ می‌شوند. اقدامات صنعتی جدید به فرماندهی عملیاتی نیاز دارند. اتاق‌ها و پژوهش‌های قبلی ادامه می‌یابند؛ مجوزهای پژوهش مستقل‌اند.';root.append(policy);
 };
}
