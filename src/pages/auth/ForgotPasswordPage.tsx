import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../../services/api/auth';
import { useToast } from '../../context/ToastContext';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { success } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await forgotPassword({ email });
      setIsSuccess(true);
      success('Password reset link has been sent to your email if the account exists.');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#242426] px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-white">Check Your Email</h1>
            <p className="text-white/60">We've sent a password reset link to {email}</p>
          </div>

          <div className="space-y-6 rounded-lg bg-[#1F1F21] p-8">
            <div className="rounded-md bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-400">
              <p className="mb-2">If an account with that email exists, you'll receive a password reset link.</p>
              <p className="text-xs text-white/60">The link will expire in 1 hour.</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full rounded-md bg-gradient-to-r from-[#A8DADC] to-[#B39CD0] px-4 py-2.5 font-semibold text-[#1A1A1C] transition hover:opacity-90"
              >
                Back to Login
              </button>
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setEmail('');
                }}
                className="w-full rounded-md border border-white/10 px-4 py-2.5 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
              >
                Send Another Email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#242426] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">Forgot Password</h1>
          <p className="text-white/60">Enter your email to receive a password reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-[#1F1F21] p-8">
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-gradient-to-r from-[#A8DADC] to-[#B39CD0] px-4 py-2.5 font-semibold text-[#1A1A1C] transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <p className="text-center text-sm text-white/60">
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-[#A8DADC] hover:text-[#B39CD0]">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

