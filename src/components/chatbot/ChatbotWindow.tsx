import { Send, Loader2, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { ChatMessage } from '../../types/chatbot';

interface ChatbotWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onClearHistory: () => void;
}

export function ChatbotWindow({
  messages,
  isLoading,
  onSendMessage,
  onClearHistory,
}: ChatbotWindowProps) {
  const [input, setInput] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleClearHistory = () => {
    setShowConfirmDialog(true);
  };

  const confirmClear = () => {
    onClearHistory();
    setShowConfirmDialog(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
      inputRef.current?.focus();
    }
  };

  return (
    <>
      <div className="flex h-full flex-col rounded-t-2xl border-t border-l border-r border-white/10 bg-[#1A1A1C] shadow-2xl backdrop-blur-xl overflow-hidden ring-1 ring-white/5">
        {/* Header - Sticky to ensure always visible */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#1A1A1C]/95 via-[#1F1F21]/95 to-[#1A1A1C]/95 backdrop-blur-sm px-4 py-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#A8DADC] to-[#B39CD0] shadow-lg ring-2 ring-[#A8DADC]/30">
              <svg
                className="h-5 w-5 text-[#1A1A1C]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
              <p className="text-xs text-white/60">Always here to help</p>
            </div>
          </div>
          
          {/* Prominent Red Clear Chat Button - Always visible when messages exist */}
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-red-500 to-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/40 active:scale-95"
              aria-label="Clear chat history"
              title="Clear chat history"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear chat</span>
            </button>
          )}
        </div>

        {/* Messages - Flex-1 with overflow for scrolling */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4">
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#A8DADC]/20 via-[#B39CD0]/20 to-[#A8DADC]/20 ring-4 ring-[#A8DADC]/10 shadow-lg">
                  <svg
                    className="h-10 w-10 text-[#A8DADC]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-base font-semibold text-white mb-1">Start a conversation</p>
              <p className="text-sm text-white/60">
                Ask me anything about the system
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex gap-3 animate-fade-in">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#A8DADC] to-[#B39CD0] shadow-lg ring-2 ring-[#A8DADC]/30">
                  <svg
                    className="h-5 w-5 text-[#1A1A1C]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-[#1A1A1C] border border-white/10 px-4 py-3 shadow-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-[#A8DADC]" />
                  <span className="text-sm text-white/70 font-medium">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

        {/* Input - Fixed at bottom */}
        <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-white/10 bg-gradient-to-r from-[#1A1A1C]/98 to-[#1F1F21]/98 backdrop-blur-sm p-4 shadow-lg">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 rounded-xl border border-white/10 bg-[#1F1F21]/80 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder:text-white/40 transition-all duration-200 focus:border-[#A8DADC] focus:bg-[#1F1F21] focus:outline-none focus:ring-2 focus:ring-[#A8DADC]/30 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex items-center justify-center rounded-xl bg-gradient-to-br from-[#A8DADC] to-[#B39CD0] px-5 py-3 text-[#1A1A1C] shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-[#A8DADC]/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      </div>

      {showConfirmDialog && (
        <ConfirmDialog
          title="Clear Chat History"
          message="Are you sure you want to clear all chat history? This action cannot be undone."
          onConfirm={confirmClear}
          onCancel={() => setShowConfirmDialog(false)}
          confirmText="Clear History"
          cancelText="Cancel"
          confirmVariant="danger"
        />
      )}
    </>
  );
}

