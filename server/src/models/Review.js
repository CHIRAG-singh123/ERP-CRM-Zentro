import mongoose from 'mongoose';

// Reply schema for nested replies (defined as a function to allow recursion)
const createReplySchema = () => {
  return new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      comment: {
        type: String,
        required: [true, 'Reply comment is required'],
        trim: true,
      },
      readBy: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          readAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      replies: {
        type: [],
        default: [],
      },
    },
    {
      timestamps: true,
    }
  );
};

const replySchema = createReplySchema();
// Make replies recursive
replySchema.add({
  replies: [replySchema],
});

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5'],
    },
    comment: {
      type: String,
      default: '',
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    replies: {
      type: [replySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reviewSchema.index({ productId: 1 });
reviewSchema.index({ customerId: 1 });
reviewSchema.index({ productId: 1, customerId: 1 }, { unique: true }); // One review per customer per product

export const Review = mongoose.model('Review', reviewSchema);

