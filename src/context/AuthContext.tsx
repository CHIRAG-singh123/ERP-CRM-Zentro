import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, login as loginApi, register as registerApi, logout as logoutApi, getCurrentUser, refreshToken as refreshTokenApi } from '../services/api/auth';
import { setAccessToken, removeAccessToken, getAccessToken } from '../services/api/http';
import { logger } from '../utils/logger';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  apiUnavailable: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  
  // Refs for intervals and timeouts
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const validationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRefreshingRef = useRef(false);
  
  // Ref to store updateUserState function for event listeners
  // This ensures event listeners always use the latest function
  const updateUserStateRef = useRef<((user: User) => void) | null>(null);

  // Token refresh function
  const refreshAccessToken = async (): Promise<boolean> => {
    if (isRefreshingRef.current) {
      logger.debug('[AuthContext] Token refresh already in progress');
      return false;
    }

    try {
      isRefreshingRef.current = true;
      logger.debug('[AuthContext] Refreshing access token...');
      
      const response = await refreshTokenApi();
      setAccessToken(response.accessToken);
      
      logger.debug('[AuthContext] Token refreshed successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('[AuthContext] Token refresh failed:', errorMessage);
      
      // If refresh fails, clear session
      setUser(null);
      removeAccessToken();
      localStorage.removeItem(USER_STORAGE_KEY);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  };

  // Periodic session validation
  const validateSession = async () => {
    const currentUser = user;
    const currentToken = getAccessToken();
    
    if (!currentUser || !currentToken) {
      return;
    }

    try {
      logger.debug('[AuthContext] Validating session...');
      const { user: updatedUser } = await getCurrentUser();
      
      // Update user if there are any changes
      setUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      setApiUnavailable(false);
      logger.debug('[AuthContext] Session validated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('[AuthContext] Session validation failed:', errorMessage);

      if (
        errorMessage.includes('503') ||
        errorMessage.includes('Network error') ||
        errorMessage.includes('timeout')
      ) {
        // Server unreachable: keep session but mark as unavailable
        setApiUnavailable(true);
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        // Try to refresh token
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          // Refresh failed, clear session
          setUser(null);
          removeAccessToken();
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      }
    }
  };

  // Setup token refresh interval (refresh every 50 minutes, assuming 1 hour token expiry)
  const setupTokenRefresh = () => {
    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Refresh token every 50 minutes (5 minutes before typical 1 hour expiry)
    refreshIntervalRef.current = setInterval(() => {
      const currentUser = user;
      const currentToken = getAccessToken();
      if (currentUser && currentToken) {
        refreshAccessToken();
      }
    }, 50 * 60 * 1000); // 50 minutes
  };

  // Setup periodic session validation (every 5 minutes)
  const setupSessionValidation = () => {
    // Clear existing interval
    if (validationIntervalRef.current) {
      clearInterval(validationIntervalRef.current);
    }

    // Validate session every 5 minutes
    validationIntervalRef.current = setInterval(() => {
      const currentUser = user;
      const currentToken = getAccessToken();
      if (currentUser && currentToken) {
        validateSession();
      }
    }, 5 * 60 * 1000); // 5 minutes
  };


  // Load user from localStorage on mount - non-blocking
  useEffect(() => {
    let isMounted = true;
    let periodicCheckInterval: ReturnType<typeof setInterval> | null = null;

    const loadUser = async () => {
      try {
        logger.debug('[AuthContext] Loading user from storage...');

        // Check if there's a token in URL (from email link) - if so, wait longer for TokenHandler to process it
        const urlParams = new URLSearchParams(window.location.search);
        const tokenInUrl = urlParams.get('token');
        if (tokenInUrl) {
          logger.debug('[AuthContext] Token detected in URL, waiting for TokenHandler to process...');
          // Wait longer to allow TokenHandler to process the token (increased from 200ms to 500ms)
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Re-check localStorage after waiting (TokenHandler should have saved user by now)
          const userAfterWait = localStorage.getItem(USER_STORAGE_KEY);
          if (userAfterWait) {
            try {
              const parsedUser = JSON.parse(userAfterWait) as User;
              logger.debug('[AuthContext] User found in localStorage after token wait, updating immediately');
              if (isMounted) {
                setUser(parsedUser);
                setIsLoading(false);
                // Don't return - continue with token verification in background
              }
            } catch (error) {
              logger.error('[AuthContext] Failed to parse user after token wait:', error);
            }
          }
          
          // Continue checking localStorage periodically while token is in URL
          let checkCount = 0;
          const maxChecks = 5; // Check 5 more times (every 100ms)
          periodicCheckInterval = setInterval(() => {
            if (!isMounted) {
              if (periodicCheckInterval) clearInterval(periodicCheckInterval);
              return;
            }
            
            checkCount++;
            const periodicUser = localStorage.getItem(USER_STORAGE_KEY);
            if (periodicUser) {
              try {
                const parsedUser = JSON.parse(periodicUser) as User;
                logger.debug('[AuthContext] User found in periodic check, updating immediately');
                if (isMounted) {
                  setUser(parsedUser);
                  setIsLoading(false);
                  if (periodicCheckInterval) clearInterval(periodicCheckInterval);
                }
              } catch (error) {
                logger.error('[AuthContext] Failed to parse user in periodic check:', error);
              }
            }
            if (checkCount >= maxChecks) {
              if (periodicCheckInterval) clearInterval(periodicCheckInterval);
            }
          }, 100);
        }

        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        if (!storedUser) {
          logger.debug('[AuthContext] No stored user found');
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        const parsedUser = JSON.parse(storedUser) as User;
        // Set user immediately from cache for instant UI render
        if (isMounted) {
          setUser(parsedUser);
          setIsLoading(false);
        }

        logger.debug('[AuthContext] Stored user found, verifying token in background...');

        // Verify token in background without blocking UI
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 2000)
        );

        try {
          const userPromise = getCurrentUser();
          const result = await Promise.race([userPromise, timeoutPromise]);
          const { user: currentUser } = result as { user: User };
          
          if (isMounted) {
            setUser(currentUser);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
            setApiUnavailable(false);
            logger.debug('[AuthContext] Token verified, user updated');
            
            // Setup token refresh and session validation after successful login
            setupTokenRefresh();
            setupSessionValidation();
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn('[AuthContext] Token verification failed:', errorMessage);

          if (
            errorMessage.includes('503') ||
            errorMessage.includes('Network error') ||
            errorMessage.includes('timeout')
          ) {
            // Server unreachable: keep cached user and allow UI to render
            if (isMounted) {
              logger.warn('[AuthContext] Server unreachable, keeping cached user');
              setApiUnavailable(true);
              // Still setup intervals in case server comes back
              setupTokenRefresh();
              setupSessionValidation();
            }
          } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            // Try to refresh token
            const refreshed = await refreshAccessToken();
            if (refreshed && isMounted) {
              // Retry getting user after refresh
              try {
                const { user: currentUser } = await getCurrentUser();
                setUser(currentUser);
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
                setApiUnavailable(false);
                setupTokenRefresh();
                setupSessionValidation();
              } catch (retryError) {
                // Refresh worked but getCurrentUser failed - clear session
                if (isMounted) {
                  setUser(null);
                  removeAccessToken();
                  localStorage.removeItem(USER_STORAGE_KEY);
                }
              }
            } else if (isMounted) {
              // Refresh failed, clear storage
              logger.warn('[AuthContext] Token invalid, clearing storage');
              setUser(null);
              removeAccessToken();
              localStorage.removeItem(USER_STORAGE_KEY);
            }
          } else {
            // Other error: clear storage
            if (isMounted) {
              logger.warn('[AuthContext] Token invalid, clearing storage');
              setUser(null);
              removeAccessToken();
              localStorage.removeItem(USER_STORAGE_KEY);
            }
          }
        }
      } catch (error) {
        logger.error('[AuthContext] Error loading user:', error);
        if (isMounted) {
          setUser(null);
          removeAccessToken();
          localStorage.removeItem(USER_STORAGE_KEY);
          setIsLoading(false);
        }
      }
    };

    // Use requestIdleCallback for better performance
    const scheduleLoad = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          if (isMounted) {
            loadUser();
          }
        }, { timeout: 50 });
      } else {
        setTimeout(() => {
          if (isMounted) {
            loadUser();
          }
        }, 0);
      }
    };

    scheduleLoad();

    return () => {
      isMounted = false;
      // Cleanup intervals on unmount
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current);
      }
      // Clear periodic check interval if it exists
      if (periodicCheckInterval) {
        clearInterval(periodicCheckInterval);
        periodicCheckInterval = null;
      }
    };
  }, []);

  // Multi-tab session sync via storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === USER_STORAGE_KEY) {
        if (e.newValue) {
          try {
            const newUser = JSON.parse(e.newValue) as User;
            logger.debug('[AuthContext] User updated from another tab');
            setUser(newUser);
          } catch (error) {
            logger.error('[AuthContext] Error parsing user from storage event:', error);
          }
        } else {
          // User was removed (logout in another tab)
          logger.debug('[AuthContext] User logged out in another tab');
          setUser(null);
          removeAccessToken();
        }
      } else if (e.key === 'accessToken') {
        // Token was updated in another tab
        logger.debug('[AuthContext] Token updated from another tab');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await loginApi({ email, password });
      setAccessToken(response.accessToken);
      setUser(response.user);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
      
      // Setup token refresh and session validation after login
      setupTokenRefresh();
      setupSessionValidation();
    } catch (error) {
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await registerApi({ name, email, password });
      setAccessToken(response.accessToken);
      setUser(response.user);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
      
      // Setup token refresh and session validation after registration
      setupTokenRefresh();
      setupSessionValidation();
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      logger.error('Logout error:', error);
    } finally {
      // Clear intervals
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current);
        validationIntervalRef.current = null;
      }
      
      setUser(null);
      removeAccessToken();
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  const updateUserState = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    setApiUnavailable(false);
    
    // Setup token refresh and session validation after user update
    // This ensures complete session initialization (matching login/register behavior)
    setupTokenRefresh();
    setupSessionValidation();
    
    logger.debug('[AuthContext] User updated, token refresh and session validation initialized');
  };
  
  // Keep ref updated with latest function
  updateUserStateRef.current = updateUserState;

  // Listen for custom auth events (when TokenHandler saves user to localStorage)
  // This ensures immediate authentication when user clicks dashboard link from email
  useEffect(() => {
    // Listen for custom auth events (from TokenHandler)
    const handleAuthUpdate = (e: CustomEvent) => {
      const { user: userData } = e.detail as { user: User; token?: string };
      if (userData && updateUserStateRef.current) {
        logger.debug('[AuthContext] Custom auth event detected, updating user immediately');
        // Use ref to ensure we always use the latest updateUserState function
        updateUserStateRef.current(userData);
        setIsLoading(false);
        setApiUnavailable(false);
      } else if (userData) {
        // Fallback: if ref is not set yet, check localStorage
        logger.debug('[AuthContext] Custom auth event detected but ref not ready, checking localStorage');
        handleStorageCheck();
      }
    };

    // Also check localStorage directly when event fires (in case event detail is missing)
    const handleStorageCheck = () => {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser) as User;
          logger.debug('[AuthContext] Storage check detected user, updating immediately');
          if (updateUserStateRef.current) {
            updateUserStateRef.current(parsedUser);
          } else {
            // Fallback: direct state update if ref not ready
            setUser(parsedUser);
            setIsLoading(false);
            setApiUnavailable(false);
          }
        } catch (error) {
          logger.error('[AuthContext] Failed to parse user from storage:', error);
        }
      }
    };

    window.addEventListener('auth:user-updated', handleAuthUpdate as EventListener);
    
    // Also listen for storage events (for cross-tab sync, though same-tab uses custom events)
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key === USER_STORAGE_KEY && e.newValue) {
        handleStorageCheck();
      }
    });

    return () => {
      window.removeEventListener('auth:user-updated', handleAuthUpdate as EventListener);
    };
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    apiUnavailable,
    login,
    register,
    logout,
    updateUser: updateUserState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

