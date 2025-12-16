import { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../services/api/auth';
import { useToast } from '../../context/ToastContext';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { success } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid reset token');
      return;
    }

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
      await resetPassword({ token, password });
      setIsSuccess(true);
      success('Password has been reset successfully. You can now login with your new password.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to reset password. The link may have expired. Please request a new one.');
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
            <h1 className="mb-2 text-3xl font-bold text-white">Password Reset Successful</h1>
            <p className="text-white/60">Your password has been reset successfully</p>
          </div>

          <div className="space-y-6 rounded-lg bg-[#1F1F21] p-8">
            <div className="rounded-md bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-400">
              <p>You can now login with your new password.</p>
            </div>

            <Link
              to="/login"
              className="block w-full rounded-md bg-gradient-to-r from-[#A8DADC] to-[#B39CD0] px-4 py-2.5 text-center font-semibold text-[#1A1A1C] transition hover:opacity-90"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#242426] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">Reset Password</h1>
          <p className="text-white/60">Enter your new password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-[#1F1F21] p-8">
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {!token && (
            <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 p-3 text-sm text-yellow-400">
              Invalid reset link. Please request a new password reset.
            </div>
          )}

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-white/80">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={!token}
              className="w-full rounded-md border border-white/10 bg-[#242426] px-4 py-2.5 text-white placeholder-white/40 focus:border-[#A8DADC] focus:outline-none focus:ring-1 focus:ring-[#A8DADC] disabled:opacity-50 disabled:cursor-not-allowed"
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
              disabled={!token}
              className="w-full rounded-md border border-white/10 bg-[#242426] px-4 py-2.5 text-white placeholder-white/40 focus:border-[#A8DADC] focus:outline-none focus:ring-1 focus:ring-[#A8DADC] disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !token}
            className="w-full rounded-md bg-gradient-to-r from-[#A8DADC] to-[#B39CD0] px-4 py-2.5 font-semibold text-[#1A1A1C] transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>

          <p className="text-center text-sm text-white/60">
            <Link to="/login" className="font-medium text-[#A8DADC] hover:text-[#B39CD0]">
              Back to Login
            </Link>
            {' • '}
            <Link to="/forgot-password" className="font-medium text-[#A8DADC] hover:text-[#B39CD0]">
              Request New Link
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

