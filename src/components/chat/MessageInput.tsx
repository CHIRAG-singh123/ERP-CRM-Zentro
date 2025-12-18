import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

interface MessageInputProps {
  chatId: string;
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ chatId, onSend, disabled = false }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { setTyping, isConnected, connectionStatus } = useSocket();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Handle typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setTyping(chatId, true);

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(chatId, false);
    }, 2000);
  };

  const handleSend = async () => {
    const messageContent = content.trim();
    if (!messageContent || disabled || isSending || !isConnected) {
      return;
    }

    setIsSending(true);
    setSendError(null);
    
    try {
      // Clear typing indicator
      setTyping(chatId, false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Call onSend and wait a bit to see if there's an immediate error
      onSend(messageContent);
      
      // Clear input immediately for better UX
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      // Reset sending state after a short delay (message will appear optimistically)
      setTimeout(() => {
        setIsSending(false);
      }, 500);
    } catch (error) {
      setSendError('Failed to send message. Please try again.');
      setIsSending(false);
      // Restore content on error
      setContent(messageContent);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isInputDisabled = disabled || isSending || !isConnected;
  const canSend = content.trim() && !isInputDisabled;

  return (
    <div className="border-t border-white/10 bg-gradient-to-t from-[#1A1A1C] to-[#1A1A1C]/95 backdrop-blur-sm p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
      {sendError && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span>{sendError}</span>
          <button
            onClick={() => setSendError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            ×
          </button>
        </div>
      )}
      {!isConnected && connectionStatus !== 'connecting' && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-xs text-yellow-400">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Not connected. Messages will be queued.</span>
        </div>
      )}
      <div className="flex items-end gap-3">
        <div className={`flex-1 rounded-2xl border p-3 transition-all duration-300 ${
          sendError 
            ? 'border-red-500/50 bg-red-500/5' 
            : isInputDisabled
            ? 'border-white/5 bg-white/3'
            : 'border-white/10 bg-white/5 focus-within:border-[#B39CD0]/50 focus-within:bg-white/10 focus-within:shadow-lg focus-within:shadow-[#B39CD0]/10'
        }`}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={!isConnected ? "Connecting..." : "Type a message..."}
            disabled={isInputDisabled}
            rows={1}
            className="w-full resize-none bg-transparent text-white placeholder:text-white/40 focus:outline-none text-sm leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              minHeight: '24px',
              maxHeight: '120px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#B39CD0] to-[#A68BC7] text-[#1A1A1C] transition-all duration-300 hover:from-[#C3ADD9] hover:to-[#B39CD0] hover:scale-110 hover:shadow-lg hover:shadow-[#B39CD0]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          title={!isConnected ? "Not connected" : isSending ? "Sending..." : "Send message"}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}

