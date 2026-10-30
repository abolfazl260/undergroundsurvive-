import { HELP_TOPICS, type HelpTopic } from '../../content/helpTopics';
import { BUILD_COSTS } from '../../modules/economy/pricing';
import { ROOM_DEFINITIONS, type RoomType } from '../../modules/building/catalog';
import { formatNumber, getLocale } from '../../i18n';

type RoomGuide = { fa: string; en: string; purposeFa: string; purposeEn: string };
export const ROOM_GUIDE: Readonly<Record<RoomType, RoomGuide>> = {
  recreation:{fa:'اتاق تفریح',en:'Recreation lounge',purposeFa:'با حضور واقعی و برق، روحیهٔ بازمانده در زمان محدود بازیابی می‌شود؛ رزرو ظرفیت و هزینهٔ برق دارد.',purposeEn:'Recover morale through a timed, powered visit after physical arrival; reservations require capacity and one power unit.'},
  guardPost: { fa: 'اتاق نگهبانی', en: 'Guard post', purposeFa: 'محل استقرار نگهبانان؛ ظرفیت نگهبانی، وضعیت برق و آمادگی دفاعی از پنل آن بررسی می‌شود.', purposeEn: 'Assign guards here; inspect guard capacity, power and defensive readiness in the guard panel.' },
  command: { fa: 'اتاق فرماندهی', en: 'Command center', purposeFa: 'مدیریت پناهگاه؛ فقط یک اتاق مجاز است. سطح ۲ مجوز صنعت را باز می‌کند؛ مجوز حفظ می‌شود و استفاده از آن به فرماندهی فعال و دارای برق کافی نیاز دارد.', purposeEn: 'Shelter management; only one is allowed. Level 2 earns Industry access; permission persists but use requires an active powered command center.' },
  habitat: { fa: 'خوابگاه / اتاق مسکونی', en: 'Habitat', purposeFa: 'افزایش ظرفیت اسکان بازماندگان.', purposeEn: 'Increases survivor housing capacity.' },
  generator: { fa: 'نیروگاه', en: 'Generator', purposeFa: 'تولید برق. قفل پژوهشی مجزا ندارد؛ شرایط ساخت عمومی اعمال می‌شوند.', purposeEn: 'Produces power. No separate research gate; standard build checks apply.' },
  hydroponics: { fa: 'گلخانه', en: 'Hydroponics', purposeFa: 'تولید غذا در چرخه‌های منابع.', purposeEn: 'Produces food in resource cycles.' },
  medbay: { fa: 'درمانگاه', en: 'Medbay', purposeFa: 'ظرفیت درمان و پشتیبانی ساکنان.', purposeEn: 'Provides treatment capacity and survivor support.' },
  workshop: { fa: 'کارگاه', en: 'Workshop', purposeFa: 'تجهیزات و تولید صنعتی؛ نیازمند مجوز صنعت (قابل کسب از سطح ۲) و فرماندهی فعال با برق کافی.', purposeEn: 'Industrial supplies; requires Industry permission and an active powered command center.' },
  storage: { fa: 'انبار', en: 'Storage', purposeFa: 'افزایش ظرفیت ذخیرهٔ منابع.', purposeEn: 'Increases resource storage capacity.' },
  mine: { fa: 'معدن', en: 'Mine', purposeFa: 'استخراج سنگ معدن؛ نیازمند فرماندهی فعال سطح ۲ با برق کافی.', purposeEn: 'Extracts ore; requires a powered, active level-2 command center.' },
  waterTreatment: { fa: 'تصفیهٔ آب', en: 'Water treatment', purposeFa: 'تصفیهٔ آب برای پناهگاه، با توجه به منابع و شرایط عملیاتی.', purposeEn: 'Treats shelter water subject to resources and operating conditions.' },
  laboratory: { fa: 'آزمایشگاه', en: 'Laboratory', purposeFa: 'زیرساخت پژوهش؛ سطح آزمایشگاه، برق و حضور دانشمند برای شروع و ادامهٔ پژوهش لازم‌اند.', purposeEn: 'Research facility; lab level, power and physical scientist presence gate research start and continuation.' }
};

export function findHelpTopics(query: string, locale: 'fa' | 'en'): readonly HelpTopic[] {
  const normalized = normalize(query);
  if (!normalized) return HELP_TOPICS;
  return HELP_TOPICS.filter((topic) => {
    const entry = topic[locale];
    const extra = topic.id === 'rooms'
      ? Object.values(ROOM_GUIDE).flatMap((room) => [room[locale], locale === 'fa' ? room.purposeFa : room.purposeEn])
      : [];
    return normalize([entry.title, entry.intro, ...entry.steps, entry.note ?? '', ...extra].join(' ')).includes(normalized);
  });
}

function normalize(input: string): string {
  return input.trim().toLocaleLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ');
}

