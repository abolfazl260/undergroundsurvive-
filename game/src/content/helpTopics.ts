/** Player-facing, offline guide. Keep gameplay rules in their owning modules; do not hard-code prices here. */
export interface HelpText {
  readonly title: string;
  readonly intro: string;
  readonly steps: readonly string[];
  readonly note?: string;
}
export interface HelpTopic {
  readonly id: string;
  readonly fa: HelpText;
  readonly en: HelpText;
}
export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: 'start',
    fa: {
      title: 'شروع سریع',
      intro: 'برای شروع، پناهگاه زیرزمینی خود را بررسی کنید. با چند اقدام ساده می‌توانید یک اتاق بسازید و منابع را مدیریت کنید.',
      steps: [
        'از منوی اصلی «شروع بازی» یا «ادامهٔ بازی» را انتخاب کنید.',
        'نوار بالای صفحه را ببینید؛ سکه و ذخیرهٔ منابع پناهگاه در آن نمایش داده می‌شود.',
        'در نوار پایین ابزار «ساخت» را بزنید و از فهرست، یک نوع اتاق قابل‌دسترسی انتخاب کنید.',
        'یک خانهٔ خالی و حفاری‌شده نزدیک مسیر موجود پناهگاه را لمس کنید. پیش‌نمایش معتبر و هزینه را بررسی کنید.',
        'ساخت را انجام دهید؛ اگر محل نامعتبر باشد یا موجودی کافی نداشته باشید، خطای مربوط نمایش داده می‌شود و هزینه‌ای کسر نمی‌شود.',
        'برای فضای تازه از «حفاری» استفاده کنید؛ برای دسترسی به تراز عمیق‌تر، آسانسور پیوسته را گسترش دهید.',
        'پنل منابع را بررسی کنید؛ در صورت امکان یک اتاق را با ابزار «ارتقا» انتخاب و اثر ارتقا را پیش از پرداخت مشاهده کنید.'
      ],
      note: 'در نسخهٔ کنونی ساخت روی سطح زمین فعال نیست. اتاق‌ها باید در زیرزمین و در موقعیت مجاز ایجاد شوند.'
    },
    en: {
      title: 'Quick start',
      intro: 'Inspect your underground shelter, place a room and keep an eye on essential supplies.',
      steps: [
        'Choose Start Game or Continue from the main menu.',
        'Check the top HUD for your coin balance and stored resources.',
        'Choose Build from the bottom toolbar and select an available room type.',
        'Tap an excavated, empty area near the existing shelter. Check the placement preview and price.',
        'Build the room. Invalid placement or insufficient coins produces a message without spending coins.',
        'Use Dig for more space; extend the continuous elevator shaft to reach a deeper level.',
        'Review your resources, then select a room with Upgrade to see its next benefit and price before confirming.'
      ],
      note: 'Surface construction is currently disabled. Place rooms only in valid underground locations.'
    }
  },
  {
    id: 'story',
    fa: {
      title: 'جهان بازی و هدف شما',
      intro: 'سطح زمین آلوده شده و منشأ آلودگی هنوز نامعلوم است. پس از هشدار اضطراری تلویزیون‌های دولتی، کسانی که توانستند وارد پناهگاه‌های زیرزمینی شدند. درها خودکار بسته شدند و اکنون سه ماه از قرنطینه گذشته است.',
      steps: [
        'شما مسئول نگهداری و توسعهٔ یک پناهگاه زیرزمینی هستید.',
        'با مدیریت برق، آب، غذا و دیگر منابع، شرایط زندگی بازماندگان را حفظ کنید.',
        'برای گسترش پناهگاه به زیرزمین حفاری کنید و مسیرهای دسترسی را متصل نگه دارید.',
        'داستان و مأموریت‌ها را از بخش مربوط در بازی دنبال کنید؛ راهنما علت آلودگی یا اتفاق‌های آینده را افشا نمی‌کند.'
      ],
      note: 'آلودگی سطح زمین در داستان با شاخص‌ها و مکانیزم‌های عددی تشعشع داخل بازی یکسان نیست.'
    },
    en: {
      title: 'World and objective',
      intro: 'The surface has become contaminated for reasons still unknown. Following an emergency government television alert, survivors took shelter underground. Automated doors sealed; three months of quarantine have passed.',
      steps: [
        'Manage and expand an underground shelter for its survivors.',
        'Balance power, water, food and other supplies to maintain the shelter.',
        'Excavate underground and keep access routes connected as you expand.',
        'Discover the narrative through the story and mission screens; the guide does not reveal the cause of contamination.'
      ],
      note: 'The outside-world contamination in the story is distinct from the in-game numeric radiation mechanics.'
    }
  },
  {
    id: 'controls',
    fa: {
      title: 'کنترل‌ها، زوم و منوها',
      intro: 'نمای بازی در موبایل و دسکتاپ یکسان است؛ روش کنترل با لمس یا ماوس تغییر می‌کند.',
      steps: [
        'نوار بالا وضعیت منابع و اطلاعات پناهگاه را نشان می‌دهد؛ نوار پایین محل ابزارهای اصلی است.',
        'روی اتاق یا خانهٔ شبکه لمس کوتاه کنید تا ابزار انتخاب‌شده روی آن عمل کند. پیش از اقدام، ابزار فعال را بررسی کنید.',
        'با کشیدن انگشت یا ماوس، نقشه را جابه‌جا کنید. در موبایل برای بزرگ‌نمایی از حرکت دو انگشت و در دسکتاپ از چرخ ماوس استفاده کنید.',
        'دکمه‌های + و − مقیاس را تغییر می‌دهند؛ کنترل بازنشانی زوم، نقشه را به مقیاس پیش‌فرض برمی‌گرداند.',
        'دکمهٔ منو بازی را متوقف و گزینه‌های «ادامه»، «تنظیمات» و «بازی جدید» را نمایش می‌دهد.',
        'اگر یک پنل باز است، ابتدا آن را ببندید و سپس ابزار دیگری انتخاب کنید.'
      ],
      note: 'کشیدن نقشه به‌جای لمس کوتاه نباید باعث ساخت یا تخریب اتاق شود.'
    },
    en: {
      title: 'Controls, zoom and menus',
      intro: 'Mobile and desktop share a layout, with touch or mouse input adapted to the device.',
      steps: [
        'Use the upper HUD to check shelter status and the bottom dock to select tools.',
        'A short tap or click on the grid applies the selected tool. Check which tool is active first.',
        'Drag to pan; pinch with two fingers on mobile or use the mouse wheel on desktop to zoom.',
        'Use + and − to adjust zoom, or Reset Zoom for the default scale.',
        'Open the menu to pause and access Continue, Settings and New Game.',
        'Close an open panel before switching to another tool if it obstructs the map.'
      ],
      note: 'Panning the map should not trigger a build or demolition action.'
    }
  },
  {
    id: 'construction',
    fa: {
      title: 'حفاری و ساخت‌وساز',
      intro: 'حفاری فضای قابل استفاده ایجاد می‌کند و ابزار ساخت، اتاق انتخابی را در خانه‌های آزاد قرار می‌دهد.',
      steps: [
        'ابتدا «حفاری» را انتخاب کنید و یک خانهٔ مجاز در امتداد فضای باز پناهگاه را انتخاب کنید.',
        'پس از آماده‌شدن فضای کافی، «ساخت» و سپس نوع اتاق را انتخاب کنید.',
        'اندازهٔ اتاق‌ها یکسان نیست؛ تمامی خانه‌های زیر اتاق باید آزاد، داخل محدوده و بدون هم‌پوشانی باشند.',
        'در اعتبارسنج فعلی، آزاد و حفاری‌شده‌بودن محل الزامی است. مجاورت مستقیم با اتاق دیگر هنوز به‌عنوان شرط مستقل پیاده‌سازی نشده؛ برای مسیر‌یابی بهتر اتاق‌ها را کنار شبکهٔ پناهگاه قرار دهید.',
        'پیش‌نمایش معتبر و نامعتبر را بررسی کنید؛ در صورت رد عملیات دلیل خطا را بخوانید.',
        'برای تغییر مکان یا حذف اتاق از ابزار مربوط استفاده کنید. محدودیت‌های اتاق‌های اصلی و سازه‌های قدیمی همچنان اعمال می‌شود.'
      ],
      note: 'حفاری، طبقهٔ جدید را آزاد نمی‌کند. همچنین ساخت‌وساز روی سطح زمین در این فاز ممنوع است.'
    },
    en: {
      title: 'Digging and construction',
      intro: 'Dig to reveal usable underground cells, then place a room on a valid cleared footprint.',
      steps: [
        'Choose Dig and select a permitted cell bordering accessible shelter space.',
        'After clearing enough space, choose Build and select a room type.',
        'Room footprints vary in size. Every covered cell must be free, in bounds and non-overlapping.',
        'Placement currently checks cleared and unoccupied space. Direct room-to-room adjacency is not yet enforced as a separate rule; place rooms near existing access for practical navigation.',
        'Read the valid/invalid preview and any rejection message before attempting construction.',
        'Use Move or Remove only where current room and legacy-structure restrictions allow it.'
      ],
      note: 'Digging does not unlock floors. Construction above ground is disabled in this phase.'
    }
  },
  {
    id: 'elevator',
    fa: {
      title: 'آسانسور و دسترسی به طبقات',
      intro: 'برای رسیدن به عمق جدید باید محور آسانسور موجود را به‌صورت پیوسته، در همان ستون، به پایین گسترش دهید.',
      steps: [
        'ابزار «آسانسور» را انتخاب کنید و شفت موجود را روی نقشه پیدا کنید.',
        'خانهٔ قابل‌دسترسی بعدی در امتداد عمودی شفت را انتخاب کنید؛ توسعهٔ پراکنده یا ناپیوسته پذیرفته نمی‌شود.',
        'پیش از ساخت، برخورد احتمالی با اتاق، محدودهٔ نقشه و موجودی سکه را بررسی کنید.',
        'پس از گسترش مجاز شفت، تراز زیرزمینی مرتبط قابل دسترس می‌شود؛ سپس فضای افقی را حفاری و اتاق بسازید.',
        'جابه‌جایی یا حذف شفت پیوسته در نسخهٔ کنونی فعال نیست.'
      ],
      note: 'آسانسور با اتاق معمولی تفاوت دارد: گسترش آن راه آزادسازی طبقات زیرزمینی است.'
    },
    en: {
      title: 'Elevators and underground levels',
      intro: 'Extend the existing elevator shaft downward in the same column and without gaps to reach deeper levels.',
      steps: [
        'Select the Elevator tool and locate the current shaft.',
        'Choose the next vertically adjacent shaft cell. Disconnected segments are not allowed.',
        'Check collisions, bounds and coin balance before confirming.',
        'Once the extension is valid, the corresponding underground level becomes accessible; excavate horizontally from there.',
        'Moving or removing the connected shaft is not currently supported.'
      ],
      note: 'The elevator is not an ordinary room; extending it unlocks access to deeper levels.'
    }
  },
  {
    id: 'rooms',
    fa: {
      title: 'اتاق‌ها و شرایط ساخت',
      intro: 'هر اتاق کاربرد، هزینه، ابعاد و گاهی پیش‌نیاز خاص خود را دارد. فهرست پایین از کاتالوگ و قیمت‌های واقعی بازی خوانده می‌شود.',
      steps: [
        'برای انتخاب اتاق به ابزار «ساخت» و فهرست اتاق‌ها مراجعه کنید.',
        'نوع اتاق و هزینهٔ آن را پیش از قرار دادن روی نقشه بررسی کنید؛ برای فضای خالی و پیوسته برنامه‌ریزی کنید.',
        'معدن و کارگاه به مجوز صنعتی نیاز دارند که نخست با رسیدن فرماندهی به سطح ۲ کسب می‌شود؛ برای ساخت همچنان فرماندهی فعال و دارای برق کافی لازم است. مجوز کسب‌شده پس از حذف فرماندهی حفظ می‌شود.',
        'برای نیروگاه، علاوه بر سکهٔ کافی، جای‌گذاری معتبر در زیرزمین لازم است؛ در کد فعلی قفل پژوهشی مستقل برای نیروگاه تعریف نشده است.',
        'اگر یک گزینه غیرفعال است، پیام خطای آن را بررسی کنید؛ قابلیت‌های آینده را با اتاق‌های فعال اشتباه نگیرید.'
      ],
      note: 'هزینهٔ هر اتاق و مساحت اشغال‌شده در فهرست زیر از دادهٔ فعلی بازی محاسبه می‌شود.'
    },
    en: {
      title: 'Rooms and prerequisites',
      intro: 'Rooms have different uses, prices and footprints; some also require capabilities. The catalog and prices below come from the game code.',
      steps: [
        'Open Build and select a room from the available list.',
        'Check its cost and footprint; prepare enough connected underground space first.',
        'Mine and Workshop need the Industry capability, first earned at command-center level 2; building still requires an active powered command center. Earned permission persists if the center is later removed.',
        'The Generator has no separate research unlock in current code; it still needs sufficient coins and a legal underground placement.',
        'When a room is unavailable, read the actual rejection reason. Planned rooms are not automatically buildable.'
      ],
      note: 'Prices and footprint sizes shown below are sourced from current game data.'
    }
  },
  {
    id: 'resources',
    fa: {
      title: 'منابع و چرخه‌های بقا',
      intro: 'تولید و مصرف منابع در چرخه‌های زمانی هنگام فعال‌بودن بازی انجام می‌شود. کمبود یک منبع می‌تواند فعالیت بعضی اتاق‌ها را متوقف کند.',
      steps: [
        'پنل منابع را باز کنید و موجودی برق، آب، غذا، سنگ معدن و تجهیزات را بررسی کنید.',
        'نیروگاه، گلخانه، معدن و سایر تأسیسات اثرهای متفاوتی بر جریان تولید و مصرف دارند؛ به گزارش چرخهٔ اخیر توجه کنید.',
        'اگر پیغام کمبود دیدید، ابتدا مشخص کنید کدام منبع کافی نیست و کدام اتاق در چرخه غیرفعال شده است.',
        'ساخت یا ارتقای تأسیسات مرتبط، افزایش ظرفیت انبار یا اصلاح مصرف را مطابق شرایط واقعی بازی بررسی کنید.',
        'هنگام توقف بازی، چرخه‌های تولید نیز متوقف می‌شوند؛ راهنما نباید ذخیرهٔ منابع را دستکاری کند.'
      ],
      note: 'اعداد و نرخ‌های تولید ممکن است با ارتقا و وضعیت پناهگاه تغییر کنند؛ به پنل منابع داخل بازی استناد کنید.'
    },
    en: {
      title: 'Resources and survival cycles',
      intro: 'Production and consumption run in timed cycles while gameplay is active. Shortages can stop some rooms.',
      steps: [
        'Open Resources and check power, water, food, ore and supplies.',
        'Generators, gardens, mines and other facilities affect production and demand differently; review the latest cycle.',
        'On a shortage, identify the missing resource and the rooms stopped in that cycle.',
        'Consider building or upgrading the relevant facility, raising storage capacity or managing demand where available.',
        'Production cycles stop while gameplay is paused; reading this guide does not modify resources.'
      ],
      note: 'Actual rates depend on room levels and shelter state. Refer to the live Resources panel for current figures.'
    }
  },
  {
    id: 'economy',
    fa: {
      title: 'سکه، هزینه‌ها و ارتقا',
      intro: 'سکه برای حفاری، ساخت اتاق، آسانسور، ارتقا و برخی عملیات پناهگاه مصرف می‌شود.',
      steps: [
        'موجودی سکه را در نوار بالای بازی بررسی کنید و قیمت هر اتاق را در منوی ساخت ببینید.',
        'برای ارتقا، ابزار «ارتقا» را انتخاب کنید و روی اتاق بزنید؛ سطح فعلی، سطح بعد، اثر و هزینه نمایش داده می‌شوند.',
        'تنها پس از تأیید ارتقا و موفق‌بودن عملیات، هزینه کسر می‌شود.',
        'حداکثر سطح اتاق در نسخهٔ فعلی محدود است؛ در سقف سطح، گزینهٔ ارتقا غیرفعال می‌شود.',
        'کمک‌هزینهٔ آزمایشی، اگر در منوی بازی موجود باشد، بخشی از امکانات تست است و منبع درآمد دائمی محسوب نمی‌شود.',
        'در صورت ناکافی‌بودن موجودی، پیش از ادامهٔ ساخت یا ارتقا، روش‌های فعلی کسب/صرفه‌جویی سکه را بررسی کنید.'
      ],
      note: 'قیمت‌ها در طول توسعه تغییر می‌کنند؛ رقم ثابت در متن راهنما ملاک نیست.'
    },
    en: {
      title: 'Coins, costs and upgrades',
      intro: 'Coins pay for excavation, rooms, elevator extensions, upgrades and selected shelter actions.',
      steps: [
        'Check your balance in the HUD and room prices in the Build menu.',
        'Choose Upgrade and tap a room to inspect its current level, next effect and required coins.',
        'Coins are spent only after a valid, confirmed upgrade succeeds.',
        'Rooms have a current maximum level; the upgrade action becomes unavailable at the cap.',
        'The one-time demo bonus, if visible, exists for testing and is not a permanent income source.',
        'If you lack funds, review the available ways to earn or conserve coins before spending more.'
      ],
      note: 'Prices can change as the game develops; live prices take precedence over examples.'
    }
  },
  {
    id: 'survivors',
    fa: {
      title: 'بازماندگان، جمعیت و حرکت',
      intro: 'کاراکترها از مسیرهای قابل عبور بین اتاق‌های متصل حرکت می‌کنند. ظرفیت پناهگاه و وضعیت اتاق فرماندهی را از پنل‌های مربوط ببینید.',
      steps: [
        'اگر ابزار جابه‌جایی آدمک فعال است، اتاق مقصد را لمس کنید و مسیر قابل‌عبور را بررسی کنید.',
        'کاراکتر نمی‌تواند از دیوار یا خارج از محدودهٔ پناهگاه عبور کند؛ اتصال اتاق‌ها و آسانسور اهمیت دارد.',
        'در صورت نبود مسیر، محل اتاق مقصد و مسیر ارتباطی را بررسی کنید.',
        'برای شناخت ظرفیت اسکان و قابلیت‌های فرماندهی، پنل وضعیت/اتاق فرماندهی را باز کنید.',
        'تخصص‌ها و آموزش نیرو تنها زمانی قابل استفاده‌اند که کنترل‌های آن‌ها واقعاً در نسخهٔ بازی فعال شده باشند.'
      ],
      note: 'راهنما حرکت شخصیت‌ها را فقط توضیح می‌دهد و فرمان جابه‌جایی صادر نمی‌کند.'
    },
    en: {
      title: 'Survivors, population and movement',
      intro: 'Characters move through accessible paths between connected rooms. Use room and command panels to inspect shelter capacity.',
      steps: [
        'When the character navigation tool is available, tap a destination room.',
        'Characters cannot cross walls or travel outside playable shelter bounds; connected routes and elevators matter.',
        'If no route exists, inspect connectivity and the selected destination.',
        'Use the command-center and population panels to review housing capacity and command capabilities.',
        'Specializations and training are usable only where their controls are actually enabled in the current version.'
      ],
      note: 'The guide explains movement but does not issue character commands.'
    }
  },
  {
    id: 'water-radiation',
    fa: {
      title: 'آب، آلودگی و تشعشع',
      intro: 'آب تصفیه‌شده و مدیریت تشعشع از سیستم‌های عملیاتی پناهگاه‌اند و با داستان آلودگی بیرون ارتباط دارند، اما یکسان نیستند.',
      steps: [
        'پنل آب را برای وضعیت آب خام، آب تصفیه‌شده، مخزن و قابلیت برداشت باز کنید.',
        'اگر برداشت آب ممکن نیست، برق، فضای خالی مخزن و ذخیرهٔ منبع آب را بررسی کنید.',
        'اتاق تصفیهٔ آب را در فضای مجاز بسازید و شرایط کار آن را در پنل آب مشاهده کنید.',
        'پنل تشعشع را باز کنید تا خانه‌ها/اتاق‌های در معرض خطر و گزینه‌های پاک‌سازی یا فیلتر را ببینید.',
        'قبل از پرداخت سکه برای پاک‌سازی یا فیلتر، انتخاب معتبر و منابع لازم را بررسی کنید.'
      ],
      note: 'قفل خودکار درهای پناهگاه بخشی از روایت است؛ راهنما نباید خروج به سطح آلوده را به‌عنوان اقدام فعال معرفی کند.'
    },
    en: {
      title: 'Water, contamination and radiation',
      intro: 'Water treatment and radiation are live shelter systems, related to but distinct from the narrative contamination outside.',
      steps: [
        'Open the Water panel to inspect raw water, treated water, storage and collection.',
        'If collection fails, check power, free tank capacity and the available aquifer reserve.',
        'Place a Water Treatment room in a legal location and inspect its operating conditions.',
        'Open the Radiation panel to see affected cells/rooms and available cleanup or filter actions.',
        'Check selection validity and available coins before paying for cleanup or filters.'
      ],
      note: 'The sealed shelter door is part of the story; do not treat surface exit as a currently available action.'
    }
  },
  {
    id: 'research',
    fa: {
      title: 'آزمایشگاه و پژوهش',
      intro: 'از پنل پژوهش برای دیدن فناوری‌های موجود، پیش‌نیازها، هزینه‌ها و وضعیت شروع یا تکمیل آن‌ها استفاده کنید.',
      steps: [
        'ابتدا آزمایشگاه مناسب را در پناهگاه بسازید؛ سطح و وضعیت تأمین برق آن می‌تواند بر دسترسی پژوهش اثر بگذارد.',
        'پنل پژوهش را باز کنید و گزینهٔ موردنظر را بررسی کنید.',
        'پیش از آغاز، شرط آزمایشگاه، پیش‌نیاز فناوری و موجودی سکه را بررسی کنید.',
        'اگر شروع پژوهش رد شد، پیام موجود در پنل را بخوانید و پیش‌نیازهای ناموجود را رفع کنید.',
        'فناوری‌های برنامه‌ریزی‌شده که هنوز اجرا نشده‌اند، جزو توانایی‌های فعال محسوب نمی‌شوند.'
      ],
      note: 'آغاز پژوهش باید از خود پنل بازی انجام شود؛ راهنما هیچ پژوهشی را خودکار فعال نمی‌کند.'
    },
    en: {
      title: 'Laboratory and research',
      intro: 'Use the Research panel for available technologies, prerequisites, costs and progress.',
      steps: [
        'Build an appropriate Laboratory; its level and power availability may affect research eligibility.',
        'Open Research and inspect a technology.',
        'Check lab requirements, prerequisite research and coin balance before starting.',
        'If the action fails, follow its reason and resolve missing requirements.',
        'Planned but unimplemented technologies are not active player abilities.'
      ],
      note: 'Start research using the actual in-game panel; this guide never starts it automatically.'
    }
  },
  {
    id: 'missions',
    fa: {
      title: 'مأموریت‌ها، روایت و دستاوردها',
      intro: 'داستان اتفاقات جهان را نمایش می‌دهد؛ مأموریت‌ها هدف‌های مشخص دارند و دستاوردها موفقیت‌های ثبت‌شدهٔ بازیکن هستند.',
      steps: [
        'از بخش «روایت بازی» فصل‌های در دسترس و تصاویر یا ویدیوهای داستان را ببینید.',
        'اگر پنل مأموریت‌ها در این نسخه فعال است، در همان‌جا هدف، پیشرفت، شرط زمانی و پاداش واقعی را بررسی کنید.',
        'در «دستاوردها» وضعیت پیشرفت و موارد بازشده/بازنشده را مشاهده کنید.',
        'تکمیل دستاورد لزوماً سکه یا پاداش قابل برداشت نمی‌دهد؛ برای پاداش فقط به اعلان رسمی همان بخش تکیه کنید.',
        'دستاوردهایی که به ویژگی‌های غیرفعال آینده وابسته‌اند ممکن است فعلاً قابل دستیابی نباشند.'
      ],
      note: 'راهنما داستان آینده یا دلیل نهایی آلودگی را لو نمی‌دهد.'
    },
    en: {
      title: 'Missions, narrative and achievements',
      intro: 'The Story presents events, Missions have objectives, and Achievements record milestones.',
      steps: [
        'Open Story to browse available chapters and illustrated or video scenes.',
        'If a Missions panel is enabled in this build, use its own objective, timer and reward details.',
        'Open Achievements to review progress and locked/unlocked milestones.',
        'Achievement unlocks do not necessarily grant coins or claimable rewards; check the actual UI.',
        'Some milestones dependent on future disabled features may not yet be achievable.'
      ],
      note: 'This guide avoids spoilers about later chapters and the cause of contamination.'
    }
  },
  {
    id: 'save',
    fa: {
      title: 'ذخیرهٔ بازی و شروع مجدد',
      intro: 'در نسخهٔ فعلی، پیشرفت پناهگاه به‌صورت محلی در مرورگر و دستگاه شما ذخیره می‌شود؛ همگام‌سازی آنلاین تضمین نشده است.',
      steps: [
        'پس از بازی، برای بازگشت به وضعیت ذخیره‌شده در همان مرورگر «ادامهٔ بازی» را انتخاب کنید.',
        'پاک‌کردن داده‌های سایت، حالت خصوصی یا تغییر دستگاه ممکن است باعث از دست‌رفتن ذخیرهٔ محلی شود.',
        'گزینهٔ «بازی جدید» برای شروع از ابتداست؛ تأیید آن می‌تواند نقشه، سکه و پیشرفت قبلی را بازنشانی کند.',
        'قبل از تأیید بازی جدید، متن هشدار را بخوانید؛ این عمل قابل بازگشت نیست.',
        'اگر وضعیت قدیمی قابل بازیابی نبود، پیام بازیابی را بررسی کنید و از پاک‌سازی خودسرانهٔ داده‌ها پرهیز کنید.'
      ],
      note: 'این بخش صرفاً اطلاع‌رسانی است؛ باز کردن راهنما ذخیره یا دادهٔ بازی را تغییر نمی‌دهد.'
    },
    en: {
      title: 'Saving and starting over',
      intro: 'Progress is currently saved locally in this browser/device; online account synchronization is not guaranteed.',
      steps: [
        'Use Continue in the same browser to return to the saved shelter.',
        'Clearing site data, private browsing or changing devices can remove access to a local save.',
        'New Game begins again and, if confirmed, resets the map, coins and stored progress.',
        'Read the confirmation warning carefully: this reset cannot be undone.',
        'If an old save cannot be restored, read the recovery warning rather than clearing data immediately.'
      ],
      note: 'Opening the guide never writes to game saves or changes your progress.'
    }
  },
  {
    id: 'settings',
    fa: {
      title: 'تنظیمات، زبان و صدا',
      intro: 'از منوی اصلی یا توقف بازی به تنظیمات دسترسی دارید؛ گزینه‌ها جدا از ذخیرهٔ پناهگاه نگهداری می‌شوند.',
      steps: [
        'برای تغییر زبان، از فهرست «زبان بازی» فارسی یا انگلیسی را انتخاب کنید.',
        'موسیقی و افکت‌ها را جداگانه خاموش یا روشن کنید و شدت هرکدام را با نوار لغزنده تغییر دهید.',
        'در صورت نیاز «کاهش حرکت‌های تزئینی» را فعال کنید تا برخی انیمیشن‌های آزمایشی متوقف شوند.',
        'در بعضی مرورگرها پخش صدا فقط پس از نخستین لمس یا کلیک کاربر شروع می‌شود.',
        'برای برگشت، دکمهٔ «بازگشت» را انتخاب کنید؛ اگر بازی قبلاً متوقف بوده، با «ادامهٔ بازی» آن را از سر بگیرید.'
      ],
      note: 'تنظیم صدا با پنل صدای داخل بازی مشترک است.'
    },
    en: {
      title: 'Settings, language and audio',
      intro: 'Open Settings from the main or pause menu; preferences are stored separately from shelter progress.',
      steps: [
        'Choose Persian or English in the Language selector.',
        'Toggle music and sound effects separately and use each slider to adjust its volume.',
        'Enable Reduced Motion to stop some decorative and prototype animations.',
        'Some browsers require your first tap or click before audio playback is permitted.',
        'Use Back to return to the menu, then Continue to resume a paused game.'
      ],
      note: 'Audio preferences are shared with the in-game audio panel.'
    }
  },
  {
    id: 'faq',
    fa: {
      title: 'مشکلات رایج و پرسش‌های متداول',
      intro: 'در بیشتر موارد، پیام خطای خود بازی مشخص می‌کند چه شرطی رعایت نشده است.',
      steps: [
        'چرا نمی‌توانم اتاق بسازم؟ زمین باید حفاری‌شده، آزاد، به‌اندازهٔ کافی بزرگ و در زیرزمین باشد؛ سکه و مجوز اتاق را هم بررسی کنید. اتصال مستقیم هنوز شرط مستقل ساخت نیست.',
        'چرا نمی‌توانم طبقه اضافه کنم؟ فقط توسعهٔ عمودی و پیوستهٔ آسانسور طبقهٔ جدید را قابل دسترس می‌کند.',
        'چرا ساخت روی زمین غیرفعال است؟ این فاز بازی فقط ساخت زیرزمینی را پشتیبانی می‌کند.',
        'چرا معدن یا کارگاه قفل است؟ مجوز صنعتی ابتدا با فرماندهی سطح ۲ کسب می‌شود؛ برای ساخت، فرماندهی فعال و دارای برق کافی لازم است.',
        'چرا نمی‌توانم نیروگاه بسازم؟ موجودی سکه و جای خالی متصل را بررسی کنید؛ برای نیروگاه قفل پژوهشی مستقلی تعریف نشده است.',
        'چرا کاراکتر به مقصد نمی‌رود؟ مقصد و مسیر قابل‌عبور بین اتاق‌ها را بررسی کنید.',
        'چرا تولید متوقف شد؟ منبع کم‌شده، برق و ظرفیت را در پنل چرخهٔ منابع ببینید.',
        'چرا آب برداشت نمی‌شود؟ برق، فضای مخزن و ذخیرهٔ منبع آب را بررسی کنید.',
        'چرا موسیقی پخش نمی‌شود؟ تنظیم قطع صدا و نیاز مرورگر به اولین لمس را بررسی کنید.',
        'چگونه زوم را اصلاح کنم؟ از کنترل بازگشت به مقیاس پیش‌فرض استفاده کنید.',
        'داده‌های من کجاست؟ ذخیرهٔ فعلی محلی است؛ از پاک‌کردن دادهٔ مرورگر خودداری کنید.'
      ]
    },
    en: {
      title: 'Frequently asked questions',
      intro: 'An in-game error message usually indicates which requirement is missing.',
      steps: [
        'Why can’t I build? The footprint must be excavated, free, large enough and underground. Check coins and unlocks too; direct adjacency is not currently enforced.',
        'Why can’t I reach a new level? Extend the existing elevator vertically without gaps.',
        'Why no surface construction? This phase supports underground construction only.',
        'Why are Mine and Workshop locked? Industry is first earned at command-center level 2; a powered active command center is then required.',
        'Why can’t I build a Generator? Check coins and a valid connected footprint; there is no separate generator research gate.',
        'Why won’t a character move? Check the destination and traversable route.',
        'Why did production stop? Inspect missing supplies, power and storage capacity in Resources.',
        'Why can’t I collect water? Verify power, tank space and aquifer reserve.',
        'Why is music silent? Check mute/volume and the browser’s first-interaction requirement.',
        'How do I reset zoom? Use the Reset Zoom control.',
        'Where is my progress? It is stored locally; avoid clearing browser site data.'
      ]
    }
  }
];
export const HELP_TOPIC_IDS = HELP_TOPICS.map((topic) => topic.id);
