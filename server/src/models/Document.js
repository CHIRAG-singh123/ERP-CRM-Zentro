import mongoose from 'mongoose';
import crypto from 'crypto';

const documentSchema = new mongoose.Schema(
  {
    // PDF filename (stored file)
    filename: {
      type: String,
      required: true,
    },
    // Original uploaded filename (e.g., "report.docx")
    originalName: {
      type: String,
      required: true,
    },
    // Original filename before conversion (preserved for reference)
    originalFilename: {
      type: String,
      default: null,
    },
    // MIME type - always 'application/pdf' for stored files
    mimeType: {
      type: String,
      required: true,
      default: 'application/pdf',
    },
    // Original MIME type before conversion
    originalMimeType: {
      type: String,
      default: null,
    },
    // PDF file size
    size: {
      type: Number,
      required: true,
    },
    // Original file size before conversion
    originalSize: {
      type: Number,
      default: null,
    },
    // Path to PDF file
    path: {
      type: String,
      required: true,
    },
    // Original file type (word, powerpoint, excel) - kept for display purposes
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
    // Flag to indicate if document was converted to PDF
    isConverted: {
      type: Boolean,
      default: true,
    },
    // Temporary view token for external viewers (kept for backward compatibility)
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

