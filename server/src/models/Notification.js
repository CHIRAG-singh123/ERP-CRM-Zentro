import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error', 'task', 'lead', 'deal', 'comment'],
      default: 'info',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    relatedTo: {
      type: {
        type: String,
        enum: ['Lead', 'Deal', 'Contact', 'Company', 'Invoice', 'Quote', 'Task'],
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'relatedTo.type',
      },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);

