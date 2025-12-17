import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState, Suspense } from 'react';

import { createQueryClient } from '../services/queryClient';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { SocketProvider } from '../context/SocketContext';
import { logger } from '../utils/logger';

interface AppProvidersProps {
  children: ReactNode;
}

// Loading component
function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 text-foreground">Loading...</div>
        <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse bg-accent"></div>
        </div>
      </div>
    </div>
  );
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => {
    logger.debug('[AppProviders] Creating query client...');
    return createQueryClient();
  });

  logger.debug('[AppProviders] Rendering providers...');

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <Suspense fallback={<LoadingFallback />}>
                {children}
              </Suspense>
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

