import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: string | string[];
  public?: boolean; // Allow unauthenticated access when true
}

export function ProtectedRoute({ children, requireRole, public: isPublic = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Public routes allow unauthenticated access - render immediately, don't block on loading
  if (isPublic) {
    // Check if this is a customer route and user is authenticated admin/employee
    const isCustomerRoute = location.pathname.startsWith('/customers/');
    
    // If user is authenticated and on customer route, check role
    if (!isLoading && isAuthenticated && isCustomerRoute && user) {
      // Redirect admin/employee away from customer routes
      if (user.role === 'admin' || user.role === 'employee') {
        return <Navigate to="/dashboard" replace />;
      }
      // Customer role can access customer routes - continue
    }
    
    // If user is authenticated and role is required, check after loading completes
    if (!isLoading && isAuthenticated && requireRole) {
      const allowedRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
      if (user && !allowedRoles.includes(user.role)) {
        // Redirect authenticated users with wrong role
        if (user.role === 'admin') {
          return <Navigate to="/dashboard" replace />;
        } else if (user.role === 'employee') {
          return <Navigate to="/dashboard" replace />;
        } else if (user.role === 'customer') {
          return <Navigate to="/customers/dashboard" replace />;
        }
      }
    }
    // Allow access for public routes - render immediately
    return <>{children}</>;
  }

  // Protected routes require authentication - show loading during auth check
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#242426]">
        <div className="text-center">
          <div className="mb-4 text-white">Loading...</div>
          <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 animate-pulse bg-[#B39CD0]"></div>
          </div>
        </div>
      </div>
    );
  }

  // Protected routes require authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (requireRole) {
    const allowedRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
    if (!user || !allowedRoles.includes(user.role)) {
      // Redirect based on user role
      if (user?.role === 'admin') {
        return <Navigate to="/dashboard" replace />;
      } else if (user?.role === 'employee') {
        return <Navigate to="/dashboard" replace />;
      } else if (user?.role === 'customer') {
        return <Navigate to="/customers/dashboard" replace />;
      }
      // Default fallback - redirect customers to their dashboard
      return <Navigate to="/customers/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
