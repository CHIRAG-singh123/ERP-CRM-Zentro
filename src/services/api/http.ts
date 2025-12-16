import { API_BASE_URL, GRAPHQL_URL, API_TIMEOUT_MS } from './config';
import { logger } from '../../utils/logger';

type FetchOptions = RequestInit & {
  skipAuth?: boolean;
};

// Token storage key
const ACCESS_TOKEN_KEY = 'accessToken';

// Get access token from localStorage
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

// Set access token in localStorage
export const setAccessToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
};

// Remove access token from localStorage
export const removeAccessToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
};

// Check if current route is a public route (doesn't require authentication)
const isPublicRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const pathname = window.location.pathname;
  // Public customer routes that don't require authentication
  return pathname.startsWith('/customers/') || 
         pathname === '/customers' ||
         pathname === '/';
};

// Handle 401 errors - redirect to login only if not on public route
const handleUnauthorized = (): void => {
  if (typeof window !== 'undefined') {
    // Don't redirect if we're on a public route
    if (isPublicRoute()) {
      logger.debug('[API] 401 on public route, not redirecting');
      removeAccessToken();
      return;
    }
    removeAccessToken();
    window.location.href = '/login';
  }
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  if (!API_TIMEOUT_MS) {
    return promise;
  }

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new ApiError('Request timed out', 408));
      }, API_TIMEOUT_MS);
    }),
  ]);
}

function buildUrl(path: string, baseUrl: string): URL {
  if (/^https?:\/\//i.test(path)) {
    return new URL(path);
  }

  if (!baseUrl) {
    // Default to localhost if not configured
    const defaultUrl = 'http://localhost:5000/api';
    logger.warn('API base URL not configured, using default:', defaultUrl);
    return new URL(path.replace(/^\//, ''), defaultUrl.endsWith('/') ? defaultUrl : `${defaultUrl}/`);
  }

  return new URL(path.replace(/^\//, ''), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new ApiError('Failed to parse JSON response', response.status, error);
  }
}

export async function fetchJson<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = buildUrl(path, API_BASE_URL);
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Add JWT token to Authorization header if not skipping auth
  if (!options.skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  logger.debug(`[API] ${options.method || 'GET'} ${url.toString()}`);

  let response: Response;
  try {
    response = await withTimeout(
      fetch(url, {
        ...options,
        headers,
        credentials: options.skipAuth ? 'omit' : 'include',
      }),
    );
  } catch (error) {
    // Network error or timeout
    if (error instanceof ApiError && error.status === 408) {
      logger.error('[API] Request timeout:', url.toString());
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to connect to server';
    logger.error('[API] Network error:', errorMessage, 'URL:', url.toString());
    
    // If it's a network error (server not running), don't throw for optional auth
    if (options.skipAuth) {
      throw new ApiError(
        `Network error: ${errorMessage}`,
        503,
        { originalError: error, url: url.toString() },
      );
    }
    // For authenticated requests, allow the error to propagate but log it
    throw new ApiError(
      `Network error: ${errorMessage}`,
      503,
      { originalError: error, url: url.toString() },
    );
  }

  // Handle 401 Unauthorized - try to refresh token or redirect to login
  if (response.status === 401 && !options.skipAuth) {
    // If we're on a public route, don't try to refresh or redirect
    // Just throw the error and let the component handle it
    if (isPublicRoute()) {
      logger.debug('[API] 401 on public route, allowing error to propagate');
      const errorPayload = await parseJson<unknown>(response).catch(() => undefined);
      throw new ApiError(
        'Unauthorized - public route',
        401,
        errorPayload,
      );
    }

    const token = getAccessToken();
    if (token) {
      // Try to refresh the token
      try {
        const authModule = await import('./auth');
        const refreshTokenFn = authModule.refreshToken;
        const refreshResponse = await refreshTokenFn();
        setAccessToken(refreshResponse.accessToken);
        
        // Retry the original request with new token
        headers.set('Authorization', `Bearer ${refreshResponse.accessToken}`);
        const retryResponse = await withTimeout(
          fetch(url, {
            ...options,
            headers,
            credentials: 'include',
          }),
        );
        
        if (!retryResponse.ok) {
          if (retryResponse.status === 401) {
            handleUnauthorized();
          }
          const errorPayload = await parseJson<unknown>(retryResponse).catch(() => undefined);
          throw new ApiError(
            `Request failed with status ${retryResponse.status}`,
            retryResponse.status,
            errorPayload,
          );
        }
        
        return parseJson<T>(retryResponse);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        handleUnauthorized();
        throw new ApiError('Authentication failed', 401);
      }
    } else {
      handleUnauthorized();
      throw new ApiError('No authentication token', 401);
    }
  }

  if (!response.ok) {
    const errorPayload = await parseJson<unknown>(response).catch(() => undefined);
    logger.error(`[API] Request failed: ${response.status} ${response.statusText}`, {
      url: url.toString(),
      payload: errorPayload,
    });
    
    const errorDetails = errorPayload && typeof errorPayload === 'object' 
      ? { ...errorPayload, url: url.toString() }
      : { error: errorPayload, url: url.toString() };
    
    throw new ApiError(
      `Request failed with status ${response.status}`,
      response.status,
      errorDetails,
    );
  }

  logger.debug(`[API] Success: ${response.status} ${url.toString()}`);

  return parseJson<T>(response);
}

interface GraphQLRequestPayload {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

export async function graphqlRequest<T>({
  query,
  variables,
  operationName,
}: GraphQLRequestPayload): Promise<T> {
  const url = buildUrl('', GRAPHQL_URL || API_BASE_URL);
  const response = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables, operationName }),
      credentials: 'include',
    }),
  );

  const result = await parseJson<{ data?: T; errors?: unknown[] }>(response);

  if (!response.ok || result.errors) {
    throw new ApiError('GraphQL request failed', response.status, result.errors);
  }

  if (!result.data) {
    throw new ApiError('GraphQL response missing data', response.status);
  }

  return result.data;
}

