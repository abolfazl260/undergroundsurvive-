import type { GameSnapshot } from '../../modules/economy/session';
import { KITCHEN_CONFIG, cookingOutput, type CookingBlock } from '../../modules/kitchen/kitchen';
import { getResourceCapacity } from '../../modules/economy/resources';
import { getLocale, formatNumber } from '../../i18n';

const faReasons: Record<CookingBlock, string> = {
  room: 'آشپزخانه وجود ندارد', recipe: 'دستور نامعتبر',
  locked: 'نیازمند ارتقای اتاق و پژوهش', busy: 'چرخهٔ فعلی هنوز تمام نشده است',
  staff: 'آشپز حاضر در اتاق لازم است', food: 'مواد خام یا برق کافی نیست',
  water: 'آب تمیز کافی نیست', power: 'برق کافی نیست', capacity: 'انبار جیره پر است',
  duplicate: 'درخواست تکراری'
};
const enReasons: Record<CookingBlock, string> = {
  room: 'Missing kitchen', recipe: 'Unknown recipe', locked: 'Upgrade room / unlock research',
  busy: 'Current batch is unfinished', staff: 'An on-duty cook is required',
  food: 'Insufficient raw food or power', water: 'Insufficient clean water',
  power: 'Insufficient power', capacity: 'Meal storage is full', duplicate: 'Duplicate request'
};
const faStates = { idle: 'آماده', running: 'در حال پخت', paused: 'متوقف شده',
  blocked: 'منتظر برق، نیرو یا ظرفیت', completed: 'پخت تکمیل شد' };
const enStates = { idle: 'Idle', running: 'Cooking', paused: 'Paused',
  blocked: 'Waiting for power, staff or space', completed: 'Completed' };

