import { ROOM_DEFINITIONS } from '../../modules/building/catalog';
import type { GameSnapshot } from '../../modules/economy/session';
import type { PowerAllocation, PowerPriority } from '../../modules/power/network';
import { formatNumber, t } from '../../i18n';

const statusText = {
  online: 'متصل و روشن', disconnected: 'قطع اتصال', shed: 'قطع به‌علت کمبود توان',
  legacy: 'شبکه مجازی قدیمی'
} as const;
const priorityText = ['حیاتی', 'ضروری', 'غیرضروری'] as const;

/** Compact, accessible status board. The game simulation owns the data, not the DOM. */
export function mountPowerPanel(root: ParentNode, activate: () => void,
                                prioritize: (id: string, priority: PowerPriority) => void):
  (snapshot: GameSnapshot, allocation: PowerAllocation) => void {
  const panel = root.querySelector<HTMLElement>('#power-panel');
  if (!panel) throw new Error('Missing power panel');
  panel.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-power-priority]');
    if (button) {
      const priority = Number(button.dataset.powerPriority);
      if (priority === 0 || priority === 1 || priority === 2) {
        const roomId = button.dataset.powerRoomId;
        if (roomId) prioritize(roomId, priority);
      }
      return;
    }
    if ((event.target as Element).closest('#power-activate')) activate();
  });
  const append = (container: HTMLElement, tag: 'p'|'strong'|'span', content: string) => {
    const element = document.createElement(tag);
    element.textContent = content;
    container.append(element);
    return element;
  };
  return (snapshot, allocation) => {
    const totalSupply = allocation.networks.reduce((n,network)=>n+network.supply,0);
    const totalDemand = allocation.networks.reduce((n,network)=>n+network.demand,0);
    const totalShortage = allocation.networks.reduce((n,network)=>n+network.shortage,0);
    panel.replaceChildren();
    append(panel,'strong',t('شبکه توزیع برق'));
    append(panel,'p',t('شبکه‌ها')+': '+formatNumber(allocation.networks.length)+' · '+
      t('تولید')+': '+formatNumber(totalSupply)+' · '+t('تقاضا')+': '+formatNumber(totalDemand)+
      ' · '+t('کمبود')+': '+formatNumber(totalShortage));
    if (allocation.mode === 'legacy') {
      append(panel,'p',t('ذخیره قدیمی در حالت شبکه مجازی است؛ ابتدا کابل‌کشی کنید، سپس شبکه فیزیکی را فعال کنید.'));
      const action = document.createElement('button');
      action.id = 'power-activate';
      action.type = 'button';
      action.textContent = t('فعال‌سازی شبکه فیزیکی');
      panel.append(action);
    }
    for (const network of allocation.networks) {
      const summary = append(panel,'p',network.id+': '+t('تولید')+' '+formatNumber(network.supply)+
        ' / '+t('مصرف')+' '+formatNumber(network.allocated)+' / '+t('کمبود')+' '+formatNumber(network.shortage));
      summary.className='power-network-summary';
    }
    const rows = document.createElement('div');
    rows.className = 'power-room-list';
    const names = new Map(snapshot.base.rooms.map(room=>[room.id,ROOM_DEFINITIONS[room.type].label]));
    for (const room of allocation.rooms) {
      const row = document.createElement('div');
      row.className='power-room-row';
      row.dataset.status=room.status;
      const details=document.createElement('span');
      details.textContent=(names.get(room.roomId)??room.roomId)+' · '+t(statusText[room.status])+
        ' · '+t('تقاضا')+' '+formatNumber(room.demand);
      row.append(details);
      if (room.demand > 0 && allocation.mode === 'physical') {
        const selector=document.createElement('div');
        selector.className='power-priority-options';
        for (const priority of [0,1,2] as const) {
          const action=document.createElement('button');
          action.type='button';
          action.dataset.powerRoomId=room.roomId;
          action.dataset.powerPriority=String(priority);
          action.setAttribute('aria-pressed',String(room.priority===priority));
          action.setAttribute('aria-label',t('اولویت')+': '+t(priorityText[priority]));
          action.textContent=t(priorityText[priority]);
          selector.append(action);
        }
        row.append(selector);
      }
      rows.append(row);
    }
    panel.append(rows);
  };
}
