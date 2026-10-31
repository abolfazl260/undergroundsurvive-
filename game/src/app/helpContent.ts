import type { GameLocale } from '../i18n';

export interface HelpTopic {
  readonly id: string;
  readonly title: string;
  readonly steps: readonly string[];
  readonly tip?: string;
}
export interface HelpDocument {
  readonly intro: string;
  readonly startTitle: string;
  readonly startSteps: readonly string[];
  readonly topicsTitle: string;
  readonly topics: readonly HelpTopic[];
  readonly reminder: string;
}

const fa: HelpDocument = {
  intro: 'از اینجا یاد می‌گیرید چطور پناهگاه را بسازید، منابع را مدیریت کنید و با ابزارهای بازی کار کنید. برای دیدن توضیحات بیشتر، روی عنوان هر موضوع بزنید.',
  startTitle: 'شروع سریع در ۶ قدم',
  startSteps: [
    '«شروع بازی» یا «ادامهٔ بازی» را بزنید. اگر داستان نمایش داده شد، آن را ببینید یا از آن عبور کنید.',
    'با کشیدن یک انگشت روی زمین نقشه را جابه‌جا کنید. با دو انگشت یا دکمه‌های + و − بزرگ‌نمایی کنید.',
    '«منابع» را در نوار بالای صفحه باز کنید و مقدار برق، آب و اکسیژن را بررسی کنید.',
    'از «ابزارها»، حفاری را انتخاب کنید و روی یک خانهٔ قابل حفاری کنار فضای باز بزنید.',
    'از «ساخت»، اتاق «تصفیه آب» را انتخاب کنید؛ «شروع ساخت» را بزنید و محل مجاز و متصل به پناهگاه را لمس کنید.',
    'از «ابزارها»، «ارتقا» را بزنید؛ یک اتاق را انتخاب کنید و بعد از دیدن هزینه، دکمهٔ تأیید ارتقا را بزنید.'
  ],
  topicsTitle: 'آموزش بخش‌های بازی',
  topics: [
    {
      id: 'screen', title: 'صفحه بازی و دکمه‌های بالا',
      steps: [
        '«منو» بازی را متوقف می‌کند و به تنظیمات، راهنما و بازی جدید دسترسی می‌دهد.',
        '«ساخت» فهرست اتاق‌ها را باز می‌کند. «ابزارها» حفاری، آسانسور، جابه‌جایی، ارتقا، تخریب، آدمک‌ها و شبکه برق را نشان می‌دهد.',
        '«منابع» وضعیت مصرف و تولید را نشان می‌دهد. «امکانات» راه دسترسی به بخش‌های بیشتر مانند داستان و دستاوردهاست.',
        'در گوشی، نوار میانی دکمه‌های بالا افقی حرکت می‌کند؛ آن را به چپ یا راست بکشید تا ابزارهای دیگر را ببینید.'
      ],
      tip: 'با بستن پنل، فضای بیشتری از نقشه دیده می‌شود.'
    },
    {
      id: 'camera', title: 'حرکت و بزرگ‌نمایی نقشه',
      steps: [
        'در موبایل با یک انگشت نقشه را بکشید؛ با نزدیک و دورکردن دو انگشت اندازه تصویر را تغییر دهید.',
        'در رایانه از کشیدن ماوس، چرخ ماوس یا دکمه‌های + و − بالای بازی استفاده کنید.',
        'دکمه بازگشت به ۱۰۰٪، بزرگ‌نمایی متناسب با صفحه را بازیابی می‌کند.',
        'لمس کوتاه، روی خانه‌ای که انتخاب کرده‌اید عمل می‌کند؛ کشیدن نقشه نباید حفاری یا ساخت انجام دهد.'
      ]
    },
    {
      id: 'dig', title: 'حفاری و بازکردن طبقه‌های پایین‌تر',
      steps: [
        '«ابزارها ← حفاری» را انتخاب و روی خانهٔ خاکی مجاز کنار خانهٔ باز بزنید؛ حفاری سکه مصرف می‌کند.',
        'برای دسترسی به طبقه‌های عمیق‌تر، «ابزارها ← آسانسور» را انتخاب کنید و شفت را به شکل متصل ادامه دهید.',
        'حفاری به‌تنهایی قفل طبقه را باز نمی‌کند. ابتدا باید دسترسی آسانسور برقرار باشد.',
        'ساخت‌وساز جدید فعلاً فقط زیر زمین انجام می‌شود.'
      ],
      tip: 'اگر خانه‌ای قابل حفاری نیست، اتصال به فضای باز، دسترسی آسانسور و موجودی سکه را بررسی کنید.'
    },
    {
      id: 'build', title: 'ساخت و انتخاب اتاق',
      steps: [
        'از بالای صفحه «ساخت» را بزنید، دسته‌بندی را انتخاب کنید و روی کارت اتاق دلخواه بزنید.',
        'هزینه را بررسی کنید و «شروع ساخت» را بزنید تا پنل بسته شود.',
        'روی فضای حفاری‌شده و مجاز نقشه بزنید؛ اتاق باید به زنجیرهٔ اتاق‌های متصل به آسانسور وصل باشد.',
        'اتاق‌ها اندازه‌های متفاوتی دارند؛ زمین کافی و سکه لازم است. اتاق جداافتاده ساخته نمی‌شود.'
      ]
    },
    {
      id: 'edit', title: 'ارتقا، جابه‌جایی و تخریب',
      steps: [
        'برای ارتقا: «ابزارها ← ارتقا»، انتخاب اتاق، بررسی سطح و هزینه و سپس «تأیید ارتقا». حداکثر سطح فعلی ۳ است.',
        'برای جابه‌جایی: ابزار «جابه‌جایی»، اتاق موردنظر و سپس خانهٔ مقصد مجاز را بزنید.',
        'برای حذف: ابزار «تخریب»، اتاق و سپس تأیید حذف را انتخاب کنید.',
        'جابجایی یا حذف نباید اتصال اتاق‌های دیگر یا دسترسی آن‌ها به آسانسور را قطع کند.'
      ],
      tip: 'قبل از تأیید تخریب، پیام هشدار را بخوانید؛ بازگشت خودکار برای این کار وجود ندارد.'
    },
    {
      id: 'power', title: 'برق و کابل‌کشی',
      steps: [
        'نیروگاه برق تولید می‌کند، اما برای رساندن آن به اتاق‌ها باید اتصال شبکه درست باشد.',
        'از «ابزارها»، «کابل» یا «رابط عمودی» را انتخاب کنید و روی خانهٔ مجاز بزنید؛ رابط عمودی برای اتصال بین طبقه‌هاست.',
        '«نمایش شبکه برق» را فعال کنید تا اتصال و اتاق‌های بدون برق مشخص شوند.',
        'از پنل منابع/شبکه برق، تولید، مصرف، کمبود و اولویت اتاق‌ها را ببینید.',
        'اگر یک اتاق روشن نیست، کابل، ظرفیت نیروگاه و اولویت مصرف را بررسی کنید.'
      ]
    },
    {
      id: 'water', title: 'آب سالم و اکسیژن',
      steps: [
        '«تصفیه آب» را در جای مجاز و دارای برق بسازید. در پنل آب، گزینه «برداشت ۱۰ آب خام» را برای پمپاژ منبع اولیه بزنید.',
        'دستگاه تصفیه به مرور آب خام را به آب سالم تبدیل می‌کند؛ تولید به برق و ظرفیت مخزن نیاز دارد.',
        'اتاق تهویهٔ دارای برق، اکسیژن تولید می‌کند؛ انبارها به افزایش ظرفیت کمک می‌کنند.',
        'اتاق‌های مجاور از اتصال‌های آب و هوا استفاده می‌کنند. در پنل آب، شیرهای اتصال را می‌توان باز یا بسته کرد.',
        'در صفحه منابع، ذخیرهٔ آب و اکسیژن و هشدار کمبود را دنبال کنید.'
      ]
    },
    {
      id: 'air', title: 'کیفیت هوا و شکست در بازی',
      steps: [
        'نشانگر «هوا» کیفیت هوای قابل تنفس پناهگاه را نشان می‌دهد و با موجودی اکسیژن یکسان نیست.',
        'اتاق تهویهٔ سالم و دارای برق به بهبود کیفیت هوا کمک می‌کند؛ جمعیت و فعالیت صنعتی به آن فشار می‌آورند.',
        'اگر تهویه خراب یا خاموش است، از پنل هوا وضعیت آن را بررسی کنید و در صورت امکان تعمیر یا روشن کنید.',
        'اگر کیفیت هوای پناهگاه به صفر برسد، بازی تمام می‌شود و این دور را می‌بازید.'
      ],
      tip: 'هشدار هوا را زود جدی بگیرید؛ فقط داشتن اکسیژن در انبار برای حفظ کیفیت هوا کافی نیست.'
    },
    {
      id: 'food', title: 'غذا، آشپزخانه و انبار',
      steps: [
        'گلخانه مواد غذایی تولید می‌کند؛ آشپزخانه با دستورهای پخت، آن‌ها را به جیره تبدیل می‌کند.',
        'از پنل آشپزخانه دستور غذا را انتخاب کنید و به آن آشپز اختصاص دهید. برق و مواد اولیه هم لازم‌اند.',
        'انبار ظرفیت ذخیره منابع را بالا می‌برد؛ در صورت پرشدن مخزن یا کمبود مواد، تولید ممکن است متوقف شود.',
        'در «منابع» موجودی غذا، جیره و تجهیزات را بررسی کنید.'
      ]
    },
    {
      id: 'people', title: 'بازماندگان و کار در اتاق‌ها',
      steps: [
        'در «ابزارها ← آدمک»، ابتدا یکی از آدمک‌ها و بعد اتاق مقصد را لمس کنید.',
        'برای مشاغل فعال مانند آشپز، دانشمند یا نگهبان از پنل مربوط به بازماندگان یا اتاق استفاده کنید.',
        'کاراکتر باید به اتاق مسیر معتبر داشته باشد؛ برق، ظرفیت و مشغول‌نبودن او نیز برای فعالیت مهم است.',
        'تفریح می‌تواند روحیه بازماندگان را بهتر کند؛ برای کارکرد آن به برق و دسترسی نیاز دارید.'
      ]
    },
    {
      id: 'research', title: 'آزمایشگاه و پژوهش',
      steps: [
        'آزمایشگاه بسازید، آن را به برق متصل کنید و دانشمند به آن اختصاص دهید.',
        'از پنل پژوهش، فناوری قابل دسترس را انتخاب و هزینه را بررسی کنید.',
        'پژوهش هنگام نبود برق یا دانشمند متوقف می‌شود و با برگشت شرایط ادامه پیدا می‌کند.',
        'بعضی فناوری‌ها بازده تولید یا امکانات بعدی را بهتر می‌کنند.'
      ]
    },
    {
      id: 'radiation', title: 'تشعشع و پاک‌سازی',
      steps: [
        'از ابزارها یا پنل مربوط به تشعشع، وضعیت منطقه آلوده را بررسی کنید.',
        'در صورت دسترسی، فیلتر حفاظتی اتاق را نصب کنید یا خانه آلوده را با پرداخت منابع پاک‌سازی کنید.',
        'آلودگی و کمبود حفاظت می‌توانند خطرناک باشند؛ پیش از گسترش به مناطق مشکوک وضعیت آن‌ها را ببینید.'
      ]
    },
    {
      id: 'progress', title: 'داستان، دستاورد و ذخیره‌سازی',
      steps: [
        'از «امکانات»، داستان تصویری و دستاوردها را باز کنید. با انجام هدف‌های دستاورد، پاداش مربوط را دریافت می‌کنید.',
        'پیشرفت پناهگاه در حافظه همین مرورگر یا برنامه ذخیره می‌شود؛ حساب و همگام‌سازی ابری هنوز فعال نیست.',
        'در «منو ← تنظیمات» می‌توانید زبان، صدا و کاهش حرکت را تغییر دهید.',
        '«بازی جدید» همه پیشرفت این دور را بازنشانی می‌کند؛ تنها پس از بررسی پیام تأیید از آن استفاده کنید.'
      ]
    },
    {
      id: 'troubleshooting', title: 'وقتی کاری انجام نمی‌شود چه کنم؟',
      steps: [
        'ساخت ناموفق: فضای خالی، حفاری قبلی، اتصال به اتاق‌ها، دسترسی آسانسور، پیش‌نیاز و سکه را بررسی کنید.',
        'دستگاه بی‌کار: اتصال برق، کمبود منابع، ظرفیت مخزن، وضعیت روشن/خاموش و کارمند لازم را بررسی کنید.',
        'آدمک حرکت نمی‌کند: ابزار آدمک و مقصد معتبر را انتخاب کنید و مطمئن شوید مسیر باز است.',
        'دکمه دیده نمی‌شود: نوار میانی هدر را افقی بکشید یا «امکانات» را باز کنید. پنل باز را ببندید تا نقشه قابل لمس باشد.',
        'اگر با تغییر دستگاه ذخیره قبلی را نمی‌بینید، توجه کنید پیشرفت فعلاً فقط روی همان مرورگر یا نصب برنامه نگهداری می‌شود.'
      ]
    }
  ],
  reminder: 'نکته مهم: برق، آب، اکسیژن و به‌ویژه کیفیت هوا را مرتب بررسی کنید. این راهنما توضیح استفاده از نسخه فعلی بازی است، نه قوانین حقوقی و حریم خصوصی.'
};

