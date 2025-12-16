import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center text-white/70">
      <p className="text-xs uppercase tracking-[0.32em] text-white/40">404</p>
      <h2 className="mt-2 text-3xl font-semibold text-white">We lost that workspace view</h2>
      <p className="mt-3 max-w-md text-sm">
        The page you’re looking for hasn’t been plugged into the CRM shell yet. Choose another module to keep exploring.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 rounded-full bg-[#A8DADC] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition hover:bg-[#BCE7E5]"
      >
        Return to dashboard
      </Link>
    </div>
  );
}

