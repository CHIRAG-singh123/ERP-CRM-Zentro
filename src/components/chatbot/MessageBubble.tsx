import { Bot } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../common/UserAvatar';
import type { ChatMessage } from '../../types/chatbot';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { user } = useAuth();
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-3 animate-fade-in transition-all duration-300 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center">
        {isUser ? (
          <UserAvatar
            avatarUrl={user?.profile?.avatar}
            name={user?.name}
            email={user?.email}
            size={36}
            className="ring-2 ring-[#B39CD0]/30 shadow-lg"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#A8DADC] to-[#B39CD0] shadow-lg ring-2 ring-[#A8DADC]/30">
            <Bot className="h-5 w-5 text-[#1A1A1C]" />
          </div>
        )}
      </div>
      <div
        className={`flex max-w-[80%] flex-col gap-1.5 ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        <div
          className={`group rounded-2xl px-4 py-3 shadow-lg transition-all duration-200 hover:shadow-xl ${
            isUser
              ? 'bg-gradient-to-br from-[#B39CD0] to-[#C3ADD9] text-[#1A1A1C] rounded-br-sm'
              : 'bg-[#1A1A1C] border border-white/10 text-white rounded-bl-sm hover:border-white/20'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
        <span className="text-xs text-white/40 px-1.5 font-medium">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

