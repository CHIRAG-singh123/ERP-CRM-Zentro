import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { setAccessToken } from '../../services/api/http';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

export function AuthSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setErrorMessage('No authentication token provided.');
      return;
    }

    // Set the access token
    setAccessToken(token);

    // Fetch user data using the token
    const fetchUser = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const data = await response.json();
        updateUser(data.user);
        setStatus('success');

        // Redirect based on user role after a short delay
        setTimeout(() => {
          if (data.user.role === 'admin' || data.user.role === 'employee') {
            navigate('/dashboard', { replace: true });
          } else if (data.user.role === 'customer') {
            navigate('/customers/dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }, 1500);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setStatus('error');
        setErrorMessage('Failed to authenticate. Please try signing in again.');
      }
    };

    fetchUser();
  }, [searchParams, navigate, setAccessToken, updateUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#242426] px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-[#1F1F21] p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="mb-6 flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-[#A8DADC]" />
              </div>
              <h1 className="mb-4 text-2xl font-bold text-white">Completing Sign In...</h1>
              <p className="text-white/60">Please wait while we set up your account.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-green-500/10 p-4">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
              </div>
              <h1 className="mb-4 text-2xl font-bold text-white">Welcome!</h1>
              <p className="mb-6 text-white/60">
                You've successfully signed in. Redirecting to your dashboard...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-red-500/10 p-4">
                  <XCircle className="h-12 w-12 text-red-500" />
                </div>
              </div>
              <h1 className="mb-4 text-2xl font-bold text-white">Authentication Failed</h1>
              <p className="mb-6 text-white/60">
                {errorMessage}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="rounded-md bg-gradient-to-r from-[#A8DADC] to-[#B39CD0] px-6 py-2.5 font-semibold text-[#1A1A1C] transition hover:opacity-90"
              >
                Go to Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

