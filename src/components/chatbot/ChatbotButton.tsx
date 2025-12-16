import { MessageCircle, X } from 'lucide-react';

interface ChatbotButtonProps {
  isOpen: boolean;
  onClick: () => void;
  unreadCount?: number;
}

export function ChatbotButton({ isOpen, onClick, unreadCount = 0 }: ChatbotButtonProps) {
  return (
    <button
      data-chatbot-button
      onClick={onClick}
      className="group fixed bottom-6 right-6 z-[9999] flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#A8DADC] via-[#B39CD0] to-[#A8DADC] text-[#1A1A1C] shadow-2xl ring-4 ring-[#A8DADC]/20 transition-all duration-300 hover:scale-110 hover:shadow-[#A8DADC]/60 hover:ring-[#A8DADC]/40 active:scale-95"
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
    >
      <div className="relative">
        {isOpen ? (
          <X className="h-6 w-6 transition-transform duration-300 group-hover:rotate-90" />
        ) : (
          <MessageCircle className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
        )}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-xs font-bold text-white shadow-lg ring-2 ring-[#1A1A1C] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[#A8DADC] to-[#B39CD0] opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-30 animate-pulse"></span>
        )}
      </div>
    </button>
  );
}

