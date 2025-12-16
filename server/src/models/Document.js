import mongoose from 'mongoose';
import crypto from 'crypto';

const documentSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ['word', 'powerpoint', 'excel'],
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    // Temporary view token for external viewers (like Google Docs Viewer)
    viewToken: {
      type: String,
      default: null,
      index: true,
    },
    viewTokenExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Method to generate a temporary view token
documentSchema.methods.generateViewToken = function (expiresInMinutes = 30) {
  const token = crypto.randomBytes(32).toString('hex');
  this.viewToken = token;
  this.viewTokenExpires = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  return token;
};

// Method to validate a view token
documentSchema.methods.isViewTokenValid = function (token) {
  if (!this.viewToken || !this.viewTokenExpires) {
    return false;
  }
  if (this.viewToken !== token) {
    return false;
  }
  if (new Date() > this.viewTokenExpires) {
    return false;
  }
  return true;
};

// Static method to find by view token
documentSchema.statics.findByViewToken = async function (token) {
  return this.findOne({
    viewToken: token,
    viewTokenExpires: { $gt: new Date() },
  });
};

// Indexes for efficient queries
documentSchema.index({ uploadedBy: 1, createdAt: -1 });
documentSchema.index({ tenantId: 1, fileType: 1 });
documentSchema.index({ originalName: 'text' }); // Text search index
documentSchema.index({ createdAt: -1 });

export default mongoose.model('Document', documentSchema);

