import { StrictMode, startTransition } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';

import App from './App.tsx';
import { AppProviders } from './providers/AppProviders.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { logger } from './utils/logger';
import './index.css';

// Global error handlers - only in development
if (import.meta.env.DEV) {
  logger.debug('[App] Initializing application...');
  
  window.addEventListener('error', (event) => {
    logger.error('[App] Unhandled error:', event.error);
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('[App] Unhandled promise rejection:', event.reason);
  });
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  const error = new Error('Root element not found. Make sure index.html has a <div id="root"></div> element.');
  logger.error('[App]', error);
  throw error;
}

// Ensure root element has proper styling to prevent white screen
rootElement.style.minHeight = '100vh';
rootElement.style.backgroundColor = '#242426';

// Create loading element with inline styles to prevent FOUC
const loadingElement = document.createElement('div');
loadingElement.id = 'app-loading';
loadingElement.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  padding: 16px;
  color: #e4e4e4;
  background: #242426;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
`;
loadingElement.innerHTML = `
  <div style="text-align: center;">
    <div style="margin-bottom: 16px; font-size: 16px;">Loading application...</div>
    <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; margin: 0 auto;">
      <div style="width: 33%; height: 100%; background: #B39CD0; animation: app-pulse 1.5s ease-in-out infinite;"></div>
    </div>
  </div>
`;

// Add keyframes inline to prevent blocking
if (!document.getElementById('app-loading-styles')) {
  const style = document.createElement('style');
  style.id = 'app-loading-styles';
  style.textContent = `
    @keyframes app-pulse {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(200%); }
    }
  `;
  document.head.appendChild(style);
}

document.body.appendChild(loadingElement);

// Remove loading element function with retry logic
let loadingRemoved = false;
const removeLoadingElement = () => {
  if (loadingRemoved) return;
  loadingRemoved = true;
  
  const loading = document.getElementById('app-loading');
  if (loading) {
    loading.style.opacity = '0';
    loading.style.transition = 'opacity 0.2s ease-out';
    setTimeout(() => {
      if (loading.parentNode) {
        loading.remove();
      }
    }, 200);
  }
};

// Initialize app with proper error handling and retry logic
let renderAttempts = 0;
const MAX_RENDER_ATTEMPTS = 3;

const initializeApp = () => {
  try {
    logger.debug('[App] Creating React root...');
    
    const root = createRoot(rootElement);
    
    logger.debug('[App] Rendering application...');
    
    // Get Google Client ID from environment
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '435625982072-97bpjjd4sudfhgqmof5mieb26241sik3.apps.googleusercontent.com';

    // Use startTransition for non-blocking render
    startTransition(() => {
      root.render(
        <StrictMode>
          <GoogleOAuthProvider clientId={googleClientId}>
            <ErrorBoundary>
              <AppProviders>
                <App />
              </AppProviders>
            </ErrorBoundary>
          </GoogleOAuthProvider>
        </StrictMode>,
      );
    });
    
    // Remove loading element after render completes
    // Use multiple fallbacks to ensure it's removed
    if (document.readyState === 'complete') {
      setTimeout(removeLoadingElement, 100);
    } else {
      window.addEventListener('load', () => {
        setTimeout(removeLoadingElement, 100);
      });
    }
    
    // Fallback: remove after a reasonable timeout
    setTimeout(removeLoadingElement, 1000);
    
    logger.debug('[App] Application rendered successfully');
  } catch (error) {
    renderAttempts++;
    logger.error('[App] Failed to render application:', error);
    
    removeLoadingElement();
    
    if (renderAttempts < MAX_RENDER_ATTEMPTS) {
      logger.warn(`[App] Retrying render (attempt ${renderAttempts}/${MAX_RENDER_ATTEMPTS})...`);
      setTimeout(initializeApp, 500 * renderAttempts);
      return;
    }
    
    // Show error UI after max attempts
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; color: #ff4444; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; background: #242426;">
        <h1 style="margin-bottom: 16px;">Application Failed to Load</h1>
        <p style="margin-bottom: 8px;">Error: ${error instanceof Error ? error.message : String(error)}</p>
        <p style="margin-bottom: 16px;">Check the browser console for more details.</p>
        <button onclick="window.location.reload()" style="padding: 8px 16px; background: #B39CD0; color: #1A1A1C; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Reload Page</button>
      </div>
    `;
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM already loaded
  initializeApp();
}
