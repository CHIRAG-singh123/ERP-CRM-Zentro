import { useState, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

interface MessageInputProps {
  chatId: string;
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ chatId, onSend, disabled = false }: MessageInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { setTyping } = useSocket();
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

  const handleSend = () => {
    if (content.trim() && !disabled) {
      onSend(content.trim());
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setTyping(chatId, false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-white/10 bg-gradient-to-t from-[#1A1A1C] to-[#1A1A1C]/95 backdrop-blur-sm p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
      <div className="flex items-end gap-3">
        <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-3 transition-all duration-300 focus-within:border-[#B39CD0]/50 focus-within:bg-white/10 focus-within:shadow-lg focus-within:shadow-[#B39CD0]/10">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            rows={1}
            className="w-full resize-none bg-transparent text-white placeholder:text-white/40 focus:outline-none text-sm leading-relaxed"
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
          disabled={!content.trim() || disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#B39CD0] to-[#A68BC7] text-[#1A1A1C] transition-all duration-300 hover:from-[#C3ADD9] hover:to-[#B39CD0] hover:scale-110 hover:shadow-lg hover:shadow-[#B39CD0]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