const en: HelpDocument = {
  intro: 'Learn how to build your shelter, manage resources, and use the controls. Open a topic below for step-by-step instructions.',
  startTitle: 'Get started in 6 steps',
  startSteps: [
    'Tap Start or Continue. Watch the story if it appears, or skip it.',
    'Drag the map with one finger. Use two fingers or the + and − buttons to zoom.',
    'Open Resources in the top bar and check power, water, and oxygen.',
    'Open Tools, select Dig, and tap a valid rock cell next to excavated ground.',
    'Open Build and choose Water Treatment. Tap Start building, then place it in a valid spot connected to your shelter.',
    'Open Tools → Upgrade, select a room, review its cost, and confirm the upgrade.'
  ],
  topicsTitle: 'How to play',
  topics: [
    { id: 'screen', title: 'Top bar and menus', steps: [
      'Menu pauses the game and opens Settings, Help, and New Game.',
      'Build shows rooms. Tools includes digging, elevators, moving, upgrading, removal, residents, and the power network.',
      'Resources shows production and consumption. More opens story, achievements, and other features.',
      'On a phone, swipe the middle of the top bar left or right to see more controls.'
    ], tip: 'Close a panel to see more of the map.' },
    { id: 'camera', title: 'Move and zoom the map', steps: [
      'Drag with one finger on mobile; pinch with two fingers to zoom.',
      'On desktop, drag with the mouse or use the mouse wheel and the + and − buttons.',
      'Reset to 100% to restore the zoom level fitted to your screen.',
      'A short tap uses the selected tool; dragging should not build or dig.'
    ] },
    { id: 'dig', title: 'Dig and reach lower floors', steps: [
      'Choose Tools → Dig, then tap an allowed rock cell next to an open cell. Digging costs coins.',
      'To reach deeper levels choose Tools → Elevator and extend the connected shaft.',
      'Digging by itself does not unlock a floor; elevator access is required first.',
      'New construction is underground-only in this version.'
    ], tip: 'If you cannot dig, check adjacency, elevator access, and coins.' },
    { id: 'build', title: 'Build a room', steps: [
      'Tap Build in the top bar, select a room category, then tap a room card.',
      'Check the cost and tap Start building to close the room picker.',
      'Tap a valid excavated area connected to the elevator-linked room chain.',
      'Rooms have different sizes. You need enough empty space and coins; isolated rooms are not allowed.'
    ] },
    { id: 'edit', title: 'Upgrade, move, and remove', steps: [
      'Upgrade: select Tools → Upgrade, tap a room, review its level and price, then confirm. The current maximum level is 3.',
      'Move: choose Move, select the room, then tap a valid destination.',
      'Remove: choose Demolish, select the room, and confirm the warning.',
      'Moves and removals may not disconnect the other rooms from the elevator.'
    ], tip: 'Demolition is not automatically reversible.' },
    { id: 'power', title: 'Power and wiring', steps: [
      'Generators produce electricity, but rooms need a working network connection.',
      'Use Tools → Cable or Vertical connector to install wiring. Vertical connectors bridge floors.',
      'Enable Show power grid to see connections and unpowered rooms.',
      'Check production, demand, shortages, and room priorities in the power panel.',
      'If a room is off, check wires, generation, and load priorities.'
    ] },
    { id: 'water', title: 'Clean water and oxygen', steps: [
      'Build and power Water Treatment. In the water panel, use Pump 10 raw water to collect source water.',
      'The treatment unit converts raw water into clean water over time, subject to power and tank capacity.',
      'Powered Ventilation produces oxygen; Storage increases capacity.',
      'Adjacent rooms use water/air connections. Open or close valves in the water panel.',
      'Watch water, oxygen, and shortage warnings in Resources.'
    ] },
    { id: 'air', title: 'Air quality and game over', steps: [
      'The Air quality indicator is different from your stored oxygen amount.',
      'Powered, healthy ventilation improves air; residents and industrial activity increase the load.',
      'If a vent is damaged or disabled, use the air panel to inspect, repair, or enable it.',
      'When breathable air quality reaches zero, this run ends in defeat.'
    ], tip: 'Stored oxygen alone cannot fix every air-quality problem.' },
    { id: 'food', title: 'Food, kitchen, and storage', steps: [
      'Hydroponics produces raw food; the Kitchen turns ingredients into meals using recipes.',
      'Choose a recipe and assign a cook. You also need power and ingredients.',
      'Storage increases resource capacity; full tanks or missing supplies can suspend production.',
      'Track food, meals, and supplies in Resources.'
    ] },
    { id: 'people', title: 'Residents and jobs', steps: [
      'Open Tools → Resident, tap a character, then tap a destination room.',
      'Use the resident or room panel to assign active jobs such as cook, scientist, or guard.',
      'The route must be reachable; capacity, power, and worker availability also matter.',
      'Recreation can improve morale when powered and reachable.'
    ] },
    { id: 'research', title: 'Laboratory and research', steps: [
      'Build a Laboratory, connect it to power, and assign a scientist.',
      'Choose an available technology in Research and review its cost.',
      'Research pauses when staff or power is missing, then resumes when restored.',
      'Technologies can improve production and later capabilities.'
    ] },
    { id: 'radiation', title: 'Radiation and cleanup', steps: [
      'Inspect radiation status through the relevant tool or panel.',
      'When available, install a protective room filter or spend resources to clean an affected cell.',
      'Inspect hazardous areas before expanding into them.'
    ] },
    { id: 'progress', title: 'Story, achievements, and saving', steps: [
      'Open More to view the illustrated story and achievements. Meeting achievement goals grants their rewards.',
      'Shelter progress is saved locally in this browser or installed app; cloud sync and accounts are not active yet.',
      'Open Menu → Settings to change language, audio, and reduced motion.',
      'New Game resets this run; read the confirmation carefully.'
    ] },
    { id: 'troubleshooting', title: 'What if something will not work?', steps: [
      'Cannot build: check free excavated space, room connectivity, elevator access, prerequisites, and coins.',
      'Room not working: check wiring, resources, capacity, power switch, and required staff.',
      'Resident will not move: select the Resident tool, choose a valid destination, and check the path.',
      'Missing controls: swipe the middle of the top bar or open More. Close sheets to interact with the map.',
      'Missing progress on another device: saves are currently local to each browser or app installation.'
    ] }
  ],
  reminder: 'Important: check power, water, oxygen, and especially air quality regularly. This guide explains the game controls, not legal or privacy policies.'
};

