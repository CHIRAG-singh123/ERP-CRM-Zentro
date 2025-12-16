import ChatGroup from '../models/ChatGroup.js';
import Message from '../models/Message.js';
import ChatParticipant from '../models/ChatParticipant.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getIO } from '../socket/socketServer.js';
import fs from 'fs';
import path from 'path';

// @desc    Get all chats (groups + individuals) for user
// @route   GET /api/chat
// @access  Private
export const getChats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const tenantId = req.user.tenantId;

  // Build query
  const query = {
    $or: [
      { members: userId },
      { createdBy: userId },
    ],
    isActive: true,
  };

  if (tenantId) {
    query.tenantId = tenantId;
  }

  // Get all chats user is part of
  const chats = await ChatGroup.find(query)
    .populate('createdBy', 'name email profile.avatar')
    .populate('members', 'name email profile.avatar role')
    .sort({ updatedAt: -1 });

  // Get last message and unread count for each chat
  const chatsWithMetadata = await Promise.all(
    chats.map(async (chat) => {
      const lastMessage = await Message.findOne({
        chatId: chat._id,
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .populate('senderId', 'name email profile.avatar')
        .limit(1);

      const participant = await ChatParticipant.findOne({
        userId,
        chatId: chat._id,
      });

      const lastReadAt = participant?.lastReadAt || chat.createdAt;

      // Count unread messages
      const unreadCount = await Message.countDocuments({
        chatId: chat._id,
        senderId: { $ne: userId },
        createdAt: { $gt: lastReadAt },
        isDeleted: false,
      });

      return {
        ...chat.toObject(),
        lastMessage: lastMessage ? lastMessage.toObject() : null,
        unreadCount,
        lastReadAt,
      };
    })
  );

  res.json({ chats: chatsWithMetadata });
});

// @desc    Get chat details with participants
// @route   GET /api/chat/:id
// @access  Private
export const getChatById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const chat = await ChatGroup.findOne({
    _id: id,
    $or: [
      { members: userId },
      { createdBy: userId },
    ],
    isActive: true,
  })
    .populate('createdBy', 'name email profile.avatar')
    .populate('members', 'name email profile.avatar role');

  if (!chat) {
    return res.status(404).json({ error: 'Chat not found' });
  }

  // Get participant info
  const participant = await ChatParticipant.findOne({
    userId,
    chatId: id,
  });

  res.json({
    chat,
    participant: participant || null,
  });
});

// @desc    Get messages for a chat with pagination
// @route   GET /api/chat/:id/messages
// @access  Private
export const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const userId = req.user._id;
  const skip = (page - 1) * limit;

  // Verify user is part of the chat
  const chat = await ChatGroup.findOne({
    _id: id,
    $or: [
      { members: userId },
      { createdBy: userId },
    ],
    isActive: true,
  });

  if (!chat) {
    return res.status(404).json({ error: 'Chat not found' });
  }

  // Get messages
  const messages = await Message.find({
    chatId: id,
    isDeleted: false,
  })
    .populate('senderId', 'name email profile.avatar')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Message.countDocuments({
    chatId: id,
    isDeleted: false,
  });

  res.json({
    messages: messages.reverse(), // Reverse to show oldest first
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Create new group
// @route   POST /api/chat/groups
// @access  Private
export const createGroup = asyncHandler(async (req, res) => {
  const { name, description, members = [], avatar } = req.body;
  const userId = req.user._id;
  const tenantId = req.user.tenantId;

  // Validate members
  if (members.length > 0) {
    const validMembers = await User.find({
      _id: { $in: members },
      isActive: true,
    });

    if (validMembers.length !== members.length) {
      return res.status(400).json({ error: 'Invalid member IDs' });
    }
  }

  // Create group
  const group = new ChatGroup({
    name,
    description: description || '',
    type: 'group',
    createdBy: userId,
    members: [...members, userId], // Include creator
    avatar: avatar || '',
    tenantId: tenantId || null,
  });

  await group.save();

  // Create participants
  const participants = [...members, userId].map((memberId) => ({
    userId: memberId,
    chatId: group._id,
    role: memberId.toString() === userId.toString() ? 'admin' : 'member',
    tenantId: tenantId || null,
  }));

  await ChatParticipant.insertMany(participants);

  await group.populate('createdBy', 'name email profile.avatar');
  await group.populate('members', 'name email profile.avatar role');

  // Emit socket event
  const io = getIO();
  members.forEach((memberId) => {
    io.to(`user:${memberId}`).emit('newChat', group);
  });

  res.status(201).json({ chat: group });
});

// @desc    Update group details (Group creator only)
// @route   PUT /api/chat/groups/:id
// @access  Private
export const updateGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, avatar } = req.body;

  const group = await ChatGroup.findOne({
    _id: id,
    createdBy: req.user._id,
    type: 'group',
    isActive: true,
  });

  if (!group) {
    return res.status(404).json({ error: 'Group not found or access denied' });
  }

  if (name) group.name = name;
  if (description !== undefined) group.description = description;
  if (avatar !== undefined) group.avatar = avatar;

  await group.save();

  await group.populate('createdBy', 'name email profile.avatar');
  await group.populate('members', 'name email profile.avatar role');

  // Emit socket event
  const io = getIO();
  io.to(`chat:${id}`).emit('chatUpdated', group);

  res.json({ chat: group });
});

