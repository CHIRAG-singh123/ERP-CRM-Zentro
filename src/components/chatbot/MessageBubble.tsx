import React, { useMemo } from 'react';
import { Bot } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../common/UserAvatar';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { ChatMessage } from '../../types/chatbot';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble = React.memo<MessageBubbleProps>(
  ({ message }) => {
    const { user } = useAuth();
    const isUser = message.role === 'user';

    // Memoize timestamp formatting to avoid recalculation on every render
    const formattedTime = useMemo(() => {
      return new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }, [message.timestamp]);

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
          className={`flex flex-col gap-1.5 min-w-0 ${
            isUser 
              ? 'items-end max-w-[80%]' 
              : 'items-start max-w-[95%]'
          }`}
        >
          <div
            className={`group rounded-2xl px-4 py-3 shadow-lg transition-all duration-200 hover:shadow-xl overflow-x-hidden ${
              isUser
                ? 'bg-gradient-to-br from-[#B39CD0] to-[#C3ADD9] text-[#1A1A1C] rounded-br-sm'
                : 'bg-[#1A1A1C] border border-white/10 text-white rounded-bl-sm hover:border-white/20'
            }`}
          >
            <div className="text-sm leading-relaxed break-words overflow-wrap-anywhere max-w-full min-w-0 w-full">
              <MarkdownRenderer content={message.content} isUser={isUser} />
            </div>
          </div>
          <span className="text-xs text-white/40 px-1.5 font-medium">
            {formattedTime}
          </span>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if message content, role, or timestamp changes
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.role === nextProps.message.role &&
      prevProps.message.timestamp.getTime() === nextProps.message.timestamp.getTime()
    );
  }
);

MessageBubble.displayName = 'MessageBubble';

