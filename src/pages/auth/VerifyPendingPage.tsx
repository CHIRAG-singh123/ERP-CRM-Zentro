import { useSearchParams, Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';

export function VerifyPendingPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const error = searchParams.get('error');

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#242426] px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-[#1F1F21] p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-[#A8DADC]/10 p-4">
              <Mail className="h-12 w-12 text-[#A8DADC]" />
            </div>
          </div>

          <h1 className="mb-4 text-2xl font-bold text-white">Check Your Email</h1>

          {error === 'email_failed' && (
            <div className="mb-4 rounded-md bg-yellow-500/10 border border-yellow-500/20 p-3 text-sm text-yellow-200">
              We encountered an issue sending the email. Please try signing up again or contact support.
            </div>
          )}

          <p className="mb-2 text-white/80">
            We've sent a verification link to
          </p>
          {email && (
            <p className="mb-6 font-semibold text-[#A8DADC] break-all">
              {email}
            </p>
          )}
          {!email && (
            <p className="mb-6 text-white/60">
              your email address
            </p>
          )}

          <div className="mb-6 space-y-3 text-left text-sm text-white/60">
            <p>Please check your inbox and click the verification link to activate your account.</p>
            <p className="font-medium text-white/80">The link will expire in 1 hour.</p>
            <p className="text-xs">Don't forget to check your spam folder if you don't see the email.</p>
          </div>

          <div className="mt-8 space-y-3">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-[#A8DADC] hover:text-[#B39CD0] transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

