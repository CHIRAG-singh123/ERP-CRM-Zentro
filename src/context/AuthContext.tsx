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

    const loadUser = async () => {
      try {
        logger.debug('[AuthContext] Loading user from storage...');

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

