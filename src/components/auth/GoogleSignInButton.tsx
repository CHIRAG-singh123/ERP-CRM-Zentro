import { useState } from 'react';

interface GoogleSignInButtonProps {
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  className?: string;
  mode?: 'login' | 'signup';
}

export function GoogleSignInButton({ text = 'signin_with', className = '', mode = 'signup' }: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
    
    // CRITICAL: OAuth must redirect directly to backend, bypassing Vite proxy
    // Extract backend URL - if VITE_API_URL includes /api, remove it
    let backendBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    // Normalize the URL
    backendBaseUrl = backendBaseUrl.replace(/\/$/, ''); // Remove trailing slash
    backendBaseUrl = backendBaseUrl.replace(/\/api$/, ''); // Remove /api suffix if present
    
    // Ensure we're using the actual backend port (5000), not frontend (5173)
    // Parse the URL to extract host and port
    try {
      const url = new URL(backendBaseUrl);
      // If port is 5173 (frontend), replace with 5000 (backend)
      if (url.port === '5173' || (!url.port && url.hostname === 'localhost' && window.location.port === '5173')) {
        url.port = '5000';
        backendBaseUrl = url.origin;
      }
    } catch (e) {
      // If URL parsing fails, use default backend URL
      console.warn('Failed to parse backend URL, using default:', e);
      backendBaseUrl = 'http://localhost:5000';
    }
    
    // Construct the full OAuth URL - MUST point directly to backend
    // Include mode parameter to distinguish between login and signup flows
    const oauthUrl = `${backendBaseUrl}/api/auth/google?mode=${mode}`;
    
    console.log('🔐 Initiating Google OAuth:');
    console.log('   Backend URL:', backendBaseUrl);
    console.log('   Mode:', mode);
    console.log('   OAuth URL:', oauthUrl);
    console.log('   ⚠️  This MUST match the callback URL in Google Cloud Console');
    
    // Redirect directly to backend (bypasses Vite proxy)
    window.location.href = oauthUrl;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`
        w-full flex items-center justify-center gap-3
        rounded-md border border-white/10 bg-[#242426]
        px-4 py-2.5 font-medium text-white
        transition-all duration-200
        hover:bg-[#2a2a2c] hover:border-white/20
        active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#242426]
        ${className}
      `}
      aria-label={text === 'signup_with' ? 'Sign up with Google' : 'Sign in with Google'}
    >
      {isLoading ? (
        <>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span>
            {text === 'signup_with' && 'Sign up with Google'}
            {text === 'signin_with' && 'Sign in with Google'}
            {text === 'continue_with' && 'Continue with Google'}
            {text === 'signin' && 'Sign in with Google'}
          </span>
        </>
      )}
    </button>
  );
}

