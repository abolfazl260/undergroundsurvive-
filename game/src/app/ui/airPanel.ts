import type { GameSnapshot } from '../../modules/economy/session';
import { AIR_CONFIG, airStatus, ventCapacity, ventPower } from '../../modules/air/air';
import { getLocale } from '../../i18n';

const reasons = {
  stable: ['Ventilation is stable', 'تهویه پایدار است'],
  'no-vents': ['No ventilation room built', 'اتاق تهویه ساخته نشده است'],
  disabled: ['All fans are switched off', 'تمام دستگاه‌های تهویه خاموش‌اند'],
  damaged: ['Ventilation equipment needs repair', 'تجهیزات تهویه نیاز به تعمیر دارند'],
  power: ['Insufficient power for the air system', 'برق کافی برای تهویه وجود ندارد'],
  overload: ['Population exceeds air coverage', 'جمعیت از ظرفیت تهویه بیشتر است'],
  emissions: ['Pollution is greater than purification', 'آلودگی از توان پاک‌سازی بیشتر است'],
} as const;
export function mountAirPanel(root: HTMLElement, toggle: (id: string) => void, repair: (id: string) => void) {
  return (snapshot: GameSnapshot): void => {
    const en = getLocale() === 'en', a = snapshot.air;
    const status = airStatus(a.quality);
    const statusText = status === 'healthy' ? (en ? 'Healthy' : 'سالم')
      : status === 'warning' ? (en ? 'Warning' : 'هشدار') : (en ? 'Critical' : 'بحرانی');
    root.dataset.status = status;
    const title = document.createElement('h3');
    title.textContent = en ? 'Air quality and ventilation' : 'کیفیت هوا و تهویه';
    const quality = document.createElement('p');
    quality.className = 'air-quality-readout';
    quality.textContent = `${a.quality.toFixed(1)} / 100 · ${statusText}`;
    quality.setAttribute('role', 'status');
    const coverage = document.createElement('p');
    coverage.textContent = en
      ? `Coverage: ${a.coverage.toFixed(1)} / ${a.population} people · Last tick: ${a.powerUsed} power`
      : `پوشش جمعیت: ${a.coverage.toFixed(1)} از ${a.population} نفر · مصرف چرخهٔ آخر: ${a.powerUsed} برق`;
    const reason = document.createElement('p');
    reason.textContent = reasons[a.reason][en ? 0 : 1];
    const hint = document.createElement('p');
    hint.textContent = en ? 'Air changes once per active 5-second cycle. Off or unpowered units cannot clean air.'
      : 'کیفیت هوا هر ۵ ثانیه از زمان فعال بازی تغییر می‌کند. دستگاه خاموش یا بدون برق هوا را تصفیه نمی‌کند.';
    root.replaceChildren(title, quality, coverage, reason, hint);
    for (const vent of a.vents) {
      const room = snapshot.base.rooms.find(r => r.id === vent.id);
      if (!room) continue;
      const line = document.createElement('div');
      line.className = 'air-vent-line';
      const text = document.createElement('p');
      const condition = !vent.enabled ? (en ? 'Off' : 'خاموش') : vent.health <= 0
        ? (en ? 'Broken' : 'خراب') : vent.powered ? (en ? 'Powered' : 'فعال')
          : (en ? 'No power' : 'بدون برق');
      text.textContent = `${en ? 'Ventilation' : 'تهویه'} · ${vent.id} · Lv ${room.level} · ${condition} · ${en ? 'Health' : 'سلامت'} ${vent.health.toFixed(1)}% · ${en ? 'Capacity' : 'ظرفیت'} ${ventCapacity(room.level)} · ${ventPower(room.level)} ${en ? 'power/tick' : 'برق/چرخه'}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = vent.enabled ? (en ? 'Turn off' : 'خاموش‌کردن') : (en ? 'Turn on' : 'روشن‌کردن');
      button.onclick = () => toggle(vent.id);
      line.append(text, button);
      if (vent.health < 100) {
        const fix = document.createElement('button');
        fix.type = 'button';
        fix.textContent = en ? `Repair · ${AIR_CONFIG.repairCoins} coins` : `تعمیر · ${AIR_CONFIG.repairCoins} سکه`;
        fix.disabled = snapshot.wallet.balance < AIR_CONFIG.repairCoins;
        fix.onclick = () => repair(vent.id);
        line.append(fix);
      }
      root.append(line);
    }
  };
}
