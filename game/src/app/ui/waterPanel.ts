import type { GameSnapshot } from '../../modules/economy/session';
import { WaterProductionProcessor } from '../../modules/water/water';
import { getLocale } from '../../i18n';
export function mountWaterPanel(root: HTMLElement, collect: () => void, toggle: (id: string) => void) {
  return (s: GameSnapshot) => {
    const en = getLocale() === 'en', w = s.water;
    const processor = WaterProductionProcessor.restore(w)!;
    const title = document.createElement('h3'); title.textContent = en ? 'Water treatment' : 'تصفیه آب';
    const summary = document.createElement('p');
    summary.textContent = `${en ? 'Raw / Clean / Aquifer' : 'خام / تمیز / ذخیرهٔ چاه'}: ${w.raw} / ${w.clean} / ${w.reserve} · ${en ? 'Tank' : 'مخزن'}: ${processor.capacity(s.base.rooms)}`;
    const source = document.createElement('button'); source.type = 'button';
    source.textContent = en ? 'Pump 10 raw water · 1 power' : 'برداشت ۱۰ آب خام · ۱ برق'; source.onclick = collect;
    root.replaceChildren(title, summary, source);
    const blocks = { paused: en ? 'Paused' : 'متوقف', raw: en ? 'Raw water required' : 'کمبود آب خام', power: en ? 'Power required' : 'کمبود برق', capacity: en ? 'Tank full' : 'مخزن پر', producing: en ? 'Producing' : 'در حال تولید' };
    for (const c of w.cycles) {
      const p = document.createElement('p'), b = document.createElement('button'); b.type = 'button';
      p.textContent = `${c.id} · ${blocks[processor.status(c,s.base.rooms,s.resources.stock.power)]} · ${Math.floor(c.elapsedMs / 100)}% · ${processor.recipe(c.level).clean}/10s`;
      b.textContent = en ? (c.enabled ? 'Pause' : 'Resume') : (c.enabled ? 'توقف' : 'ادامه'); b.onclick = () => toggle(c.id);
      root.append(p,b);
    }
  };
}
