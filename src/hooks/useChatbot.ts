import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { findKnowledgeBaseAnswer, classifyQueryWithConfidence } from '../services/chatbotService';
import { callOpenRouterAPI } from '../services/api/chatbot';
import { logger } from '../utils/logger';
import type { ChatMessage } from '../types/chatbot';

const STORAGE_PREFIX = 'chatbot_history_';
const SESSION_USER_KEY = 'chatbot_session_user';

function getStorageKey(role: string): string {
  return `${STORAGE_PREFIX}${role}`;
}

function loadChatHistory(role: string): ChatMessage[] {
  try {
    const key = getStorageKey(role);
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    }
  } catch (error) {
    logger.error('[useChatbot] Failed to load chat history:', error);
  }
  return [];
}

function saveChatHistory(role: string, messages: ChatMessage[]): void {
  try {
    const key = getStorageKey(role);
    localStorage.setItem(key, JSON.stringify(messages));
  } catch (error) {
    logger.error('[useChatbot] Failed to save chat history:', error);
  }
}

function shouldShowWelcomeBadge(userId: string | undefined): boolean {
  if (!userId) return false;
  
  try {
    const lastSessionUserId = sessionStorage.getItem(SESSION_USER_KEY);
    // Show badge if this is a new login session (different user or first time)
    if (lastSessionUserId !== userId) {
      sessionStorage.setItem(SESSION_USER_KEY, userId);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function useChatbot() {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcomeBadge, setShowWelcomeBadge] = useState(false);

  // For unauthenticated users, force role to 'customer' and mark as unauthenticated
  const role = user?.role || 'customer';
  const validRole = role === 'admin' || role === 'employee' || role === 'customer' 
    ? role 
    : 'customer';
  const isUserAuthenticated = isAuthenticated && !!user;

  // Load chat history on mount and show welcome badge on every login
  useEffect(() => {
    if (user) {
      const history = loadChatHistory(validRole);
      setMessages(history);
      
      // Show welcome badge on every login (when user changes)
      if (shouldShowWelcomeBadge(user._id)) {
        setShowWelcomeBadge(true);
        // Auto-hide badge after 5 seconds
        setTimeout(() => setShowWelcomeBadge(false), 5000);
      }
    } else {
      // For unauthenticated users, load customer chat history
      const history = loadChatHistory('customer');
      setMessages(history);
      
      // Clear session when user logs out
      try {
        sessionStorage.removeItem(SESSION_USER_KEY);
      } catch {
        // Ignore errors
      }
    }
  }, [user?._id, validRole]);

  // Save chat history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Save history for both authenticated and unauthenticated users
      // Unauthenticated users use 'customer' role storage
      saveChatHistory(validRole, messages);
    }
  }, [messages, validRole]);

  const getQuestionType = (text: string): string => {
    const normalized = text.trim().toLowerCase();
    if (normalized.startsWith('how')) return 'how';
    if (normalized.startsWith('what')) return 'what';
    if (normalized.startsWith('why')) return 'why';
    if (normalized.startsWith('when')) return 'when';
    if (normalized.startsWith('where')) return 'where';
    if (normalized.startsWith('who')) return 'who';
    return 'general';
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => {
      const updated = [...prev, userMessage];
      setIsLoading(true);
      setError(null);

      // Process message asynchronously
      (async () => {
        try {
          // Pre-classify query for routing and API context
          const classification = classifyQueryWithConfidence(content);
          const questionType = getQuestionType(content);
          const wordCount = content.trim().split(/\s+/).length;

          // First, try to find answer in role-specific knowledge base
          let response: string | null = null;
          
          try {
            // Pass isAuthenticated flag to restrict access for unauthenticated users
            // This will check:
            // - Admin => admin-knowledge.txt only
            // - Employee => employee-knowledge.txt only
            // - Customer => customer-knowledge.txt only
            // - Unauthenticated => customer-knowledge.txt only
            response = await findKnowledgeBaseAnswer(content, validRole, isUserAuthenticated);
          } catch (kbError) {
            logger.warn('[useChatbot] Knowledge base lookup failed:', kbError);
          }

          // If no knowledge base match, use API (OpenRouter with Google AI Studios fallback)
          // This includes general/programming questions that don't match ERP knowledge base
          if (!response) {
            // Explicit logging for general/programming queries to ensure API is called
            const isGeneralQuery = classification.type === 'general' || classification.type === 'unclear';
            if (isGeneralQuery) {
              logger.debug(`[useChatbot] General query detected (type: ${classification.type}, confidence: ${classification.confidence.toFixed(2)}) - calling API for response`);
            }
            
            try {
              const conversationHistory = [
                ...updated.map((msg) => ({
                  role: msg.role,
                  content: msg.content,
                })),
              ];
              
              logger.debug(`[useChatbot] Attempting API call (OpenRouter with Google AI Studios fallback) for query type: ${classification.type}`);
              
              // callOpenRouterAPI has built-in fallback to Google AI Studios
              // It will try OpenRouter first, then Google AI Studios if OpenRouter fails
              // Pass isAuthenticated flag and role for proper access control
              response = await callOpenRouterAPI(conversationHistory, 2, validRole, {
                classification: classification.type,
                confidence: classification.confidence,
                questionType,
                wordCount,
                isAuthenticated: isUserAuthenticated,
              });
              
              logger.debug('[useChatbot] API call successful, received response');
            } catch (apiError: any) {
              logger.error('[useChatbot] All API tiers failed:', apiError);
              
              // Use the error message from the orchestrator if available
              // The orchestrator already provides a comprehensive error message
              if (apiError?.message?.includes('All AI services')) {
                response = apiError.message;
              } else if (apiError?.message?.includes('timeout')) {
                response = "The request took too long to process. Please try again in a moment.";
              } else if (apiError?.message?.includes('Network error') || apiError?.message?.includes('internet connection')) {
                response = "I'm unable to connect to any AI service. Please check your internet connection and try again.";
              } else if (apiError?.message?.includes('API')) {
                response = "All AI services are currently unavailable. Please try again in a few moments.";
              } else {
                response = "I apologize, but I'm unable to connect to any AI service at the moment. All API services are currently unavailable. Please check your internet connection and try again in a few moments. If the problem persists, please contact support.";
              }
            }
          }

          // Ensure we have a response before creating message
          if (!response) {
            response = "I apologize, but I'm unable to process your request at the moment. Please try again later.";
          }

          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: response,
            timestamp: new Date(),
          };

          setMessages((current) => [...current, assistantMessage]);
        } catch (error) {
          logger.error('[useChatbot] Error sending message:', error);
          setError('Failed to send message. Please try again.');
          
          const errorMessage: ChatMessage = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: "I'm sorry, I encountered an error. Please try again.",
            timestamp: new Date(),
          };
          
          setMessages((current) => [...current, errorMessage]);
        } finally {
          setIsLoading(false);
        }
      })();

      return updated;
    });
  }, [isLoading, validRole, isUserAuthenticated]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem(getStorageKey(validRole));
    } catch (error) {
      logger.error('[useChatbot] Failed to clear history:', error);
    }
  }, [validRole]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
    setShowWelcomeBadge(false);
  }, []);

  return {
    messages,
    isOpen,
    isLoading,
    error,
    showWelcomeBadge,
    sendMessage,
    clearHistory,
    toggleOpen,
    setIsOpen,
  };
}

