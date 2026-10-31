/** Small, dependency-free game UI localization. Persian is the existing default. */
export type GameLocale = 'fa' | 'en';
export const DEFAULT_LOCALE: GameLocale = 'fa';
export const LANGUAGE_STORAGE_KEY = 'underground-survive:language:v1';
const english: Readonly<Record<string, string>> = {
  "آنلاین": "Online",
  "نمایش رتبه‌بندی آزمایشی": "Open sample rankings",
  "رتبه‌بندی بازماندگان": "Survivor rankings",
  "امتیاز پیشرفت و موجودی سکه": "Progress score and coin balance",
  "امتیاز شما": "Your score",
  "سکه‌های شما": "Your coins",
  "فهرست نمونه بازیکنان": "Sample player list",
  "رتبه‌بندی نمونه بازیکنان": "Sample player rankings",
  "بستن رتبه‌بندی": "Close rankings",
  "شما": "You",
  "امتیاز": "pts",
  "ابزارهای اصلی": "Main tools",
  "ابزارهای شبکه برق": "Power network tools",
  "توسعه شفت آسانسور": "Extend elevator shaft",
  "اتاق جدید بسازید": "Build a new room",
  "۳۵ سکه برای هر خانه": "35 coins per cell",
  "انتقال اتاق": "Relocate room",
  "افزایش سطح اتاق": "Upgrade room level",
  "حذف سازه": "Remove structure",
  "هدایت بازماندگان": "Move survivors",
  "کابل · ۱۵": "Cable · 15",
  "کابل‌کشی بین اتاق‌ها": "Wire rooms together",
  "رابط عمودی · ۳۵": "Vertical riser · 35",
  "اتصال بین طبقات": "Connect floors",
  "حذف کابل": "Remove cable",
  "حذف اتصال انتخابی": "Remove selected wire",
  "نمایش اتصال‌ها و قطعی‌ها": "Show connections and outages",
  "نمایش شبکه برق": "Show power grid",
  "پنهان‌کردن شبکه برق": "Hide power grid",
  "نمایش کابل و اتاق‌های بی‌برق": "Show wiring and unpowered rooms",
  "شبکه برق فعال · {cables} کابل · {rooms} اتاق بی‌برق": "Power grid visible · {cables} wires · {rooms} unpowered rooms",
  "نمایش شبکه برق فعال شد.": "Power grid overlay enabled.",
  "نمایش شبکه برق غیرفعال شد.": "Power grid overlay disabled.",
  "شبکه توزیع برق": "Power distribution network",
  "شبکه‌ها": "Networks",
  "تقاضا": "Demand",
  "کمبود": "Shortage",
  "مصرف": "Consumption",
  "متصل و روشن": "Connected / online",
  "قطع اتصال": "Disconnected",
  "قطع به‌علت کمبود توان": "Shed: insufficient supply",
  "شبکه مجازی قدیمی": "Legacy virtual grid",
  "حیاتی": "Critical",
  "ضروری": "Essential",
  "غیرضروری": "Non-essential",
  "اولویت": "Priority",
  "ذخیره قدیمی در حالت شبکه مجازی است؛ ابتدا کابل‌کشی کنید، سپس شبکه فیزیکی را فعال کنید.": "This older save uses a virtual grid. Wire each room before activating physical distribution.",
  "فعال‌سازی شبکه فیزیکی": "Activate physical grid",
  "روی خانهٔ باز برای نصب کابل افقی بزنید. هزینه ۱۵ سکه.": "Tap an accessible cell to install wire (15 coins).",
  "روی دو خانهٔ عمودی مجاور، رابط عمودی نصب کنید؛ هر رابط ۳۵ سکه.": "Install risers on both vertically adjacent cells (35 coins each).",
  "برای حذف کابل روی خانهٔ دارای کابل بزنید.": "Tap a wired cell to remove its conductor.",
  "کابل فقط در خانهٔ باز یا حفاری‌شده قابل نصب است.": "Wiring requires an opened or excavated cell.",
  "این خانه قبلاً کابل مناسب دارد.": "This cell already has the required wire.",
  "در این خانه کابل وجود ندارد.": "No cable at this location.",
  "سکهٔ کافی برای کابل ندارید.": "Not enough coins for wiring.",
  "نصب کابل ممکن نیست.": "Could not install cable.",
  "تغییر اولویت بیش از یک سطح مجاز نیست.": "Priority may shift by only one tier.",
  "شبکهٔ فیزیکی فعال است.": "Physical grid is already enabled.",
  "ابتدا تمام اتاق‌ها را با کابل به نیروگاه متصل کنید.": "Connect every room to a generator before activating the physical grid.",
  "شبکه برق فیزیکی فعال شد.": "Physical distribution activated.",
  "اولویت مصرف برق تغییر کرد.": "Power priority updated.",
  "کابل حذف شد.": "Cable removed.",
  "کابل نصب شد.": "Cable installed.",

  'تفریح':'Recreation',
  'بازیابی روحیه':'Morale recovery',
  'در ثانیه':'per second',
  'ظرفیت تفریح':'Recreation capacity',
  'روحیه کامل است.':'Morale is full.',
  'برق کافی نیست.':'Insufficient power.',
  'آشپزخانه': 'Kitchen',
  'مواد خام': 'Raw food',
  'جیره': 'Meals',
  'جیره در هر پخت': 'Meals per batch',
  'نگهبانی':'Guard post',
  'ظرفیت نگهبانی':'Guard capacity',
  'تخصیص انجام شد؛ نیرو در مسیر است.':'Assigned; survivor is en route.',
  'نیرو آزاد شد.':'Survivor released.',
  'بازمانده وجود ندارد.':'Survivor not found.',
  'پست معتبر نیست.':'Invalid guard post.',
  'نیرو شغل دیگری دارد؛ ابتدا آزاد کنید.':'Survivor is busy; release first.',
  'ظرفیت اتاق پر است.':'Room capacity is full.',
  'مسیر قابل‌عبور نیست.':'No traversable path.',
  'درخواست تکراری است.':'Duplicate operation.',
  "ارتقا در دسترس نیست": "Upgrade unavailable",
  "اتاق فرماندهی": "Command center",
  "فقط یک اتاق فرماندهی مجاز است.": "Only one command center is allowed.",
  "این قابلیت هنوز فعال نشده است.": "This capability is not implemented/enabled yet.",
  "اتاق فرماندهی فعال لازم است.": "An active command center is required.",
  "فرماندهی برق کافی ندارد.": "Command center has insufficient power.",
  "فرماندهی سطح ۲ لازم است.": "Command center level 2 is required.",
  "ارتقای فرماندهی به برق و درخواست جدید نیاز دارد.": "Command upgrade requires power and a new operation.",
  "فرماندهی ارتقا یافت.": "Command center upgraded.",
  "برای تخریب روی اتاق کلیک کنید. مجوزهای کسب‌شده حفظ می‌شوند.": "Tap a room to demolish it. Earned capabilities are retained.",
  "کاهش تشعشع": "Radiation mitigation",
  "منطقهٔ تشعشع انتخاب شد.": "Radiation cell selected.",
  "پاکسازی انجام شد.": "Decontamination completed.",
  "پاکسازی ممکن نیست؛ موجودی را بررسی کنید.": "Cannot decontaminate: check coins.",
  "فیلتر نصب شد.": "Filter installed.",
  "ابتدا اتاق بدون فیلتر انتخاب کنید و موجودی را بررسی کنید.": "Select an unfiltered room and check coins.",
  "آزمایشگاه": "Laboratory",
  "پژوهش": "Research",
  "سطح پژوهش": "Research level",
  "پژوهش تکمیل شد.": "Research completed.",
  "پژوهش آغاز شد.": "Research started.",
  "پژوهش قابل شروع نیست؛ پیش‌نیازها را بررسی کنید.": "Cannot start research. Check prerequisites.",
  "ذخیره قابل بازیابی نیست؛ نسخهٔ اصلی برای بازیابی نگهداری شد.": "Save could not be restored; the original was retained for recovery.",
  "آسانسور": "Elevator",
  "این خانه آسانسور دارد.": "This cell already has an elevator.",
  "آسانسور باید به شفت پیوسته متصل باشد.": "Extend an adjacent connected shaft.",
  "این طبقه قفل است؛ آسانسور را امتداد دهید.": "Floor locked: extend the elevator.",
  "این محل با آسانسور تداخل دارد.": "This location overlaps an elevator.",
  "حذف یا انتقال شفت متصل مجاز نیست.": "Moving or removing a connected shaft is disabled.",
  "آسانسور را در خانهٔ مجاور شفت امتداد دهید.": "Extend the shaft into an adjacent cell. Cost: 150 coins.",
  "آسانسور ساخته و طبقه آزاد شد.": "Elevator built; floor now accessible.",
  "آب خام برداشت شد.": "Raw water collected.",
  "برداشت ممکن نیست؛ برق، فضای مخزن و ذخیرهٔ چاه را بررسی کنید.": "Cannot pump: check power, tank space and aquifer reserve.",
  "تصفیه آب": "Water treatment",
  "تهویه": "Ventilation",
  "سیستم تهویه": "Ventilation system",
  "ظرفیت هوای سالم": "Fresh-air coverage",
  "تعمیر تهویه": "Ventilation repair",
  "وضعیت تهویه تغییر کرد.": "Ventilation state changed.",
  "تغییر وضعیت تهویه ممکن نیست.": "Cannot change ventilation status.",
  "تجهیزات تهویه تعمیر شد.": "Ventilation equipment repaired.",
  "تعمیر تهویه ممکن نیست؛ موجودی را بررسی کنید.": "Cannot repair ventilation: check your coins.",
  "آب تمیز در هر چرخه": "Clean water per cycle",
  "دستاوردها": "Achievements",
  "دسته‌بندی دستاوردها": "Achievement categories",
  "پیشرفت کل دستاوردها": "Overall achievement progress",
  "همه": "All",
  "کاوش": "Exploration",
  "تولید": "Production",
  "جمعیت": "Community",

  "دستاوردهای پناهگاه": "Shelter achievements",
  "بستن دستاوردها": "Close achievements",
  "فهرست دستاوردها": "Achievement list",
  "بستن": "Close",
  "{done} از {total} دستاورد باز شده": "{done} of {total} achievements unlocked",
  "۰ از ۱۱ دستاورد باز شده": "0 of 11 achievements unlocked",
  "پیشرفت": "Progress",
  "باز شده": "Unlocked",
  "پاداش: {value} سکه": "Reward: {value} coins",
  "+{value} سکه دریافت شد": "+{value} coins received",
  "دستاورد باز شد: {name}؛ +{value} سکه": "Achievement unlocked: {name}; +{value} coins",
  "{count} دستاورد باز شد؛ +{value} سکه": "{count} achievements unlocked; +{value} coins",
  "پاداش دستاورد": "Achievement reward",
  "دستاورد جدید: {name}": "New achievement: {name}",
  "{count} دستاورد جدید باز شد": "{count} new achievements unlocked",
  "اولین قدم": "First steps",
  "یک اتاق جدید بسازید.": "Build a new room.",
  "معمار پناهگاه": "Shelter architect",
  "۵ اتاق جدید بسازید.": "Build 5 new rooms.",
  "زیر سطح": "Below the surface",
  "یک خانه حفاری کنید.": "Excavate one cell.",
  "کاوشگر": "Excavator",
  "۱۰ خانه حفاری کنید.": "Excavate 10 cells.",
  "رو به پیشرفت": "Moving up",
  "یک اتاق را ارتقا دهید.": "Upgrade a room.",
  "مهندس پناهگاه": "Shelter engineer",
  "۳ ارتقای اتاق انجام دهید.": "Upgrade rooms 3 times.",
  "رو به آسمان": "Toward the sky",
  "اولین طبقهٔ بالایی را باز کنید.": "Unlock the first upper floor.",
  "بر فراز ویرانه‌ها": "Above the ruins",
  "۲ طبقهٔ بالایی را باز کنید.": "Unlock 2 upper floors.",
  "چرخهٔ پایدار": "Sustainable cycle",
  "۵ چرخهٔ تولید منابع را پشت سر بگذارید.": "Complete 5 resource cycles.",
  "پناهگاه پایدار": "Sustainable shelter",
  "۲۵ چرخهٔ تولید منابع را پشت سر بگذارید.": "Complete 25 resource cycles.",
  "پناهگاهی برای همه": "A home for everyone",
  "۶ نوع اتاق متفاوت داشته باشید.": "Own 6 different room types.",
  "نمونهٔ قابل‌بازی ساخت‌وساز": "Playable building prototype",
  "اطلاعات بازیکن": "Player information",
  "بازیکن محلی": "Local player",
  "حساب آنلاین متصل نیست": "No online account connected",
  "در انتظار ذخیره": "Waiting to save",
  "☰ منو": "☰ Menu",
  "روایت بازی": "Game story",
  "داستان تصویری": "Visual story",
  "وضعیت منابع و پیشرفت پناهگاه": "Shelter resources and progress",
  "سکه": "coins",
  "موجودی سکه": "Coin balance",
  "هنوز تغییری ثبت نشده است": "No changes recorded yet",
  "اتاق‌های پناهگاه": "Shelter rooms",
  "طبقات بالایی باز": "Unlocked upper floors",
  "ترازهای حفاری‌شده": "Excavated underground levels",
  "ساخت‌وساز فقط در زیرزمین": "Underground construction only",
  "خانه‌های حفاری‌شده": "Excavated cells",
  "نمای دوبعدی پناهگاه": "2D shelter view",
  "ساخت طبقات روی زمین و حفاری زیرزمین": "Build above ground and excavate below",
  "کنترل بزرگ‌نمایی نقشه": "Map zoom controls",
  "کوچک‌نمایی نقشه": "Zoom out",
  "کوچک‌نمایی": "Zoom out",
  "مقیاس فعلی نقشه": "Current map scale",
  "بزرگ‌نمایی نقشه": "Zoom in",
  "بزرگ‌نمایی": "Zoom in",
  "بازگشت به بزرگ‌نمایی پیش‌فرض": "Reset map zoom",
  "بازگشت به ۱۰۰ درصد": "Reset to 100%",
  "ابزار موردنظر را انتخاب کنید.": "Choose a tool.",
  "ساخت‌وساز": "Construction",
  "ساخت‌وساز فعلاً فقط در زیرزمین مجاز است.": "Construction is currently restricted to underground.",
  "سازه‌های سطحیِ ذخیره‌های قدیمی در این نسخه فقط قابل مشاهده‌اند.": "Legacy surface structures are view-only in this version.",
  "اتاق موردنظر را انتخاب کنید و روی خانه‌های باز شبکه بزنید.": "Choose a room and tap an available grid cell.",
  "موجودی شروع: ۱٬۵۰۰ سکه. هزینه‌ها آزمایشی‌اند و برای ساخت، حفاری، آزادسازی طبقه و ارتقا پرداخت می‌شوند.": "Starting balance: 1,500 coins. Prototype costs apply to building, digging, floor unlocks and upgrades.",
  "اتاق‌ها و قیمت ساخت": "Rooms and construction costs",
  "انتخاب نوع اتاق": "Choose a room type",
  "اتاق مسکونی": "Habitat",
  "نیروگاه": "Generator",
  "کارگاه": "Workshop",
  "انبار": "Storage",
  "اتاق معدن": "Mine",
  "گلخانه": "Hydroponics",
  "درمانگاه": "Medical bay",
  "Habitat · ۲ خانه": "Habitat · 2 cells",
  "Generator · ۲ خانه": "Generator · 2 cells",
  "Workshop · ۲ خانه": "Workshop · 2 cells",
  "Storage · ۲ خانه": "Storage · 2 cells",
  "Mine · ۲ خانه": "Mine · 2 cells",
  "Hydroponics · ۲ خانه": "Hydroponics · 2 cells",
  "Medbay · ۲ خانه": "Medbay · 2 cells",
  "ابزارهای زمین و اتاق": "Terrain and room tools",
  "ابزارهای ویرایش": "Editor tools",
  "حفاری": "Dig",
  "جابه‌جایی": "Move",
  "ارتقا": "Upgrade",
  "تخریب": "Demolish",
  "جزئیات ارتقای اتاق": "Room upgrade details",
  "یک اتاق انتخاب کنید": "Select a room",
  "روی اتاق موردنظر بزنید.": "Tap the room you want.",
  "ابتدا اتاق را انتخاب کنید": "Select a room first",
  "بازکردن طبقهٔ +۱": "Unlock floor +1",
  "دریافت ۵۰۰ سکهٔ آزمایشی (یک‌بار)": "Claim 500 demo coins (once)",
  "صدا و موسیقی": "Sound and music",
  "قطع همهٔ صداها": "Mute all sounds",
  "موسیقی محیطی": "Ambient music",
  "افکت‌های بازی": "Game sound effects",
  "حجم موسیقی": "Music volume",
  "حجم افکت‌های صوتی": "Sound effects volume",
  "آزمایش افکت صوتی": "Test sound effect",
  "موسیقی پس از اولین لمس یا کلیک شروع می‌شود.": "Music starts after the first tap or click.",
  "آخرین تراکنش‌ها": "Recent transactions",
  "تاریخچهٔ سکه": "Coin transaction history",
  "هنوز تراکنشی ثبت نشده است.": "No transactions yet.",
  "بازنشانی تمام تغییرات آزمایشی": "Reset all prototype changes",
  "قوانین این نسخه": "Rules for this version",
  "ساخت‌وساز فعلاً فقط در زیرزمین و در شبکهٔ اتاق‌های متصل به آسانسور مجاز است. جزئیات کامل قوانین، حریم خصوصی و مجوزها در بخش اختصاصی قرار دارد.": "Construction is currently limited to underground rooms connected to the elevator network. See the dedicated page for full rules, privacy practices and device permissions.",
  "قوانین و حریم خصوصی": "Policies & Privacy",
  "شرایط استفاده، داده‌ها و دسترسی‌ها": "Terms, data and permissions",
  "حفاری از خانه‌های باز مجاور انجام می‌شود. برای ساخت طبقهٔ بالا، خانه‌های زیر اتاق باید تکیه‌گاه باشند. حذف تکیه‌گاه مجاز نیست. ارتقا تا سطح ۳ است و به سکه نیاز دارد.": "Excavate next to an open cell. Rooms above ground require support across their width. You cannot remove a supporting room. Upgrades cost coins and are capped at level 3.",
  "سکه‌ها و تغییرات فقط در همین مرورگر ذخیره می‌شوند؛ اقتصاد این نسخه آزمایشی است و هنوز سرور، حساب کاربری یا پرداخت واقعی وجود ندارد.": "Coins and changes are stored only in this browser. The economy is experimental; there are no servers, accounts or real payments.",
  "پناهگاه زیرزمینی": "Underground shelter",
  "پناهگاه خود را روی زمین و زیر زمین توسعه دهید. پیشرفت بازی در همین مرورگر ذخیره می‌شود.": "Expand your shelter above and below ground. Progress is saved in this browser.",
  "شروع بازی": "Start game",
  "بازی جدید": "New game",
  "تنظیمات": "Settings",
  "بازی متوقف شده است": "Game paused",
  "بستن منوی توقف و ادامهٔ بازی": "Close pause menu and resume",
  "ورود به پناهگاه": "Enter the shelter",
  "بازگشت به پناهگاه": "Return to the shelter",
  "ساخت یک پناهگاه تازه": "Create a fresh shelter",
  "صدا، زبان و حرکت": "Audio, language and motion",
  "بازگشت به صفحهٔ شروع": "Back to the start screen",
  "ذخیرهٔ محلی روی این دستگاه": "Local save on this device",
  "زمان و حرکت‌های صحنه متوقف شده‌اند. پیشرفت شما به‌صورت محلی ذخیره می‌شود.": "Scene time and animations are paused. Progress is saved locally.",
  "ادامهٔ بازی": "Continue game",
  "منوی اصلی": "Main menu",
  "تنظیمات بازی": "Game settings",
  "موسیقی": "Music",
  "افکت‌های صوتی": "Sound effects",
  "حجم افکت‌ها": "Effects volume",
  "تنظیمات صدا با کنترل‌های پنل بازی مشترک است.": "Audio settings are shared with in-game controls.",
  "کاهش حرکت‌های تزئینی": "Reduce decorative motion",
  "انیمیشن آدمک آزمایشی متوقف می‌شود.": "Pauses the demo character animation.",
  "تنظیمات صدا و کاهش حرکت جدا از پیشرفت پناهگاه ذخیره می‌شوند.": "Audio, motion and language preferences are saved separately from your shelter progress.",
  "بازگشت": "Back",
  "شروع بازی جدید؟": "Start a new game?",
  "این کار نقشه، سکه‌ها و پیشرفت ذخیره‌شده را به وضعیت اولیه برمی‌گرداند و قابل بازگشت نیست.": "This resets your map, coins and saved progress. It cannot be undone.",
  "بله، بازی جدید": "Yes, new game",
  "انصراف": "Cancel",
  "زبان بازی": "Game language",
  "انتخاب زبان بازی": "Select game language",
  "فارسی": "Persian",
  "انگلیسی": "English",
  "ساخت": "Build",
  "آدمک": "Resident",
  "انتخاب اتاق": "Select a room",
  "امکانات پناهگاه": "Shelter actions",
  "بستن پنل": "Close panel",
  "تنظیمات و امکانات": "Tools and settings",
  "جزئیات منابع": "Resource details",
  "نمایش تمام‌صفحه": "Enter fullscreen",
  "تمام‌صفحه": "Fullscreen",
  "ابزارهای اصلی بازی": "Main game actions",
  "ذخیره روی دستگاه": "Saved on this device",
  "ذخیره نشد": "Save failed",
  "آخرین تغییر موجودی: {value} سکه": "Last balance change: {value} coins",
  "سرمایهٔ اولیه": "Starting balance",
  "ساخت اتاق": "Room construction",
  "ابزارها": "Tools",
  "دسته‌بندی اتاق‌ها": "Room categories",
  "همه اتاق‌ها": "All rooms",
  "مسکونی": "Living",
  "فرماندهی": "Command",
  "منابع": "Resources",
  "خدمات": "Services",
  "دفاعی": "Defense",
  "تحقیقات": "Research",
  "اتاق انتخاب‌شده": "Selected room",
  "شروع ساخت": "Place room",
  "بازکردن طبقه": "Unlock floor",
  "ارتقای اتاق": "Room upgrade",
  "کمک‌هزینهٔ آزمایشی": "Demo bonus",
  "هزینه: {value} سکه": "Cost: {value} coins",
  "یک اتاق را برای ارتقا انتخاب کنید": "Choose a room to upgrade",
  "برای دیدن ظرفیت و هزینه، روی اتاق بزنید.": "Tap a room to see its capacity and cost.",
  "سطح {level} از {max}": "Level {level} of {max}",
  "این اتاق به بالاترین سطح رسیده است.": "This room is at the maximum level.",
  "هزینهٔ سطح بعد: {value} سکه": "Next level cost: {value} coins",
  "موجودی کافی نیست.": "Insufficient balance.",
  "حداکثر سطح": "Maximum level",
  "تأیید ارتقا · {value} سکه": "Confirm upgrade · {value} coins",
  "کمک‌هزینهٔ آزمایشی دریافت شده": "Demo bonus already claimed",
  "دریافت {value} سکهٔ آزمایشی (یک‌بار)": "Claim {value} demo coins (once)",
  "تمام طبقات باز شده‌اند": "All floors unlocked",
  "طبقهٔ +{floor} · {value} سکه": "Floor +{floor} · {value} coins",
  "فعال‌کردن صدا": "Unmute audio",
  "پخش موسیقی پس از اولین لمس یا کلیک شروع می‌شود. تنظیمات روی همین دستگاه ذخیره می‌شوند.": "Music starts after the first tap or click. Settings are saved on this device.",
  "این مرورگر از Web Audio پشتیبانی نمی‌کند؛ بازی بدون صدا قابل استفاده است.": "This browser does not support Web Audio. You can still play without sound.",
  "دستور نامعتبر است.": "Invalid action.",
  "اطلاعات نقشه معتبر نیست.": "Invalid map data.",
  "سکهٔ کافی برای این عملیات ندارید.": "You do not have enough coins for this action.",
  "پرداخت انجام نشد.": "Payment failed.",
  "اتاق انتخاب‌شده وجود ندارد.": "Selected room does not exist.",
  "اتاق به حداکثر سطح رسیده است.": "Room is at the maximum level.",
  "ابتدا یک اتاق را انتخاب کنید.": "Select a room first.",
  "کمک‌هزینهٔ آزمایشی قبلاً دریافت شده است.": "Demo bonus has already been claimed.",
  "افزایش موجودی ممکن نیست.": "Unable to increase balance.",
  "مکان ساخت خارج از نقشه است.": "Build location is outside the map.",
  "ابتدا زمین را حفاری کنید.": "Excavate the ground first.",
  "ابتدا طبقهٔ جدید را باز کنید.": "Unlock the next floor first.",
  "این محل با اتاق دیگری تداخل دارد.": "This location overlaps another room.",
  "اتاق طبقهٔ بالا به تکیه‌گاه در تمام عرض نیاز دارد.": "Upper-floor rooms require support across their full width.",
  "این اتاق قابل جابه‌جایی نیست.": "This room cannot be moved.",
  "اتاق‌های بالاتر بدون تکیه‌گاه باقی می‌مانند.": "Upper rooms would lose their supports.",
  "اتاق فرمان قابل حذف نیست.": "The command room cannot be removed.",
  "این اتاق تکیه‌گاه طبقات بالایی است.": "This room supports upper floors.",
  "این اتاق به بالاترین سطح آزمایشی رسیده است.": "This room is already at the maximum level.",
  "حفاری فقط در محدودهٔ زیرزمین مجاز است.": "Digging is only allowed underground.",
  "این خانه قبلاً حفاری شده است.": "This cell has already been excavated.",
  "ابتدا خانه‌ای مجاور این محل را حفاری کنید.": "Excavate an adjacent cell first.",
  "همهٔ طبقات مجاز باز شده‌اند.": "All available floors are unlocked.",
  "برای جابه‌جایی نقشه با یک انگشت بکشید؛ برای زوم از دو انگشت یا دکمه‌های زوم استفاده کنید.": "Drag with one finger to pan the map. Pinch with two fingers or use the zoom buttons to zoom.",
  "برای ساخت، یک خانهٔ خالی و آماده را انتخاب کنید.": "Choose an available empty cell to build.",
  "برای حفاری روی زمین بستهٔ زیرزمینی مجاور فضای باز بزنید.": "Tap underground ground next to an open cell to dig.",
  "ابتدا اتاق را انتخاب کنید و سپس مکان جدید آن را لمس کنید.": "Select a room, then tap its new location.",
  "برای تخریب روی اتاق کلیک کنید. اتاق فرمان محفوظ است.": "Tap a room to demolish it. The command room is protected.",
  "اتاق را انتخاب کنید، جزئیات ارتقا را ببینید و سپس پرداخت را تأیید کنید.": "Choose a room, review the upgrade and confirm payment.",
  "نقشه، حفاری‌ها و طبقات به وضعیت اولیه بازگردانده شدند.": "The map, excavations and floors were reset.",
  "ابتدا در حالت ارتقا یک اتاق را انتخاب کنید.": "Select a room while using the upgrade tool.",
  "این اتاق در بالاترین سطح قرار دارد.": "This room is at the highest level.",
  "در این موقعیت اتاقی وجود ندارد.": "There is no room at this position.",
  "جزئیات ارتقا نمایش داده شد؛ با دکمهٔ تأیید پرداخت کنید.": "Upgrade details are shown. Confirm to pay.",
  "برای جابه‌جایی ابتدا یک اتاق معمولی انتخاب کنید.": "Select a regular room to move.",
  "اتاق انتخاب شد؛ روی محل جدید بزنید.": "Room selected. Tap its new location.",
  "انتخاب جابه‌جایی لغو شد.": "Room move cancelled.",
  "اتاق به محل جدید منتقل شد.": "Room moved to the new location.",
  "اتاق تخریب شد.": "Room demolished.",
  "ظرفیت هماهنگی": "Command capacity",
  "ظرفیت اسکان": "Housing capacity",
  "توان اسمی برق": "Nominal power",
  "ظرفیت کشت": "Growing capacity",
  "ظرفیت درمان": "Treatment capacity",
  "ظرفیت کارگاه": "Workshop capacity",
  "ظرفیت ذخیره": "Storage capacity",
  "توان اسمی استخراج": "Extraction capacity",
  "واحد": "units",
  "نفر": "people",
  "داستان و روایت": "Story and narrative",
  "بستن داستان": "Close story",
  "فصل": "Chapter",
  "انتخاب فصل داستان": "Choose story chapter",
  "در حال آماده‌سازی داستان…": "Preparing story…",
  "قبلی": "Previous",
  "بعدی": "Next",
  "رد کردن فصل": "Skip chapter",
  "پوستر جایگزین": "Fallback poster",
  "رسانه در دسترس نیست؛ متن صحنه را دنبال کنید.": "Media unavailable. Read the scene text instead.",
  "هنوز فصل قابل‌نمایشی ثبت نشده است.": "No viewable chapters are available yet.",
  "پایان فصل": "End chapter",
  "زیرنویس": "Subtitles",
  "در حال بارگذاری فصل‌ها…": "Loading chapters…",
  "فصل بارگذاری نشد.": "chapter(s) failed to load.",
  "فصل‌ها قابل بارگذاری نیستند. فایل‌های محتوا را بررسی کنید.": "Could not load chapters. Check the content files.",
  "هنوز فصل فعالی وجود ندارد.": "No active chapters yet.",
  "دریافت محتوای داستان ناموفق بود. اتصال اینترنت یا انتشار فایل‌های محتوا را بررسی کنید.": "Story content failed to load. Check your connection and deployed content files.",
  "خطای بارگذاری": "Loading error",
  "منابع و چرخهٔ زمانی پناهگاه": "Shelter resources and timed cycles",
  "نمایش یا پنهان‌کردن منابع": "Toggle resource sheet",
  "وضعیت منابع": "Resource status",
  "ذخیرهٔ {resources} خالی است؛ اتاق‌های تولید را بررسی کنید.": "Depleted stock: {resources}. Inspect production rooms.",
  "هشدار منابع": "Resource warnings",
  "جزئیات شبکه برق": "Power network details",
  "چرخهٔ بعد در": "Next cycle in",
  "چرخهٔ اخیر بدون کمبود منابع انجام شد.": "The last cycle had no shortages.",
  "تولید و مصرف منابع": "Resource production and consumption",
  "چرخه": "Cycle",
  "· چرخهٔ بعد در": "· Next cycle in",
  "ثانیه": "seconds",
  "برق": "Power",
  "غذا": "Food",
  "سنگ معدن": "Ore",
  "تجهیزات": "Supplies",
  "تولید هر ۵ ثانیه از زمان فعال بازی محاسبه می‌شود.": "Resources are processed every 5 seconds of active gameplay.",
  "چرخهٔ اخیر بدون کمبود منابع انجام شد. هنگام توقف بازی تولید متوقف می‌شود.": "The last cycle had no shortages. Production pauses when the game is paused.",
  "کمبود {resources} · {rooms} اتاق در چرخهٔ اخیر غیرفعال بود.": "Shortage: {resources} · {rooms} room(s) inactive in the latest cycle.",
  "چرخهٔ منابع انجام شد؛ برخی اتاق‌ها به‌علت کمبود منابع متوقف شدند.": "Resource cycle completed. Some rooms stopped due to shortages.",
  "چرخهٔ تولید و مصرف منابع انجام شد.": "Production and consumption cycle completed.",
  "مسیریابی آدمک": "Character navigation",
  "اتاق مقصد را لمس کنید تا آدمک از راهروهای قابل‌عبور به آن برسد.": "Tap a destination room to send the character along a reachable path.",
  "مسیر قابل‌عبوری به این اتاق وجود ندارد.": "No traversable path to this room.",
  "ابتدا یک اتاق مقصد انتخاب کنید.": "Select a destination room first."
};
let active: GameLocale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

