/** Informational, versioned product policy copy for the current offline-first prototype.
 * These descriptions must be audited before adding accounts, networking, ads,
 * payment processing or new Android permissions.
 */
import type { GameLocale } from '../i18n';

export const POLICY_UPDATED_AT = '2026-10-31';
export type PolicySectionId = 'gameplay' | 'terms' | 'privacy' | 'permissions' | 'support';

export interface PolicyItem {
  heading: string;
  description: string;
}

export interface PolicySection {
  id: PolicySectionId;
  title: string;
  description: string;
  items: PolicyItem[];
}

export interface PolicyContent {
  introduction: string;
  versionLabel: string;
  notice: string;
  sections: PolicySection[];
}

const fa: PolicyContent = {
  introduction: 'این صفحه قواعد بازی، نحوهٔ استفاده از نسخهٔ آزمایشی و دسترسی‌های نرم‌افزار را توضیح می‌دهد. اطلاعات زیر بر اساس امکانات فعلی نسخهٔ وب و زیرساخت اندروید نوشته شده است.',
  versionLabel: 'آخرین بازبینی: ۱۰ آبان ۱۴۰۵ (۳۱ اکتبر ۲۰۲۶) · نسخهٔ آزمایشی',
  notice: 'این اطلاعات مخصوص نسخهٔ فعلی است و جایگزین بررسی حقوقی و سیاست رسمی حریم خصوصی پیش از انتشار عمومی یا تجاری نیست.',
  sections: [
    {
      id: 'gameplay', title: 'قوانین و محدودیت‌های بازی',
      description: 'شرایط ساخت‌وساز و پیشرفت در پناهگاه',
      items: [
        { heading: 'ساخت‌وساز زیرزمینی', description: 'در نسخهٔ فعلی امکان ساخت اتاق جدید روی سطح زمین وجود ندارد. محل ساخت باید در محدودهٔ نقشه، حفاری‌شده، خالی و مطابق قواعد برخورد و پشتیبانی اتاق‌ها باشد.' },
        { heading: 'اتصال اتاق‌ها', description: 'اتاق تازه باید از کنار به آسانسور یا شبکهٔ اتاق‌های متصل به آن وصل باشد؛ اتاق مجزا با فاصله یا اتصال صرفاً گوشه‌ای قابل ساخت نیست. حذف یا جابه‌جایی اتاق نباید شبکهٔ متصل را قطع کند.' },
        { heading: 'آسانسور و طبقات', description: 'گسترش عمودی طبقات از طریق امتداد شفت آسانسور انجام می‌شود. بدون بازکردن مسیر آسانسور نمی‌توان طبقهٔ جدید را صرفاً از منو اضافه کرد.' },
        { heading: 'منابع و پیشرفت', description: 'ساخت، حفاری، ارتقا و فعالیت بعضی سامانه‌ها سکه یا منابع بازی مصرف می‌کند. برق، آب، غذا، هوا و چرخه‌های تولید می‌توانند کارایی اتاق‌ها را محدود کنند. میزان هزینه و ظرفیت مطابق نسخهٔ بازی تغییرپذیر است.' },
        { heading: 'ارتقا و تصمیم‌های بازیکن', description: 'ارتقای اتاق‌ها تا سقف تعیین‌شدهٔ همین نسخه و در صورت تأمین پیش‌نیازها و هزینه امکان‌پذیر است. حذف اتاق، شروع بازی جدید و تغییرات ساخت‌وساز ممکن است بخشی از پیشرفت را از بین ببرد.' }
      ]
    },
    {
      id: 'terms', title: 'شرایط استفاده و محتوای بازی',
      description: 'دامنهٔ نسخهٔ آزمایشی و وضعیت امتیازها',
      items: [
        { heading: 'وضعیت محصول', description: 'Underground Survive در حال توسعه است. برخی قابلیت‌ها، تعادل اقتصادی، تصویرها، سناریوها و قوانین ممکن است بدون حفظ رفتار پیشین تغییر کنند؛ پایداری تمام قابلیت‌های آزمایشی تضمین نمی‌شود.' },
        { heading: 'سکه و پاداش مجازی', description: 'سکه، منابع و دستاوردها فقط برای پیشرفت در بازی هستند؛ در نسخهٔ فعلی خرید با پول واقعی، برداشت وجه، تبدیل به پول یا انتقال دارایی بین حساب‌ها وجود ندارد.' },
        { heading: 'حساب و رقابت آنلاین', description: 'در نسخهٔ بررسی‌شده ورود به حساب کاربری، رتبه‌بندی سروری و همگام‌سازی ابری فعال نیست. داده‌های ذخیره‌شده روی دستگاه معیار حسابداری آنلاین یا مالکیت مالی محسوب نمی‌شوند.' },
        { heading: 'داستان و محتوا', description: 'روایت آلودگی، پناهگاه‌ها، رخدادها و شخصیت‌ها داستانی‌اند. نمایش این محتوا به معنای ارائهٔ توصیهٔ واقعی در حوزهٔ بحران، سلامت یا ایمنی نیست.' },
        { heading: 'حقوق محتوا و بازنشر', description: 'وجود فایل‌های بازی در یک مخزن عمومی به‌تنهایی مجوز استفادهٔ تجاری یا بازنشر دارایی‌های تصویری و صوتی نیست. مجوزهای انتشار و حقوق صاحبان محتوا باید جداگانه بررسی شوند.' }
      ]
    },
    {
      id: 'privacy', title: 'حریم خصوصی و مدیریت داده‌ها',
      description: 'چه چیزی ذخیره می‌شود و چگونه می‌توان آن را پاک کرد',
      items: [
        { heading: 'اطلاعات نگهداری‌شده', description: 'پیشرفت پناهگاه، موقعیت اتاق‌ها و بازماندگان، منابع، سکه و تاریخچهٔ تراکنش‌های بازی در ذخیرهٔ محلی نگهداری می‌شوند. زبان، وضعیت صدا و گزینهٔ کاهش حرکت نیز جداگانه ذخیره می‌شوند.' },
        { heading: 'روش ذخیره‌سازی', description: 'این داده‌ها در فضای localStorage مرورگر یا WebView برنامه روی همان دستگاه ذخیره می‌شوند. بازی برای این قابلیت حساب کاربری، رمز عبور، نام واقعی یا شمارهٔ تلفن درخواست نمی‌کند.' },
        { heading: 'ارسال داده و میزبان وب', description: 'کد فعلی برای ذخیرهٔ پیشرفت، اطلاعات را به سرور حساب کاربری ارسال نمی‌کند و سامانهٔ تحلیل رفتار بازیکن در آن پیاده‌سازی نشده است. با این حال، میزبان وب یا ارائه‌دهندهٔ شبکه ممکن است مانند هر وب‌سایت دیگری اطلاعات فنی اتصال را طبق سیاست خود پردازش کند.' },
        { heading: 'بازیابی و نسخهٔ پشتیبان', description: 'اگر ذخیرهٔ محلی نامعتبر تشخیص داده شود، ممکن است نسخه‌ای از دادهٔ قبلی با کلید بازیابی محلی نگه داشته شود. این نسخهٔ پشتیبان ابری نیست و پاک‌سازی داده‌های سایت آن را نیز از بین می‌برد.' },
        { heading: 'حذف داده‌ها', description: 'برای حذف ذخیره‌ها و تنظیمات، داده‌های همین وب‌سایت را در تنظیمات مرورگر پاک کنید؛ در اندروید نیز می‌توانید داده‌های برنامه را از تنظیمات سیستم حذف کنید. پاک‌کردن داده‌ها یا حذف برنامه ممکن است پیشرفت را به‌طور غیرقابل‌بازگشت از بین ببرد.' },
        { heading: 'انتقال بین دستگاه‌ها', description: 'ذخیرهٔ مرورگر، نسخهٔ وب منتشرشده و برنامهٔ اندروید به‌طور خودکار با یکدیگر همگام نمی‌شوند. هنگام تعویض دستگاه یا پاک‌کردن مرورگر ممکن است پیشرفت از دست برود.' }
      ]
    },
    {
      id: 'permissions', title: 'مجوزهای دسترسی به دستگاه',
      description: 'دسترسی‌های موردنیاز و دسترسی‌هایی که درخواست نمی‌شوند',
      items: [
        { heading: 'حافظهٔ محلی', description: 'ذخیره و خواندن localStorage برای ادامهٔ بازی استفاده می‌شود. این کار معادل دسترسی به عکس‌ها، فایل‌های شخصی یا حافظهٔ عمومی دستگاه نیست و معمولاً پنجرهٔ اجازهٔ جداگانه ندارد.' },
        { heading: 'اتصال اینترنت', description: 'برای دریافت نسخهٔ وب و فایل‌های آن اتصال شبکه لازم است؛ نسخهٔ بسته‌بندی‌شدهٔ اندروید فایل‌های بازی را درون برنامه دارد. وجود مجوز فنی اینترنت در خروجی نهایی اندروید باید از روی AndroidManifest همان خروجی بررسی شود.' },
        { heading: 'صدا', description: 'بازی از قابلیت پخش صدای مرورگر یا دستگاه استفاده می‌کند و پخش معمولاً پس از لمس یا کلیک فعال می‌شود. پخش صدا به مجوز میکروفون یا ضبط صدا نیاز ندارد.' },
        { heading: 'دوربین، میکروفون و مکان', description: 'نسخهٔ فعلی هیچ درخواست دسترسی به دوربین، ضبط میکروفون یا موقعیت مکانی دقیق ندارد و این موارد برای بازی ضروری نیستند.' },
        { heading: 'مخاطبان و رسانه‌های شخصی', description: 'نسخهٔ فعلی به دفترچهٔ مخاطبان، پیامک، تماس‌ها، تصاویر، ویدیوها یا فایل‌های شخصی دستگاه درخواست دسترسی نمی‌دهد.' },
        { heading: 'اعلان‌ها و دسترسی پس‌زمینه', description: 'اعلان پوش، خواندن شناسهٔ تبلیغاتی، ردیابی موقعیت در پس‌زمینه و دسترسی به حسگرهای حساس در قابلیت‌های فعلی بازی پیاده‌سازی نشده‌اند. پیش از انتشار نسخهٔ بومی باید مجوزهای نهایی دوباره ممیزی شوند.' }
      ]
    },
    {
      id: 'support', title: 'امنیت، پشتیبانی و تغییر سیاست‌ها',
      description: 'محدودیت‌های نسخهٔ فعلی و مسیر گزارش مشکل',
      items: [
        { heading: 'امنیت ذخیره‌ها', description: 'اطلاعات localStorage برای ذخیرهٔ شخصی و آفلاین است و مانع فنی دستکاری موجودی یا پیشرفت توسط کاربر دستگاه نیست. این داده‌ها نباید برای خرید، رقابت یا امتیازدهی مالی آنلاین مبنا قرار گیرند.' },
        { heading: 'مشکلات و گزارش‌ها', description: 'برای گزارش باگ، پیشنهاد یا مشکل دسترسی می‌توان از بخش Issues مخزن رسمی پروژه در GitHub استفاده کرد. در گزارش عمومی، اطلاعات شخصی، گذرواژه یا محتوای خصوصی ذخیره‌ها را منتشر نکنید.' },
        { heading: 'دسترسی‌های جدید', description: 'اگر در نسخه‌های بعدی حساب آنلاین، پرداخت، تبلیغات، تحلیل رفتار، اعلان یا مجوزهای حساس اضافه شود، باید پیش از فعال‌سازی، این صفحه و سیاست رسمی به‌روزرسانی و دلیل دسترسی به کاربر اعلام شود.' },
        { heading: 'تغییر قوانین', description: 'تاریخ آخرین بازبینی در همین صفحه نمایش داده می‌شود. تغییر مهم در شیوهٔ پردازش داده یا دسترسی‌های دستگاه نیازمند اطلاع‌رسانی روشن در نسخهٔ مربوطه است.' }
      ]
    }
  ]
};

