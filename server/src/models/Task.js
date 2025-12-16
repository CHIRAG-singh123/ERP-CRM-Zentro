import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: String,
    status: {
      type: String,
      enum: ['Todo', 'In Progress', 'Done', 'Cancelled'],
      default: 'Todo',
      index: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    assignedTo: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    dueDate: Date,
    completedDate: Date,
    relatedTo: {
      type: {
        type: String,
        enum: ['Lead', 'Deal', 'Contact', 'Company', 'Invoice', 'Quote'],
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'relatedTo.type',
      },
    },
    tags: [String],
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

taskSchema.index({ assignedTo: 1, status: 1 });
// Index for array queries
taskSchema.index({ 'assignedTo': 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ 'relatedTo.type': 1, 'relatedTo.id': 1 });

export default mongoose.model('Task', taskSchema);

