<div dir="rtl" align="right">

# محفظة الوقود الرقمية — Fuel Wallet Platform

# قم بزيارة الـ API Docs 
## [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

**منصة الدفع المسبق الذكية لمحطات الوقود بنظام القيد المحاسبي المزدوج الصارم (Double-Entry Ledger)**

نظام متكامل (Full-Stack FinTech Platform) يتيح للسائقين شحن محفظتهم الرقمية، وتخصيص أرصدة لمحطات وقود محددة أو التحويل بينها، والدفع الفوري في المحطات عبر رمز تحقق سداسي (`6-Digit Verification Code`) حتى في حال انقطاع الاتصال ببوابة البنك الخارجية، مع لوحات تحكم مخصصة لمشغلي المحطات (`OPERATOR`) ومديري النظام (`ADMIN`).

---

##  جدول المحتويات

1. [نظرة عامة والمميزات الرئيسية](#-نظرة-عامة-والمميزات-الرئيسية)
2. [المعمارية الهندسية والضمانات المالية](#-المعمارية-الهندسية-والضمانات-المالية)
3. [التقنيات المستخدمة (Tech Stack)](#-التقنيات-المستخدمة-tech-stack)
4. [هيكلية المشروع (Project Structure)](#-هيكلية-المشروع-project-structure)
5. [طريقة التشغيل والإعداد السريع](#-طريقة-التشغيل-والإعداد-السريع)
6. [توثيق الواجهة البرمجية التفاعلي (Swagger / OpenAPI)](#-توثيق-الواجهة-البرمجية-التفاعلي-swagger--openapi)
7. [الأدوار والصلاحيات وترقية المستخدمين (RBAC)](#-الأدوار-والصلاحيات-وترقية-المستخدمين-rbac)
8. [سيناريو العرض التوضيحي الكامل (Demo Flow)](#-سيناريو-العرض-التوضيحي-الكامل-demo-flow)
9. [الاختبارات الآلية ومطابقة الحسابات](#-الاختبارات-الآلية-ومطابقة-الحسابات)

---

## نظرة عامة والمميزات الرئيسية

- **محفظة رئيسية ومحافظ مخصصة للمحطات (`USER_MAIN` & `USER_STATION`)**:
  - لكل مستخدم محفظة رئيسية برقم تعريفي مختصر مكون من 6 أرقام (مثال: `#104829`) بدلاً من المعرفات الطويلة المعقدة.
  - إمكانية تخصيص ميزانية لمحطة وقود معينة أو إعادة تحويل الرصيد بين المحطات فوراً وبدون رسوم.
- **استمرارية الدفع عند توقف البنك (`Bank DOWN Resilience`)**:
  - تعتمد عمليات تغذية الرصيد (`TOPUP`) على بوابة البنك المحاكية (`BANK_SIM`).
  - أما عمليات الدفع في المحطات (`PAYMENT`) والتحويل بين المحافظ (`TRANSFER`) فتتم داخلياً عبر دفتر الأستاذ العام، مما يضمن استمرار عمل المحطات والدفع حتى عند انقطاع اتصال البنك (`503 BANK_UNAVAILABLE`).
- **رمز التحقق السداسي الفوري (`6-Digit Verification Code`)**:
  - عند كل عملية دفع ناجحة في المحطة، يُصدر النظام رمز تحقق مكوناً من 6 أرقام يظهر للسائق، ويمكن لمشغل المحطة التحقق منه فوراً خلال 30 دقيقة.
- **إدارة متكاملة للمحطات (`CRUD`)**:
  - إمكانية إضافة محطات جديدة (مع إنشاء محفظة إيراداتها تلقائياً)، وتعديل بياناتها، وتحديث حالة الازدحام (`LOW` / `MEDIUM` / `HIGH`)، أو حذفها.
- **واجهة مستخدم عربية وإنجليزية (`RTL / LTR`)**:
  - تصميم عصري بالوضع الفاتح (`Light Mode`) يدعم اللغتين العربية (`RTL`) والإنجليزية (`LTR`) بشكل فوري.

---

## المعمارية الهندسية والضمانات المالية

تم بناء النظام وفق أعلى معايير الأنظمة المالية والمحاسبية:

1. **نظام القيد المحاسبي المزدوج الصارم (`Strict Double-Entry Ledger`)**:
   - لا يتم تعديل حقل الرصيد (`wallets.balance`) يدوياً في أي مكان خارج خدمة دفتر الأستاذ (`ledger.service.ts`).
   - كل معاملة مالية مكتملة (`COMPLETED`) تُنشئ قيدين محاسبيين بالضبط في جدول `ledger_entries`: قيد خصم سالب (`-amount`) من المحفظة المصدر، وقيد إيداع موجب (`+amount`) في المحفظة الوجهة، بحيث يكون مجموع القيود دائماً **`0`**.
2. **حماية التزامن ومنع السحب على المكشوف (`Concurrency & Overdraft Guard`)**:
   - يتم خصم الرصيد عبر جملة تحديث ذرية محمية في PostgreSQL:
     `UPDATE wallets SET balance = balance - $amount WHERE id = $id AND balance >= $amount`
   - عند إرسال 10 طلبات دفع متزامنة في نفس اللحظة، ينجح فقط عدد الطلبات الذي يغطيه الرصيد الفعلي دون حدوث أي رصيد سالب (`Race Condition Safe`).
3. **منع ازدواجية العمليات (`Idempotency-Key Protection`)**:
   - جميع طلبات الأموال (`POST /api/topups`, `POST /api/transfers`, `POST /api/payments`) تتطلب ترويسة `Idempotency-Key`.
   - إعادة إرسال نفس الطلب بنفس المفتاح تعيد نفس النتيجة السابقة دون خصم الرصيد مرتين، بينما إرسال نفس المفتاح ببيانات مختلفة يُرفض بالخطأ `409 IDEMPOTENCY_KEY_MISMATCH`.
4. **جدول قيود غير قابل للتعديل أو الحذف (`Append-Only Immutable Ledger`)**:
   - جدول `ledger_entries` محمي على مستوى قاعدة البيانات PostgreSQL بواسطة `Trigger` يمنع عمليات `UPDATE` أو `DELETE`.
5. **المبالغ المالية بأعداد صحيحة (`BigInt Whole SDG`)**:
   - تُخزن جميع المبالغ بالجنيه السوداني كأعداد صحيحة (`BigInt`) لتجنب أخطاء الفاصلة العائمة (`Floating-Point Precision Errors`).

---

## التقنيات المستخدمة (Tech Stack)

### أولاً: الواجهة الخلفية (`Backend — /server`)
- **بيئة التشغيل**: Node.js (`>=20.19.0`) + TypeScript (`ESM`)
- **إطار العمل**: Express 5
- **قاعدة البيانات و ORM**: PostgreSQL (Neon) + Prisma ORM (`7.10.1` مع `@prisma/adapter-pg`)
- **المصادقة والأمان**: Clerk (`@clerk/express`) + Helmet + Express Rate Limit
- **التحقق من البيانات**: Zod
- **توثيق الـ API**: Swagger UI (`swagger-ui-express` — OpenAPI 3.0.3)

### ثانياً: الواجهة الأمامية (`Frontend — /client`)
- **المكتبة الأساسية**: React 19 + TypeScript + Vite 8
- **التنسيق والتصميم**: Tailwind CSS (`RTL` / `LTR`)
- **المصادقة**: Clerk React SDK (`@clerk/react`)
- **إدارة حالة الخادم والطلبات**: TanStack React Query v5 + Axios
- **التوجيه (Routing)**: React Router v7

---

## هيكلية المشروع (Project Structure)

</div>

<div dir="ltr" align="left">

```text
Fuel/
├── README.md                     # التوثيق الرئيسي للمشروع باللغة العربية (RTL)
├── server/                  # الواجهة الخلفية (Backend API)
│   ├── prisma/                   # مخطط قاعدة البيانات (schema.prisma)، الهجرات، والبيانات الأولية (seed.ts)
│   ├── scripts/                  # سكربتات التحقق وإعادة ضبط العرض (demo-reset.ts, verify-db.ts)
│   ├── src/
│   │   ├── config/               # إعدادات البيئة والثوابت
│   │   ├── controllers/          # متحكمات نقاط النهاية (Me, Stations, Topups, Transfers, Payments, Operator, Admin)
│   │   ├── db/                   # اتصال Prisma مع PostgreSQL
│   │   ├── docs/                 # توثيق Swagger / OpenAPI 3.0 (swagger.ts)
│   │   ├── errors/               # فئة الأخطاء الموحدة وكتالوج الرسائل العربية
│   │   ├── jobs/                 # المهام الخلفية لإنهاء المعاملات المعلقة (expire-pending.job.ts)
│   │   ├── middleware/           # المصادقة، الصلاحيات، مفتاح عدم التكرار، وتحديد المعدل (Rate Limiting)
│   │   ├── routes/               # تعريف مسارات الـ API
│   │   ├── schemas/              # مخططات التحقق بواسطة Zod
│   │   └── services/             # منطق الأعمال ودفتر الأستاذ المزدوج (ledger, transaction, topup, transfer, payment, reconcile)
│   ├── tests/                    # اختبارات شاملة للمراحل 1 إلى 10 (تشمل اختبارات التزامن)
│   └── api.http                  # ملف طلبات HTTP جاهز للتجربة في VS Code
│
└── client/                       # الواجهة الأمامية (React Frontend)
    └── src/
        ├── app/                  # المزودات (Providers: Clerk, QueryClient, Language, Theme) والتوجيه (Router)
        ├── components/           # المكونات المشتركة وعناصر واجهة المستخدم (UI & Layout)
        ├── features/             # وحدات النظام (auth, dashboard, wallet, stations, payments, transfers, transactions, operator, admin, profile)
        ├── lib/                  # إعداد Axios، تنسيق العملات والتواريخ، ومفاتيح الكاش
        ├── locales/              # قواميس الترجمة العربية والإنجليزية
        ├── services/api/         # دوال الاتصال بالخادم الخلفي
        └── types/                # تعريفات الأنواع المطابقة لعقود الـ Backend DTOs
```

</div>

<div dir="rtl" align="right">

---

## طريقة التشغيل والإعداد السريع

### 1- إعداد وتشغيل الواجهة الخلفية (`server`)

```bash
cd server

# تثبيت الحزم
npm install

# نسخ ملف المتغيرات البيئية وإعداد روابط قاعدة البيانات ومفاتيح Clerk
cp .env.example .env

# تطبيق هجرات قاعدة البيانات وزراعة البيانات الأولية (المحطات ومحفظة البنك)
npm run db:deploy
npm run db:seed
npm run db:verify

# تشغيل خادم التطوير (يعمل افتراضياً على المنفذ 3000)
npm run dev
```

### 2- إعداد وتشغيل الواجهة الأمامية (`client`)

```bash
cd client

# تثبيت الحزم
npm install

# تأكد من وجود ملف .env يحتوي على مفتاح Clerk وعنوان الخادم الخلفي:
# VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
# VITE_API_BASE_URL=http://localhost:3000/api

# تشغيل واجهة المستخدم (تعمل افتراضياً على المنفذ 5173)
npm run dev
```

- **رابط الواجهة الأمامية**: `http://localhost:5173`
- **رابط الخادم الخلفي**: `http://localhost:3000`
- **رابط توثيق Swagger UI**: `http://localhost:3000/api-docs`

---

## توثيق الواجهة البرمجية التفاعلي (Swagger / OpenAPI)

يحتوي الخادم الخلفي على توثيق **Swagger UI** تفاعلي كامل باللغتين العربية والإنجليزية لجميع نقاط النهاية:

- **واجهة Swagger التفاعلية**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **ملف مواصفات OpenAPI JSON**: [http://localhost:3000/api-docs.json](http://localhost:3000/api-docs.json)

### كيف تجرب الـ API من داخل Swagger؟
1. افتح `http://localhost:3000/api-docs`.
2. اضغط على زر **Authorize** في أعلى الصفحة وأدخل رمز الجلسة (`Clerk Bearer JWT Token`).
3. يمكنك تجربة جميع نقاط النهاية مباشرةً من المتصفح:
   - `GET /api/me` — بيانات المستخدم ورقم المحفظة المختصر والأرصدة.
   - `GET /api/stations` ، `POST /api/stations` ، `PATCH /api/stations/:id` ، `DELETE /api/stations/:id` — إدارة واستعراض المحطات.
   - `POST /api/topups` — تغذية الرصيد من البنك.
   - `POST /api/transfers` — تحويل الرصيد بين المحفظة الرئيسية ومحافظ المحطات.
   - `POST /api/payments` — الدفع الفوري في المحطة واستلام رمز التحقق السداسي.
   - `GET /api/transactions` و `GET /api/wallets/:id/ledger` — سجل العمليات وكشف الحساب المحاسبي.
   - `GET /api/operator/summary` ، `GET /api/operator/payments/lookup` ، `PATCH /api/operator/station` — أدوات مشغل المحطة.
   - `GET /api/admin/reconcile` ، `POST /api/admin/bank-status` ، `PATCH /api/admin/users/:id` — أدوات مدير النظام.

---

## الأدوار والصلاحيات وترقية المستخدمين (RBAC)

عند تسجيل الدخول لأول مرة عبر Clerk، يتم إنشاء حساب المستخدم تلقائياً بدور سائق/عميل (`role = 'DRIVER'`) وحالة نشطة (`status = 'ACTIVE'`).

### 1. ترقية مستخدم إلى مدير نظام (`ADMIN`)
نفّذ استعلام SQL التالي في قاعدة بيانات PostgreSQL (أو Neon Console):

```sql
UPDATE "users"
SET "role" = 'ADMIN'
WHERE "clerk_user_id" = 'user_2xYourClerkUserIdHere';
```

### 2. ترقية مستخدم إلى مشغل محطة (`OPERATOR`)
يمكنك ترقية المستخدم إلى `OPERATOR` مباشرةً (وسيقوم النظام تلقائياً بإسناده إلى أول محطة نشطة إذا كان حقل المحطة فارغاً، كما يمكن للمشغل تغيير محطته من داخل لوحة المشغل):

```sql
UPDATE "users"
SET "role" = 'OPERATOR'
WHERE "clerk_user_id" = 'user_2xOperatorClerkUserIdHere';
```

أو تحديد محطة معينة بالاسم:

```sql
UPDATE "users"
SET
  "role" = 'OPERATOR',
  "operator_station_id" = (
    SELECT "id"
    FROM "stations"
    WHERE "name" = 'محطة النيل' AND "city" = 'أم درمان'
  )
WHERE "clerk_user_id" = 'user_2xOperatorClerkUserIdHere';
```

### 3. تجميد أو تنشيط حساب مستخدم (`FROZEN` / `ACTIVE`)
- من واجهة مدير النظام (`/admin`) أو عبر الـ API:
  `PATCH /api/admin/users/:id` مع الجسم `{ "status": "FROZEN" }` أو `{ "status": "ACTIVE" }`.

---

## سيناريو العرض التوضيحي الكامل (Demo Flow)

لإعادة ضبط البيانات قبل بدء العرض التوضيحي المباشر (تصفير الأرصدة والعمليات وإعادة حالة البنك إلى `UP`):

```bash
cd server
npm run demo:reset
```

بعد ذلك يمكنك تنفيذ خطوات السيناريو الكامل من الواجهة الأمامية أو عبر Swagger:

1. **تغذية المحفظة الرئيسية (`POST /api/topups`)**:
   - شحن مبلغ `30,000` ج.س في المحفظة الرئيسية (`USER_MAIN`).
   - النتيجة: رصيد المحفظة الرئيسية يصبح `30,000` ج.س، ورصيد محفظة البنك المحاكية `-30,000` ج.س.
2. **استعراض المحطات (`GET /api/stations`)**:
   - اختيار محطة وقود نشطة (مثل **محطة الأمل — أ** و **محطة السلام — ب**).
3. **تحويل من المحفظة الرئيسية إلى المحطة أ (`POST /api/transfers`)**:
   - تحويل `20,000` ج.س من المحفظة الرئيسية إلى محفظة **المحطة أ**.
   - النتيجة: المحفظة الرئيسية = `10,000` ج.س، ومحفظة المحطة أ = `20,000` ج.س.
4. **الدفع في المحطة أ (`POST /api/payments`)**:
   - دفع `12,000` ج.س في **المحطة أ** من محفظة المحطة أ.
   - النتيجة: إصدار رمز تحقق سداسي (`verificationCode`)، ويتبقى `8,000` ج.س في محفظة المحطة أ، ويرتفع رصيد إيرادات المحطة أ بمقدار `+12,000` ج.س.
5. **تحويل الرصيد المتبقي من المحطة أ إلى المحطة ب (`POST /api/transfers`)**:
   - نقل `8,000` ج.س من محفظة **المحطة أ** إلى محفظة **المحطة ب** مباشرةً.
   - النتيجة: محفظة المحطة أ = `0` ج.س، ومحفظة المحطة ب = `8,000` ج.س.
6. **الدفع في المحطة ب (`POST /api/payments`)**:
   - دفع `5,000` ج.س في **المحطة ب** واستلام رمز التحقق السداسي.
7. **اختبار صمود النظام عند توقف البنك (`POST /api/admin/bank-status`)**:
   - من لوحة الإدارة، قم بتحويل حالة البنك إلى `DOWN`.
   - جرب شحن الرصيد (`TOPUP`): سيفشل الطلب بـ `503 BANK_UNAVAILABLE` دون أي تغيير في الأرصدة.
   - جرب الدفع في المحطة ب (`PAYMENT`) بمبلغ `3,000` ج.س: **ينجح الدفع فوراً** لأن التسوية تتم داخلياً عبر دفتر الأستاذ المزدوج دون الاعتماد على البنك الخارجي.
8. **مطابقة دفتر الأستاذ العام (`GET /api/admin/reconcile`)**:
   - اضغط على **"تشغيل فحص المطابقة الآن"** في لوحة الإدارة للتأكد من أن `ok: true` وأن مجموع كافة أرصدة النظام يساوي `0` تماماً.

---

## الاختبارات الآلية ومطابقة الحسابات

للتحقق من البناء، سلامة الأنواع (TypeScript)، وتشغيل حزمة الاختبارات الشاملة:

```bash
# في مجلد الواجهة الخلفية (server)
cd server
npm run typecheck
npm run build
npm test

# في مجلد الواجهة الأمامية (client)
cd ../client
npm run lint
npm run build
```

</div>

