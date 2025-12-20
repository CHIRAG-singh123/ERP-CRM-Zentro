import { Link } from 'react-router-dom';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';

export function SignupSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#242426] px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-[#1F1F21] p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-500/10 p-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>

          <h1 className="mb-4 text-2xl font-bold text-white">Account Created Successfully!</h1>

          <div className="mb-6 space-y-3 text-left text-sm text-white/60">
            <p>Your account has been created and is ready to use.</p>
            <p className="font-medium text-white/80">
              We've sent a login link to your email address. Click the link in the email to access your dashboard.
            </p>
            <p className="text-xs">The login link will expire in 24 hours.</p>
          </div>

          <div className="mb-6 flex items-center justify-center gap-2 text-white/60">
            <Mail className="h-5 w-5" />
            <p className="text-sm">Check your inbox (and spam folder)</p>
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

