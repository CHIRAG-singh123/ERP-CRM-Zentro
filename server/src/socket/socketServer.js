import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import ChatGroup from '../models/ChatGroup.js';
import Message from '../models/Message.js';
import ChatParticipant from '../models/ChatParticipant.js';

let io;

export const initializeSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        const decoded = verifyToken(token, 'access');
        const user = await User.findById(decoded.userId).select('-passwordHash');

        if (!user || !user.isActive) {
          return next(new Error('Authentication error: User not found or inactive'));
        }

        socket.user = user;
        next();
      } catch (error) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }
    } catch (error) {
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user._id})`);

    // Join user's personal room
    socket.join(`user:${socket.user._id}`);

    // Join all chats the user is part of
    socket.on('joinChats', async () => {
      try {
        const chats = await ChatGroup.find({
          $or: [
            { members: socket.user._id },
            { createdBy: socket.user._id },
          ],
          isActive: true,
        });

        chats.forEach((chat) => {
          socket.join(`chat:${chat._id}`);
        });

        socket.emit('chatsJoined', { count: chats.length });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join chats' });
      }
    });

    // Join a specific chat
    socket.on('joinChat', async (chatId) => {
      try {
        const chat = await ChatGroup.findOne({
          _id: chatId,
          $or: [
            { members: socket.user._id },
            { createdBy: socket.user._id },
          ],
          isActive: true,
        });

        if (chat) {
          socket.join(`chat:${chatId}`);
          socket.emit('chatJoined', { chatId });
        } else {
          socket.emit('error', { message: 'Chat not found or access denied' });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Leave a chat
    socket.on('leaveChat', (chatId) => {
      socket.leave(`chat:${chatId}`);
      socket.emit('chatLeft', { chatId });
    });

    // Send message
    socket.on('sendMessage', async (data) => {
      try {
        const { chatId, content, type = 'text', attachments = [], replyTo = null } = data;

        // Verify user is part of the chat
        const chat = await ChatGroup.findOne({
          _id: chatId,
          $or: [
            { members: socket.user._id },
            { createdBy: socket.user._id },
          ],
          isActive: true,
        });

        if (!chat) {
          socket.emit('error', { message: 'Chat not found or access denied' });
          return;
        }

        // Create message
        const message = new Message({
          chatId,
          senderId: socket.user._id,
          content,
          type,
          attachments,
          replyTo,
          tenantId: socket.user.tenantId || null,
        });

        await message.save();

        // Populate sender info
        await message.populate('senderId', 'name email profile.avatar');

        // Mark as read by sender immediately
        message.readBy.push({
          userId: socket.user._id,
          readAt: new Date(),
        });
        await message.save();

        // Update participant's lastReadAt (don't wait for this)
        ChatParticipant.findOneAndUpdate(
          { userId: socket.user._id, chatId },
          { lastReadAt: new Date() },
          { upsert: true }
        ).catch(err => console.error('Error updating participant:', err));

        // Convert message to plain object for socket emission
        // Use lean() equivalent by converting to plain object
        const messageObj = message.toObject ? message.toObject({ virtuals: true }) : JSON.parse(JSON.stringify(message));
        
        // Ensure chatId is a string in the message object
        if (messageObj.chatId && typeof messageObj.chatId !== 'string') {
          messageObj.chatId = messageObj.chatId.toString();
        }
        
        // Ensure senderId is properly serialized
        if (messageObj.senderId && typeof messageObj.senderId === 'object') {
          // Already populated, keep as is
        } else if (messageObj.senderId) {
          messageObj.senderId = messageObj.senderId.toString();
        }
        
        // Emit immediately to all users in the chat room (including sender for immediate feedback)
        // Use io.to() for broadcasting to all participants
        io.to(`chat:${chatId}`).emit('newMessage', messageObj);

        // Also emit chatUpdated event for sidebar updates (don't wait for participants query)
        // Get participants asynchronously and emit separately
        ChatParticipant.find({ chatId })
          .then((participants) => {
            participants.forEach((participant) => {
              io.to(`user:${participant.userId}`).emit('chatUpdated', {
                chatId,
                lastMessage: messageObj,
              });
            });
          })
          .catch(err => console.error('Error emitting chatUpdated:', err));
          
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', async (data) => {
      const { chatId, isTyping } = data;

      // Verify user is part of the chat
      const chat = await ChatGroup.findOne({
        _id: chatId,
        $or: [
          { members: socket.user._id },
          { createdBy: socket.user._id },
        ],
        isActive: true,
      });

      if (chat) {
        socket.to(`chat:${chatId}`).emit('userTyping', {
          userId: socket.user._id,
          userName: socket.user.name,
          chatId,
          isTyping,
        });
      }
    });

    // Mark message as read
    socket.on('readMessage', async (data) => {
      try {
        const { messageId, chatId } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Check if already read
        const alreadyRead = message.readBy.some(
          (read) => read.userId.toString() === socket.user._id.toString()
        );

        if (!alreadyRead) {
          message.readBy.push({
            userId: socket.user._id,
            readAt: new Date(),
          });
          await message.save();

          // Update participant's lastReadAt
          await ChatParticipant.findOneAndUpdate(
            { userId: socket.user._id, chatId },
            { lastReadAt: new Date() },
            { upsert: true }
          );

          // Emit to chat room and all participants
          io.to(`chat:${chatId}`).emit('messageRead', {
            messageId,
            chatId,
            userId: socket.user._id,
          });

          // Also emit messagesRead event for chat list updates
          io.to(`chat:${chatId}`).emit('messagesRead', {
            chatId,
            userId: socket.user._id,
          });

          // Emit to user's personal room for sidebar updates
          io.to(`user:${socket.user._id}`).emit('messagesRead', {
            chatId,
            userId: socket.user._id,
          });
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });

    // Delete message
    socket.on('deleteMessage', async (data) => {
      try {
        const { messageId, chatId } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Only sender or admin can delete
        const isSender = message.senderId.toString() === socket.user._id.toString();
        const isAdmin = socket.user.role === 'admin';

        if (!isSender && !isAdmin) {
          socket.emit('error', { message: 'Unauthorized to delete message' });
          return;
        }

        message.isDeleted = true;
        message.deletedAt = new Date();
        message.deletedBy = socket.user._id;
        await message.save();

        // Emit to chat room
        io.to(`chat:${chatId}`).emit('messageDeleted', {
          messageId,
          chatId,
          deletedBy: socket.user._id,
        });
      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Join user's task room for task notifications
    socket.on('joinTaskRoom', () => {
      socket.join(`user:${socket.user._id}`);
      socket.emit('taskRoomJoined', { userId: socket.user._id });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name} (${socket.user._id})`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

