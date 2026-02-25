# مستندات نهایی پروژه V2Ray Config Manager (Full Document)

## ۱. معرفی و اهداف پروژه
پروژه **V2Ray Config Manager** یک اپلیکیشن اندرویدی حرفه‌ای مبتنی بر React Native (Expo) است که برای مدیریت، تست و اتصال به کانفیگ‌های VPN طراحی شده است. این اپلیکیشن با حذف لایه‌های واسط، مستقیماً با Cloudflare Workers در ارتباط است و تمامی پردازش‌های حساس از جمله تست و اتصال را در سمت کلاینت انجام می‌دهد.

### اهداف محقق شده:
- **معماری Serverless:** حذف کامل بک‌اِند FastAPI و دیتابیس MongoDB و جایگزینی با ارتباط مستقیم Worker.
- **اتصال واقعی (Real Tunneling):** طراحی و آماده‌سازی زیرساخت Native Bridge برای برقراری اتصال واقعی VPN.
- **تست حرفه‌ای (Real Delay):** پیاده‌سازی متد تست تاخیر واقعی در لایه اپلیکیشن.
- **مدیریت اشتراک پیشرفته:** سیستم هوشمند دریافت آمار مصرف و زمان باقی‌مانده از طریق کد اشتراک یا QR Code.
- **رابط کاربری مدرن:** طراحی الهام گرفته از WARP و Windscribe با تم تاریک و انیمیشن‌های روان.

---

## ۲. معماری نهایی سیستم

### کلاینت (Android App):
- **Core:** React Native 0.81.5 + Expo SDK 54.
- **State Management:** Zustand (برای پایداری و سرعت بالای دسترسی به داده‌ها).
- **Communication:** apiService (ارتباط مستقیم با Cloudflare Worker).
- **Testing:** testService (اجرای تست‌های غیرمسدودکننده در دسته‌های ۱۰ تایی).
- **Parsing:** parser.ts (پشتیبانی کامل از VLESS, VMess, Trojan, Shadowsocks).

### بک‌اِند (Cloudflare Worker):
- **Storage:** KV Storage برای نگهداری هزاران کانفیگ رتبه‌بندی شده.
- **Endpoints:**
  - `/api/configs`: دریافت کانفیگ‌های عمومی.
  - `/api/user-sub`: دریافت دیتای اختصاصی کاربر.
  - `/dashboard/api/vote`: سیستم ثبت امتیاز برای بهبود کیفیت کلی.

---

## ۳. ویژگی‌های فنی پیاده‌سازی شده

### ۳.۱ مدیریت اشتراک (Subscription Tab)
کاربران می‌توانند با وارد کردن کد `AdminID-ClientID` اطلاعات زیر را مشاهده کنند:
- نمودار مصرف حجم (Used vs Total).
- تعداد روزهای باقی‌مانده از اعتبار.
- تعداد کاربران متصل به همان اشتراک.
- اسکنر QR داخلی برای سهولت در افزودن اشتراک.

### ۳.۲ صفحه اتصال هوشمند (Smart Connect)
- نمایش وضعیت ایمنی اتصال.
- دکمه Power بزرگ با Glow Effect بر اساس وضعیت اتصال.
- انتخاب خودکار بهترین سرور بر اساس کمترین پینگ تست شده توسط کلاینت.

---

## ۴. راهنمای توسعه و بیلد (Build Guide)

### ۴.۱ پیش‌نیازها
- نصب Node.js و Yarn.
- تنظیم فایل `.env` در پوشه `frontend` شامل `EXPO_PUBLIC_WORKER_URL`.

### ۴.۲ بیلد Native برای اتصال واقعی
با توجه به استفاده از Native Modules برای اتصال واقعی، برنامه باید با استفاده از دستور زیر به صورت Development Build اجرا یا بیلد شود:
```bash
npx expo prebuild
# سپس بیلد با Android Studio یا EAS Build
```

---

## ۵. ساختار پوشه‌بندی نهایی
```
frontend/
├── app/
│   ├── (tabs)/              # صفحات اصلی (Home, Configs, Subscription, Settings)
│   ├── constants/           # ثابت‌های رنگی و API
│   ├── store/               # مدیریت حالت (useAppStore.ts)
│   ├── services/            # سرویس‌های API و تست (apiService, testService)
│   ├── utils/               # توابع پارسر و لینک‌ها
│   └── types/               # تعاریف TypeScript
```

---
*پایان مستندات - تمامی حقوق برای V2Ray Manager محفوظ است.*
