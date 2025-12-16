import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface WelcomeBadgeProps {
  onDismiss: () => void;
}

export function WelcomeBadge({ onDismiss }: WelcomeBadgeProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(), 300); // Wait for animation
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-28 right-6 z-[10000] transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="relative">
        <div className="absolute -top-2 -right-2 h-5 w-5 animate-ping rounded-full bg-[#A8DADC] opacity-75"></div>
        <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-gradient-to-br from-[#A8DADC] to-[#B39CD0] shadow-lg"></div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-gradient-to-br from-[#1A1A1C]/98 via-[#1F1F21]/98 to-[#1A1A1C]/98 backdrop-blur-xl px-5 py-4 shadow-2xl ring-2 ring-[#A8DADC]/30 transition-all duration-300 hover:ring-[#A8DADC]/50 hover:shadow-[#A8DADC]/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#A8DADC] to-[#B39CD0] shadow-lg ring-2 ring-[#A8DADC]/40">
            <MessageCircle className="h-6 w-6 text-[#1A1A1C]" />
          </div>
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-white">How can I assist you today?</p>
            <p className="text-xs text-white/60 mt-0.5">Click the chat button to get started</p>
          </div>
          <button
            onClick={onDismiss}
            className="ml-2 rounded-lg p-1.5 text-white/40 transition-all duration-200 hover:bg-white/10 hover:text-white hover:scale-110"
            aria-label="Dismiss"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

