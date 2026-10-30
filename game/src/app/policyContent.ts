/**
 * Policies for the current local-first prototype. Keep claims aligned with
 * the shipped code, deployment and mobile manifest before each public release.
 */
import type { GameLocale } from '../i18n';

export interface PolicySection {
  id: string;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
}

export interface PolicyDocument {
  updated: string;
  summary: string;
  sections: readonly PolicySection[];
  contactLabel: string;
  contactNote: string;
}

export const POLICY_UPDATED = '2026-10-31';
export const POLICY_ISSUES_URL = 'https://github.com/abolfazl260/undergroundsurvive-/issues';

const persian: PolicyDocument = {
  updated: 'آخرین بازبینی: ۹ آبان ۱۴۰۵ (۳۱ اکتبر ۲۰۲۶) · مربوط به نسخهٔ فعلی',
  summary: 'این صفحه شرایط استفاده، حریم خصوصی، دسترسی‌های دستگاه و قوانین نسخهٔ فعلی Underground Survive را توضیح می‌دهد. این توضیحات دربارهٔ قابلیت‌هایی است که اکنون در کد بازی وجود دارند؛ ویژگی‌های آینده ممکن است سیاست جداگانه‌ای نیاز داشته باشند.',
  sections: [
    {
      id: 'gameplay',
      title: '۱. قوانین بازی و پیشرفت',
      paragraphs: [
        'Underground Survive یک بازی مدیریت پناهگاه و شبیه‌سازی است. ساخت اتاق، حفاری، امتداد آسانسور، ارتقا، پژوهش و مدیریت منابع بر اساس پیش‌نیازها و موجودی درون بازی انجام می‌شود.',
        'سکه‌ها، منابع و دستاوردهای این نسخه صرفاً امتیاز یا اقلام مجازی بازی هستند. موجودی فعلی به صورت محلی محاسبه می‌شود و اعتبار مالی، دارایی واقعی، قابلیت برداشت یا ارزش قابل‌انتقال به بیرون از بازی ندارد.',
        'وقفه در بازی چرخه‌های شبیه‌سازی را متوقف می‌کند. شروع «بازی جدید» وضعیت پیشرفت پناهگاه را بازنشانی می‌کند؛ این عمل قابل بازگشت از داخل بازی نیست.'
      ]
    },
    {
      id: 'terms',
      title: '۲. شرایط و استفادهٔ مجاز',
      paragraphs: [
        'بازی در وضعیت توسعه و آزمایشی ارائه می‌شود. ممکن است ویژگی‌ها، تعادل اقتصاد، عملکرد و فرمت فایل ذخیره در به‌روزرسانی‌ها تغییر کند؛ پایداری دائمی ذخیره یا دسترس‌پذیری بدون وقفه تضمین نمی‌شود.',
        'بازیکن نباید از نسخهٔ بازی یا زیرساخت میزبانی آن برای دسترسی غیرمجاز، اختلال عمدی در سرویس، انتشار بدافزار یا نقض حقوق دیگران استفاده کند.',
        'تصاویر، موسیقی، کد و سایر محتوا تابع مجوزها و حقوق صاحبان مربوطه هستند. اجرای بازی به معنای اعطای حق فروش یا بازنشر تجاری دارایی‌های آن نیست؛ مجوز دقیق هر دارایی باید جداگانه بررسی شود.'
      ]
    },
    {
      id: 'privacy',
      title: '۳. داده‌ها و حریم خصوصی',
      paragraphs: [
        'در کد فعلی، ایجاد حساب کاربری، ورود با شماره تلفن یا ایمیل، پروفایل آنلاین، چت و ارسال عمدی اطلاعات پیشرفت بازیکن به سرور بازی پیاده‌سازی نشده است. همچنین در کد فعلی SDK اختصاصی تبلیغات یا تحلیل رفتار بازیکن وجود ندارد.',
        'وضعیت پناهگاه، موجودی و تراکنش‌های مجازی، تنظیمات صدا، زبان، کاهش حرکت و جایگاه پیشرفت داستان در localStorage مرورگر یا WebView دستگاه ذخیره می‌شوند. هنگام خطای ذخیره‌سازی ممکن است تغییرات بعد از خروج از بین بروند.',
        'برای نمایش صفحهٔ وب و دریافت فایل‌های بازی و داستان، ارتباط شبکه‌ای با میزبان سایت برقرار می‌شود. همچنین فونت Vazirmatn از Google Fonts بارگذاری می‌شود؛ در نتیجه مرورگر ممکن است اطلاعات فنی مانند نشانی IP و مشخصات درخواست را به میزبان سایت یا سرویس فونت ارسال کند. مدیریت لاگ‌های میزبان و سیاست سرویس ثالث خارج از ذخیره‌سازی محلی بازی است.',
        'کد فعلی برای ردیابی تبلیغاتی کوکی اختصاصی ایجاد نمی‌کند؛ با این حال دربارهٔ کوکی‌ها، لاگ‌ها یا ابزارهای احتمالی سرویس میزبانی نباید بدون بررسی تنظیمات محیط انتشار ادعای قطعی کرد.'
      ]
    },
    {
      id: 'permissions',
      title: '۴. مجوزها و دسترسی‌های دستگاه',
      paragraphs: [
        'دسترسی به اینترنت برای باز کردن نسخهٔ وب و بارگذاری منابع از میزبان و Google Fonts استفاده می‌شود. استفاده از حافظهٔ محلی مرورگر برای ذخیرهٔ بازی است و معمولاً پنجرهٔ درخواست مجوز سیستم‌عامل ندارد.',
        'پخش صدا اختیاری است، پس از تعامل کاربر فعال می‌شود و صرفاً از خروجی صدای دستگاه استفاده می‌کند؛ مجوز میکروفون لازم ندارد.',
        'نسخهٔ وب فعلی درخواست دسترسی به دوربین، میکروفون، موقعیت مکانی، مخاطبان، تصاویر و فایل‌های شخصی یا اعلان‌های دستگاه ندارد. نسخهٔ بسته‌بندی‌شدهٔ اندروید یا هر انتشار آینده باید پیش از انتشار از نظر Android Manifest و مجوزهای افزوده‌شده دوباره بررسی شود.'
      ]
    },
    {
      id: 'controls',
      title: '۵. کنترل اطلاعات و حذف آن‌ها',
      paragraphs: [
        'می‌توانید موسیقی و افکت‌های صوتی را خاموش کنید، زبان را تغییر دهید و حرکت‌های تزئینی را کاهش دهید. این تنظیمات از ذخیرهٔ پیشرفت پناهگاه مستقل هستند.',
        '«بازی جدید» فقط وضعیت بازی را از نو شروع می‌کند و لزوماً زبان، صدا، داده‌های داستان یا نسخهٔ بازیابی‌شدهٔ ذخیره را پاک نمی‌کند.',
        'برای حذف کامل اطلاعات محلی این نسخه، از تنظیمات مرورگر گزینهٔ پاک‌کردن داده‌های سایت / حافظهٔ محلی مربوط به دامنهٔ بازی را انتخاب کنید. پاک‌کردن داده‌ها یا حذف برنامه ممکن است پیشرفت را به‌طور دائمی از دسترس خارج کند؛ همگام‌سازی ابری یا بازیابی حساب در نسخهٔ فعلی وجود ندارد.'
      ]
    },
    {
      id: 'commerce',
      title: '۶. خرید، تبلیغات و سرویس‌های ثالث',
      paragraphs: [
        'در نسخهٔ فعلی خرید درون‌برنامه‌ای با پول واقعی، اشتراک، معاملهٔ سکه با پول واقعی، تبلیغات درون بازی و خدمات چندنفره یا اجتماعی پیاده‌سازی نشده است.',
        'نمایش فایل‌های بازی از میزبان وب و دریافت فونت از Google Fonts وابستگی‌های شبکه‌ای فعلی هستند. اگر در نسخه‌های بعدی پرداخت، تبلیغات، حساب آنلاین، تحلیل‌گر یا سرویس ثالث جدید اضافه شود، توضیحات و رضایت‌های لازم باید پیش از فعال‌سازی به‌روزرسانی شوند.'
      ]
    },
    {
      id: 'safety',
      title: '۷. محتوا، مسئولیت و محدودیت‌ها',
      paragraphs: [
        'داستان بازی شامل موضوعاتی مانند فاجعه، آلودگی، قرنطینه و بقا در شرایط بحرانی است. اطلاعات فنی، پزشکی یا ایمنی در سناریوها جنبهٔ داستانی دارند و نباید برای تصمیم‌های دنیای واقعی به آن‌ها اتکا کرد.',
        'نسخهٔ فعلی سیستم احراز سن یا کنترل والدین داخلی ندارد. والدین و سرپرستان می‌توانند دربارهٔ مناسب بودن محتوای داستانی برای کودک تصمیم بگیرند.',
        'ممکن است باگ، کاهش عملکرد یا از دست رفتن داده رخ دهد. در محدودهٔ مجاز قانون، بازی بدون تضمین عملکرد بی‌نقص ارائه می‌شود؛ این توضیح حقوقی، حقوق الزامی مصرف‌کننده را محدود نمی‌کند.'
      ]
    },
    {
      id: 'updates',
      title: '۸. تغییر سیاست‌ها و گزارش مشکل',
      paragraphs: [
        'این متن برای نسخهٔ موجود در تاریخ ذکرشده نوشته شده است. تغییر در زیرساخت، سرویس‌های خارجی یا دسترسی‌ها باید همراه با بازبینی تاریخ و متن این صفحه انجام شود.',
        'برای گزارش نقص یا سؤال دربارهٔ سیاست‌ها می‌توانید از صفحهٔ Issues مخزن عمومی پروژه استفاده کنید. گزارش‌ها عمومی هستند؛ رمز عبور، شماره تلفن، اطلاعات خصوصی یا دادهٔ حساس را در آن‌ها قرار ندهید.'
      ]
    }
  ],
  contactLabel: 'گزارش مشکل یا درخواست شفاف‌سازی در GitHub',
  contactNote: 'لینک به یک صفحهٔ عمومی در خارج از بازی باز می‌شود.'
};

