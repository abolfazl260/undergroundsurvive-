# ساخت دستی نسخهٔ امضاشده Android (APK / AAB)

این قابلیت فقط Android را هدف می‌گیرد. کد بازی از `game/` با Vite ساخته، توسط Capacitor 8 به پروژهٔ بومی Android تبدیل و با کلید اختصاصی Release امضا می‌شود. **هیچ build یا انتشار خودکاری برای نسخهٔ امضاشده وجود ندارد.** Workflow فقط رویداد `workflow_dispatch` دارد، صرفاً روی شاخهٔ `main` اجرا می‌شود و هیچ Release یا انتشار فروشگاهی ایجاد نمی‌کند.

## پیش‌نیاز امضا (یک‌بار)

1. شناسهٔ برنامه در `game/capacitor.config.json` فعلاً `com.undergroundsurvive.game` است؛ قبل از اولین انتشار رسمی دربارهٔ شناسه تصمیم قطعی بگیرید.
2. یک کلید امضای اختصاصی بسازید. نمونهٔ زیر را روی دستگاه مطمئن اجرا کنید (فایل کلید در Git قرار نمی‌گیرد):

   ```bash
   keytool -genkeypair -v \
     -keystore underground-release.jks \
     -storetype JKS \
     -alias underground-upload \
     -keyalg RSA -keysize 3072 -validity 10000
   ```

3. فایل `.jks`، نام مستعار، گذرواژهٔ keystore و گذرواژهٔ کلید را در فضای امن و به همراه نسخهٔ پشتیبان رمزگذاری‌شده نگه دارید. **گم‌شدن یا تعویض بدون برنامه‌ریزی کلید امضا می‌تواند به‌روزرسانی برنامه را مختل کند.** برای Google Play، در صورت فعال‌بودن Play App Signing، این کلید می‌تواند *upload key* باشد و کلید امضای توزیع توسط Google مدیریت شود.
4. فایل keystore را فقط روی دستگاه مورد اعتماد به Base64 تبدیل کنید:
   
   ```bash
   # Linux
   base64 -w 0 underground-release.jks

   # macOS
   base64 < underground-release.jks | tr -d '\n'
   ```

   خروجی Base64 رمزنگاری نیست؛ باید مثل کلید خصوصی محرمانه نگهداری شود.

## پیکربندی GitHub Secrets

در مخزن به **Settings → Secrets and variables → Actions → New repository secret** بروید و چهار Secret زیر را بسازید:

| Secret | مقدار |
| --- | --- |
| `ANDROID_SIGNING_KEYSTORE_BASE64` | کل محتوای Base64 فایل keystore، بدون شکست خط |
| `ANDROID_SIGNING_STORE_PASSWORD` | گذرواژهٔ keystore |
| `ANDROID_SIGNING_KEY_ALIAS` | alias کلید (در مثال: `underground-upload`) |
| `ANDROID_SIGNING_KEY_PASSWORD` | گذرواژهٔ کلید، حتی اگر با گذرواژهٔ keystore یکسان است |

هیچ Secret یا فایل keystore را در Issue، Pull Request، لاگ، کد یا پیوست عمومی ارسال نکنید. Workflow فقط هنگام اجرای دستی Secretها را دریافت می‌کند؛ فایل موقت keystore با دسترسی محدود در runner ساخته و در پایان حذف می‌شود. خود runner نیز موقتی است.

## ساخت دستی

1. بعد از ادغام این تغییرات در `main`، صفحهٔ **Actions** مخزن را باز کنید.
2. Workflow با نام **Build signed Android release (manual only)** را انتخاب کنید.
3. روی **Run workflow** بزنید و **Branch: main** را انتخاب کنید. روی برنچ دیگر، job امضا اجرا نمی‌شود.
4. `artifact_format` را انتخاب کنید: `apk`، `aab` یا `both` (پیش‌فرض).
5. `version_code` را به‌صورت عدد صحیح مثبت وارد کنید؛ برای هر آپلود جدید در Google Play نسبت به نسخهٔ قبلی افزایش دهید. `version_name` مثل `0.1.0` است و فقط حروف لاتین، عدد، `.`، `_` و `-` را می‌پذیرد.
6. Workflow را به‌صورت دستی اجرا کنید و نتیجهٔ مرحله‌های build و verification را بررسی کنید.
7. از بخش **Artifacts** اجرای موفق، بستهٔ `underground-survive-android-signed-<run_number>` را دریافت کنید. داخل بسته فایل(های) `-signed.apk` / `-signed.aab` و `SHA256SUMS` قرار دارد. نگهداری Artifacts تا **۱۴ روز** است.

**APK** برای نصب آزمایشی مستقیم مناسب است؛ **AAB** فرمت توزیع از طریق فروشگاه است و معمولاً مستقیماً مانند APK نصب نمی‌شود. وجود فایل امضاشده به‌تنهایی به معنی انتشار در Play Store یا تأیید گوگل نیست. برای نصب/انتشار باید نصب روی دستگاه واقعی، آیکون، سازگاری نسخه و الزام‌های فروشگاه جداگانه بررسی شوند.

## مراحل فنی و حفاظت‌ها

- نسخهٔ وب با `npm run mobile:prepare:android` ساخته و اعتبارسنجی می‌شود؛ فقط Android، بدون build یا test مربوط به iOS.
- `scripts/configure-android-release.mjs` روی `android/app/build.gradle` تولیدشده یک block تکرارپذیر برای `versionCode`، `versionName` و `signingConfigs.release` اعمال می‌کند. مقادیر رمز فقط در زمان build از environment خوانده می‌شوند و هیچ گذرواژه‌ای در Gradle ذخیره نمی‌شود.
- `assembleRelease` برای APK و `bundleRelease` برای AAB استفاده می‌شوند؛ تولید بستهٔ debug با بستهٔ signed release اشتباه گرفته نمی‌شود.
- APK با `apksigner verify` و AAB با `jarsigner -verify` بررسی می‌شود. در صورت نبود کلید، اشتباه بودن نسخه، نبود فایل خروجی یا شکست اعتبارسنجی امضا، Artifact انتشار بارگذاری نمی‌شود.
- `permissions: contents: read`، محدودیت اجرای job به `main`، نبود trigger خودکار و حذف فایل موقت keystore، ریسک انتشار و افشای کلید را کاهش می‌دهند.
- پروژهٔ بومی `game/android/` همچنان با `.gitignore` کنترل و از ابتدا تولید می‌شود. برای توسعهٔ بومی دائمی باید در آینده روش نگهداری پروژه تجدیدنظر شود.

## محدودیت‌ها

- کلید و Secretها توسط مالک مخزن باید ساخته و تنظیم شوند؛ بدون آن‌ها خروجی امضاشده ساخته نمی‌شود.
- تا اجرای واقعی Workflow روی `main` با Secretهای معتبر و تست روی دستگاه، موفقیت بیلد/نصب واقعی تأیید نشده است.
- کنترل خودکار افزایش `versionCode` نسبت به نسخه‌های قبلی Play Store وجود ندارد؛ مسئولیت انتخاب عدد تکرارنشده با اجراکننده است.
- `npm install` به‌دلیل نبود lockfile فعلی کاملاً deterministic نیست؛ ثبت lockfile و استفاده از `npm ci` می‌تواند در مرحلهٔ بعد بازتولیدپذیری را افزایش دهد.
- صدور نسخهٔ عمومی، بارگذاری در Google Play، امضای iOS و ساخت IPA در دامنهٔ این Workflow نیستند.

برای خروجی debug فعلی، Workflow مستقل `Capacitor Android checks` همچنان دستی باقی می‌ماند.
