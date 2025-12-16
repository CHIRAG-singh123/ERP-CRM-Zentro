import mongoose from 'mongoose';

const dealSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Deal title is required'],
      trim: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      index: true,
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
    value: {
      type: Number,
      required: [true, 'Deal value is required'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    stage: {
      type: String,
      enum: ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
      default: 'Prospecting',
      index: true,
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    closeDate: {
      type: Date,
      required: [true, 'Expected close date is required'],
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        quantity: Number,
        unitPrice: Number,
        discount: { type: Number, default: 0 },
      },
    ],
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    description: String,
    notes: String,
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

dealSchema.index({ stage: 1, ownerId: 1 });
dealSchema.index({ closeDate: 1 });

export default mongoose.model('Deal', dealSchema);