/** Standalone, read-only UI. Never invokes GameScene operations or writes to a game snapshot. */
export function mountGameHelp(dialog: HTMLDialogElement): {
  open: () => void;
  render: () => void;
} {
  function required<T extends HTMLElement>(selector: string): T {
    const element = dialog.querySelector<T>(selector);
    if (!element) throw new Error('Missing game help element: ' + selector);
    return element;
  }
  const root = required<HTMLElement>('#game-help');
  const search = required<HTMLInputElement>('#game-help-search');
  const count = required<HTMLElement>('#game-help-count');
  const list = required<HTMLElement>('#game-help-topics');
  const empty = required<HTMLElement>('#game-help-empty');
  const title = required<HTMLElement>('#menu-help-title');
  const subtitle = required<HTMLElement>('#game-help-subtitle');
  const searchLabel = required<HTMLLabelElement>('#game-help-search-label');
  const opened = new Set<string>(['start']);

  function paragraph(doc: Document, value: string, className?: string): HTMLParagraphElement {
    const item = doc.createElement('p');
    if (className) item.className = className;
    item.textContent = value;
    return item;
  }

  function roomCatalog(doc: Document, fa: boolean): HTMLElement {
    const section = doc.createElement('section');
    section.className = 'game-help__room-section';
    const heading = doc.createElement('h4');
    heading.textContent = fa ? 'فهرست اتاق‌های قابل ساخت' : 'Buildable room catalog';
    section.append(heading);
    const items = doc.createElement('ul');
    items.className = 'game-help__room-grid';
    (Object.keys(ROOM_DEFINITIONS) as RoomType[]).forEach((type) => {
      const item = doc.createElement('li');
      const room = ROOM_GUIDE[type];
      const name = doc.createElement('strong');
      name.textContent = fa ? room.fa : room.en;
      const meta = doc.createElement('span');
      const dimensions = ROOM_DEFINITIONS[type];
      meta.textContent = fa
        ? 'هزینه: ' + formatNumber(BUILD_COSTS[type]) + ' سکه · ابعاد: ' + formatNumber(dimensions.width) + '×' + formatNumber(dimensions.height)
        : 'Cost: ' + formatNumber(BUILD_COSTS[type]) + ' coins · Size: ' + formatNumber(dimensions.width) + '×' + formatNumber(dimensions.height);
      item.append(name, meta, paragraph(doc, fa ? room.purposeFa : room.purposeEn));
      items.append(item);
    });
    section.append(items);
    return section;
  }

  function renderTopic(doc: Document, topic: HelpTopic, fa: boolean, query: string): HTMLDetailsElement {
    const entry = fa ? topic.fa : topic.en;
    const details = doc.createElement('details');
    details.className = 'game-help__topic';
    details.dataset.topic = topic.id;
    details.open = !!query || opened.has(topic.id);
    const summary = doc.createElement('summary');
    summary.textContent = entry.title;
    const content = doc.createElement('div');
    content.className = 'game-help__topic-body';
    content.append(paragraph(doc, entry.intro));
    const heading = doc.createElement('h4');
    heading.textContent = fa ? 'مراحل و نکات کاربردی' : 'Steps and practical advice';
    content.append(heading);
    const steps = doc.createElement('ol');
    for (const step of entry.steps) {
      const li = doc.createElement('li');
      li.textContent = step;
      steps.append(li);
    }
    content.append(steps);
    if (topic.id === 'rooms') content.append(roomCatalog(doc, fa));
    if (entry.note) content.append(paragraph(doc, entry.note, 'game-help__note'));
    details.append(summary, content);
    details.addEventListener('toggle', () => {
      if (details.open) opened.add(topic.id);
      else opened.delete(topic.id);
    });
    return details;
  }

  function render(): void {
    const fa = getLocale() === 'fa';
    const locale = fa ? 'fa' : 'en';
    root.dir = fa ? 'rtl' : 'ltr';
    title.textContent = fa ? 'راهنمای بازی' : 'How to Play';
    subtitle.textContent = fa
      ? 'آموزش شروع، قواعد ساخت‌وساز، منابع و رفع مشکلات'
      : 'Learn the controls, construction rules, resources and troubleshooting';
    searchLabel.textContent = fa ? 'جست‌وجو در راهنما' : 'Search the guide';
    search.placeholder = fa ? 'مثلاً: آسانسور، نیروگاه، سکه…' : 'Try: elevator, generator, coins…';
    empty.textContent = fa ? 'موضوعی با این عبارت پیدا نشد.' : 'No matching guide topics.';
    const query = search.value.trim();
    const matches = findHelpTopics(query, locale);
    count.textContent = fa
      ? formatNumber(matches.length) + ' موضوع از ' + formatNumber(HELP_TOPICS.length)
      : formatNumber(matches.length) + ' of ' + formatNumber(HELP_TOPICS.length) + ' topics';
    const scroll = root.scrollTop;
    list.replaceChildren(...matches.map((topic) => renderTopic(dialog.ownerDocument, topic, fa, query)));
    empty.hidden = matches.length !== 0;
    root.scrollTop = scroll;
  }

  search.addEventListener('input', render);
  render();
  return {
    open: () => {
      search.value = '';
      opened.add('start');
      root.scrollTop = 0;
      render();
    },
    render
  };
}
