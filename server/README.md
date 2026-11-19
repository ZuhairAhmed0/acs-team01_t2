<div dir="rtl" align="right">

# ⛽ محفظة الوقود الرقمية — الخادم الخلفي (Fuel Wallet Backend)

واجهة برمجة التطبيقات الخلفية لمنصة **محفظة الوقود الرقمية** المبنية باستخدام **Node.js**، **Express 5**، **TypeScript (ESM)**، **Prisma 7** (`@prisma/adapter-pg`)، **PostgreSQL**، **Clerk** (`@clerk/express`)، وتوثيق **Swagger UI** التفاعلي.

---

## 🚀 التشغيل السريع (Quick Start)

```bash
# 1. تثبيت الحزم
npm install

# 2. إعداد المتغيرات البيئية
cp .env.example .env

# 3. تطبيق هجرات قاعدة البيانات وزراعة البيانات الأولية
npm run db:deploy
npm run db:seed
npm run db:verify

# 4. إعادة ضبط بيانات العرض التوضيحي (لبيئة التطوير فقط)
npm run demo:reset

# 5. تشغيل خادم التطوير أو البناء للإنتاج أو تشغيل الاختبارات
npm run dev
npm run build && npm start
npm test
```

---

## 📖 توثيق الواجهة البرمجية (Swagger / OpenAPI 3.0)

عند تشغيل الخادم (`npm run dev` أو `npm start`)، يتوفر توثيق Swagger التفاعلي على الروابط التالية:

- **واجهة Swagger UI التفاعلية**: `http://localhost:3000/api-docs`
- **مواصفات OpenAPI JSON**: `http://localhost:3000/api-docs.json`
- كما تتوفر جميع الطلبات التجريبية في ملف [`api.http`](./api.http) لاستخدامها مع إضافة VS Code REST Client.

---

## 🔐 ترقية المستخدمين (`ADMIN` و `OPERATOR`)

يتم تسجيل المستخدمين الجدد تلقائياً عند أول طلب بدور `DRIVER` وحالة `ACTIVE`.

### 1. ترقية مستخدم إلى مدير نظام (`ADMIN`)
```sql
UPDATE "users"
SET "role" = 'ADMIN'
WHERE "clerk_user_id" = 'user_2xYourClerkUserIdHere';
```

### 2. ترقية مستخدم إلى مشغل محطة (`OPERATOR`)
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
*(ملاحظة: في حال تعيين `role = 'OPERATOR'` وترك `operator_station_id` فارغاً `NULL`، يقوم النظام تلقائياً بإسناد المشغل إلى أول محطة نشطة مع إمكانية تبديل المحطة من لوحة المشغل).*

### 3. تجميد أو تنشيط مستخدم (`FROZEN` / `ACTIVE`)
عبر نقطة النهاية الخاصة بالإدارة:
- `PATCH /api/admin/users/:id` مع الجسم `{ "status": "FROZEN" }` أو `{ "status": "ACTIVE" }`.

---

## 🎯 سيناريو العرض التوضيحي (Demo flow)

قبل بدء العرض التوضيحي، قم بإعادة ضبط قاعدة البيانات:

```bash
npm run demo:reset
```

خطوات العرض التوضيحي الكامل:

1. **تغذية الرصيد (`POST /api/topups`)**: شحن `30,000` ج.س في المحفظة الرئيسية (`USER_MAIN`).
2. **اختيار المحطة (`GET /api/stations`)**: استعراض المحطات النشطة والرصيد المتاح في كل محطة.
3. **تحويل من الرئيسية إلى المحطة أ (`POST /api/transfers`)**: تحويل `20,000` ج.س إلى محفظة المحطة أ (`USER_STATION`).
4. **الدفع في المحطة أ (`POST /api/payments`)**: دفع `12,000` ج.س في المحطة أ والحصول على رمز التحقق السداسي (`verificationCode`).
5. **تحويل من المحطة أ إلى المحطة ب (`POST /api/transfers`)**: تحويل الرصيد المتبقي `8,000` ج.س من المحطة أ إلى المحطة ب مباشرةً.
6. **الدفع في المحطة ب (`POST /api/payments`)**: دفع `5,000` ج.س في المحطة ب.
7. **السجل وكشف الحساب (`GET /api/transactions` و `GET /api/wallets/:id/ledger`)**: استعراض العمليات وقيود القيد المزدوج.
8. **اختبار توقف البنك (`POST /api/admin/bank-status`)**: تحويل حالة البنك إلى `DOWN` — تفشل عملية الشحن `TOPUP` بـ `503 BANK_UNAVAILABLE` بينما تستمر عمليات الدفع `PAYMENT` والتحويل `TRANSFER` بالعمل بنجاح تام.
9. **المطابقة المحاسبية (`GET /api/admin/reconcile`)**: التحقق من سلامة دفتر الأستاذ العام (`ok: true, issues: []`).

</div>