// @desc    Delete group (Group creator only)
// @route   DELETE /api/chat/groups/:id
// @access  Private
export const deleteGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const group = await ChatGroup.findOne({
    _id: id,
    createdBy: req.user._id,
    type: 'group',
    isActive: true,
  });

  if (!group) {
    return res.status(404).json({ error: 'Group not found or access denied' });
  }

  // Soft delete
  group.isActive = false;
  await group.save();

  // Delete participants
  await ChatParticipant.deleteMany({ chatId: id });

  // Emit socket event
  const io = getIO();
  io.to(`chat:${id}`).emit('chatDeleted', { chatId: id });

  res.json({ message: 'Group deleted successfully' });
});

// @desc    Upload group avatar
// @route   POST /api/chat/groups/:id/avatar
// @access  Private (Group creator only)
export const uploadGroupAvatar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Verify user is the group creator
  const group = await ChatGroup.findOne({
    _id: id,
    createdBy: userId,
    type: 'group',
    isActive: true,
  });

  if (!group) {
    return res.status(404).json({ error: 'Group not found or access denied' });
  }

  // Delete old avatar if exists
  if (group.avatar) {
    const oldAvatarPath = path.join(process.cwd(), 'server', group.avatar);
    try {
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    } catch (error) {
      console.error('Error deleting old avatar:', error);
    }
  }

  // Save new avatar path
  const avatarPath = `/uploads/group-avatars/${req.file.filename}`;
  group.avatar = avatarPath;
  await group.save();

  await group.populate('createdBy', 'name email profile.avatar');
  await group.populate('members', 'name email profile.avatar role');

  // Emit socket event for real-time updates
  const io = getIO();
  const groupObj = group.toObject ? group.toObject() : JSON.parse(JSON.stringify(group));
  io.to(`chat:${id}`).emit('groupAvatarUpdated', {
    chatId: id,
    avatar: avatarPath,
    group: groupObj,
  });
  io.to(`chat:${id}`).emit('chatUpdated', {
    chatId: id,
    lastMessage: null,
  });
  
  // Also notify all group members individually
  group.members.forEach((memberId) => {
    io.to(`user:${memberId}`).emit('groupAvatarUpdated', {
      chatId: id,
      avatar: avatarPath,
      group: groupObj,
    });
  });

  res.status(200).json({
    message: 'Avatar uploaded successfully',
    avatarUrl: avatarPath,
    chat: group,
  });
});