export function mountKitchenPanel(
  root: HTMLElement,
  start: (roomId: string, recipeId: string) => void,
  toggle: (roomId: string) => void,
  cancel: (roomId: string) => void
) {
  return (snapshot: GameSnapshot): void => {
    const en = getLocale() === 'en', rooms = snapshot.base.rooms.filter(r => r.type === 'kitchen');
    const title = document.createElement('h3');
    title.textContent = en ? 'Kitchen · cooked meals' : 'آشپزخانه · جیرهٔ آماده';
    root.replaceChildren(title);
    if (!rooms.length) {
      const hint = document.createElement('p');
      hint.textContent = en ? 'Build a kitchen underground to prepare rations.' : 'برای تهیهٔ جیره یک آشپزخانه در زیرزمین بسازید.';
      root.append(hint); return;
    }
    const stats = document.createElement('p');
    stats.textContent = en
      ? `Raw: ${formatNumber(snapshot.resources.stock.food)} · Meals: ${formatNumber(snapshot.resources.stock.meal)}/${formatNumber(getResourceCapacity(snapshot.base.rooms))} · Clean water: ${formatNumber(snapshot.water.clean)}`
      : `مواد خام: ${formatNumber(snapshot.resources.stock.food)} · جیره: ${formatNumber(snapshot.resources.stock.meal)}/${formatNumber(getResourceCapacity(snapshot.base.rooms))} · آب تمیز: ${formatNumber(snapshot.water.clean)}`;
    root.append(stats);
    for (const room of rooms) {
      const cycle = snapshot.kitchen.cycles.find(c => c.roomId === room.id);
      const cooks = snapshot.survivors.assignments.filter(a => a.kind === 'cook' && a.roomId === room.id);
      const present = cooks.filter(a => a.state === 'active').length;
      const section = document.createElement('section'); section.className = 'kitchen-room';
      const header = document.createElement('h4');
      header.textContent = `${room.id} · LV ${room.level} · ${en ? 'Cooks' : 'آشپز'} ${present}/${room.level}`;
      section.append(header);
      const state = document.createElement('p'); state.className = 'kitchen-state';
      const status = cycle?.status ?? 'idle';
      const seconds = cycle && cycle.durationMs ? Math.ceil((cycle.durationMs - cycle.elapsedMs) / 1000) : 0;
      state.textContent = `${(en ? enStates : faStates)[status]} · ${en ? 'Remaining' : 'باقی‌مانده'}: ${formatNumber(seconds)}s`;
      section.append(state);
      if (cycle && cycle.durationMs > 0) {
        const bar = document.createElement('progress');
        bar.max = cycle.durationMs; bar.value = cycle.elapsedMs;
        bar.setAttribute('aria-label', en ? 'Cooking progress' : 'پیشرفت پخت');
        section.append(bar);
      }
      if (cycle && ['running', 'paused', 'blocked'].includes(cycle.status)) {
        const controls = document.createElement('div'); controls.className = 'kitchen-actions';
        const pause = document.createElement('button'); pause.type = 'button';
        pause.textContent = cycle.enabled ? (en ? 'Pause' : 'توقف') : (en ? 'Resume' : 'ادامه');
        pause.onclick = () => toggle(room.id);
        const stop = document.createElement('button'); stop.type = 'button';
        stop.textContent = en ? 'Cancel · no refund' : 'لغو · بدون بازپرداخت';
        stop.onclick = () => cancel(room.id);
        controls.append(pause, stop); section.append(controls);
      }
      for (const recipe of KITCHEN_CONFIG.recipes) {
        const unlocked = room.level >= recipe.minLevel && (!recipe.technologyId ||
          snapshot.research.unlockedTechnologyIds.includes(recipe.technologyId));
        const staffed = present > 0;
        const output = cookingOutput(recipe, room.level);
        const reserved = snapshot.kitchen.cycles.reduce((sum, c) =>
          sum + (c.roomId !== room.id && ['running','paused','blocked'].includes(c.status) ? c.output : 0), 0);
        const reason: CookingBlock | null = !unlocked ? 'locked' :
          cycle && ['running','paused','blocked'].includes(cycle.status) ? 'busy' :
          !staffed ? 'staff' :
          snapshot.resources.stock.power < recipe.power + KITCHEN_CONFIG.minOperatingPower ? 'power' :
          snapshot.resources.stock.food < recipe.food ? 'food' :
          snapshot.water.clean < recipe.cleanWater ? 'water' :
          snapshot.resources.stock.meal + reserved + output > getResourceCapacity(snapshot.base.rooms) ? 'capacity' : null;
        const card = document.createElement('div'); card.className = 'kitchen-recipe';
        const label = document.createElement('p');
        label.textContent = `${recipe.name[en ? 'en' : 'fa']} · ${en ? 'Raw' : 'مواد'} ${formatNumber(recipe.food)} · ${en ? 'Water' : 'آب'} ${formatNumber(recipe.cleanWater)} · ${en ? 'Power' : 'برق'} ${formatNumber(recipe.power)} → ${formatNumber(output)} ${en ? 'meals' : 'جیره'} · ${formatNumber(recipe.durationMs / 1000)}s`;
        const button = document.createElement('button'); button.type = 'button';
        button.disabled = reason !== null;
        button.textContent = en ? 'Cook batch' : 'شروع پخت';
        button.onclick = () => start(room.id, recipe.id);
        card.append(label, button);
        if (reason) {
          const message = document.createElement('small');
          message.textContent = (en ? enReasons : faReasons)[reason];
          card.append(message);
        }
        section.append(card);
      }
      root.append(section);
    }
    const help = document.createElement('p'); help.className = 'kitchen-hint';
    help.textContent = en ? 'Assign a survivor below. Ingredients are spent at the start; canceling or demolition does not refund them. Cooking pauses with the game.' :
      'از بخش بازماندگان، آشپز اختصاص دهید. مواد اولیه هنگام شروع مصرف می‌شوند و لغو یا تخریب بازپرداخت ندارد. توقف بازی، زمان پخت را نیز متوقف می‌کند.';
    root.append(help);
  };
}
