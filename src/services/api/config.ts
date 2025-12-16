export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || '';
export const API_TIMEOUT_MS = 10_000;

export const USE_API_MOCKS =
  (import.meta.env.VITE_API_USE_MOCK as string | undefined)?.toLowerCase() === 'true' ||
  (!import.meta.env.VITE_API_URL && !GRAPHQL_URL);

