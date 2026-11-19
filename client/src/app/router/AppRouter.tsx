import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminDashboardPage } from '../../features/admin/pages/AdminDashboardPage.js';
import { SignInPage } from '../../features/auth/pages/SignInPage.js';
import { SignUpPage } from '../../features/auth/pages/SignUpPage.js';
import { DashboardPage } from '../../features/dashboard/pages/DashboardPage.js';
import { OperatorDashboardPage } from '../../features/operator/pages/OperatorDashboardPage.js';
import { PaymentPage } from '../../features/payments/pages/PaymentPage.js';
import { ProfilePage } from '../../features/profile/pages/ProfilePage.js';
import { StationsPage } from '../../features/stations/pages/StationsPage.js';
import { TransactionsPage } from '../../features/transactions/pages/TransactionsPage.js';
import { TransferPage } from '../../features/transfers/pages/TransferPage.js';
import { WalletsPage } from '../../features/wallet/pages/WalletsPage.js';
import { ProtectedRoute } from './ProtectedRoute.js';

export function AppRouter() {
  return (
    <Routes>
      {/* Public Clerk Authentication Routes */}
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      {/* Protected Authenticated Customer / Driver Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wallets"
        element={
          <ProtectedRoute>
            <WalletsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stations"
        element={
          <ProtectedRoute>
            <StationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pay"
        element={
          <ProtectedRoute>
            <PaymentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transfer"
        element={
          <ProtectedRoute>
            <TransferPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <TransactionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Role-Restricted Station Operator & Station Admin Route */}
      <Route
        path="/operator"
        element={
          <ProtectedRoute allowedRoles={['OPERATOR', 'ADMIN']}>
            <OperatorDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Role-Restricted Super Admin Console Route */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

