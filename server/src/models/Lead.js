import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Lead title is required'],
      trim: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    source: {
      type: String,
      enum: ['website', 'referral', 'social', 'email', 'phone', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Qualified', 'Lost', 'Converted'],
      default: 'New',
      index: true,
    },
    value: {
      type: Number,
      default: 0,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    description: String,
    notes: String,
    expectedCloseDate: Date,
    convertedToDealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal',
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

leadSchema.index({ status: 1, ownerId: 1 });
leadSchema.index({ companyId: 1, contactId: 1 });

export default mongoose.model('Lead', leadSchema);