const en: PolicyContent = {
  introduction: 'This page explains game rules, prototype terms, local data handling and device permissions. It describes the current web build and Android preparation, not unreleased features.',
  versionLabel: 'Last reviewed: October 31, 2026 · Prototype',
  notice: 'This information describes the current build. It is not a substitute for legal review or a finalized privacy notice before a public or commercial release.',
  sections: [
    {
      id: 'gameplay', title: 'Game rules and limitations',
      description: 'Construction and shelter progression',
      items: [
        { heading: 'Underground construction', description: 'New construction is limited to underground floors. Each location must be within the map, excavated, empty and valid under collision and structural support rules.' },
        { heading: 'Connected rooms', description: 'New rooms must connect edge-to-edge to the elevator or another room connected to it. Isolated rooms and corner-only contact are not valid. Moving or removing a room may not break an existing connected network.' },
        { heading: 'Elevators and floors', description: 'Vertical expansion uses a continuous elevator shaft. A new floor cannot simply be unlocked from a menu without extending elevator access.' },
        { heading: 'Resources and progression', description: 'Construction, digging, upgrades and some equipment consume in-game coins or resources. Power, water, food, air and timed production can affect room output. Costs and capacities may change between builds.' },
        { heading: 'Upgrades and irreversible actions', description: 'Rooms can be upgraded only up to the current level cap and when prerequisites and costs are met. Demolition, a new game and layout changes can erase part of your progress.' }
      ]
    },
    {
      id: 'terms', title: 'Terms of use and content',
      description: 'Prototype scope and virtual rewards',
      items: [
        { heading: 'Development status', description: 'Underground Survive is under active development. Features, game balance, imagery, stories and rules may change. Experimental functionality is not guaranteed to remain stable.' },
        { heading: 'Virtual coins and rewards', description: 'Coins, resources and achievements are gameplay-only. The current build does not support real-money purchases, cash-out, currency redemption or transfers between accounts.' },
        { heading: 'Accounts and online competition', description: 'This build does not provide account login, server-backed rankings or cloud syncing. Local save data is not an authoritative financial or online ownership record.' },
        { heading: 'Fictional content', description: 'The contamination scenario, shelters, incidents and characters are fictional and must not be relied on as real-world emergency, medical or safety advice.' },
        { heading: 'Copyright and reuse', description: 'A publicly accessible source repository does not itself grant permission to redistribute or commercially reuse artwork, sound or other assets. Publication rights and applicable licenses must be checked separately.' }
      ]
    },
    {
      id: 'privacy', title: 'Privacy and saved data',
      description: 'Stored information, retention and deletion',
      items: [
        { heading: 'Stored game information', description: 'The local save may contain shelter progression, room and survivor positions, resources, coins and in-game transaction history. Language, audio preferences and reduced-motion preference are saved separately.' },
        { heading: 'Where data is stored', description: 'Data is stored in localStorage inside your browser or app WebView on this device. Saving progress does not require an account, password, real name or phone number.' },
        { heading: 'Data transmission and hosting', description: 'The current game code does not upload saved progress to an account server and does not implement an in-game analytics service. Website hosts and network providers may separately process technical connection logs under their own policies.' },
        { heading: 'Recovery copies', description: 'When a malformed save is detected, an earlier version may be retained under a local recovery key. This is not a cloud backup; clearing website data removes it as well.' },
        { heading: 'Deleting local data', description: 'Clear this site’s data in your browser settings, or clear app data in Android settings. Uninstalling or deleting stored data can permanently remove your progress.' },
        { heading: 'Across devices', description: 'Web, hosted browser and Android app saves do not sync automatically. Changing devices or clearing browser storage can cause loss of progress.' }
      ]
    },
    {
      id: 'permissions', title: 'Device permissions',
      description: 'What the app uses and does not request',
      items: [
        { heading: 'Local storage', description: 'The app reads and writes localStorage to resume progress. This is not access to personal photos, documents or general device storage and usually does not require a separate OS permission prompt.' },
        { heading: 'Network access', description: 'The web edition needs network access to load the site and assets; the packaged Android edition bundles game files. Any technical Internet permission in a final Android package must be verified against that build’s AndroidManifest.' },
        { heading: 'Audio playback', description: 'The game plays sound using device or browser audio, typically after a user interaction. Playback does not require microphone or audio-recording permission.' },
        { heading: 'Camera, microphone and location', description: 'The current build does not request camera access, microphone recording or precise location. They are not needed to play.' },
        { heading: 'Contacts and personal media', description: 'The current build does not request contacts, SMS, phone calls, personal photos, videos or personal files.' },
        { heading: 'Notifications and background access', description: 'Push notifications, advertising-ID access, background location tracking and sensitive sensor access are not implemented. Final native app permissions must be audited before distribution.' }
      ]
    },
    {
      id: 'support', title: 'Security, support and revisions',
      description: 'Important safeguards and future changes',
      items: [
        { heading: 'Local save security', description: 'Local storage is intended for personal/offline play and is not tamper-proof. Its values must not be relied upon for real-money transactions or competitive server-side scoring.' },
        { heading: 'Reporting an issue', description: 'Bug reports, accessibility problems and suggestions can be submitted using GitHub Issues in the project repository. Do not post passwords, personal details or private save contents in public issues.' },
        { heading: 'New permissions or services', description: 'If future releases introduce cloud accounts, purchases, ads, analytics, notifications or sensitive permissions, this information and the formal policy must be updated before activation, with clear explanations.' },
        { heading: 'Policy revisions', description: 'The review date appears on this page. Material changes to device access or data processing require clear notice in the relevant game release.' }
      ]
    }
  ]
};

export function getPolicyContent(locale: GameLocale): PolicyContent {
  return locale === 'en' ? en : fa;
}
