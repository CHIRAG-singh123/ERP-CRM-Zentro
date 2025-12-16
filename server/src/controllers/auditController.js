import AuditLog from '../models/AuditLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Get audit logs
// @route   GET /api/audit
// @access  Private (Admin only)
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, entityType, userId, startDate, endDate } = req.query;
  const skip = (page - 1) * limit;

  const query = {};

  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  if (action) {
    query.action = action;
  }

  if (entityType) {
    query.entityType = entityType;
  }

  if (userId) {
    query.userId = userId;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate);
    }
  }

  const auditLogs = await AuditLog.find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 })
    .populate('userId', 'name email role')
    .populate('entityId');

  const total = await AuditLog.countDocuments(query);

  res.json({
    auditLogs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get audit log by ID
// @route   GET /api/audit/:id
// @access  Private (Admin only)
export const getAuditLog = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };

  if (req.user.tenantId) {
    query.tenantId = req.user.tenantId;
  }

  const auditLog = await AuditLog.findOne(query)
    .populate('userId', 'name email role')
    .populate('entityId');

  if (!auditLog) {
    return res.status(404).json({ error: 'Audit log not found' });
  }

  res.json({ auditLog });
});

