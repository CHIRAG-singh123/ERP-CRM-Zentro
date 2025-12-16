import { useEffect, useState } from 'react';
import { useChatbot } from '../../hooks/useChatbot';
import { ChatbotButton } from './ChatbotButton';
import { ChatbotWindow } from './ChatbotWindow';
import { WelcomeBadge } from './WelcomeBadge';

export function Chatbot() {
  const {
    messages,
    isOpen,
    isLoading,
    showWelcomeBadge,
    sendMessage,
    clearHistory,
    toggleOpen,
    setIsOpen,
  } = useChatbot();
  
  const [showBadge, setShowBadge] = useState(showWelcomeBadge);
  
  useEffect(() => {
    setShowBadge(showWelcomeBadge);
  }, [showWelcomeBadge]);

  // Close chatbot when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside the chatbot window and button
      if (
        !target.closest('[data-chatbot-window]') &&
        !target.closest('[data-chatbot-button]')
      ) {
        // Don't close if clicking on the welcome badge
        if (!target.closest('[data-welcome-badge]')) {
          setIsOpen(false);
        }
      }
    };

    // Add slight delay to prevent immediate close on open
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  return (
    <>
      <ChatbotButton
        isOpen={isOpen}
        onClick={toggleOpen}
        unreadCount={0}
      />
      
      {showBadge && !isOpen && (
        <div data-welcome-badge>
          <WelcomeBadge onDismiss={() => setShowBadge(false)} />
        </div>
      )}

      {isOpen && (
        <>
          {/* Desktop version */}
          <div
            data-chatbot-window
            className="hidden fixed bottom-24 right-6 z-[9998] h-[500px] max-h-[85vh] w-[380px] max-w-[calc(100vw-3rem)] animate-slide-in-up shadow-2xl ring-2 ring-[#A8DADC]/20 sm:block sm:w-[420px]"
          >
            <ChatbotWindow
              messages={messages}
              isLoading={isLoading}
              onSendMessage={sendMessage}
              onClearHistory={clearHistory}
            />
          </div>

          {/* Mobile responsive version */}
          <div
            data-chatbot-window
            className="fixed inset-0 z-[9998] flex items-end sm:hidden"
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <div className="relative w-full max-w-full h-[85vh] max-h-[85vh] animate-slide-in-up">
              <ChatbotWindow
                messages={messages}
                isLoading={isLoading}
                onSendMessage={sendMessage}
                onClearHistory={clearHistory}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

