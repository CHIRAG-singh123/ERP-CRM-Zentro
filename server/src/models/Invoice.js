import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },
    quoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quote',
      index: true,
    },
    dealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deal',
      index: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'],
      default: 'Draft',
      index: true,
    },
    lineItems: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        description: String,
        quantity: Number,
        unitPrice: Number,
        discount: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
      },
    ],
    subtotal: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    dueDate: Date,
    paidDate: Date,
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

invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ contactId: 1, companyId: 1 });

// Calculate totals before saving
invoiceSchema.pre('save', function (next) {
  if (this.lineItems && this.lineItems.length > 0) {
    let subtotal = 0;

    this.lineItems.forEach((item) => {
      const quantity = item.quantity || 0;
      const unitPrice = item.unitPrice || 0;
      const discount = item.discount || 0;
      const lineTotal = quantity * unitPrice * (1 - discount / 100);
      subtotal += lineTotal;
    });

    const tax = this.lineItems.reduce((sum, item) => sum + (item.tax || 0), 0);
    this.subtotal = subtotal;
    this.tax = tax;
    this.total = subtotal + tax;
  } else {
    this.subtotal = 0;
    this.tax = 0;
    this.total = 0;
  }
  next();
});

// Generate invoice number before saving
invoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `INV-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model('Invoice', invoiceSchema);

