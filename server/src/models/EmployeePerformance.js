import mongoose from 'mongoose';

const employeePerformanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    period: {
      type: String, // Format: "YYYY-MM" for monthly tracking
      required: true,
    },
    productsCreated: {
      type: Number,
      default: 0,
    },
    averageProductRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    tasksCompleted: {
      type: Number,
      default: 0,
    },
    reviewsReceived: {
      type: Number,
      default: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
employeePerformanceSchema.index({ employeeId: 1, period: 1 }, { unique: true });

export const EmployeePerformance = mongoose.model('EmployeePerformance', employeePerformanceSchema);