const english: PolicyDocument = {
  updated: 'Last reviewed: October 31, 2026 · Current version only',
  summary: 'This page explains the current Underground Survive game rules, terms, privacy practices and device access. It describes features currently present in the code; future features may require revised policies.',
  sections: [
    {
      id: 'gameplay',
      title: '1. Game rules and progress',
      paragraphs: [
        'Underground Survive is a shelter-management simulation. Construction, excavation, elevator extensions, upgrades, research and resource management depend on in-game prerequisites and available resources.',
        'Coins, resources and achievements in this version are virtual game values only. Local balances are not money, transferable property or redeemable for real-world value.',
        'Pausing stops simulation cycles. Starting a new game resets shelter progress; it cannot be undone from within the game.'
      ]
    },
    {
      id: 'terms',
      title: '2. Terms of use',
      paragraphs: [
        'This is a work-in-progress prototype. Features, economy balance, performance and save formats may change. Permanent save compatibility and uninterrupted availability are not guaranteed.',
        'Do not use the game or its hosting infrastructure to gain unauthorized access, intentionally disrupt service, distribute malware or violate others’ rights.',
        'Artwork, audio, code and other assets remain subject to their respective owners’ rights and licenses. Playing the game does not grant permission to commercially resell or redistribute its assets; check each applicable license.'
      ]
    },
    {
      id: 'privacy',
      title: '3. Privacy and data',
      paragraphs: [
        'The current code does not implement accounts, email/phone sign-in, online player profiles, chat, or intentional upload of player progress to a game server. No dedicated in-game advertising or player analytics SDK is present in the current code.',
        'Your shelter state, virtual balances and transactions, sound and language preferences, reduced-motion preference and story position are stored in browser/WebView localStorage. If local storage fails, later changes may not persist.',
        'Opening the web game and loading its assets or story files involves requests to the website host. The Vazirmatn font is loaded from Google Fonts, so browsers may disclose technical request data such as IP address to the host and font provider. Host logs and the provider’s own practices are outside the game’s local-save functionality.',
        'The current game code does not set its own advertising-tracking cookies. Cookies, server logs or other services configured by the deployment host should be verified separately before making broader promises.'
      ]
    },
    {
      id: 'permissions',
      title: '4. Device access and permissions',
      paragraphs: [
        'Network access is used to load the web game and assets from the host and Google Fonts. Local browser storage saves your progress and usually does not trigger a system permission prompt.',
        'Audio playback is optional and begins after user interaction. It uses speaker output only and does not require microphone access.',
        'The current web version does not request access to the camera, microphone, location, contacts, personal photos or files, or notifications. Before releasing a packaged Android build, its Android Manifest and any additional permissions must be audited separately.'
      ]
    },
    {
      id: 'controls',
      title: '5. Your choices and local-data deletion',
      paragraphs: [
        'You can disable music and sound effects, change language and reduce decorative motion. These preferences are stored separately from shelter progress.',
        '“New game” resets game progress but does not necessarily erase language, audio settings, story progress or a retained recovery copy of a corrupted save.',
        'To remove all local data for this version, use your browser’s site-data/local-storage clearing controls for the game origin. Clearing site data or uninstalling the application can permanently remove progress; there is currently no cloud sync or account-based recovery.'
      ]
    },
    {
      id: 'commerce',
      title: '6. Purchases, ads and third parties',
      paragraphs: [
        'The current version does not implement real-money in-app purchases, subscriptions, real-money coin exchanges, in-game ads, multiplayer or social services.',
        'The current network dependencies include the website host and Google Fonts. Introducing payments, advertising, accounts, analytics or other third-party integrations will require a review of this notice and any applicable user consents before deployment.'
      ]
    },
    {
      id: 'safety',
      title: '7. Content, safety and limitations',
      paragraphs: [
        'The fictional story includes catastrophe, contamination, quarantine and survival themes. Fictional medical, technical or emergency information is not real-world safety guidance.',
        'The current version has no built-in age-verification or parental-control system. Guardians should assess whether the themes are appropriate for children.',
        'Bugs, performance problems and data loss may occur. To the extent legally permitted, the prototype is provided without a guarantee of error-free operation; mandatory consumer rights are unaffected.'
      ]
    },
    {
      id: 'updates',
      title: '8. Policy revisions and support',
      paragraphs: [
        'This notice describes the build as reviewed on the date above. Changes to hosting, external services or permissions require this page and its review date to be updated.',
        'For questions or bug reports, use the public GitHub Issues page. Reports are public: never include passwords, phone numbers, private records or sensitive personal data.'
      ]
    }
  ],
  contactLabel: 'Report an issue or request clarification on GitHub',
  contactNote: 'This link opens a public page outside the game.'
};

