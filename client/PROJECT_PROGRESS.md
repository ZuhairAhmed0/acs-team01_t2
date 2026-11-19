# Fuel Wallet Frontend — Architecture & Project Progress Report

## Phase Status Tracker

| Phase | Title | Status | Verification |
|---|---|---|---|
| **Phase 1** | Project Inspection and Architecture | ✅ Completed | Existing app builds (`tsc -b && vite build`), API matrix & architecture documented |
| **Phase 2** | Foundation and Design System | ✅ Completed | Tailwind CSS v3.4, Dark/Light themes (`localStorage`), Arabic RTL / English LTR, reusable UI & layout components |
| **Phase 3** | Authentication and Authorization | ✅ Completed | Clerk React SDK (`@clerk/clerk-react`), Axios JWT interceptor (`AuthTokenSync`), `/api/me` sync, `ProtectedRoute` & role guards |
| **Phase 4** | Dashboard and Core Wallet Features | ✅ Completed | Customer Dashboard (`DashboardPage`), Wallets & Double-Entry Ledger Statements (`WalletsPage`), Stations (`StationsPage`), Top-Up Modal (`TopUpModal`) |
| **Phase 5** | Payments and Transfers | ✅ Completed | Fuel Payment (`PaymentPage`) with 6-digit verification receipt & status reconciliation, Atomic Transfers (`TransferPage`) with `Idempotency-Key` |
| **Phase 6** | Transaction History & Role Dashboards | ✅ Completed | Cursor-paginated History (`TransactionsPage`), Station Operator / Station Admin Hub (`OperatorDashboardPage`), Super Admin Console (`AdminDashboardPage`), Profile (`ProfilePage`) |
| **Phase 7** | Final Integration, Testing & Polish | ✅ Completed | `npm run lint` (0 errors, 0 warnings) & `npm run build` (`tsc -b && vite build` in ~600ms) verified |

---

## 1. Inspection of Existing `/client` Directory

- **Framework & Tooling**: React `^19.3.1`, TypeScript `~6.0.3`, Vite `^8.3.6` (`@vitejs/plugin-react`).
- **Build Repair**: Installed `@rolldown/binding-win32-x64-msvc@1.2.19` to repair the Vite 8 Rolldown native binding on Windows x64.
- **Installed Dependencies**:
  - Runtime: `@clerk/clerk-react`, `@tanstack/react-query`, `axios`, `react-router-dom`.
  - Dev: `tailwindcss@^3.4.19`, `postcss`, `autoprefixer`, `@rolldown/binding-win32-x64-msvc@1.2.19`.
- **Same-Origin Dev Proxy**: Configured `vite.config.ts` to proxy `/api` and `/health` to `http://localhost:3000`, and configured `src/app/config/env.ts` to normalize `http://localhost:3000/api` to `/api` in dev mode so browser requests never fail with CORS errors against the backend.

---

## 2. Backend Authentication, Roles & Authorization Contract

1. User signs in or signs up via Clerk (`SignInPage.tsx` / `SignUpPage.tsx`).
2. `AuthTokenSync` in `AppProviders.tsx` registers Clerk's `getToken()` with our centralized Axios client (`src/lib/axios.ts`).
3. Every API request automatically includes `Authorization: Bearer <token>`.
4. `useCurrentUser()` calls `GET /api/me`, triggering backend `ensureUser` middleware to provision/sync the PostgreSQL `users` row and `USER_MAIN` wallet and return `{ user: { id, fullName, role, status }, wallets: { main, stations }, totalBalance }`.
5. **Actual Backend Roles (`enum UserRole`)**:
   - `DRIVER`: Customer dashboard, wallets, stations, top-ups, payments, transfers, transaction history, wallet ledger statements, profile.
   - `OPERATOR`: All driver features + Station Operator Hub (`/operator`) scoped to `users.operator_station_id` (`GET /api/operator/summary`, `GET /api/operator/payments`, `GET /api/operator/payments/lookup`, `PATCH /api/operator/station`).
   - `ADMIN`: All features + station selector override (`?stationId=`) in `/operator` + Super Admin Console (`/admin`) (`GET/POST /api/admin/bank-status`, `GET /api/admin/reconcile`, `PATCH /api/admin/stations/:id`, `PATCH /api/admin/users/:id`).

