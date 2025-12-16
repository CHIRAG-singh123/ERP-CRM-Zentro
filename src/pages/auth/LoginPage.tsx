import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user, isAuthenticated, isLoading: authLoading, apiUnavailable } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to their appropriate dashboard
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
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
  }, [user, isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      // Navigation will be handled by useEffect when user state updates
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#242426] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-white/60">Sign in to your Zentro account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-[#1F1F21] p-8">
          {apiUnavailable && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
              API server unreachable. You can still attempt to sign in. Ensure the backend is running at
              <span className="font-semibold"> http://localhost:5000</span>.
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

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
              className="w-full rounded-md border border-white/10 bg-[#242426] px-4 py-2.5 text-white placeholder-white/40 focus:border-[#A8DADC] focus:outline-none focus:ring-1 focus:ring-[#A8DADC]"
              placeholder="you@example.com"
            />
          </div>

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
              className="w-full rounded-md border border-white/10 bg-[#242426] px-4 py-2.5 text-white placeholder-white/40 focus:border-[#A8DADC] focus:outline-none focus:ring-1 focus:ring-[#A8DADC]"
              placeholder="••••••••"
            />
          </div>

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-[#A8DADC] hover:text-[#B39CD0] transition"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-gradient-to-r from-[#A8DADC] to-[#B39CD0] px-4 py-2.5 font-semibold text-[#1A1A1C] transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-white/60">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-[#A8DADC] hover:text-[#B39CD0]">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

