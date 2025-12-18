import { formatMessageTime } from '../../utils/formatting';
import { UserAvatar } from '../common/UserAvatar';
import { Check, CheckCheck, Clock } from 'lucide-react';
import type { Message } from '../../types/chat';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
}

export function MessageBubble({ message, isOwn, showAvatar = true, showTimestamp = true }: MessageBubbleProps) {
  const sender = typeof message.senderId === 'object' ? message.senderId : null;
  const senderName = sender?.name || 'Unknown';
  const senderAvatar = sender?.profile?.avatar;

  // Determine message status for own messages
  const getMessageStatus = () => {
    if (!isOwn) return null;
    
    // Check if message is optimistic (sending)
    if (message._id?.startsWith('temp-')) {
      return 'sending';
    }
    
    // Check read status
    const readBy = message.readBy || [];
    if (readBy.length > 1) {
      // More than just the sender has read it
      return 'read';
    } else if (readBy.length === 1) {
      // Only sender has read it (sent but not delivered/read)
      return 'sent';
    }
    
    // Default to sent if no readBy info
    return 'sent';
  };

  const messageStatus = getMessageStatus();
  
  const getStatusIcon = () => {
    switch (messageStatus) {
      case 'sending':
        return <Clock className="h-3.5 w-3.5 text-white/40 animate-pulse" />;
      case 'sent':
        return <Check className="h-3.5 w-3.5 text-white/40" />;
      case 'read':
        return <CheckCheck className="h-3.5 w-3.5 text-[#A8DADC]" />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} animate-fade-in group`}>
      {showAvatar && !isOwn && (
        <div className="flex-shrink-0">
          <UserAvatar
            avatarUrl={senderAvatar}
            name={senderName}
            size={32}
            className="border-white/20"
          />
        </div>
      )}
      <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {!isOwn && showAvatar && (
          <span className="text-xs text-white/60 px-2">{senderName}</span>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 shadow-sm ${
            isOwn
              ? messageStatus === 'sending'
                ? 'bg-gradient-to-br from-[#B39CD0]/70 to-[#A68BC7]/70 text-[#1A1A1C]/70'
                : 'bg-gradient-to-br from-[#B39CD0] to-[#A68BC7] text-[#1A1A1C]'
              : 'bg-white/10 text-white border border-white/20 backdrop-blur-sm'
          } transition-all duration-200 hover:scale-[1.01] hover:shadow-md ${
            messageStatus === 'sending' ? 'opacity-70' : ''
          }`}
        >
          {message.replyTo && typeof message.replyTo === 'object' && (
            <div className="mb-2 pl-3 border-l-2 border-white/30 text-xs text-white/70">
              <div className="font-semibold">
                {typeof message.replyTo.senderId === 'object' ? message.replyTo.senderId.name : 'Unknown'}
              </div>
              <div className="truncate">{message.replyTo.content}</div>
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment, idx) => (
                <div key={idx} className="rounded-lg bg-white/5 p-2 border border-white/10 hover:bg-white/10 transition-colors">
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#A8DADC] hover:text-[#BCE7E5] hover:underline flex items-center gap-1.5"
                  >
                    <span>📎</span>
                    <span>{attachment.filename}</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
        {showTimestamp && (
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <span>{formatMessageTime(message.createdAt)}</span>
            {isOwn && (
              <div className="flex items-center" title={
                messageStatus === 'sending' ? 'Sending...' :
                messageStatus === 'sent' ? 'Sent' :
                messageStatus === 'read' ? 'Read' : 'Sent'
              }>
                {getStatusIcon()}
              </div>
            )}
          </div>
        )}
      </div>
      {isOwn && showAvatar && <div className="w-8" />}
    </div>
  );
}

