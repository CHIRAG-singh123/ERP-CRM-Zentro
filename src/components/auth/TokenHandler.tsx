import { useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { setAccessToken } from '../../services/api/http';
import { API_BASE_URL } from '../../services/api/config';
import { logger } from '../../utils/logger';

const USER_STORAGE_KEY = 'user';
const ACCESS_TOKEN_KEY = 'accessToken';

/**
 * TokenHandler component - Extracts token from URL query params and sets up user session
 * This allows direct redirects to dashboard with token (bypassing AuthSuccessPage for login)
 */
export function TokenHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { updateUser, user, isAuthenticated } = useAuth();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const token = searchParams.get('token');
    
    // Only process if token exists and we haven't processed it yet
    if (!token || hasProcessedRef.current) {
      return;
    }

    // Don't process on auth/success page (let that page handle it)
    if (location.pathname === '/auth/success') {
      return;
    }

    // If user is already authenticated, just remove token from URL
    if (isAuthenticated && user) {
      logger.debug('[TokenHandler] User already authenticated, removing token from URL');
      searchParams.delete('token');
      searchParams.delete('mode');
      setSearchParams(searchParams, { replace: true });
      return;
    }

    // Mark as processing
    hasProcessedRef.current = true;
    
    logger.debug('[TokenHandler] Token found in URL, processing...');

    // Set token immediately to localStorage (synchronous operation)
    // This ensures token is available before any API calls
    setAccessToken(token);
    logger.debug('[TokenHandler] Token saved to localStorage');

    // Fetch user data and set up session
    const setupSession = async () => {
      try {
        // Build API URL properly
        const apiBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
        const apiUrl = `${apiBase}/auth/me`;
        
        logger.debug('[TokenHandler] Fetching user from:', apiUrl);

        // Direct fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

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
          logger.error('[TokenHandler] API request failed:', {
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
          logger.error('[TokenHandler] Invalid API response format:', data);
          throw new Error('Invalid response format: missing user data');
        }

        const { user: userData } = data;
        
        logger.debug('[TokenHandler] User data fetched successfully', {
          userId: userData._id,
          email: userData.email,
          role: userData.role,
        });

        // CRITICAL: Save user to localStorage IMMEDIATELY (synchronous)
        // This prevents race condition where ProtectedRoute checks before user is set
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        logger.debug('[TokenHandler] User saved to localStorage (synchronous)');

        // Now update React state (which will also setup token refresh and validation)
        updateUser(userData);
        logger.debug('[TokenHandler] User state updated, session setup initiated');

        // Remove token from URL to clean it up
        searchParams.delete('token');
        searchParams.delete('mode');
        setSearchParams(searchParams, { replace: true });

        logger.debug('[TokenHandler] Session setup complete - user authenticated');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[TokenHandler] Failed to setup session:', {
          error: errorMessage,
          details: error,
        });
        
        // Clean up on error: remove token and user from localStorage
        try {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(USER_STORAGE_KEY);
          logger.debug('[TokenHandler] Cleared tokens and user from localStorage on error');
        } catch (cleanupError) {
          logger.error('[TokenHandler] Failed to cleanup localStorage:', cleanupError);
        }
        
        // Remove token from URL
        searchParams.delete('token');
        searchParams.delete('mode');
        setSearchParams(searchParams, { replace: true });
        
        // Reset processing flag so it can retry if needed
        hasProcessedRef.current = false;
      }
    };

    // Small delay to ensure token is set
    const timeoutId = setTimeout(() => {
      setupSession();
    }, 50);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchParams, setSearchParams, location.pathname, updateUser, isAuthenticated, user]);

  // Reset processing flag when user becomes authenticated (session is set up)
  useEffect(() => {
    if (isAuthenticated && user && hasProcessedRef.current) {
      // Session is set up, can reset flag for future use
      hasProcessedRef.current = false;
    }
  }, [isAuthenticated, user]);

  return null; // This component doesn't render anything
}

