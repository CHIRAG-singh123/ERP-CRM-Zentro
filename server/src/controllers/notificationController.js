import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = false } = req.query;
  const skip = (page - 1) * limit;

  const query = {
    userId: req.user._id,
  };

  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  if (unreadOnly === 'true') {
    query.isRead = false;
  }

  const notifications = await Notification.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .populate('relatedTo.id');

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({
    ...query,
    isRead: false,
  });

  res.json({
    notifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
    unreadCount,
  });
});

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const query = {
    _id: req.params.id,
    userId: req.user._id,
  };

  const notification = await Notification.findOneAndUpdate(
    query,
    {
      isRead: true,
      readAt: new Date(),
    },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  res.json({ notification });
});

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res) => {
  const query = {
    userId: req.user._id,
    isRead: false,
  };

  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  await Notification.updateMany(query, {
    isRead: true,
    readAt: new Date(),
  });

  res.json({ message: 'All notifications marked as read' });
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = asyncHandler(async (req, res) => {
  const query = {
    _id: req.params.id,
    userId: req.user._id,
  };

  const notification = await Notification.findOneAndDelete(query);

  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  res.json({ message: 'Notification deleted successfully' });
});

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = asyncHandler(async (req, res) => {
  const query = {
    userId: req.user._id,
    isRead: false,
  };

  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const count = await Notification.countDocuments(query);

  res.json({ unreadCount: count });
});

