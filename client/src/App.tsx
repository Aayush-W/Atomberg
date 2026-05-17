import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { Role } from '@/types';

// Layouts
import AppLayout from '@/components/layout/AppLayout';

// Auth
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));

// Employee
const EmployeeDashboard = lazy(() => import('@/pages/employee/DashboardPage'));
const EmployeeGoals = lazy(() => import('@/pages/employee/GoalsPage'));
const NewGoalPage = lazy(() => import('@/pages/employee/NewGoalPage'));
const CheckInPage = lazy(() => import('@/pages/employee/CheckInPage'));
const HistoryPage = lazy(() => import('@/pages/employee/HistoryPage'));

// Manager
const ManagerDashboard = lazy(() => import('@/pages/manager/DashboardPage'));
const ManagerApprovals = lazy(() => import('@/pages/manager/ApprovalsPage'));
const ManagerTeam = lazy(() => import('@/pages/manager/TeamPage'));
const ManagerSharedGoals = lazy(() => import('@/pages/manager/SharedGoalsPage'));
const ManagerAnalytics = lazy(() => import('@/pages/manager/AnalyticsPage'));
const DependencyGraph = lazy(() => import('@/pages/manager/DependencyGraphPage'));
const ManagerDelegations = lazy(() => import('@/pages/manager/DelegationsPage'));

// Admin
const AdminDashboard = lazy(() => import('@/pages/admin/DashboardPage'));
const AdminCycles = lazy(() => import('@/pages/admin/CyclesPage'));
const AdminUsers = lazy(() => import('@/pages/admin/UsersPage'));
const AdminGoals = lazy(() => import('@/pages/admin/GoalsPage'));
const AdminEscalations = lazy(() => import('@/pages/admin/EscalationsPage'));
const AdminReports = lazy(() => import('@/pages/admin/ReportsPage'));
const AdminAudit = lazy(() => import('@/pages/admin/AuditPage'));
const AdminMLInsights = lazy(() => import('@/pages/admin/MLInsightsPage'));

// ─── Route Guards ────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!user) {
    // Session state mismatch - force logout and redirect
    logout();
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.role)) {
    const redirectMap: Record<Role, string> = {
      EMPLOYEE: '/employee/dashboard',
      MANAGER: '/manager/dashboard',
      ADMIN: '/admin/dashboard',
    };
    return <Navigate to={redirectMap[user?.role ?? 'EMPLOYEE']} replace />;
  }
  return <>{children}</>;
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const user = useAuthStore((s) => s.user);

  const defaultDashboard =
    user?.role === 'ADMIN'
      ? '/admin/dashboard'
      : user?.role === 'MANAGER'
      ? '/manager/dashboard'
      : '/employee/dashboard';

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        {/* Root redirect */}
        <Route index element={<Navigate to={defaultDashboard} replace />} />

        {/* Employee */}
        <Route
          path="employee/dashboard"
          element={
            <RequireRole roles={['EMPLOYEE']}>
              <EmployeeDashboard />
            </RequireRole>
          }
        />
        <Route
          path="employee/goals"
          element={
            <RequireRole roles={['EMPLOYEE']}>
              <EmployeeGoals />
            </RequireRole>
          }
        />
        <Route
          path="employee/goals/new"
          element={
            <RequireRole roles={['EMPLOYEE']}>
              <NewGoalPage />
            </RequireRole>
          }
        />
        <Route
          path="employee/checkin"
          element={
            <RequireRole roles={['EMPLOYEE']}>
              <CheckInPage />
            </RequireRole>
          }
        />
        <Route
          path="employee/history"
          element={
            <RequireRole roles={['EMPLOYEE']}>
              <HistoryPage />
            </RequireRole>
          }
        />

        {/* Manager */}
        <Route
          path="manager/dashboard"
          element={
            <RequireRole roles={['MANAGER', 'ADMIN']}>
              <ManagerDashboard />
            </RequireRole>
          }
        />
        <Route
          path="manager/approvals"
          element={
            <RequireRole roles={['MANAGER', 'ADMIN']}>
              <ManagerApprovals />
            </RequireRole>
          }
        />
        <Route
          path="manager/team"
          element={
            <RequireRole roles={['MANAGER', 'ADMIN']}>
              <ManagerTeam />
            </RequireRole>
          }
        />
        <Route
          path="manager/shared-goals"
          element={
            <RequireRole roles={['MANAGER', 'ADMIN']}>
              <ManagerSharedGoals />
            </RequireRole>
          }
        />
        <Route
          path="manager/analytics"
          element={
            <RequireRole roles={['MANAGER', 'ADMIN']}>
              <ManagerAnalytics />
            </RequireRole>
          }
        />
        <Route
          path="manager/dependency-graph"
          element={
            <RequireRole roles={['MANAGER', 'ADMIN']}>
              <DependencyGraph />
            </RequireRole>
          }
        />
        <Route
          path="manager/delegations"
          element={
            <RequireRole roles={['MANAGER', 'ADMIN']}>
              <ManagerDelegations />
            </RequireRole>
          }
        />

        {/* Admin */}
        <Route
          path="admin/dashboard"
          element={
            <RequireRole roles={['ADMIN']}>
              <AdminDashboard />
            </RequireRole>
          }
        />
        <Route
          path="admin/cycles"
          element={
            <RequireRole roles={['ADMIN']}>
              <AdminCycles />
            </RequireRole>
          }
        />
        <Route
          path="admin/users"
          element={
            <RequireRole roles={['ADMIN']}>
              <AdminUsers />
            </RequireRole>
          }
        />
        <Route
          path="admin/goals"
          element={
            <RequireRole roles={['ADMIN']}>
              <AdminGoals />
            </RequireRole>
          }
        />
        <Route
          path="admin/escalations"
          element={
            <RequireRole roles={['ADMIN']}>
              <AdminEscalations />
            </RequireRole>
          }
        />
        <Route
          path="admin/reports"
          element={
            <RequireRole roles={['ADMIN']}>
              <AdminReports />
            </RequireRole>
          }
        />
        <Route
          path="admin/audit"
          element={
            <RequireRole roles={['ADMIN']}>
              <AdminAudit />
            </RequireRole>
          }
        />
        <Route
          path="admin/ml-insights"
          element={
            <RequireRole roles={['ADMIN']}>
              <AdminMLInsights />
            </RequireRole>
          }
        />
        <Route
          path="admin/dependency-graph"
          element={
            <RequireRole roles={['ADMIN']}>
              <DependencyGraph />
            </RequireRole>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
