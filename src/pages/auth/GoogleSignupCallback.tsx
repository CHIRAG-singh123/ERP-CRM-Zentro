import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { setAccessToken } from '../../services/api/http';
import { API_BASE_URL } from '../../services/api/config';
import { logger } from '../../utils/logger';
import { Loader2, Mail, CheckCircle } from 'lucide-react';

const USER_STORAGE_KEY = 'user';
const ACCESS_TOKEN_KEY = 'accessToken';

/**
 * GoogleSignupCallback - Dedicated route for handling Google OAuth signup callbacks
 * This runs BEFORE ProtectedRoute, ensuring we can set up the session before any auth checks
 * 
 * Flow:
 * 1. Extract token from URL
 * 2. Save token to localStorage (synchronous)
 * 3. Fetch user data
 * 4. Save user to localStorage (synchronous)
 * 5. Show confirmation page with email verification message
 * 6. Redirect to dashboard (user can access even if not verified)
 */
export function GoogleSignupCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      logger.error('[GoogleSignupCallback] No token in URL');
      setStatus('error');
      setErrorMessage('No authentication token provided. Redirecting to signup...');
      setTimeout(() => navigate('/register', { replace: true }), 2000);
      return;
    }

    const processSignup = async () => {
      try {
        logger.debug('[GoogleSignupCallback] Processing Google signup callback...');

        // STEP 1: Save token to localStorage IMMEDIATELY (synchronous)
        setAccessToken(token);
        logger.debug('[GoogleSignupCallback] Token saved to localStorage');

        // STEP 2: Fetch user data
        const apiBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
        const apiUrl = `${apiBase}/auth/me`;
        
        logger.debug('[GoogleSignupCallback] Fetching user from:', apiUrl);

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
          logger.error('[GoogleSignupCallback] API request failed:', {
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
          logger.error('[GoogleSignupCallback] Invalid API response format:', data);
          throw new Error('Invalid response format: missing user data');
        }

        const { user: fetchedUserData } = data;
        
        logger.debug('[GoogleSignupCallback] User data fetched successfully', {
          userId: fetchedUserData._id,
          email: fetchedUserData.email,
          role: fetchedUserData.role,
          isVerified: fetchedUserData.isVerified,
        });

        // STEP 3: Save user to localStorage IMMEDIATELY (synchronous)
        // This is CRITICAL - it allows AuthContext to see the user immediately
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fetchedUserData));
        logger.debug('[GoogleSignupCallback] User saved to localStorage (synchronous)');

        // STEP 4: Trigger a custom event to notify AuthContext immediately
        const customEvent = new CustomEvent('auth:user-updated', {
          detail: { user: fetchedUserData, token },
        });
        window.dispatchEvent(customEvent);
        logger.debug('[GoogleSignupCallback] Custom auth event dispatched');

        // STEP 5: Set user data and show confirmation page
        setUserData(fetchedUserData);
        setStatus('success');
        setShowConfirmation(true);

        // STEP 6: Auto-redirect to dashboard after showing confirmation
        // User can access dashboard even if email is not verified
        setTimeout(() => {
          let redirectPath = '/dashboard'; // Default for admin/employee
          
          if (fetchedUserData.role === 'customer') {
            redirectPath = '/customers/dashboard';
          } else if (fetchedUserData.role === 'admin' || fetchedUserData.role === 'employee') {
            redirectPath = '/dashboard';
          }

          logger.debug('[GoogleSignupCallback] Redirecting to:', redirectPath);
          
          // Force a full page reload to ensure AuthContext re-initializes
          window.location.href = redirectPath;
        }, 5000); // Show confirmation for 5 seconds

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[GoogleSignupCallback] Failed to process signup:', {
          error: errorMessage,
          details: error,
        });
        
        // Clean up on error
        try {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
          logger.debug('[GoogleSignupCallback] Cleared localStorage on error');
        } catch (cleanupError) {
          logger.error('[GoogleSignupCallback] Failed to cleanup localStorage:', cleanupError);
        }
        
        setStatus('error');
        setErrorMessage(`Signup failed: ${errorMessage}. Redirecting to signup...`);
        
        setTimeout(() => {
          navigate('/register?error=' + encodeURIComponent(errorMessage), { replace: true });
        }, 2000);
      }
    };

    processSignup();
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
              <h1 className="mb-4 text-2xl font-bold text-white">Completing Signup...</h1>
              <p className="text-white/60">Please wait while we set up your account.</p>
            </>
          )}

          {status === 'success' && showConfirmation && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-green-500/10 p-4">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
              </div>
              <h1 className="mb-4 text-2xl font-bold text-white">Welcome to Zentro!</h1>
              <p className="mb-6 text-white/60">
                Your account has been created successfully.
              </p>
              
              <div className="mb-6 rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 text-left">
                <div className="mb-3 flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="mb-2 font-semibold text-blue-400">Verify Your Email</h3>
                    <p className="text-sm text-white/80 mb-3">
                      We've sent a verification email to <strong className="text-white">{userData?.email}</strong>.
                    </p>
                    <p className="text-sm text-white/70 mb-3">
                      Please check your inbox and click the verification link to activate your account. 
                      The email also contains a direct link to your dashboard.
                    </p>
                    <p className="text-xs text-white/60">
                      <strong>Note:</strong> You can access your dashboard now, but some features may be limited until you verify your email.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4 text-sm text-white/60">
                Redirecting to your dashboard in a few seconds...
              </div>
              
              <button
                onClick={() => {
                  let redirectPath = '/dashboard';
                  if (userData?.role === 'customer') {
                    redirectPath = '/customers/dashboard';
                  }
                  window.location.href = redirectPath;
                }}
                className="w-full rounded-md bg-gradient-to-r from-[#A8DADC] to-[#B39CD0] px-6 py-2.5 font-semibold text-[#1A1A1C] transition hover:opacity-90"
              >
                Go to Dashboard Now
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-red-500/10 p-4">
                  <div className="h-12 w-12 rounded-full bg-red-500/20"></div>
                </div>
              </div>
              <h1 className="mb-4 text-2xl font-bold text-white">Signup Failed</h1>
              <p className="mb-6 text-white/60">{errorMessage}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