---

## 3. Complete Backend API Integration Matrix

| Feature | Backend Endpoint | HTTP Method | Request / Headers | Response `{ data }` | Frontend Integration |
|---|---|---|---|---|---|
| **User Profile & Wallets** | `/api/me` | `GET` | `Authorization: Bearer <token>` | `MeResponseDto` | `src/services/api/me.api.ts` -> `useCurrentUser()` |
| **Stations List & Filter** | `/api/stations?city=` | `GET` | Optional `?city=` | `StationDto[]` | `src/services/api/stations.api.ts` -> `useStationsQuery()` |
| **Station Details** | `/api/stations/:id` | `GET` | `:id` UUID | `StationDto` | `src/services/api/stations.api.ts` -> `useStationDetailQuery()` |
| **Simulated Bank Top-Up** | `/api/topups` | `POST` | `Idempotency-Key` + `{ amount }` | `TransactionDto` | `src/services/api/topups.api.ts` -> `TopUpModal.tsx` |
| **Atomic Wallet Transfer** | `/api/transfers` | `POST` | `Idempotency-Key` + `{ fromWalletId, to, amount }` | `TransactionDto` | `src/services/api/transfers.api.ts` -> `TransferPage.tsx` |
| **Fuel Station Payment** | `/api/payments` | `POST` | `Idempotency-Key` + `{ stationId, sourceWalletId, amount }` | `TransactionDto` (with 6-digit `verificationCode`) | `src/services/api/payments.api.ts` -> `PaymentPage.tsx` |
| **Transaction History** | `/api/transactions` | `GET` | `?limit=&cursor=&type=&status=` | `PaginatedResponseDto<TransactionHistoryItemDto>` | `src/services/api/transactions.api.ts` -> `TransactionsPage.tsx` |
| **Single Transaction Poll** | `/api/transactions/:id` | `GET` | `:id` UUID | `TransactionHistoryItemDto` | `src/services/api/transactions.api.ts` -> `TransactionDetailModal.tsx` |
| **Wallet Ledger Statement** | `/api/wallets/:id/ledger` | `GET` | `:id` UUID + `?limit=&cursor=` | `PaginatedResponseDto<WalletLedgerEntryDto>` | `src/services/api/transactions.api.ts` -> `WalletStatementModal.tsx` |
| **Operator Daily Summary** | `/api/operator/summary` | `GET` | Optional `?stationId=` (`ADMIN`) | `OperatorSummaryDto` | `src/services/api/operator.api.ts` -> `OperatorDashboardPage.tsx` |
| **Operator Payments Feed** | `/api/operator/payments` | `GET` | `?limit=&cursor=&stationId=` | `PaginatedResponseDto<OperatorPaymentDto>` | `src/services/api/operator.api.ts` -> `OperatorDashboardPage.tsx` |
| **Operator Code Lookup** | `/api/operator/payments/lookup` | `GET` | `?code=123456&stationId=` | `OperatorPaymentDto` (last 30 mins) | `src/services/api/operator.api.ts` -> `OperatorDashboardPage.tsx` |
| **Operator Congestion** | `/api/operator/station` | `PATCH` | `{ congestion: 'LOW'\|'MEDIUM'\|'HIGH' }` | `StationDto` | `src/services/api/operator.api.ts` -> `OperatorDashboardPage.tsx` |
| **Admin Bank Status** | `/api/admin/bank-status` | `GET` / `POST` | `{ status: 'UP'\|'DOWN' }` | `{ status: 'UP'\|'DOWN' }` | `src/services/api/admin.api.ts` -> `AdminDashboardPage.tsx` |
| **Admin Ledger Reconcile** | `/api/admin/reconcile` | `GET` | None | `ReconciliationReportDto` | `src/services/api/admin.api.ts` -> `AdminDashboardPage.tsx` |
| **Admin Station Active** | `/api/admin/stations/:id` | `PATCH` | `{ isActive: boolean }` | `StationDto` | `src/services/api/admin.api.ts` -> `AdminDashboardPage.tsx` |
| **Admin User Status** | `/api/admin/users/:id` | `PATCH` | `{ status: 'ACTIVE'\|'FROZEN' }` | `{ id, status }` | `src/services/api/admin.api.ts` -> `AdminDashboardPage.tsx` |
