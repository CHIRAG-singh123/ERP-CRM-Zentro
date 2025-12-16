import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    emails: [
      {
        email: String,
        type: { type: String, enum: ['work', 'personal', 'other'], default: 'work' },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    phones: [
      {
        phone: String,
        type: { type: String, enum: ['work', 'mobile', 'home', 'other'], default: 'work' },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    jobTitle: String,
    department: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    notes: String,
    tags: [String],
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

contactSchema.index({ companyId: 1 });
contactSchema.index({ 'emails.email': 1 });
contactSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

export default mongoose.model('Contact', contactSchema);

