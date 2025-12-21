import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { setAccessToken } from '../../services/api/http';
import { API_BASE_URL } from '../../services/api/config';
import { logger } from '../../utils/logger';
import { Loader2 } from 'lucide-react';

const USER_STORAGE_KEY = 'user';
const ACCESS_TOKEN_KEY = 'accessToken';

/**
 * GoogleLoginCallback - Dedicated route for handling Google OAuth login callbacks
 * This runs BEFORE ProtectedRoute, ensuring we can set up the session before any auth checks
 * 
 * Flow:
 * 1. Extract token from URL
 * 2. Save token to localStorage (synchronous)
 * 3. Fetch user data
 * 4. Save user to localStorage (synchronous)
 * 5. Redirect to appropriate dashboard
 */
export function GoogleLoginCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      logger.error('[GoogleLoginCallback] No token in URL');
      setStatus('error');
      setErrorMessage('No authentication token provided. Redirecting to login...');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
      return;
    }

    const processLogin = async () => {
      try {
        logger.debug('[GoogleLoginCallback] Processing Google login callback...');

        // STEP 1: Save token to localStorage IMMEDIATELY (synchronous)
        setAccessToken(token);
        logger.debug('[GoogleLoginCallback] Token saved to localStorage');

        // STEP 2: Fetch user data
        const apiBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
        const apiUrl = `${apiBase}/auth/me`;
        
        logger.debug('[GoogleLoginCallback] Fetching user from:', apiUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

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
          logger.error('[GoogleLoginCallback] API request failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          });
          
          if (response.status === 401) {
            throw new Error('Invalid or expired token');
          } else if (response.status === 404) {
            throw new Error('Authentication endpoint not found');
          } else {
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
        }

        const data = await response.json();
        
        if (!data || !data.user) {
          logger.error('[GoogleLoginCallback] Invalid API response format:', data);
          throw new Error('Invalid response format: missing user data');
        }

        const { user: userData } = data;
        
        logger.debug('[GoogleLoginCallback] User data fetched successfully', {
          userId: userData._id,
          email: userData.email,
          role: userData.role,
        });

        // STEP 3: Save user to localStorage IMMEDIATELY (synchronous)
        // This is CRITICAL - it allows AuthContext to see the user immediately
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        logger.debug('[GoogleLoginCallback] User saved to localStorage (synchronous)');

        // STEP 4: Trigger a custom event to notify AuthContext immediately
        // This works even if AuthContext is already initialized
        const customEvent = new CustomEvent('auth:user-updated', {
          detail: { user: userData, token },
        });
        window.dispatchEvent(customEvent);
        logger.debug('[GoogleLoginCallback] Custom auth event dispatched');

        // STEP 5: Determine redirect path based on user role
        let redirectPath = '/dashboard'; // Default for admin/employee
        
        if (userData.role === 'customer') {
          redirectPath = '/customers/dashboard';
        } else if (userData.role === 'admin' || userData.role === 'employee') {
          redirectPath = '/dashboard';
        }

        logger.debug('[GoogleLoginCallback] Redirecting to:', redirectPath);

        // STEP 6: Force a full page reload to ensure AuthContext re-initializes
        // This is the most reliable way - AuthContext will load user from localStorage on mount
        // and set up token refresh/validation automatically
        setStatus('success');
        
        // Small delay to show success message, then reload
        setTimeout(() => {
          // Use window.location.href for full page reload
          // This ensures AuthContext completely re-initializes with the new user
          window.location.href = redirectPath;
        }, 300);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[GoogleLoginCallback] Failed to process login:', {
          error: errorMessage,
          details: error,
        });
        
        // Clean up on error
        try {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
          logger.debug('[GoogleLoginCallback] Cleared localStorage on error');
        } catch (cleanupError) {
          logger.error('[GoogleLoginCallback] Failed to cleanup localStorage:', cleanupError);
        }
        
        setStatus('error');
        setErrorMessage(`Authentication failed: ${errorMessage}. Redirecting to login...`);
        
        setTimeout(() => {
          navigate('/login?error=' + encodeURIComponent(errorMessage), { replace: true });
        }, 2000);
      }
    };

    processLogin();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#242426] px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-[#1F1F21] p-8 text-center">
          {status === 'processing' && (
            <>
              <div className="mb-6 flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-[#A8DADC]" />
              </div>
              <h1 className="mb-4 text-2xl font-bold text-white">Signing you in...</h1>
              <p className="text-white/60">Please wait while we complete your login.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-green-500/10 p-4">
                  <Loader2 className="h-12 w-12 animate-spin text-green-500" />
                </div>
              </div>
              <h1 className="mb-4 text-2xl font-bold text-white">Login Successful!</h1>
              <p className="text-white/60">Redirecting to your dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-red-500/10 p-4">
                  <div className="h-12 w-12 rounded-full bg-red-500/20"></div>
                </div>
              </div>
              <h1 className="mb-4 text-2xl font-bold text-white">Authentication Failed</h1>
              <p className="mb-6 text-white/60">{errorMessage}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

