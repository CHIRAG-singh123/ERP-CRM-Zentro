import express from 'express';
import {
  getChats,
  getChatById,
  getMessages,
  createGroup,
  updateGroup,
  deleteGroup,
  uploadGroupAvatar,
  addMembers,
  removeMember,
  createIndividualChat,
  clearChatHistory,
  markAsRead,
  searchChats,
} from '../controllers/chatController.js';
import { authenticate } from '../middlewares/auth.js';
import { groupAvatarUpload } from '../utils/upload.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user's chats
router.get('/', getChats);

// Get chat details
router.get('/:id', getChatById);

// Get messages for a chat
router.get('/:id/messages', getMessages);

// Create group (All authenticated users)
router.post('/groups', createGroup);

// Update group (Group creator only)
router.put('/groups/:id', updateGroup);

// Delete group (Group creator only)
router.delete('/groups/:id', deleteGroup);

// Upload group avatar (Group creator only)
router.post('/groups/:id/avatar', groupAvatarUpload.single('avatar'), uploadGroupAvatar);

// Add members to group (Group creator only)
router.post('/groups/:id/members', addMembers);

// Remove member from group (Group creator only)
router.delete('/groups/:id/members/:userId', removeMember);

// Create/get individual chat
router.post('/individual', createIndividualChat);

// Clear chat history
router.delete('/:id/history', clearChatHistory);

// Mark messages as read
router.post('/:id/read', markAsRead);

// Search chats
router.get('/search', searchChats);

export default router;

