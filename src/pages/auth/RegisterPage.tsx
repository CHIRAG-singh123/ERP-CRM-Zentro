import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton';
import { getGoogleProfile, completeGoogleSignup } from '../../services/api/auth';
import { CheckCircle } from 'lucide-react';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const { register, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for Google OAuth signup
  useEffect(() => {
    const googleParam = searchParams.get('google');
    const tokenParam = searchParams.get('token');

    if (googleParam === 'true' && tokenParam) {
      setIsGoogleSignup(true);
      setSessionToken(tokenParam);
      setIsLoadingProfile(true);

      // Fetch Google profile data
      getGoogleProfile(tokenParam)
        .then((response) => {
          if (response.success && response.profile) {
            setName(response.profile.name);
            setEmail(response.profile.email);
            setIsLoadingProfile(false);
          } else {
            setError('Failed to load Google profile. Please try again.');
            setIsLoadingProfile(false);
          }
        })
        .catch((err) => {
          console.error('Error fetching Google profile:', err);
          setError(err instanceof Error ? err.message : 'Failed to load Google profile. Please try again.');
          setIsLoadingProfile(false);
        });
    }
  }, [searchParams]);

  // Redirect authenticated users to their appropriate dashboard
  useEffect(() => {
    if (user && isAuthenticated) {
      // Redirect based on role
      if (user.role === 'admin' || user.role === 'employee') {
        navigate('/dashboard', { replace: true });
      } else if (user.role === 'customer') {
        navigate('/customers/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      // If this is a Google signup, use the complete Google signup endpoint
      if (isGoogleSignup && sessionToken) {
        const response = await completeGoogleSignup({
          sessionToken,
          password,
          confirmPassword,
        });

        if (response.success) {
          // Redirect to signup success page
          navigate('/auth/signup-success', { replace: true });
          return;
        } else {
          setError('Failed to complete signup. Please try again.');
        }
      } else {
        // Regular email/password registration
        await register(name, email, password);
        // Navigation will be handled by useEffect when user state updates
      }
    } catch (err: unknown) {
      console.error('Registration error:', err);
      
      // Extract error message from ApiError or regular Error
      let errorMessage = 'Registration failed. Please try again.';
      let shouldRedirect = false;
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Check error details if it's an ApiError
        if ('details' in err && err.details && typeof err.details === 'object') {
          const details = err.details as any;
          if (details.error && typeof details.error === 'string') {
            errorMessage = details.error;
          } else if (details.message && typeof details.message === 'string') {
            errorMessage = details.message;
          }
          
          // Check for redirect code
          if (details.code === 'USER_EXISTS' || details.code === 'DUPLICATE_USER' || details.redirectTo) {
            shouldRedirect = true;
          }
        }
        
        // Check if it's a user exists error - redirect to login
        const errorLower = errorMessage.toLowerCase();
        if (errorLower.includes('already exists') || 
            errorLower.includes('user_exists') || 
            errorLower.includes('duplicate_user') ||
            shouldRedirect) {
          setError('An account with this email already exists. Redirecting to login...');
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
          return;
        }
      } else if (err && typeof err === 'object' && 'details' in err) {
        const details = err.details as any;
        if (details?.error && typeof details.error === 'string') {
          errorMessage = details.error;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#242426] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">
            {isGoogleSignup ? 'Complete Your Account Setup' : 'Create Customer Account'}
          </h1>
          {isGoogleSignup ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-[#A8DADC]">
                <CheckCircle className="h-5 w-5" />
                <p className="text-white/80">Google account connected</p>
              </div>
              <p className="text-white/60">Set a password to secure your account</p>
            </div>
          ) : (
            <>
              <p className="text-white/60">Sign up as a customer to browse and review products</p>
              <p className="mt-2 text-xs text-white/40">Employees must be created by an admin</p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-[#1F1F21] p-8">
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {isLoadingProfile ? (
            <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-4 text-center">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white mb-2"></div>
              <p className="text-sm text-blue-200">Loading your Google account information...</p>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-white/80">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isGoogleSignup}
                  className={`w-full rounded-md border border-white/10 bg-[#242426] px-4 py-2.5 text-white placeholder-white/40 focus:border-[#A8DADC] focus:outline-none focus:ring-1 focus:ring-[#A8DADC] ${
                    isGoogleSignup ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                  placeholder="John Doe"
                />
                {isGoogleSignup && (
                  <p className="mt-1 text-xs text-white/40">This information was provided by your Google account</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-white/80">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isGoogleSignup}
                  className={`w-full rounded-md border border-white/10 bg-[#242426] px-4 py-2.5 text-white placeholder-white/40 focus:border-[#A8DADC] focus:outline-none focus:ring-1 focus:ring-[#A8DADC] ${
                    isGoogleSignup ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                  placeholder="you@example.com"
                />
                {isGoogleSignup && (
                  <p className="mt-1 text-xs text-white/40">This email is verified by Google</p>
                )}
              </div>
            </>
          )}

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-white/80">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-md border border-white/10 bg-[#242426] px-4 py-2.5 text-white placeholder-white/40 focus:border-[#A8DADC] focus:outline-none focus:ring-1 focus:ring-[#A8DADC]"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-white/80">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-md border border-white/10 bg-[#242426] px-4 py-2.5 text-white placeholder-white/40 focus:border-[#A8DADC] focus:outline-none focus:ring-1 focus:ring-[#A8DADC]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isLoadingProfile}
            className="w-full rounded-md bg-gradient-to-r from-[#A8DADC] to-[#B39CD0] px-4 py-2.5 font-semibold text-[#1A1A1C] transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading 
              ? (isGoogleSignup ? 'Completing setup...' : 'Creating account...') 
              : (isGoogleSignup ? 'Complete Setup' : 'Sign Up')
            }
          </button>

          {!isGoogleSignup && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-[#1F1F21] px-4 text-white/60">OR</span>
                </div>
              </div>

              <GoogleSignInButton text="signup_with" />
            </>
          )}

          <p className="text-center text-sm text-white/60">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-[#A8DADC] hover:text-[#B39CD0]">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

