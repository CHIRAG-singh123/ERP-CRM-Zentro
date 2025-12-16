import mongoose from 'mongoose';

const chatParticipantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatGroup',
      required: [true, 'Chat ID is required'],
      index: true,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
    muted: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
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

// Compound indexes
chatParticipantSchema.index({ userId: 1, chatId: 1 }, { unique: true });
chatParticipantSchema.index({ chatId: 1, lastReadAt: 1 });
chatParticipantSchema.index({ tenantId: 1, userId: 1 });

export default mongoose.model('ChatParticipant', chatParticipantSchema);

