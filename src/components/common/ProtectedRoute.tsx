import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: string | string[];
  public?: boolean; // Allow unauthenticated access when true
}

const USER_STORAGE_KEY = 'user';

export function ProtectedRoute({ children, requireRole, public: isPublic = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, updateUser } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [hasCheckedToken, setHasCheckedToken] = useState(false);
  const [isProcessingToken, setIsProcessingToken] = useState(false);

  // Check if token is in URL
  const tokenInUrl = searchParams.get('token');

  // Fallback check: If token exists in URL but user is not authenticated, check localStorage
  useEffect(() => {
    if (tokenInUrl && !isAuthenticated && !isLoading && !hasCheckedToken) {
      setHasCheckedToken(true);
      setIsProcessingToken(true);
      
      // Check localStorage immediately first
      const checkImmediate = () => {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            // Update user state directly if found in localStorage
            updateUser(parsedUser);
            setIsProcessingToken(false);
            return true;
          } catch (error) {
            console.error('[ProtectedRoute] Failed to parse user from localStorage:', error);
          }
        }
        return false;
      };

      // Check immediately
      if (checkImmediate()) {
        return;
      }
      
      // If not found immediately, check periodically
      let checkCount = 0;
      const maxChecks = 10; // Check 10 times (every 200ms = 2 seconds total)
      const intervalId = setInterval(() => {
        checkCount++;
        if (checkImmediate() || checkCount >= maxChecks) {
          clearInterval(intervalId);
          if (checkCount >= maxChecks) {
            setIsProcessingToken(false);
          }
        }
      }, 200);
      
      return () => clearInterval(intervalId);
    } else if (tokenInUrl && isAuthenticated) {
      // Token processed and user authenticated, stop processing
      setIsProcessingToken(false);
      setHasCheckedToken(false); // Reset so it can check again if needed
    } else if (!tokenInUrl) {
      // No token in URL, not processing
      setIsProcessingToken(false);
      setHasCheckedToken(false); // Reset
    }
  }, [searchParams, isAuthenticated, isLoading, hasCheckedToken, updateUser, tokenInUrl]);

  // If token is in URL and we're processing it, show loading state
  // This prevents showing unauthenticated UI while TokenHandler processes the token
  if (tokenInUrl && !isAuthenticated && (isLoading || isProcessingToken)) {
    console.log('[ProtectedRoute] Token in URL, showing loading state', { tokenInUrl: !!tokenInUrl, isAuthenticated, isLoading, isProcessingToken });
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#242426]">
        <div className="text-center">
          <div className="mb-4 text-white">Setting up your session...</div>
          <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 animate-pulse bg-[#B39CD0]"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Debug logging
  if (tokenInUrl) {
    console.log('[ProtectedRoute] Token in URL but not showing loading', { 
      tokenInUrl: !!tokenInUrl, 
      isAuthenticated, 
      isLoading, 
      isProcessingToken,
      hasUser: !!user 
    });
  }

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
