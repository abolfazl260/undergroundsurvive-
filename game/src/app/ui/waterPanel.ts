import type { GameSnapshot } from '../../modules/economy/session';
import { WaterProductionProcessor } from '../../modules/water/water';
import { getLocale } from '../../i18n';
export function mountWaterPanel(root: HTMLElement, collect: () => void, toggle: (id: string) => void,
  toggleLink: (a: string, b: string) => void) {
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
    const life = s.lifeSupportView;
    const network = document.createElement('section');
    network.className = 'life-support-network';
    const networkTitle = document.createElement('h3');
    networkTitle.textContent = en ? 'Life-support distribution' : 'توزیع آب و اکسیژن';
    const totals = document.createElement('p');
    totals.textContent = en
      ? `Clean water: ${life.water.stock}/${life.water.capacity} (produce ${life.water.produced}, use ${life.water.consumed}/tick) · Oxygen: ${life.oxygen.stock}/${life.oxygen.capacity} (produce ${life.oxygen.produced}, use ${life.oxygen.consumed}/tick)`
      : `آب سالم: ${life.water.stock}/${life.water.capacity} (تولید ${life.water.produced}، مصرف ${life.water.consumed}/چرخه) · اکسیژن: ${life.oxygen.stock}/${life.oxygen.capacity} (تولید ${life.oxygen.produced}، مصرف ${life.oxygen.consumed}/چرخه)`;
    network.append(networkTitle,totals);
    const grace = document.createElement('p');
    if (life.graceTicks) {
      grace.textContent = en ? `Emergency reserve: ${life.graceTicks} cycles before residential consumption starts.`
        : `ذخیرهٔ اضطراری: ${life.graceTicks} چرخه تا شروع مصرف ساکنان.`;
      network.append(grace);
    }
    for (const zone of life.zones) {
      const line = document.createElement('p');
      line.textContent = en
        ? `Zone ${zone.ids.join(', ')}: water ${zone.waterStock ?? 0}, oxygen ${zone.oxygenStock ?? 0}`
        : `منطقه ${zone.ids.join('، ')}: آب ${zone.waterStock ?? 0}، اکسیژن ${zone.oxygenStock ?? 0}`;
      network.append(line);
    }
    for (const state of life.rooms.filter(r=>r.status !== 'online')) {
      const line = document.createElement('p');
      const missing = state.missing.map(m=>m === 'water' ? (en?'water':'آب') : (en?'oxygen':'اکسیژن')).join(', ');
      line.textContent = en ? `${state.id}: ${state.status} (${missing})`
        : `${state.id}: ${state.status === 'offline' ? 'قطع' : 'افت کارایی'} (${missing})`;
      line.setAttribute('role','status');
      network.append(line);
    }
    for (const link of life.links) {
      const button = document.createElement('button'); button.type='button';
      button.className = 'life-support-valve';
      button.textContent = `${link.a} ↔ ${link.b} · ${link.open ? (en?'Close valve':'بستن شیر') : (en?'Open valve':'بازکردن شیر')} · ${link.capacity}/${en?'tick':'چرخه'}`;
      button.setAttribute('aria-label',button.textContent);
      button.onclick = () => toggleLink(link.a,link.b);
      network.append(button);
    }
    root.append(network);
    for (const c of w.cycles) {
      const p = document.createElement('p'), b = document.createElement('button'); b.type = 'button';
      p.textContent = `${c.id} · ${blocks[processor.status(c,s.base.rooms,s.resources.stock.power)]} · ${Math.floor(c.elapsedMs / 100)}% · ${processor.recipe(c.level).clean}/10s`;
      b.textContent = en ? (c.enabled ? 'Pause' : 'Resume') : (c.enabled ? 'توقف' : 'ادامه'); b.onclick = () => toggle(c.id);
      root.append(p,b);
    }
  };
}