export function getHelpDocument(locale: GameLocale): HelpDocument {
  return locale === 'en' ? en : fa;
}

/** User-facing help is built with text nodes only; never inject HTML. */
export function renderHelpContent(container: HTMLElement, locale: GameLocale): void {
  const guide = getHelpDocument(locale);
  // Keep expanded topics visible when the player changes languages.
  const opened = new Set(Array.from(container.querySelectorAll<HTMLDetailsElement>('details[open]'))
    .map(node => node.dataset.helpTopic));
  const intro = document.createElement('p');
  intro.className = 'menu-help-intro';
  intro.textContent = guide.intro;
  const heading = document.createElement('h3');
  heading.className = 'menu-help-section-title';
  heading.textContent = guide.startTitle;
  const start = document.createElement('ol');
  start.className = 'menu-help-start';
  guide.startSteps.forEach(value => {
    const step = document.createElement('li');
    step.textContent = value;
    start.append(step);
  });
  const topicsTitle = document.createElement('h3');
  topicsTitle.className = 'menu-help-section-title';
  topicsTitle.textContent = guide.topicsTitle;
  const topics = guide.topics.map(topic => {
    const details = document.createElement('details');
    details.className = 'menu-help-topic';
    details.dataset.helpTopic = topic.id;
    details.open = opened.has(topic.id);
    const summary = document.createElement('summary');
    summary.textContent = topic.title;
    const list = document.createElement('ol');
    topic.steps.forEach(value => {
      const step = document.createElement('li');
      step.textContent = value;
      list.append(step);
    });
    details.append(summary, list);
    if (topic.tip) {
      const tip = document.createElement('p');
      tip.className = 'menu-help-tip';
      tip.textContent = topic.tip;
      details.append(tip);
    }
    return details;
  });
  const reminder = document.createElement('p');
  reminder.className = 'menu-help-reminder';
  reminder.textContent = guide.reminder;
  container.replaceChildren(intro, heading, start, topicsTitle, ...topics, reminder);
}