// @desc    Add members to group (Group creator only)
// @route   POST /api/chat/groups/:id/members
// @access  Private
export const addMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { members } = req.body;
  const tenantId = req.user.tenantId;

  if (!Array.isArray(members) || members.length === 0) {
    return res.status(400).json({ error: 'Members array is required' });
  }

  const group = await ChatGroup.findOne({
    _id: id,
    createdBy: req.user._id,
    type: 'group',
    isActive: true,
  });

  if (!group) {
    return res.status(404).json({ error: 'Group not found or access denied' });
  }

  // Validate members
  const validMembers = await User.find({
    _id: { $in: members },
    isActive: true,
  });

  if (validMembers.length !== members.length) {
    return res.status(400).json({ error: 'Invalid member IDs' });
  }

  // Add members to group (avoid duplicates)
  const existingMembers = group.members.map((m) => m.toString());
  const newMembers = members.filter((m) => !existingMembers.includes(m.toString()));

  if (newMembers.length === 0) {
    return res.status(400).json({ error: 'All members are already in the group' });
  }

  group.members.push(...newMembers);
  await group.save();

  // Create participants
  const participants = newMembers.map((memberId) => ({
    userId: memberId,
    chatId: id,
    role: 'member',
    tenantId: tenantId || null,
  }));

  await ChatParticipant.insertMany(participants);

  await group.populate('createdBy', 'name email profile.avatar');
  await group.populate('members', 'name email profile.avatar role');

  // Emit socket event
  const io = getIO();
  newMembers.forEach((memberId) => {
    io.to(`user:${memberId}`).emit('addedToChat', group);
  });
  io.to(`chat:${id}`).emit('membersAdded', { chatId: id, members: newMembers });

  res.json({ chat: group });
});

// @desc    Remove member from group (Group creator only)
// @route   DELETE /api/chat/groups/:id/members/:userId
// @access  Private
export const removeMember = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;

  const group = await ChatGroup.findOne({
    _id: id,
    createdBy: req.user._id,
    type: 'group',
    isActive: true,
  });

  if (!group) {
    return res.status(404).json({ error: 'Group not found or access denied' });
  }

  // Cannot remove creator
  if (group.createdBy.toString() === userId) {
    return res.status(400).json({ error: 'Cannot remove group creator' });
  }

  // Remove member
  group.members = group.members.filter(
    (m) => m.toString() !== userId
  );
  await group.save();

  // Remove participant
  await ChatParticipant.findOneAndDelete({
    userId,
    chatId: id,
  });

  await group.populate('createdBy', 'name email profile.avatar');
  await group.populate('members', 'name email profile.avatar role');

  // Emit socket event
  const io = getIO();
  io.to(`user:${userId}`).emit('removedFromChat', { chatId: id });
  io.to(`chat:${id}`).emit('memberRemoved', { chatId: id, userId });

  res.json({ chat: group });
});

// @desc    Create or get existing individual chat
// @route   POST /api/chat/individual
// @access  Private
export const createIndividualChat = asyncHandler(async (req, res) => {
  const { userId: otherUserId } = req.body;
  const currentUserId = req.user._id;
  const tenantId = req.user.tenantId;

  if (!otherUserId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (otherUserId === currentUserId.toString()) {
    return res.status(400).json({ error: 'Cannot create chat with yourself' });
  }

  // Check if user exists
  const otherUser = await User.findById(otherUserId);
  if (!otherUser || !otherUser.isActive) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if individual chat already exists
  let chat = await ChatGroup.findOne({
    type: 'individual',
    members: { $all: [currentUserId, otherUserId] },
    isActive: true,
  })
    .populate('createdBy', 'name email profile.avatar')
    .populate('members', 'name email profile.avatar role');

  if (!chat) {
    // Create new individual chat
    const otherUserName = otherUser.name;
    const currentUserName = req.user.name;

    chat = new ChatGroup({
      name: `${currentUserName} & ${otherUserName}`,
      description: '',
      type: 'individual',
      createdBy: currentUserId,
      members: [currentUserId, otherUserId],
      tenantId: tenantId || null,
    });

    await chat.save();

    // Create participants
    await ChatParticipant.insertMany([
      {
        userId: currentUserId,
        chatId: chat._id,
        role: 'member',
        tenantId: tenantId || null,
      },
      {
        userId: otherUserId,
        chatId: chat._id,
        role: 'member',
        tenantId: tenantId || null,
      },
    ]);

    await chat.populate('createdBy', 'name email profile.avatar');
    await chat.populate('members', 'name email profile.avatar role');

    // Emit socket event
    const io = getIO();
    io.to(`user:${otherUserId}`).emit('newChat', chat);
  }

  res.json({ chat });
});

// @desc    Clear chat history
// @route   DELETE /api/chat/:id/history
// @access  Private
export const clearChatHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  // Verify user is part of the chat
  const chat = await ChatGroup.findOne({
    _id: id,
    $or: [
      { members: userId },
      { createdBy: userId },
    ],
    isActive: true,
  });

  if (!chat) {
    return res.status(404).json({ error: 'Chat not found' });
  }

  // Delete all messages
  await Message.deleteMany({ chatId: id });

  // Reset participant's lastReadAt
  await ChatParticipant.findOneAndUpdate(
    { userId, chatId: id },
    { lastReadAt: new Date() },
    { upsert: true }
  );

  // Emit socket event
  const io = getIO();
  io.to(`chat:${id}`).emit('chatHistoryCleared', { chatId: id, clearedBy: userId });

  res.json({ message: 'Chat history cleared successfully' });
});

