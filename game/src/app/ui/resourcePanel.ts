import { getResourceCapacity, type ResourceType } from '../../modules/economy/resources';
import type { GameSnapshot } from '../../modules/economy/session';
import { formatNumber, getLocale, subscribeLocaleChange, t } from '../../i18n';

const titles: Record<ResourceType, string> = {
  power: 'برق', food: 'مواد خام', meal: 'جیره', ore: 'سنگ معدن', supplies: 'تجهیزات'
};

/** Updates DOM directly from the game snapshot; it owns no simulation state. */
export function mountResourcePanel(root: ParentNode): {
  render: (snapshot: GameSnapshot) => void;
  renderCountdown: (seconds: number) => void;
} {
  const required = (id: string): HTMLElement => {
    const node = root.querySelector<HTMLElement>('#' + id);
    if (!node) throw new Error('Missing resource UI element: ' + id);
    return node;
  };
  const counts = {
    power: required('resource-power'),
    food: required('resource-food'),
    meal: required('resource-meal'),
    ore: required('resource-ore'),
    supplies: required('resource-supplies')
  };
  const lifeWater = required('life-resource-water');
  const lifeOxygen = required('life-resource-oxygen');
  const lifeWarning = required('life-resource-warning');
  const ticks = required('resource-tick-count');
  const countdown = required('resource-next-tick');
  const warning = required('resource-warning');
  let lastSeconds = 0;
  const paintCountdown = () => { countdown.textContent = formatNumber(Math.max(0, Math.ceil(lastSeconds))); };
  subscribeLocaleChange(paintCountdown);
  return {
    render(snapshot) {
      const { stock, tickCount, lastShortages, inactiveRooms } = snapshot.resources;
      const capacity = getResourceCapacity(snapshot.base.rooms);
      for (const type of Object.keys(counts) as ResourceType[]) {
        counts[type].textContent = formatNumber(stock[type]) + ' / ' + formatNumber(capacity);
      }
      const life = snapshot.lifeSupportView;
      const en = getLocale() === 'en';
      lifeWater.textContent = (en ? 'Water ' : 'آب ') + formatNumber(life.water.stock) + ' / ' + formatNumber(life.water.capacity);
      lifeOxygen.textContent = (en ? 'Oxygen ' : 'اکسیژن ') + formatNumber(life.oxygen.stock) + ' / ' + formatNumber(life.oxygen.capacity);
      const low = life.events.filter(e=>e.type==='life-support-shortage');
      lifeWarning.dataset.shortage = String(low.length > 0);
      const etaLabel = (n: number | null) => n === null ? (en ? 'stable' : 'پایدار') : (en ? `${n} ticks` : `${formatNumber(n)} چرخه`);
      lifeWarning.textContent = life.graceTicks ? (en ? `Emergency reserve: ${life.graceTicks} cycles` : `ذخیره اضطراری: ${formatNumber(life.graceTicks)} چرخه`) :
        low.length ? (en ? `${low.length} life-support shortages; inspect water and ventilation.` : `${formatNumber(low.length)} هشدار کمبود آب یا اکسیژن؛ تصفیه و تهویه را بررسی کنید.`) :
        (en ? `Water +${life.water.produced}/-${life.water.consumed}/tick · Oxygen +${life.oxygen.produced}/-${life.oxygen.consumed}/tick` :
          `آب +${formatNumber(life.water.produced)}/-${formatNumber(life.water.consumed)} · اکسیژن +${formatNumber(life.oxygen.produced)}/-${formatNumber(life.oxygen.consumed)} در چرخه`);
      if (!life.graceTicks) lifeWarning.textContent += en
        ? ` · Water remaining: ${etaLabel(life.water.etaTicks)}, oxygen: ${etaLabel(life.oxygen.etaTicks)}`
        : ` · اتمام آب: ${etaLabel(life.water.etaTicks)}، اکسیژن: ${etaLabel(life.oxygen.etaTicks)}`;
      ticks.textContent = formatNumber(tickCount);
      warning.dataset.shortage = String(lastShortages.length > 0);
      warning.textContent = lastShortages.length
        ?  t('کمبود {resources} · {rooms} اتاق در چرخهٔ اخیر غیرفعال بود.', {
            resources: lastShortages.map((type) => t(titles[type])).join('، '),
            rooms: formatNumber(inactiveRooms)
          })
        : t('چرخهٔ اخیر بدون کمبود منابع انجام شد. هنگام توقف بازی تولید متوقف می‌شود.');
    },
    renderCountdown(seconds) {
      lastSeconds = seconds;
      paintCountdown();
    }
  };
}
