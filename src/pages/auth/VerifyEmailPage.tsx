import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const error = searchParams.get('error');
    const token = searchParams.get('token');

    if (error) {
      setStatus('error');
      switch (error) {
        case 'missing_token':
          setErrorMessage('Verification link is invalid. Please request a new verification email.');
          break;
        case 'user_not_found':
          setErrorMessage('User account not found. Please sign up again.');
          break;
        case 'invalid_token':
          setErrorMessage('Invalid verification link. Please request a new verification email.');
          break;
        case 'expired_token':
          setErrorMessage('This verification link has expired. Please request a new verification email.');
          break;
        default:
          setErrorMessage('Verification failed. Please try again or contact support.');
      }
    } else if (token) {
      // Token is present, verification should have been handled by backend
      // This page is shown after backend redirects here
      setStatus('success');
      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login?verified=true');
      }, 3000);
    } else {
      setStatus('error');
      setErrorMessage('No verification token provided.');
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#242426] px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-[#1F1F21] p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="mb-6 flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-[#A8DADC]" />
              </div>
              <h1 className="mb-4 text-2xl font-bold text-white">Verifying Email...</h1>
              <p className="text-white/60">Please wait while we verify your email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-green-500/10 p-4">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
              </div>
              <h1 className="mb-4 text-2xl font-bold text-white">Email Verified!</h1>
              <p className="mb-6 text-white/60">
                Your email has been successfully verified. You can now sign in to your account.
              </p>
              <p className="mb-6 text-sm text-white/40">
                Redirecting to login page...
              </p>
              <Link
                to="/login?verified=true"
                className="inline-block rounded-md bg-gradient-to-r from-[#A8DADC] to-[#B39CD0] px-6 py-2.5 font-semibold text-[#1A1A1C] transition hover:opacity-90"
              >
                Go to Sign In
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-red-500/10 p-4">
                  <XCircle className="h-12 w-12 text-red-500" />
                </div>
              </div>
              <h1 className="mb-4 text-2xl font-bold text-white">Verification Failed</h1>
              <p className="mb-6 text-white/60">
                {errorMessage}
              </p>
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="block rounded-md bg-gradient-to-r from-[#A8DADC] to-[#B39CD0] px-6 py-2.5 font-semibold text-[#1A1A1C] transition hover:opacity-90"
                >
                  Go to Sign In
                </Link>
                <Link
                  to="/register"
                  className="block text-sm text-[#A8DADC] hover:text-[#B39CD0] transition"
                >
                  Sign Up Again
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

