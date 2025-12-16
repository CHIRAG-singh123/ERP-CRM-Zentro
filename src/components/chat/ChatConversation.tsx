import { formatRelativeTime, truncate } from '../../utils/formatting';
import { UserAvatar } from '../common/UserAvatar';
import type { ChatWithMetadata } from '../../types/chat';

interface ChatConversationProps {
  chat: ChatWithMetadata;
  isSelected: boolean;
  onClick: () => void;
  currentUserId: string;
}

export function ChatConversation({ chat, isSelected, onClick, currentUserId }: ChatConversationProps) {
  // Get the other user for individual chats
  const getDisplayName = () => {
    if (chat.type === 'individual') {
      const otherMember = chat.members.find(
        (m) => (typeof m === 'object' ? m._id : m) !== currentUserId
      );
      if (otherMember && typeof otherMember === 'object') {
        return otherMember.name;
      }
    }
    return chat.name;
  };

  const getDisplayAvatar = () => {
    if (chat.type === 'individual') {
      const otherMember = chat.members.find(
        (m) => (typeof m === 'object' ? m._id : m) !== currentUserId
      );
      if (otherMember && typeof otherMember === 'object') {
        return otherMember.profile?.avatar;
      }
    }
    return chat.avatar;
  };

  const lastMessage = chat.lastMessage;
  const lastMessageContent = lastMessage
    ? truncate(lastMessage.content, 50)
    : 'No messages yet';

  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-all duration-300 ${
        isSelected
          ? 'bg-gradient-to-r from-white/15 to-white/10 border border-white/30 shadow-md shadow-[#B39CD0]/10'
          : 'hover:bg-white/8 border border-transparent hover:border-white/10 hover:shadow-sm'
      }`}
    >
      <div className="relative flex-shrink-0">
        <UserAvatar
          avatarUrl={getDisplayAvatar()}
          name={getDisplayName()}
          size={48}
          className="border-white/20"
        />
        {chat.unreadCount > 0 && (
          <span className="absolute -left-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-md border-2 border-[#1A1A1C]">
            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-white truncate">{getDisplayName()}</h3>
          {lastMessage && (
            <span className="text-xs text-white/40 shrink-0">
              {formatRelativeTime(lastMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-white/60 truncate">{lastMessageContent}</p>
        </div>
      </div>
    </div>
  );
}

