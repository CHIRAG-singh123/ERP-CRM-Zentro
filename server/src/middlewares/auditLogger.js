import AuditLog from '../models/AuditLog.js';

/**
 * Middleware to log audit trail
 * @param {string} action - Action type (CREATE, UPDATE, DELETE, etc.)
 * @param {string} entityType - Entity type (User, Company, Contact, etc.)
 */
export const auditLogger = (action, entityType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to capture response
    res.json = function (data) {
      // Log the action
      if (req.user && req.user._id) {
        const logData = {
          action,
          entityType,
          userId: req.user._id,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          tenantId: req.user.tenantId,
        };

        // Extract entity ID from params or body
        if (req.params.id) {
          logData.entityId = req.params.id;
        } else if (req.body._id) {
          logData.entityId = req.body._id;
        } else if (data && data[entityType.toLowerCase()] && data[entityType.toLowerCase()]._id) {
          logData.entityId = data[entityType.toLowerCase()]._id;
        }

        // For UPDATE actions, log changes
        if (action === 'UPDATE' && req.body) {
          const changes = new Map();
          Object.keys(req.body).forEach((key) => {
            if (key !== '_id' && key !== 'createdAt' && key !== 'updatedAt') {
              changes.set(key, req.body[key]);
            }
          });
          if (changes.size > 0) {
            logData.changes = changes;
          }
        }

        // Log asynchronously (don't block response)
        AuditLog.create(logData).catch((error) => {
          console.error('Failed to create audit log:', error);
        });
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

