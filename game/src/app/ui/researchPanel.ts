import type { GameSnapshot } from '../../modules/economy/session';
import { ResearchScheduler, RESEARCH_GRAPH, type ResearchBlock } from '../../modules/research/research';
import { getLocale } from '../../i18n';
export function mountResearchPanel(root:HTMLElement,start:(id:string)=>void) {
 return (s:GameSnapshot)=>{
  const en=getLocale()==='en', scheduler=ResearchScheduler.restore(s.research)!;
  const facility=s.researchFacility;
  const title=document.createElement('h3');title.textContent=en?'Research · active time only':'پژوهش · فقط زمان فعال بازی';root.replaceChildren(title);
  const reasons:Record<ResearchBlock,string>={staff:en?'Assign a scientist and wait for arrival':'دانشمند تخصیص دهید و منتظر رسیدن بمانید',facility:en?'Build a laboratory':'آزمایشگاه بسازید',power:en?'No power':'بدون برق',prerequisites:en?'Prerequisites locked':'پیش‌نیاز قفل',busy:en?'One research at a time':'یک پژوهش هم‌زمان',balance:en?'Insufficient coins':'سکه کافی نیست',completed:en?'Completed':'تکمیل‌شده',level:en?'Upgrade laboratory':'آزمایشگاه را ارتقا دهید',unknown:en?'Unknown technology':'فناوری نامعتبر'};
  for(const branch of ['power','food']) {
   const group=document.createElement('section'),heading=document.createElement('h4');heading.textContent=en?(branch==='power'?'Energy':'Agriculture'):(branch==='power'?'انرژی':'کشاورزی');group.append(heading);
   for(const n of RESEARCH_GRAPH.filter(n=>n.branch===branch)) {
    const card=document.createElement('div'),label=document.createElement('p'),button=document.createElement('button');button.type='button';
    const active=s.research.activeResearchId===n.id,block=scheduler.block(n.id,facility,s.wallet.balance);
    const status=active?(en?'Researching':'در حال پژوهش'):block?reasons[block]:(en?'Available':'آماده');
    label.textContent=`${n.name[en?'en':'fa']} · ${status} · ${n.cost} ${en?'coins':'سکه'} · ${n.durationMs/1000}s · ×${n.effect.multiplier} · ${en?'Requires':'نیازمند'}: ${n.prerequisites.map(id=>RESEARCH_GRAPH.find(t=>t.id===id)!.name[en?'en':'fa']).join(' ← ')||'—'} · ${en?'Lab level':'سطح آزمایشگاه'} ${n.facilityLevel}`;
    if(active) label.textContent+=` · ${Math.max(0,(s.research.completeAt!-s.research.nowMs)/1000)}s ${facility.powered&&facility.staffed!==false&&facility.level>=n.facilityLevel?'':(en?'Suspended':'معلق')}`;
    button.textContent=en?'Confirm research & pay':'تأیید پژوهش و پرداخت';button.disabled=block!==null;button.onclick=()=>start(n.id);card.append(label,button);group.append(card);
   }root.append(group);
  }
  const modifiers=scheduler.modifiers(),p=document.createElement('p');p.textContent=`${en?'Production modifiers: power / food':'ضرایب تولید: برق / غذا'}: ×${modifiers.powerProduction.toFixed(2)} / ×${modifiers.foodProduction.toFixed(2)}`;root.append(p);
 };
}
