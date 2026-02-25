## نسخه 1.0 - تحلیل کامل وضعیت فعلی و نقشه راه

---

## 1. معرفی پروژه

**نام پروژه:** V2Ray Config Manager  
**نوع:** اپلیکیشن موبایل (Android) - React Native + Expo  
**پشتیبان (Backend):** FastAPI (Python) + MongoDB + Cloudflare Worker (VPN Config Bot Pro)  
**هدف:** دریافت، تست، مدیریت و اتصال به کانفیگ‌های VPN بر پایه پروتکل‌های V2Ray (VLESS/VMess/Trojan/Shadowsocks)  
**مخاطب:** کاربران ایرانی نیازمند دور زدن فیلترینگ  

---

## 2. معماری کلی سیستم

```
┌─────────────────────────────────────────────────────────────┐
│                   اپلیکیشن Expo/React Native                │
│  index.tsx  |  configs.tsx  |  settings.tsx                │
└──────────────────────┬──────────────────────────────────────┘
                       │  HTTP API
┌──────────────────────▼──────────────────────────────────────┐
│              FastAPI Backend (server.py)                    │
│  - دریافت و parse کانفیگ‌ها از subscription URL             │
│  - تست TCP connectivity هر کانفیگ                          │
│  - ذخیره نتایج در MongoDB                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ (در حال حاضر مستقیم - باید از API استفاده شود)
┌──────────────────────▼──────────────────────────────────────┐
│          Cloudflare Worker (VPN Config Bot Pro)             │
│  - منبع اصلی کانفیگ‌های تست‌شده و رتبه‌بندی‌شده             │
│  - سیستم vote/quality score                                 │
│  - مدیریت اشتراک‌های شخصی (user-sub)                       │
│  - API کشور، آپدیت اپ، اعلانات                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. ساختار فایل‌های موجود

```
frontend/ (Expo React Native - TypeScript)
├── app/
│   ├── _layout.tsx          (Root Layout - RTL Forced)
│   └── (tabs)/
│       ├── _layout.tsx      (Tab Bar Navigation - 3 تب)
│       ├── index.tsx        (صفحه اتصال - Dashboard)
│       ├── configs.tsx      (لیست کانفیگ‌های تست‌شده)
│       └── settings.tsx     (تنظیمات - URL اشتراک)
├── package.json             (Expo SDK 54, React Native 0.81.5)
└── .env                     (EXPO_PUBLIC_BACKEND_URL)

