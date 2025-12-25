import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense, ReactNode, ComponentType } from 'react';

import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { useAuth } from '../context/AuthContext';

// Lazy load pages with error handling and preloading support
const createLazyRoute = (importFn: () => Promise<{ default: ComponentType }>) => {
  return lazy(() => 
    importFn().catch((error) => {
      // Log error but don't crash the app
      console.error('Failed to load route:', error);
      // Return a fallback component
      return {
        default: () => (
          <div className="flex min-h-screen items-center justify-center bg-[#242426]">
            <div className="text-center">
              <h2 className="mb-4 text-xl font-bold text-red-400">Failed to Load Page</h2>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C]"
              >
                Reload
              </button>
            </div>
          </div>
        ),
      };
    })
  );
};

// Critical routes - preload on idle
const preloadRoute = (importFn: () => Promise<unknown>) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFn();
    }, { timeout: 2000 });
  }
};

// Lazy load pages for better performance
const NotFoundPage = createLazyRoute(() => import('../pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const LoginPage = createLazyRoute(() => import('../pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = createLazyRoute(() => import('../pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = createLazyRoute(() => import('../pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = createLazyRoute(() => import('../pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const VerifyPendingPage = createLazyRoute(() => import('../pages/auth/VerifyPendingPage').then(m => ({ default: m.VerifyPendingPage })));
const VerifyEmailPage = createLazyRoute(() => import('../pages/auth/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));
const AuthSuccessPage = createLazyRoute(() => import('../pages/auth/AuthSuccessPage').then(m => ({ default: m.AuthSuccessPage })));
const SignupSuccessPage = createLazyRoute(() => import('../pages/auth/SignupSuccessPage').then(m => ({ default: m.SignupSuccessPage })));
const GoogleLoginCallback = createLazyRoute(() => import('../pages/auth/GoogleLoginCallback').then(m => ({ default: m.GoogleLoginCallback })));
const GoogleSignupCallback = createLazyRoute(() => import('../pages/auth/GoogleSignupCallback').then(m => ({ default: m.GoogleSignupCallback })));
const DashboardPage = createLazyRoute(() => import('../pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));

// Preload critical routes
preloadRoute(() => import('../pages/auth/LoginPage'));
preloadRoute(() => import('../pages/dashboard/DashboardPage'));

// Other routes
const AccountsListPage = createLazyRoute(() => import('../pages/accounts/AccountsListPage').then(m => ({ default: m.AccountsListPage })));
const AccountDetailPage = createLazyRoute(() => import('../pages/accounts/AccountDetailPage').then(m => ({ default: m.AccountDetailPage })));
const CalendarPage = createLazyRoute(() => import('../pages/calendar/CalendarPage').then(m => ({ default: m.CalendarPage })));
const ChatPage = createLazyRoute(() => import('../pages/chat/ChatPage').then(m => ({ default: m.ChatPage })));
const ContactsListPage = createLazyRoute(() => import('../pages/contacts/ContactsListPage').then(m => ({ default: m.ContactsListPage })));
const ContactDetailPage = createLazyRoute(() => import('../pages/contacts/ContactDetailPage').then(m => ({ default: m.ContactDetailPage })));
const DocumentsPage = createLazyRoute(() => import('../pages/documents/DocumentsPage').then(m => ({ default: m.DocumentsPage })));
const LeadsListPage = createLazyRoute(() => import('../pages/leads/LeadsListPage').then(m => ({ default: m.LeadsListPage })));
const LeadDetailPage = createLazyRoute(() => import('../pages/leads/LeadDetailPage').then(m => ({ default: m.LeadDetailPage })));
const DealsListPage = createLazyRoute(() => import('../pages/deals/DealsListPage').then(m => ({ default: m.DealsListPage })));
const DealDetailPage = createLazyRoute(() => import('../pages/deals/DealDetailPage').then(m => ({ default: m.DealDetailPage })));
const ReportsPage = createLazyRoute(() => import('../pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const QuotesListPage = createLazyRoute(() => import('../pages/quotes/QuotesListPage').then(m => ({ default: m.QuotesListPage })));
const QuoteDetailPage = createLazyRoute(() => import('../pages/quotes/QuoteDetailPage').then(m => ({ default: m.QuoteDetailPage })));
const InvoicesListPage = createLazyRoute(() => import('../pages/invoices/InvoicesListPage').then(m => ({ default: m.InvoicesListPage })));
const InvoiceDetailPage = createLazyRoute(() => import('../pages/invoices/InvoiceDetailPage').then(m => ({ default: m.InvoiceDetailPage })));
const SettingsOverviewPage = createLazyRoute(() => import('../pages/settings/SettingsOverviewPage').then(m => ({ default: m.SettingsOverviewPage })));
const SettingsRolesPage = createLazyRoute(() => import('../pages/settings/RolesPage').then(m => ({ default: m.SettingsRolesPage })));
const SettingsTeamsPage = createLazyRoute(() => import('../pages/settings/TeamsPage').then(m => ({ default: m.SettingsTeamsPage })));
const SettingsUsersPage = createLazyRoute(() => import('../pages/settings/UsersPage').then(m => ({ default: m.SettingsUsersPage })));
const ProfileSettingsPage = createLazyRoute(() => import('../pages/settings/ProfileSettingsPage').then(m => ({ default: m.ProfileSettingsPage })));

// Admin routes
const EmployeesListPage = createLazyRoute(() => import('../pages/admin/EmployeesListPage').then(m => ({ default: m.EmployeesListPage })));
const EmployeePerformancePage = createLazyRoute(() => import('../pages/admin/EmployeePerformancePage').then(m => ({ default: m.EmployeePerformancePage })));
const AuditLogView = createLazyRoute(() => import('../pages/admin/AuditLogView').then(m => ({ default: m.AuditLogView })));
const AdminProductsListPage = createLazyRoute(() => 
  import('../pages/admin/ProductsListPage').then(m => ({ 
    default: m.AdminProductsListPage || m.default 
  }))
);
const AdminProductDetailPage = createLazyRoute(() => 
  import('../pages/admin/ProductDetailPage').then(m => ({ 
    default: m.ProductDetailPage 
  }))
);

// Employee routes
const EmployeeProductsListPage = createLazyRoute(() => 
  import('../pages/employees/ProductsListPage').then(m => ({ 
    default: m.ProductsListPage || m.default 
  }))
);
const EmployeeProductDetailPage = createLazyRoute(() => 
  import('../pages/admin/ProductDetailPage').then(m => ({ 
    default: m.ProductDetailPage 
  }))
);
const MyPerformancePage = createLazyRoute(() => import('../pages/employees/MyPerformancePage').then(m => ({ default: m.MyPerformancePage })));
const UsersListPage = createLazyRoute(() => import('../pages/employees/UsersListPage').then(m => ({ default: m.UsersListPage })));

// Customer routes
const CustomerProductsPage = createLazyRoute(() => import('../pages/customers/ProductsPage').then(m => ({ default: m.ProductsPage })));
const ProductDetailPage = createLazyRoute(() => import('../pages/customers/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const CustomerDashboardPage = createLazyRoute(() => import('../pages/customers/CustomerDashboardPage').then(m => ({ default: m.CustomerDashboardPage })));

// Loading component for lazy routes
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#242426]">
    <div className="text-center">
      <div className="mb-4 text-white">Loading...</div>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/3 animate-pulse bg-[#B39CD0]"></div>
      </div>
    </div>
  </div>
);

// Wrapper component for lazy loading with Suspense
const LazyWrapper = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);

// Default redirect component that routes based on user role
// For authenticated users, redirect to their role-specific dashboard
// For unauthenticated users, redirect to customer dashboard (handled by route)
function DefaultRedirect() {
  const { user, isAuthenticated } = useAuth();
  
  // If authenticated, redirect based on role
  if (isAuthenticated && user) {
    if (user.role === 'admin' || user.role === 'employee') {
      return <Navigate to="/dashboard" replace />;
    }
    // Customer role or any other role goes to customer dashboard
    return <Navigate to="/customers/dashboard" replace />;
  }
  
  // For unauthenticated users, redirect to customer dashboard
  // This route is public, so it will render immediately
  return <Navigate to="/customers/dashboard" replace />;
}

export const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: <LazyWrapper><LoginPage /></LazyWrapper>,
    errorElement: <LazyWrapper><NotFoundPage /></LazyWrapper>,
  },
  {
    path: '/register',
    element: <LazyWrapper><RegisterPage /></LazyWrapper>,
    errorElement: <LazyWrapper><NotFoundPage /></LazyWrapper>,
  },
  {
    path: '/forgot-password',
    element: <LazyWrapper><ForgotPasswordPage /></LazyWrapper>,
    errorElement: <LazyWrapper><NotFoundPage /></LazyWrapper>,
  },
  {
    path: '/reset-password',
    element: <LazyWrapper><ResetPasswordPage /></LazyWrapper>,
    errorElement: <LazyWrapper><NotFoundPage /></LazyWrapper>,
  },
  {
    path: '/auth/verify-pending',
    element: <LazyWrapper><VerifyPendingPage /></LazyWrapper>,
    errorElement: <LazyWrapper><NotFoundPage /></LazyWrapper>,
  },
  {
    path: '/auth/verify-email',
    element: <LazyWrapper><VerifyEmailPage /></LazyWrapper>,
    errorElement: <LazyWrapper><NotFoundPage /></LazyWrapper>,
  },
  {
    path: '/auth/success',
    element: <LazyWrapper><AuthSuccessPage /></LazyWrapper>,
    errorElement: <LazyWrapper><NotFoundPage /></LazyWrapper>,
  },
  {
    path: '/auth/signup-success',
    element: <LazyWrapper><SignupSuccessPage /></LazyWrapper>,
    errorElement: <LazyWrapper><NotFoundPage /></LazyWrapper>,
  },
  {
    path: '/auth/google-callback',
    element: <LazyWrapper><GoogleLoginCallback /></LazyWrapper>,
    errorElement: <LazyWrapper><NotFoundPage /></LazyWrapper>,
  },
  {
    path: '/auth/google-signup-callback',
    element: <LazyWrapper><GoogleSignupCallback /></LazyWrapper>,
    errorElement: <LazyWrapper><NotFoundPage /></LazyWrapper>,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute public>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        element: <DefaultRedirect />,
      },
      // Public customer routes
      {
        path: 'customers/dashboard',
        element: (
          <ProtectedRoute public>
            <LazyWrapper><CustomerDashboardPage /></LazyWrapper>
          </ProtectedRoute>
        ),
        handle: { breadcrumb: 'Dashboard' },
      },
      {
        path: 'customers/products',
        element: (
          <ProtectedRoute public>
            <LazyWrapper><CustomerProductsPage /></LazyWrapper>
          </ProtectedRoute>
        ),
        handle: { breadcrumb: 'Products' },
      },
      {
        path: 'customers/products/:id',
        element: (
          <ProtectedRoute public>
            <LazyWrapper><ProductDetailPage /></LazyWrapper>
          </ProtectedRoute>
        ),
        handle: { breadcrumb: 'Product Details' },
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute requireRole={['admin', 'employee']}>
            <LazyWrapper><DashboardPage /></LazyWrapper>
          </ProtectedRoute>
        ),
        handle: { breadcrumb: 'Dashboard' },
      },
      // Admin routes
      {
        path: 'admin/employees',
        element: (
          <ProtectedRoute requireRole="admin">
            <LazyWrapper><EmployeesListPage /></LazyWrapper>
          </ProtectedRoute>
        ),
        handle: { breadcrumb: 'Employees' },
      },
      {
        path: 'admin/performance',
        element: (
          <ProtectedRoute requireRole="admin">
            <LazyWrapper><EmployeePerformancePage /></LazyWrapper>
          </ProtectedRoute>
        ),
        handle: { breadcrumb: 'Performance' },
      },
      {
        path: 'admin/employees/:id/performance',
        element: (
          <ProtectedRoute requireRole="admin">
            <LazyWrapper><EmployeePerformancePage /></LazyWrapper>
          </ProtectedRoute>
        ),
        handle: { breadcrumb: 'Employee Performance' },
      },
      {
        path: 'admin/audit',
        element: (
          <ProtectedRoute requireRole="admin">
            <LazyWrapper><AuditLogView /></LazyWrapper>
          </ProtectedRoute>
        ),
        handle: { breadcrumb: 'Audit Trail' },
      },
      {
        path: 'admin/products',
        element: (
          <ProtectedRoute requireRole="admin">
            <LazyWrapper><AdminProductsListPage /></LazyWrapper>
          </ProtectedRoute>
        ),
        handle: { breadcrumb: 'Products' },
      },
      {
        path: 'admin/products/:id',
        element: (
          <ProtectedRoute requireRole="admin">
            <LazyWrapper><AdminProductDetailPage /></LazyWrapper>
          </ProtectedRoute>
        ),
        handle: { breadcrumb: 'Product Details' },
      },
      // Employee routes
      {
        path: 'employees/products',
        element: (
          <ProtectedRoute requireRole={['employee', 'admin']}>
            <LazyWrapper><EmployeeProductsListPage /></LazyWrapper>
          </ProtectedRoute>
        ),
        handle: { breadcrumb: 'Products' },
      },
      {
        path: 'employees/products/:id',
        element: (
          <ProtectedRoute requireRole={['employee', 'admin']}>
            <LazyWrapper><EmployeeProductDetailPage /></LazyWrapper>
          </ProtectedRoute>
        ),
        handle: { breadcrumb: 'Product Details' },
      },
      {
        path: 'employees/performance',
        element: (
          <ProtectedRoute requireRole={['employee', 'admin']}>
            <LazyWrapper><MyPerformancePage /></LazyWrapper>
          </ProtectedRoute>
        ),
        handle: { breadcrumb: 'My Performance' },
      },
      {
        path: 'employees/users',
        element: (
          <ProtectedRoute requireRole={['employee', 'admin']}>
            <LazyWrapper><UsersListPage /></LazyWrapper>
          </ProtectedRoute>
        ),
        handle: { breadcrumb: 'Users' },
      },
      // Legacy CRM routes (for admin, user, sales, support roles)
      {
        path: 'contacts',
        handle: { breadcrumb: 'Contacts' },
        children: [
          {
            index: true,
            element: <LazyWrapper><ContactsListPage /></LazyWrapper>,
            handle: { breadcrumb: 'Contacts' },
          },
          {
            path: ':id',
            element: <LazyWrapper><ContactDetailPage /></LazyWrapper>,
            handle: { breadcrumb: 'Contact Profile' },
          },
        ],
      },
      {
        path: 'accounts',
        element: <LazyWrapper><AccountsListPage /></LazyWrapper>,
        handle: { breadcrumb: 'Accounts' },
      },
      {
        path: 'accounts/:id',
        element: <LazyWrapper><AccountDetailPage /></LazyWrapper>,
        handle: { breadcrumb: 'Account Details' },
      },
      {
        path: 'leads',
        element: <LazyWrapper><LeadsListPage /></LazyWrapper>,
        handle: { breadcrumb: 'Leads' },
      },
      {
        path: 'leads/:id',
        element: <LazyWrapper><LeadDetailPage /></LazyWrapper>,
        handle: { breadcrumb: 'Lead Details' },
      },
      {
        path: 'deals',
        element: <LazyWrapper><DealsListPage /></LazyWrapper>,
        handle: { breadcrumb: 'Deals' },
      },
      {
        path: 'deals/:id',
        element: <LazyWrapper><DealDetailPage /></LazyWrapper>,
        handle: { breadcrumb: 'Deal Details' },
      },
      {
        path: 'calendar',
        element: <LazyWrapper><CalendarPage /></LazyWrapper>,
        handle: { breadcrumb: 'Calendar' },
      },
      {
        path: 'chat',
        element: (
          <ProtectedRoute requireRole={['admin', 'employee']}>
            <LazyWrapper><ChatPage /></LazyWrapper>
          </ProtectedRoute>
        ),
        handle: { breadcrumb: 'Chat' },
      },
      {
        path: 'documents',
        element: <LazyWrapper><DocumentsPage /></LazyWrapper>,
        handle: { breadcrumb: 'Documents' },
      },
      {
        path: 'reports',
        element: <LazyWrapper><ReportsPage /></LazyWrapper>,
        handle: { breadcrumb: 'Reports' },
      },
      {
        path: 'quotes',
        handle: { breadcrumb: 'Quotes' },
        children: [
          {
            index: true,
            element: <LazyWrapper><QuotesListPage /></LazyWrapper>,
            handle: { breadcrumb: 'Quotes' },
          },
          {
            path: ':id',
            element: <LazyWrapper><QuoteDetailPage /></LazyWrapper>,
            handle: { breadcrumb: (match: { params: { id?: string } }) => `Quote ${match.params.id}` },
          },
        ],
      },
      {
        path: 'invoices',
        handle: { breadcrumb: 'Invoices' },
        children: [
          {
            index: true,
            element: <LazyWrapper><InvoicesListPage /></LazyWrapper>,
            handle: { breadcrumb: 'Invoices' },
          },
          {
            path: ':id',
            element: <LazyWrapper><InvoiceDetailPage /></LazyWrapper>,
            handle: { breadcrumb: (match: { params: { id?: string } }) => `Invoice ${match.params.id}` },
          },
        ],
      },
      {
        path: 'settings',
        handle: { breadcrumb: 'Settings' },
        children: [
          {
            index: true,
            element: <LazyWrapper><SettingsOverviewPage /></LazyWrapper>,
            handle: { breadcrumb: 'Overview' },
          },
          {
            path: 'users',
            element: <LazyWrapper><SettingsUsersPage /></LazyWrapper>,
            handle: { breadcrumb: 'Users' },
          },
          {
            path: 'profile',
            element: <LazyWrapper><ProfileSettingsPage /></LazyWrapper>,
            handle: { breadcrumb: 'Profile' },
          },
          {
            path: 'teams',
            element: <LazyWrapper><SettingsTeamsPage /></LazyWrapper>,
            handle: { breadcrumb: 'Teams' },
          },
          {
            path: 'roles',
            element: <LazyWrapper><SettingsRolesPage /></LazyWrapper>,
            handle: { breadcrumb: 'Roles' },
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <LazyWrapper><NotFoundPage /></LazyWrapper>,
  },
]);
