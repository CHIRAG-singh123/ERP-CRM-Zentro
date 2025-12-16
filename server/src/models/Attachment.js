import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
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
    relatedTo: {
      type: {
        type: String,
        enum: ['Lead', 'Deal', 'Contact', 'Company', 'Invoice', 'Quote', 'Task'],
        required: true,
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'relatedTo.type',
        required: true,
      },
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

attachmentSchema.index({ 'relatedTo.type': 1, 'relatedTo.id': 1 });
attachmentSchema.index({ uploadedBy: 1 });

export default mongoose.model('Attachment', attachmentSchema);