backend/ (FastAPI + MongoDB - Python)
└── server.py                (393 خط - API endpoints + parsers)
```

---

## 4. قابلیت‌های پیاده‌سازی‌شده (Implemented)

### 4.1 صفحه اتصال (index.tsx)
| قابلیت | وضعیت | جزئیات |
|--------|--------|---------|
| دکمه Power با انیمیشن | ✅ کامل | Glow + Pulse animation با Animated API |
| نشانگر وضعیت (Status Badge) | ✅ کامل | رنگ‌های قرمز/زرد/سبز |
| دریافت کانفیگ از Subscription URL | ✅ کامل | POST /api/configs/fetch |
| تست دسته‌ای (Batch Testing) | ✅ کامل | دسته‌های 50 تایی |
| نوار پیشرفت (Progress Bar) | ✅ کامل | نمایش دسته/کل |
| انتخاب بهترین کانفیگ (کمترین latency) | ✅ کامل | مرتب‌سازی بر اساس latency_ms |
| نمایش اطلاعات کانفیگ متصل | ✅ کامل | پروتکل، latency، کشور، سرور |
| نمایش نام کانال تلگرام | ✅ کامل | اگر is_telegram=true باشد |
| کلیک روی کانال تلگرام → باز شدن تلگرام | ✅ کامل | Linking.openURL |
| ذخیره بهترین کانفیگ در AsyncStorage | ✅ کامل | بین session‌ها حفظ می‌شود |
| RTL support | ✅ کامل | I18nManager.forceRTL |

### 4.2 صفحه لیست کانفیگ‌ها (configs.tsx)
| قابلیت | وضعیت | جزئیات |
|--------|--------|---------|
| نمایش لیست کانفیگ‌های تست‌شده | ✅ کامل | GET /api/configs/results |
| فیلتر بر اساس پروتکل | ✅ کامل | all/vless/vmess/shadowsocks/trojan |
| نمایش latency با رنگ‌بندی | ✅ کامل | سبز<200ms / زرد<500ms / قرمز>500ms |
| نمایش پروتکل با رنگ اختصاصی | ✅ کامل | هر پروتکل رنگ خاص دارد |
| Pull to Refresh | ✅ کامل | RefreshControl |
| لینک تلگرام در هر کارت | ✅ کامل | آیکون تلگرام کلیکی |
| نمایش کشور | ✅ کامل | badge کشور در هر کارت |

### 4.3 صفحه تنظیمات (settings.tsx)
| قابلیت | وضعیت | جزئیات |
|--------|--------|---------|
| ورودی URL اشتراک | ✅ کامل | ذخیره در AsyncStorage |
| ذخیره تنظیمات | ✅ کامل | با نشانگر تأیید |
| بازگشت به URL پیش‌فرض | ✅ کامل | reset به URL GitHub |
| حذف تمام کانفیگ‌ها | ✅ کامل | DELETE /api/configs/clear + AsyncStorage |
| صفحه About | ✅ کامل | لیست قابلیت‌ها |

### 4.4 Backend (server.py)
| قابلیت | وضعیت | جزئیات |
|--------|--------|---------|
| Parse کانفیگ VLESS | ✅ کامل | رگکس + URL API |
| Parse کانفیگ VMess | ✅ کامل | Base64 + JSON decode |
| Parse کانفیگ Shadowsocks | ✅ کامل | legacy base64 + modern format |
| Parse کانفیگ Trojan | ✅ کامل | URI parsing |
| استخراج نام کانال تلگرام | ✅ کامل | از fragment URL |
| استخراج کشور | ✅ کامل | از fragment URL |
| تست TCP connectivity | ✅ کامل | asyncio.open_connection |
| اندازه‌گیری latency | ✅ کامل | time.time() |
| concurrent testing (سمافور) | ✅ کامل | Semaphore(10) |
| ذخیره در MongoDB | ✅ کامل | configs + test_results collections |

---

## 5. بخش‌های ناقص و نیاز به تکمیل

### 5.1 [P0 - بحرانی] یکپارچه‌سازی با VPN Bot Pro API
**مشکل:** اپ در حال حاضر مستقیماً از لینک‌های GitHub اشتراک می‌گیرد و سرور FastAPI تست TCP انجام می‌دهد. این با سیستم Cloudflare Worker که قبلاً کانفیگ‌های تست‌شده و رتبه‌بندی‌شده دارد بی‌ارتباط است.

**API های موجود در Bot Pro که باید استفاده شوند:**
```
GET  /api/configs?limit=20&country=IR&min_quality=50&sort=best  → کانفیگ‌های برتر
GET  /api/sub?limit=100&country=IR                              → لیست اشتراک Base64
GET  /api/countries                                             → لیست کشورها
GET  /api/app-update                                            → آپدیت اپ
GET  /api/announcements                                         → اعلانات
POST /dashboard/api/vote  (auth)                               → ارسال vote
GET  /api/user-sub?code=...                                    → اشتراک شخصی
POST /api/user-sub/report                                      → گزارش مصرف
```

**نیاز:** آدرس Cloudflare Worker باید در تنظیمات قابل تنظیم باشد.

### 5.2 [P0 - بحرانی] سیستم Vote/Like
**مشکل:** کانفیگ‌هایی که تست TCP آن‌ها موفق است باید به سرور VPN Bot Pro گزارش شوند تا Quality Score بهبود یابد.

**پیاده‌سازی مورد نیاز:**
- بعد از هر تست موفق TCP، ارسال auto-like به `/dashboard/api/vote`
- Body: `{\"config_hash\": \"...\", \"vote\": \"like\"}` یا batch format
- این \"Auto-Like from Android App\" در مستندات Bot Pro ذکر شده است

### 5.3 [P0 - بحرانی] سیستم Subscription Code (کد اشتراک شخصی)
**مشکل:** کاربران می‌توانند از سرویس‌دهندگان Sub-Admin کد دریافت کنند و به کانفیگ‌های اختصاصی دسترسی داشته باشند.

**پیاده‌سازی مورد نیاز در اپ:**
- Input برای وارد کردن کد اشتراک (فرمت: `AdminID-ClientID`)
- فراخوانی `GET /api/user-sub?code=...`
- Decode کردن Base64 response به لیست کانفیگ‌ها
- نمایش کانفیگ‌های اشتراک شخصی در تب جداگانه یا بخش جداگانه در configs
- ارسال گزارش مصرف به `POST /api/user-sub/report`

### 5.4 [P1 - مهم] فیلتر بر اساس کشور
**مشکل:** فیلتر کشور در UI اعمال نشده. API داده کشور دارد ولی selector وجود ندارد.

**پیاده‌سازی مورد نیاز:**
- فراخوانی `GET /api/countries` برای دریافت لیست کشورها
- Dropdown/BottomSheet picker برای انتخاب کشور
- فیلتر کانفیگ‌ها بر اساس کد کشور انتخاب‌شده
- نمایش پرچم کشور (emoji flags)

### 5.5 [P1 - مهم] کپی کردن Raw Config
**مشکل:** کانفیگ خام (vless://...) در UI نمایش داده نمی‌شود و قابل کپی نیست.

**پیاده‌سازی مورد نیاز:**
- نمایش raw config در فرمت monospace با فونت کوچک
- دکمه کپی (Clipboard.setString)
- فیدبک haptic هنگام کپی
- Modal یا کشویی برای نمایش جزئیات کامل کانفیگ

### 5.6 [P1 - مهم] بررسی آپدیت اپ
**مشکل:** اپ هیچ‌وقت نسخه جدید را چک نمی‌کند.

**پیاده‌سازی مورد نیاز:**
- فراخوانی `GET /api/app-update` هنگام راه‌اندازی
- مقایسه با نسخه فعلی
- نمایش Modal آپدیت (اجباری اگر `force: true`)
- دکمه دانلود APK جدید

### 5.7 [P1 - مهم] سیستم اعلانات
**مشکل:** اعلانات ادمین در اپ نمایش داده نمی‌شود.

**پیاده‌سازی مورد نیاز:**
- فراخوانی `GET /api/announcements` هنگام باز شدن اپ
- نمایش Banner/Card اعلان در صفحه اصلی (اگر `active: true`)
- قابلیت بستن اعلان

### 5.8 [P2 - توسعه] جستجو در کانفیگ‌ها
**مشکل:** با تعداد زیاد کانفیگ، SearchBar وجود ندارد.

**پیاده‌سازی مورد نیاز:**
- SearchBar با فیلتر real-time
- جستجو در server, name, country

### 5.9 [P2 - توسعه] مرتب‌سازی کانفیگ‌ها
**مشکل:** فقط یک مرتب‌سازی (بر اساس latency) از backend می‌آید.

**پیاده‌سازی مورد نیاز:**
- مرتب‌سازی بر اساس: latency / quality score / کشور / پروتکل

### 5.10 [P2 - توسعه] صفحه جزئیات کانفیگ
**مشکل:** هیچ صفحه detail view وجود ندارد.

**پیاده‌سازی مورد نیاز:**
- نمایش تمام اطلاعات کانفیگ
- Raw string کامل (برای کپی)
- QR Code برای import به کلاینت‌های V2Ray
- دکمه share

---

## 6. مشکلات فنی و بدهی‌های کد (Technical Debt)

### 6.1 کد تکراری (Code Duplication)
| مشکل | فایل‌های آسیب‌دیده | راه‌حل |
|------|--------------------|---------|
| COLORS object | index.tsx, configs.tsx, settings.tsx | استخراج به `constants/colors.ts` |
| API_BASE | index.tsx, configs.tsx, settings.tsx | استخراج به `constants/api.ts` |
| openTelegram function | index.tsx, configs.tsx | استخراج به `utils/links.ts` |

### 6.2 مشکلات Architecture
| مشکل | توضیح | راه‌حل |
|------|-------|---------|
| Backend مستقیم از GitHub می‌گیرد | باید از Cloudflare Worker API استفاده کند | Proxy API در FastAPI به Bot Pro |
| بدون VPN واقعی | دکمه \"اتصال\" فقط TCP test می‌کند نه VPN tunnel | مستندسازی به کاربر + integrate V2Ray core |
| بدون Error handling | خطاهای network در configs.tsx نادیده گرفته می‌شود | Try/catch + Error state UI |
| بدون آفلاین | وابستگی کامل به network | Cache configs + AsyncStorage |

### 6.3 مشکلات UI/UX
| مشکل | توضیح | راه‌حل پیشنهادی |
|------|-------|-----------------|
| متن RTL/LTR Mixed | سرور URL و پروتکل باید LTR باشند | writingDirection property |
| فونت monospace | برخی دستگاه‌های اندروید فونت monospace ندارند | `fontFamily: 'Courier New'` |
| Padding ناکافی در TabBar | paddingBottom=8 در iOS مشکل‌ساز است | SafeAreaInsets |
| Progress bar text | فارسی می‌گوید \"دسته X از Y\" اما اعداد LTR | bidi |

---

## 7. یکپارچه‌سازی با VPN Bot Pro

### 7.1 نقشه ارتباط API

```
اپ اندروید                      FastAPI Backend              VPN Bot Pro (Cloudflare)
    │                                   │                              │
    ├─ GET /api/countries ──────────────┼──────────────────────────────▶
    │◀─────────── [{country, code, count}] ────────────────────────────┤
    │                                   │                              │
    ├─ GET /api/configs?country=IR ─────┼──────────────────────────────▶
    │◀─────────── [vless://..., vmess://...] ──────────────────────────┤
    │                                   │                              │
    ├─ POST /api/vote (after TCP OK) ───┼──────────────────────────────▶
    │                                   │                              │
    ├─ GET /api/user-sub?code=ABC-123 ──┼──────────────────────────────▶
    │◀─────────── Base64(configs) ────────────────────────────────────┤
    │                                   │                              │
    ├─ POST /api/user-sub/report ───────┼──────────────────────────────▶
```

### 7.2 تنظیمات لازم در اپ
```
- CLOUDFLARE_WORKER_URL: آدرس سرور Bot Pro
- SUBSCRIPTION_CODE: کد اشتراک کاربر (اختیاری)
- DEFAULT_COUNTRY: کشور پیش‌فرض برای فیلتر
```

---

## 8. تب‌های پیشنهادی جدید (4 تب)

| تب | نام | محتوا | وضعیت |
|----|-----|-------|--------|
| 1 | اتصال | دکمه اتصال + بهترین کانفیگ | ✅ موجود (نیاز به بهبود) |
| 2 | کانفیگ‌ها | لیست کامل + فیلتر کشور + کپی raw | ✅ موجود (نیاز به تکمیل) |
| 3 | اشتراک | ورود کد + کانفیگ‌های شخصی | ❌ کاملاً ناقص |
| 4 | تنظیمات | URL + کد اشتراک + درباره | ✅ موجود (نیاز به بسط) |

---

## 9. نقاط قوت (Strengths)

### 9.1 قوت‌های اپ اندروید
- **UI/UX تاریک و مدرن:** رنگ‌بندی `#0B0F19` با accent سبز `#00FF94` حرفه‌ای است
- **انیمیشن‌های روان:** Glow ring و Pulse animation دکمه اتصال واقعی‌گرایانه است
- **پشتیبانی RTL:** پیاده‌سازی شده از ابتدا (I18nManager.forceRTL)
- **TypeScript:** کد type-safe با interface‌های تعریف‌شده
- **Concurrent Testing:** تست همزمان با Semaphore(10) بهینه است
- **Parser قوی:** تمام 4 پروتکل VPN با edge-case handling پیاده شده
- **Telegram Integration:** استخراج channel از fragment و direct link به تلگرام

### 9.2 قوت‌های Backend
- **Parse جامع:** پشتیبانی از VMess base64، legacy SS، IPv6 bracket notation
- **Concurrency:** asyncio.Semaphore برای concurrent testing
- **MongoDB upsert:** جلوگیری از duplicate results
- **Exclude _id از response:** رعایت MongoDB best practice

### 9.3 قوت‌های سیستم پشتیبان (Bot Pro)
- **کاملاً Serverless:** Cloudflare Workers بدون هزینه hosting
- **Sharded Storage:** 20 bucket برای 2000 کانفیگ
- **Quality Score:** ترکیب test + vote + auto-like
- **Sub-Admin System:** سرویس اشتراک کاربر به کاربر
- **Response Caching:** 5 دقیقه cache برای API

---

## 10. نقاط ضعف (Weaknesses)

### 10.1 ضعف‌های اپ اندروید
| ضعف | تأثیر | اولویت رفع |
|-----|-------|------------|
| بدون اتصال VPN واقعی | کاربر فکر می‌کند VPN است ولی نیست | P0 (نیاز به مستند‌سازی واضح) |
| نمی‌توان raw config را کپی کرد | کاربران باید دستی config را پیدا کنند | P1 |
| بدون Vote System | کانفیگ‌های آزمایش‌شده به سیستم بازخورد نمی‌دهند | P0 |
| بدون Subscription Code | یکی از مهم‌ترین ویژگی‌های Bot Pro بی‌استفاده است | P0 |
| بدون فیلتر کشور | کاربران نمی‌توانند کشور مورد نظر را انتخاب کنند | P1 |
| کد تکراری در 3 فایل | نگهداری دشوار | P2 |
| URL hardcode شده | باید از متغیر محیطی بیاید | P1 |
| بدون خطای کاربرپسند | فقط Alert خالی | P2 |

### 10.2 ضعف‌های Backend
| ضعف | تأثیر | اولویت رفع |
|-----|-------|------------|
| از VPN Bot Pro API استفاده نمی‌کند | دوباره‌کاری و از دست دادن Quality Score | P0 |
| بدون rate limiting | سوء استفاده احتمالی | P2 |
| حذف همه کانفیگ‌ها هنگام fetch | اگر URL خطا دهد همه چیز پاک می‌شود | P1 |
| بدون cache | هر بار fetch جدید از اینترنت | P2 |

### 10.3 ضعف‌های معماری
| ضعف | توضیح |
|-----|-------|
| آدرس Bot Pro در اپ نیست | باید CLOUDFLARE_WORKER_URL در env باشد |
| بدون authentication | API Vote نیاز به Bearer Token دارد |
| سیستم Sub-Admin کاملاً غایب | مهم‌ترین ویژگی Bot Pro پیاده نشده |

---

## 11. نقشه راه تکمیل (Roadmap)

### فاز 1: اتصال به VPN Bot Pro (1-2 روز)
- [ ] اضافه کردن `CLOUDFLARE_WORKER_URL` به تنظیمات
- [ ] Backend: Proxy endpoint به `/api/configs`
- [ ] Backend: Proxy endpoint به `/api/countries`
- [ ] Backend: Proxy endpoint به `/api/app-update`
- [ ] Backend: Proxy endpoint به `/api/announcements`
- [ ] اپ: بررسی آپدیت هنگام راه‌اندازی
- [ ] اپ: نمایش اعلانات در dashboard

### فاز 2: Vote System (1 روز)
- [ ] Backend: Endpoint برای ارسال vote به Bot Pro
- [ ] اپ: ارسال auto-like بعد از موفقیت TCP test
- [ ] اپ: دکمه Report (dislike) در لیست کانفیگ‌ها

### فاز 3: Country Filter (1 روز)
- [ ] اپ: فراخوانی `/api/countries`
- [ ] اپ: Country Picker (BottomSheet یا Modal)
- [ ] اپ: نمایش پرچم emoji در کارت‌ها
- [ ] اپ: پاس دادن `country=XX` به `/api/configs`

### فاز 4: Subscription Code System (2 روز)
- [ ] اپ: تب \"اشتراک\" جدید
- [ ] اپ: Input برای کد اشتراک
- [ ] اپ: فراخوانی `/api/user-sub?code=...`
- [ ] اپ: Decode Base64 و نمایش کانفیگ‌های شخصی
- [ ] اپ: نمایش جداگانه از کانفیگ‌های عمومی
- [ ] اپ: گزارش مصرف به `/api/user-sub/report`

### فاز 5: Copy Config + Detail View (1 روز)
- [ ] اپ: دکمه کپی raw config در کارت
- [ ] اپ: Modal جزئیات کامل کانفیگ
- [ ] اپ: QR Code برای import
- [ ] اپ: Haptic feedback هنگام کپی

### فاز 6: Refactoring + UX بهبود (1 روز)
- [ ] استخراج COLORS به فایل مشترک
- [ ] استخراج API_BASE و helper functions
- [ ] Error states با پیام‌های کاربرپسند فارسی
- [ ] Loading skeleton به جای spinner ساده
- [ ] Offline cache با AsyncStorage

---

## 12. وابستگی‌های نیاز به نصب (Dependencies Needed)

```json
{
  \"expo-clipboard\": \"^7.x\",      // کپی raw config
  \"react-native-qrcode-svg\": \"^6.x\",  // QR Code
  \"@gorhom/bottom-sheet\": \"^4.x\",     // Country Picker
  \"expo-haptics\": \"موجود\",            // Haptic feedback (already installed)
  \"react-native-svg\": \"موجود\"         // برای QR Code
}
```

---

## 13. تنظیمات Environment Variables مورد نیاز

### frontend/.env
```
EXPO_PUBLIC_BACKEND_URL=https://your-backend.com
EXPO_PUBLIC_WORKER_URL=https://your-cloudflare-worker.com
```

### backend/.env
```
MONGO_URL=mongodb://...
DB_NAME=vpn_configs
WORKER_URL=https://your-cloudflare-worker.com
WORKER_AUTH_TOKEN=Bearer token from dashboard/api/login
```

---

## 14. تست‌های موجود

- بدون تست unit/integration در فایل‌های موجود
- `/test_reports/` وجود دارد ولی خالی است
- نیاز به Jest + React Native Testing Library

---

## 15. خلاصه وضعیت فعلی

| بخش | درصد تکمیل | نکته |
|-----|------------|------|
| UI اصلی (3 تب) | 75% | نیاز به Subscription tab |
| Parse کانفیگ | 95% | تقریباً کامل |
| TCP Testing | 90% | کامل، نیاز به vote integration |
| Vote System | 0% | کاملاً غایب |
| Country Filter | 20% | داده دارد ولی UI ندارد |
| Subscription Code | 0% | کاملاً غایب |
| App Update Check | 0% | کاملاً غایب |
| Announcements | 0% | کاملاً غایب |
| Copy Raw Config | 0% | کاملاً غایب |
| یکپارچگی با Bot Pro | 5% | فقط URL تنظیم‌پذیر نیست |

**مجموع پیشرفت کلی: ~45%**
