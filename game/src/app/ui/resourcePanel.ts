import { getResourceCapacity, type ResourceType } from '../../modules/economy/resources';
import type { GameSnapshot } from '../../modules/economy/session';
import { formatNumber, subscribeLocaleChange, t } from '../../i18n';

const titles: Record<ResourceType, string> = {
  power: 'برق', food: 'غذا', ore: 'سنگ معدن', supplies: 'تجهیزات'
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
    ore: required('resource-ore'),
    supplies: required('resource-supplies')
  };
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