export function getPolicyDocument(locale: GameLocale): PolicyDocument {
  return locale === 'en' ? english : persian;
}

/** DOM-only rendering: all policy copy is inserted as text, never HTML. */
export function renderPolicyContent(container: HTMLElement, locale: GameLocale): void {
  const policy = getPolicyDocument(locale);
  const meta = document.createElement('p');
  meta.className = 'menu-policy-meta';
  meta.textContent = policy.updated;
  const intro = document.createElement('p');
  intro.className = 'menu-policy-intro';
  intro.textContent = policy.summary;
  const articles = policy.sections.map(({ id, title, paragraphs, bullets }) => {
    const section = document.createElement('section');
    section.className = 'menu-policy-section';
    section.id = 'menu-policy-' + id;
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.append(heading);
    paragraphs.forEach((value) => {
      const p = document.createElement('p');
      p.textContent = value;
      section.append(p);
    });
    if (bullets?.length) {
      const ul = document.createElement('ul');
      bullets.forEach((value) => {
        const li = document.createElement('li');
        li.textContent = value;
        ul.append(li);
      });
      section.append(ul);
    }
    return section;
  });
  const footer = document.createElement('div');
  footer.className = 'menu-policy-contact';
  const link = document.createElement('a');
  link.href = POLICY_ISSUES_URL;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = policy.contactLabel;
  const note = document.createElement('p');
  note.textContent = policy.contactNote;
  footer.append(link, note);
  container.replaceChildren(meta, intro, ...articles, footer);
}
