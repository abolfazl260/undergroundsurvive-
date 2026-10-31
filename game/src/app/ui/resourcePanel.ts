import { getResourceCapacity, type ResourceType } from '../../modules/economy/resources';
import type { GameSnapshot } from '../../modules/economy/session';
import { formatNumber, getLocale, subscribeLocaleChange, t } from '../../i18n';

const titles: Record<ResourceType, string> = {
  power: 'برق', food: 'مواد خام', meal: 'جیره', ore: 'سنگ معدن', supplies: 'تجهیزات'
};

export type ResourceLevelState = 'normal' | 'low' | 'empty' | 'critical';

/** Presentation only. A depleted optional material is not a life-support emergency. */
export function resourceLevelState(
  amount: number, capacity: number, essential: boolean, shortage = false
): ResourceLevelState {
  if (shortage || (essential && amount <= 0)) return 'critical';
  if (amount <= 0) return 'empty';
  if (essential && capacity > 0 && amount / capacity <= 0.2) return 'low';
  return 'normal';
}

/** Updates the compact resource sheet from simulation snapshots without its own game state. */
export function mountResourcePanel(root: ParentNode): {
  render: (snapshot: GameSnapshot) => void;
  renderCountdown: (seconds: number) => void;
} {
  const required = (id: string): HTMLElement => {
    const node = root.querySelector<HTMLElement>('#' + id);
    if (!node) throw new Error('Missing resource UI element: ' + id);
    return node;
  };
  const counts: Record<ResourceType, HTMLElement> = {
    power: required('resource-power'),
    food: required('resource-food'),
    meal: required('resource-meal'),
    ore: required('resource-ore'),
    supplies: required('resource-supplies')
  };
  const meters: Record<ResourceType, HTMLProgressElement> = {
    power: required('resource-power-meter') as HTMLProgressElement,
    food: required('resource-food-meter') as HTMLProgressElement,
    meal: required('resource-meal-meter') as HTMLProgressElement,
    ore: required('resource-ore-meter') as HTMLProgressElement,
    supplies: required('resource-supplies-meter') as HTMLProgressElement
  };
  const lifeWater = required('life-resource-water');
  const lifeOxygen = required('life-resource-oxygen');
  const waterMeter = required('life-resource-water-meter') as HTMLProgressElement;
  const oxygenMeter = required('life-resource-oxygen-meter') as HTMLProgressElement;
  const lifeWarning = required('life-resource-warning');
  const ticks = required('resource-tick-count');
  const countdown = required('resource-next-tick');
  const warning = required('resource-warning');
  const panel = root.querySelector<HTMLElement>('.resource-panel');
  if (!panel) throw new Error('Missing resource sheet');

  const paintMeter = (
    meter: HTMLProgressElement, amount: number, capacity: number,
    essential: boolean, shortage = false
  ) => {
    meter.max = Math.max(1, capacity);
    meter.value = Math.min(Math.max(0, amount), meter.max);
    meter.closest<HTMLElement>('.resource-item')!.dataset.state =
      resourceLevelState(amount, capacity, essential, shortage);
  };
  let lastSeconds = 0;
  const paintCountdown = () => {
    countdown.textContent = formatNumber(Math.max(0, Math.ceil(lastSeconds)));
  };
  subscribeLocaleChange(paintCountdown);

  return {
    render(snapshot) {
      const { stock, tickCount, lastShortages, inactiveRooms } = snapshot.resources;
      const capacity = getResourceCapacity(snapshot.base.rooms);
      for (const type of Object.keys(counts) as ResourceType[]) {
        counts[type].textContent = formatNumber(stock[type]) + ' / ' + formatNumber(capacity);
        paintMeter(meters[type], stock[type], capacity, type === 'power' || type === 'meal',
          lastShortages.includes(type));
      }
      const life = snapshot.lifeSupportView;
      const en = getLocale() === 'en';
      lifeWater.textContent = formatNumber(life.water.stock) + ' / ' + formatNumber(life.water.capacity);
      lifeOxygen.textContent = formatNumber(life.oxygen.stock) + ' / ' + formatNumber(life.oxygen.capacity);
      const low = life.events.filter(event => event.type === 'life-support-shortage');
      paintMeter(waterMeter, life.water.stock, life.water.capacity, true,
        low.some(event => event.resource === 'water'));
      paintMeter(oxygenMeter, life.oxygen.stock, life.oxygen.capacity, true,
        low.some(event => event.resource === 'oxygen'));
      panel.dataset.alert = String(lastShortages.length > 0 || low.length > 0 ||
        stock.meal === 0 || life.water.stock === 0 || life.oxygen.stock === 0);
      lifeWarning.dataset.shortage = String(low.length > 0);
      const etaLabel = (n: number | null) => n === null
        ? (en ? 'stable' : 'پایدار')
        : (en ? `${n} ticks` : `${formatNumber(n)} چرخه`);
      lifeWarning.textContent = life.graceTicks
        ? (en ? `Emergency reserve: ${life.graceTicks} cycles`
          : `ذخیره اضطراری: ${formatNumber(life.graceTicks)} چرخه`)
        : low.length
          ? (en ? `${low.length} life-support shortages; inspect water and ventilation.`
            : `${formatNumber(low.length)} هشدار کمبود آب یا اکسیژن؛ تصفیه و تهویه را بررسی کنید.`)
          : (en
            ? `Water +${life.water.produced}/-${life.water.consumed}/tick · Oxygen +${life.oxygen.produced}/-${life.oxygen.consumed}/tick`
            : `آب +${formatNumber(life.water.produced)}/-${formatNumber(life.water.consumed)} · اکسیژن +${formatNumber(life.oxygen.produced)}/-${formatNumber(life.oxygen.consumed)} در چرخه`);
      if (!life.graceTicks) lifeWarning.textContent += en
        ? ` · Water remaining: ${etaLabel(life.water.etaTicks)}, oxygen: ${etaLabel(life.oxygen.etaTicks)}`
        : ` · اتمام آب: ${etaLabel(life.water.etaTicks)}، اکسیژن: ${etaLabel(life.oxygen.etaTicks)}`;
      ticks.textContent = formatNumber(tickCount);
      warning.dataset.shortage = String(lastShortages.length > 0);
      warning.textContent = lastShortages.length
        ? t('کمبود {resources} · {rooms} اتاق در چرخهٔ اخیر غیرفعال بود.', {
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
