import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { setAccessToken } from '../../services/api/http';
import { API_BASE_URL } from '../../services/api/config';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { logger } from '../../utils/logger';

export function AuthSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessedRef.current) {
      return;
    }

    const token = searchParams.get('token');

    if (!token) {
      logger.warn('[AuthSuccessPage] No token provided in URL');
      setStatus('error');
      setErrorMessage('No authentication token provided.');
      return;
    }

    // Mark as processing
    hasProcessedRef.current = true;

    // Set the access token immediately
    setAccessToken(token);
    logger.debug('[AuthSuccessPage] Token set, fetching user data...');

    // Fetch user data directly with the token (bypass complex refresh logic)
    const fetchUser = async () => {
      try {
        // Build API URL properly
        const apiBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
        const apiUrl = `${apiBase}/auth/me`;
        
        logger.debug('[AuthSuccessPage] Fetching from:', apiUrl);

        // Direct fetch with timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          logger.error('[AuthSuccessPage] API error:', response.status, errorText);
          
          if (response.status === 401) {
            throw new Error('Invalid or expired token');
          } else if (response.status === 404) {
            throw new Error('Authentication endpoint not found');
          } else {
            throw new Error(`Server error: ${response.status}`);
          }
        }

        const data = await response.json();
        
        if (!data || !data.user) {
          throw new Error('Invalid response format');
        }

        const { user } = data;
        
        logger.debug('[AuthSuccessPage] User data fetched successfully', { 
          userId: user._id, 
          email: user.email, 
          role: user.role 
        });

        // Update user state in context (this also updates localStorage)
        updateUser(user);
        setStatus('success');

        // Check if this is a login mode (instant redirect) or signup mode (with delay)
        const mode = searchParams.get('mode');
        const isLoginMode = mode === 'login';
        const redirectDelay = isLoginMode ? 100 : 1500; // Very short delay for login, 1.5s for signup

        logger.debug('[AuthSuccessPage] Redirecting to dashboard', { 
          mode, 
          isLoginMode, 
          role: user.role, 
          delay: redirectDelay 
        });

        // Redirect based on user role
        setTimeout(() => {
          let targetPath = '/dashboard'; // Default for admin/employee
          
          if (user.role === 'customer') {
            targetPath = '/customers/dashboard';
          } else if (user.role === 'admin' || user.role === 'employee') {
            targetPath = '/dashboard';
          }

          logger.debug('[AuthSuccessPage] Navigating to', targetPath);
          navigate(targetPath, { replace: true });
        }, redirectDelay);
      } catch (error) {
        let errorMsg = 'Failed to authenticate. Please try signing in again.';
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            errorMsg = 'Request timed out. Please check your connection and try again.';
          } else if (error.message.includes('401') || error.message.includes('Invalid or expired')) {
            errorMsg = 'Invalid or expired token. Please try signing in again.';
          } else if (error.message.includes('404') || error.message.includes('not found')) {
            errorMsg = 'Authentication service unavailable. Please try again later.';
          } else if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
            errorMsg = 'Unable to connect to server. Please check your connection and try again.';
          } else {
            errorMsg = error.message;
          }
          logger.error('[AuthSuccessPage] Failed to fetch user data:', error.message, error);
        } else {
          logger.error('[AuthSuccessPage] Unknown error:', error);
        }
        
        setStatus('error');
        setErrorMessage(errorMsg);
        
        // Reset processing flag on error so user can retry
        hasProcessedRef.current = false;
      }
    };

    // Small delay to ensure token is set in localStorage before API call
    const timeoutId = setTimeout(() => {
      fetchUser();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchParams, navigate, updateUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#242426] px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-[#1F1F21] p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="mb-6 flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-[#A8DADC]" />
              </div>
              <h1 className="mb-4 text-2xl font-bold text-white">Completing Sign In...</h1>
              <p className="text-white/60">Please wait while we set up your account.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-green-500/10 p-4">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
              </div>
              <h1 className="mb-4 text-2xl font-bold text-white">Welcome!</h1>
              <p className="mb-6 text-white/60">
                You've successfully signed in. Redirecting to your dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-red-500/10 p-4">
                  <XCircle className="h-12 w-12 text-red-500" />
                </div>
              </div>
              <h1 className="mb-4 text-2xl font-bold text-white">Authentication Failed</h1>
              <p className="mb-6 text-white/60">
                {errorMessage}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="rounded-md bg-gradient-to-r from-[#A8DADC] to-[#B39CD0] px-6 py-2.5 font-semibold text-[#1A1A1C] transition hover:opacity-90"
              >
                Go to Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