// @desc    Mark messages as read
// @route   POST /api/chat/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  // Verify user is part of the chat
  const chat = await ChatGroup.findOne({
    _id: id,
    $or: [
      { members: userId },
      { createdBy: userId },
    ],
    isActive: true,
  });

  if (!chat) {
    return res.status(404).json({ error: 'Chat not found' });
  }

  // Update participant's lastReadAt
  await ChatParticipant.findOneAndUpdate(
    { userId, chatId: id },
    { lastReadAt: new Date() },
    { upsert: true }
  );

  // Mark all unread messages as read
  const unreadMessages = await Message.find({
    chatId: id,
    senderId: { $ne: userId },
    'readBy.userId': { $ne: userId },
    isDeleted: false,
  });

  for (const message of unreadMessages) {
    const alreadyRead = message.readBy.some(
      (read) => read.userId.toString() === userId.toString()
    );

    if (!alreadyRead) {
      message.readBy.push({
        userId,
        readAt: new Date(),
      });
      await message.save();
    }
  }

  // Emit socket event
  const io = getIO();
  io.to(`chat:${id}`).emit('messagesRead', { chatId: id, userId });

  res.json({ message: 'Messages marked as read' });
});

// @desc    Search chats and messages
// @route   GET /api/chat/search
// @access  Private
export const searchChats = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const userId = req.user._id;
  const tenantId = req.user.tenantId;

  if (!q || q.trim().length === 0) {
    return res.json({ chats: [], messages: [] });
  }

  const searchQuery = q.trim();

  // Build chat query
  const chatQuery = {
    $or: [
      { members: userId },
      { createdBy: userId },
    ],
    isActive: true,
    $or: [
      { name: { $regex: searchQuery, $options: 'i' } },
      { description: { $regex: searchQuery, $options: 'i' } },
    ],
  };

  if (tenantId) {
    chatQuery.tenantId = tenantId;
  }

  // Search chats
  const chats = await ChatGroup.find(chatQuery)
    .populate('createdBy', 'name email profile.avatar')
    .populate('members', 'name email profile.avatar role')
    .limit(20);

  // Get chat IDs user is part of
  const userChats = await ChatGroup.find({
    $or: [
      { members: userId },
      { createdBy: userId },
    ],
    isActive: true,
  }).select('_id');

  const chatIds = userChats.map((c) => c._id);

  // Search messages
  const messageQuery = {
    chatId: { $in: chatIds },
    content: { $regex: searchQuery, $options: 'i' },
    isDeleted: false,
  };

  if (tenantId) {
    messageQuery.tenantId = tenantId;
  }

  const messages = await Message.find(messageQuery)
    .populate('senderId', 'name email profile.avatar')
    .populate('chatId', 'name type')
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({ chats, messages });
});