interface LocaleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function normalizeLocale(value: unknown): GameLocale {
  return value === 'en' ? 'en' : DEFAULT_LOCALE;
}

export function loadLocale(storage?: Pick<LocaleStorage, 'getItem'>): GameLocale {
  try {
    return normalizeLocale((storage ?? window.localStorage).getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function getLocale(): GameLocale { return active; }

export function t(original: string, values: Record<string, string | number> = {}): string {
  const template = active === 'en' ? (english[original] ?? original) : original;
  return template.replace(/\{([a-z]+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(active === 'fa' ? 'fa-IR' : 'en-US').format(value);
}

export function subscribeLocaleChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setLocale(value: unknown, storage?: Pick<LocaleStorage, 'setItem'>): GameLocale {
  const next = normalizeLocale(value);
  const changed = next !== active;
  active = next;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = next === 'fa' ? 'fa' : 'en';
    document.documentElement.dir = next === 'fa' ? 'rtl' : 'ltr';
  }
  try { (storage ?? window.localStorage).setItem(LANGUAGE_STORAGE_KEY, next); } catch { /* Private browsing. */ }
  if (changed) listeners.forEach((listener) => listener());
  return next;
}

/** Capture original, static DOM strings before the game updates dynamic controls. */
export function mountStaticTranslations(root: ParentNode = document): () => void {
  const textNodes: { node: Text; original: string }[] = [];
  const attributes: { node: Element; name: string; original: string }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    if (text.parentElement?.closest('script, style, textarea, [data-no-i18n]')) continue;
    if (text.data.trim() in english) textNodes.push({ node: text, original: text.data });
  }
  root.querySelectorAll<Element>('[aria-label], [title], [placeholder], [content]').forEach((node) => {
    for (const name of ['aria-label', 'title', 'placeholder', 'content']) {
      const original = node.getAttribute(name);
      if (original && original in english) attributes.push({ node, name, original });
    }
  });
  const render = () => {
    for (const { node, original } of textNodes) {
      if (!node.isConnected) continue;
      const core = original.trim();
      node.data = original.replace(core, t(core));
    }
    for (const { node, name, original } of attributes) {
      if (node.isConnected) node.setAttribute(name, t(original));
    }
  };
  render();
  const unsubscribe = subscribeLocaleChange(render);
  return () => { unsubscribe(); };
}

const dynamicMessages: readonly [RegExp, (parts: RegExpMatchArray) => string][] = [
  [/^مقصد آدمک: (.+)\.$/,
    (m) => 'Character destination: ' + m[1] + '.'],
  [/^طبقهٔ جدید با پرداخت (.+) سکه آزاد شد؛ برای ساخت تکیه‌گاه لازم است\.$/,
    (m) => 'New floor unlocked for ' + m[1] + ' coins. Rooms still need support.'],
  [/^۵۰۰ سکهٔ کمک‌هزینهٔ آزمایشی دریافت شد\.$/,
    () => '500 demo coins claimed.'],
  [/^اتاق (.+) با هزینهٔ (.+) سکه ارتقا یافت\.$/,
    (m) => 'Room ' + m[1] + ' upgraded for ' + m[2] + ' coins.'],
  [/^اتاق ساخته شد\. هزینه: (.+) سکه\.$/,
    (m) => 'Room built. Cost: ' + m[1] + ' coins.'],
  [/^حفاری با هزینهٔ (.+) سکه انجام شد\.$/,
    (m) => 'Excavation completed for ' + m[1] + ' coins.']
];

export function localizeGameMessage(message: string): string {
  if (active === 'fa') return message;
  const suffix = ' (ذخیرهٔ محلی در دسترس نیست)';
  const original = message.endsWith(suffix) ? message.slice(0, -suffix.length) : message;
  let result = english[original] ?? original;
  if (result === original) {
    for (const [pattern, format] of dynamicMessages) {
      const match = original.match(pattern);
      if (match) { result = format(match); break; }
    }
  }
  return result + (message.endsWith(suffix) ? ' (local storage is unavailable)' : '');
}
