import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getAccessToken } from '../services/api/http';

// Helper to get access token (re-exported for convenience)
const getToken = (): string | null => {
  return getAccessToken();
};

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface QueuedMessage {
  event: string;
  data: any;
  timestamp: number;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  sendMessage: (data: {
    chatId: string;
    content: string;
    type?: 'text' | 'file' | 'image';
    attachments?: any[];
    replyTo?: string | null;
  }) => void;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  markMessageAsRead: (messageId: string, chatId: string) => void;
  deleteMessage: (messageId: string, chatId: string) => void;
  setTyping: (chatId: string, isTyping: boolean) => void;
  // Task-related methods
  subscribeToTasks: () => void;
  onTaskCreated: (callback: (task: any) => void) => () => void;
  onTaskUpdated: (callback: (task: any) => void) => () => void;
  onTaskDeleted: (callback: (data: { taskId: string; deletedBy: string }) => void) => () => void;
  onDashboardMetricsUpdated: (callback: () => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const messageQueueRef = useRef<QueuedMessage[]>([]);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Process queued messages when connected
  const processQueue = useCallback((socketInstance: Socket) => {
    if (messageQueueRef.current.length === 0) return;

    const queue = [...messageQueueRef.current];
    messageQueueRef.current = [];

    queue.forEach((queued) => {
      try {
        socketInstance.emit(queued.event, queued.data);
      } catch (error) {
        console.error('Error processing queued message:', error);
        // Re-queue if failed (with limit)
        if (Date.now() - queued.timestamp < 60000) {
          messageQueueRef.current.push(queued);
        }
      }
    });
  }, []);

  // Queue message for later sending
  const queueMessage = useCallback((event: string, data: any) => {
    messageQueueRef.current.push({
      event,
      data,
      timestamp: Date.now(),
    });

    // Store in localStorage as backup
    try {
      const stored = localStorage.getItem('socketMessageQueue');
      const queue = stored ? JSON.parse(stored) : [];
      queue.push({ event, data, timestamp: Date.now() });
      // Keep only last 50 messages
      const recentQueue = queue.slice(-50);
      localStorage.setItem('socketMessageQueue', JSON.stringify(recentQueue));
    } catch (error) {
      console.error('Error storing message queue:', error);
    }
  }, []);

  // Load queued messages from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('socketMessageQueue');
      if (stored) {
        const queue = JSON.parse(stored);
        // Only keep messages from last 5 minutes
        const recentQueue = queue.filter(
          (q: QueuedMessage) => Date.now() - q.timestamp < 300000
        );
        messageQueueRef.current = recentQueue;
        if (recentQueue.length < queue.length) {
          localStorage.setItem('socketMessageQueue', JSON.stringify(recentQueue));
        }
      }
    } catch (error) {
      console.error('Error loading message queue:', error);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setConnectionStatus('disconnected');
      }
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    // Initialize Socket.IO client
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    setConnectionStatus('connecting');
    
    const newSocket = io(socketUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('Socket.IO connected');
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // Join user's personal room for notifications
      newSocket.emit('joinUserRoom', user._id);
      // Join all user's chats
      newSocket.emit('joinChats');
      // Join task room for task notifications
      newSocket.emit('joinTaskRoom');
      
      // Process queued messages
      processQueue(newSocket);
      
      // Clear localStorage queue
      try {
        localStorage.removeItem('socketMessageQueue');
      } catch (error) {
        console.error('Error clearing message queue:', error);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      
      // Auto-reconnect if not manual disconnect
      if (reason === 'io server disconnect') {
        // Server disconnected, reconnect manually
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('Socket.IO connection error:', error);
      setIsConnected(false);
      setConnectionStatus('error');
      
      // Retry connection after delay
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      retryTimeoutRef.current = setTimeout(() => {
        if (!newSocket.connected) {
          setConnectionStatus('connecting');
          newSocket.connect();
        }
      }, 3000);
    });

    newSocket.on('error', (error: Error) => {
      console.error('Socket.IO error:', error);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket.IO reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // Re-join chats and process queue
      newSocket.emit('joinUserRoom', user._id);
      newSocket.emit('joinChats');
      newSocket.emit('joinTaskRoom');
      processQueue(newSocket);
    });

    newSocket.on('reconnect_attempt', () => {
      setConnectionStatus('connecting');
    });

    newSocket.on('reconnect_error', () => {
      setConnectionStatus('error');
    });

    newSocket.on('reconnect_failed', () => {
      setConnectionStatus('error');
      console.error('Socket.IO reconnection failed');
    });

    setSocket(newSocket);

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };
  }, [isAuthenticated, user, processQueue]);

  const sendMessage = useCallback(
    (data: {
      chatId: string;
      content: string;
      type?: 'text' | 'file' | 'image';
      attachments?: any[];
      replyTo?: string | null;
    }) => {
      if (socket) {
        if (socket.connected) {
          socket.emit('sendMessage', data);
        } else {
          // Queue message if not connected
          queueMessage('sendMessage', data);
        }
      }
    },
    [socket, queueMessage]
  );

  const joinChat = useCallback(
    (chatId: string) => {
      if (socket) {
        if (socket.connected) {
          socket.emit('joinChat', chatId);
        } else {
          queueMessage('joinChat', chatId);
        }
      }
    },
    [socket, queueMessage]
  );

  const leaveChat = useCallback(
    (chatId: string) => {
      if (socket) {
        if (socket.connected) {
          socket.emit('leaveChat', chatId);
        }
        // Don't queue leaveChat, just skip if not connected
      }
    },
    [socket]
  );

  const markMessageAsRead = useCallback(
    (messageId: string, chatId: string) => {
      if (socket) {
        if (socket.connected) {
          socket.emit('readMessage', { messageId, chatId });
        } else {
          queueMessage('readMessage', { messageId, chatId });
        }
      }
    },
    [socket, queueMessage]
  );

  const deleteMessage = useCallback(
    (messageId: string, chatId: string) => {
      if (socket) {
        if (socket.connected) {
          socket.emit('deleteMessage', { messageId, chatId });
        } else {
          queueMessage('deleteMessage', { messageId, chatId });
        }
      }
    },
    [socket, queueMessage]
  );

  const setTyping = useCallback(
    (chatId: string, isTyping: boolean) => {
      if (socket && socket.connected) {
        socket.emit('typing', { chatId, isTyping });
      }
      // Don't queue typing indicators
    },
    [socket]
  );

  const subscribeToTasks = useCallback(() => {
    if (socket && socket.connected) {
      socket.emit('joinTaskRoom');
    }
  }, [socket]);

  const onTaskCreated = useCallback(
    (callback: (task: any) => void) => {
      if (!socket) return () => {};
      
      socket.on('taskCreated', callback);
      return () => {
        socket.off('taskCreated', callback);
      };
    },
    [socket]
  );

  const onTaskUpdated = useCallback(
    (callback: (task: any) => void) => {
      if (!socket) return () => {};
      
      socket.on('taskUpdated', callback);
      return () => {
        socket.off('taskUpdated', callback);
      };
    },
    [socket]
  );

  const onTaskDeleted = useCallback(
    (callback: (data: { taskId: string; deletedBy: string }) => void) => {
      if (!socket) return () => {};
      
      socket.on('taskDeleted', callback);
      return () => {
        socket.off('taskDeleted', callback);
      };
    },
    [socket]
  );

  const onDashboardMetricsUpdated = useCallback(
    (callback: () => void) => {
      if (!socket) return () => {};
      
      socket.on('dashboardMetricsUpdated', callback);
      return () => {
        socket.off('dashboardMetricsUpdated', callback);
      };
    },
    [socket]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        connectionStatus,
        sendMessage,
        joinChat,
        leaveChat,
        markMessageAsRead,
        deleteMessage,
        setTyping,
        subscribeToTasks,
        onTaskCreated,
        onTaskUpdated,
        onTaskDeleted,
        onDashboardMetricsUpdated,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

