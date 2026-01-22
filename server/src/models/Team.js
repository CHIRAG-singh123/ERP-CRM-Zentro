import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: [2, 'Team name must be at least 2 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    queueType: {
      type: String,
      trim: true,
      default: '',
    },
    coverage: {
      type: String,
      trim: true,
      default: '',
    },
    escalationPolicy: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Validate members array max length
teamSchema.pre('validate', function (next) {
  if (this.members && this.members.length > 10) {
    this.invalidate('members', 'A team can have a maximum of 10 members');
  }
  next();
});

// Indexes
teamSchema.index({ tenantId: 1, isActive: 1 });
teamSchema.index({ createdBy: 1 });
teamSchema.index({ members: 1 });

export default mongoose.model('Team', teamSchema);
