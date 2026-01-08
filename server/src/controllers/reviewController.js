import { Review } from '../models/Review.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';

// Get reviews for a product
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const reviews = await Review.find({ productId })
      .populate('customerId', 'name email profile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Populate replies for each review
    const reviewsWithReplies = await Promise.all(
      reviews.map(async (review) => {
        const populatedReplies = await populateReplies(review.replies || []);
        return {
          ...review.toObject(),
          replies: populatedReplies,
        };
      })
    );

    const total = await Review.countDocuments({ productId });

    // Calculate average rating
    const allReviews = await Review.find({ productId });
    const avgRating =
      allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0;

    res.json({
      reviews: reviewsWithReplies,
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create review
export const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if customer already reviewed this product
    const existingReview = await Review.findOne({
      productId,
      customerId: req.user._id,
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this product' });
    }

    const review = await Review.create({
      productId,
      customerId: req.user._id,
      rating: parseInt(rating),
      comment: comment || '',
      isVerified: false,
    });

    const populatedReview = await Review.findById(review._id).populate('customerId', 'name email profile');

    res.status(201).json({ review: populatedReview });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update review
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check ownership
    if (review.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only update your own reviews' });
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }
      review.rating = parseInt(rating);
    }

    if (comment !== undefined) {
      review.comment = comment;
    }

    await review.save();

    const populatedReview = await Review.findById(review._id).populate('customerId', 'name email profile');

    res.json({ review: populatedReview });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete review
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check ownership
    if (review.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }

    await Review.findByIdAndDelete(id);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper function to recursively find and populate replies
const populateReplies = async (replies) => {
  if (!replies || replies.length === 0) return [];
  
  const populatedReplies = await Promise.all(
    replies.map(async (reply) => {
      const populatedReply = await User.findById(reply.userId).select('name email profile');
      const nestedReplies = await populateReplies(reply.replies || []);
      
      return {
        ...reply.toObject(),
        userId: populatedReply,
        replies: nestedReplies,
      };
    })
  );
  
  return populatedReplies;
};

// Get reviews for employee's product
export const getEmployeeProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const employeeId = req.user._id;

    // Verify the product was created by this employee
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.createdBy.toString() !== employeeId.toString()) {
      return res.status(403).json({ error: 'You can only view reviews for products you created' });
    }

    const reviews = await Review.find({ productId })
      .populate('customerId', 'name email profile')
      .sort({ createdAt: -1 });

    // Populate replies for each review
    const reviewsWithReplies = await Promise.all(
      reviews.map(async (review) => {
        const populatedReplies = await populateReplies(review.replies || []);
        return {
          ...review.toObject(),
          replies: populatedReplies,
        };
      })
    );

    res.json({ reviews: reviewsWithReplies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all reviews for all products created by employee
export const getEmployeeAllReviews = async (req, res) => {
  try {
    const employeeId = req.user._id;

    // Get all products created by this employee
    const products = await Product.find({ createdBy: employeeId, isActive: true }).select('_id name');
    const productIds = products.map((p) => p._id);

    if (productIds.length === 0) {
      return res.json({ reviews: [], products: [] });
    }

    // Get all reviews for these products
    const reviews = await Review.find({ productId: { $in: productIds } })
      .populate('customerId', 'name email profile')
      .populate('productId', 'name')
      .sort({ createdAt: -1 });

    // Populate replies for each review
    const reviewsWithReplies = await Promise.all(
      reviews.map(async (review) => {
        const populatedReplies = await populateReplies(review.replies || []);
        return {
          ...review.toObject(),
          replies: populatedReplies,
        };
      })
    );

    res.json({ reviews: reviewsWithReplies, products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create reply to a review
export const createReply = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Reply comment is required' });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user is employee who created the product or the review owner
    const product = await Product.findById(review.productId);
    const isProductCreator = product && product.createdBy.toString() === req.user._id.toString();
    const isReviewOwner = review.customerId.toString() === req.user._id.toString();

    if (!isProductCreator && !isReviewOwner) {
      return res.status(403).json({ error: 'You can only reply to reviews on products you created or your own reviews' });
    }

    const newReply = {
      userId: req.user._id,
      comment: comment.trim(),
      readBy: [
        {
          userId: req.user._id,
          readAt: new Date(),
        },
      ],
      replies: [],
    };

    review.replies.push(newReply);
    await review.save();

    const updatedReview = await Review.findById(reviewId)
      .populate('customerId', 'name email profile');
    
    const populatedReplies = await populateReplies(updatedReview.replies || []);

    res.status(201).json({
      review: {
        ...updatedReview.toObject(),
        replies: populatedReplies,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create nested reply (reply to a reply)
export const createNestedReply = async (req, res) => {
  try {
    const { reviewId, replyId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Reply comment is required' });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Helper function to find and add nested reply
    const addNestedReply = (replies, targetReplyId) => {
      for (let reply of replies) {
        if (reply._id.toString() === targetReplyId) {
          reply.replies.push({
            userId: req.user._id,
            comment: comment.trim(),
            readBy: [
              {
                userId: req.user._id,
                readAt: new Date(),
              },
            ],
            replies: [],
          });
          return true;
        }
        if (reply.replies && reply.replies.length > 0) {
          if (addNestedReply(reply.replies, targetReplyId)) {
            return true;
          }
        }
      }
      return false;
    };

    const found = addNestedReply(review.replies, replyId);
    if (!found) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    await review.save();

    const updatedReview = await Review.findById(reviewId)
      .populate('customerId', 'name email profile');
    
    const populatedReplies = await populateReplies(updatedReview.replies || []);

    res.status(201).json({
      review: {
        ...updatedReview.toObject(),
        replies: populatedReplies,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a reply
export const updateReply = async (req, res) => {
  try {
    const { reviewId, replyId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Reply comment is required' });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Helper function to find and update reply
    const updateReplyInTree = (replies, targetReplyId) => {
      for (let reply of replies) {
        if (reply._id.toString() === targetReplyId) {
          if (reply.userId.toString() !== req.user._id.toString()) {
            return 'unauthorized';
          }
          reply.comment = comment.trim();
          reply.updatedAt = new Date();
          return true;
        }
        if (reply.replies && reply.replies.length > 0) {
          const result = updateReplyInTree(reply.replies, targetReplyId);
          if (result === true || result === 'unauthorized') {
            return result;
          }
        }
      }
      return false;
    };

    const result = updateReplyInTree(review.replies, replyId);
    if (result === false) {
      return res.status(404).json({ error: 'Reply not found' });
    }
    if (result === 'unauthorized') {
      return res.status(403).json({ error: 'You can only update your own replies' });
    }

    await review.save();

    const updatedReview = await Review.findById(reviewId)
      .populate('customerId', 'name email profile');
    
    const populatedReplies = await populateReplies(updatedReview.replies || []);

    res.json({
      review: {
        ...updatedReview.toObject(),
        replies: populatedReplies,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a reply
export const deleteReply = async (req, res) => {
  try {
    const { reviewId, replyId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Helper function to find and delete reply
    const deleteReplyFromTree = (replies, targetReplyId) => {
      for (let i = 0; i < replies.length; i++) {
        if (replies[i]._id.toString() === targetReplyId) {
          if (replies[i].userId.toString() !== req.user._id.toString()) {
            return 'unauthorized';
          }
          replies.splice(i, 1);
          return true;
        }
        if (replies[i].replies && replies[i].replies.length > 0) {
          const result = deleteReplyFromTree(replies[i].replies, targetReplyId);
          if (result === true || result === 'unauthorized') {
            return result;
          }
        }
      }
      return false;
    };

    const result = deleteReplyFromTree(review.replies, replyId);
    if (result === false) {
      return res.status(404).json({ error: 'Reply not found' });
    }
    if (result === 'unauthorized') {
      return res.status(403).json({ error: 'You can only delete your own replies' });
    }

    await review.save();

    const updatedReview = await Review.findById(reviewId)
      .populate('customerId', 'name email profile');
    
    const populatedReplies = await populateReplies(updatedReview.replies || []);

    res.json({
      review: {
        ...updatedReview.toObject(),
        replies: populatedReplies,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper function to recursively mark reply as read
const markReplyAsReadInTree = (replies, targetReplyId, userId) => {
  for (let reply of replies) {
    if (reply._id.toString() === targetReplyId) {
      const alreadyRead = reply.readBy?.some(
        (read) => read.userId.toString() === userId.toString()
      );
      if (!alreadyRead) {
        if (!reply.readBy) {
          reply.readBy = [];
        }
        reply.readBy.push({
          userId,
          readAt: new Date(),
        });
      }
      return true;
    }
    if (reply.replies && reply.replies.length > 0) {
      if (markReplyAsReadInTree(reply.replies, targetReplyId, userId)) {
        return true;
      }
    }
  }
  return false;
};

// Helper function to recursively mark all replies as read
const markAllRepliesAsReadInTree = (replies, userId) => {
  for (let reply of replies) {
    const alreadyRead = reply.readBy?.some(
      (read) => read.userId.toString() === userId.toString()
    );
    if (!alreadyRead) {
      if (!reply.readBy) {
        reply.readBy = [];
      }
      reply.readBy.push({
        userId,
        readAt: new Date(),
      });
    }
    if (reply.replies && reply.replies.length > 0) {
      markAllRepliesAsReadInTree(reply.replies, userId);
    }
  }
};

// Mark a reply as read
export const markReplyAsRead = async (req, res) => {
  try {
    const { reviewId, replyId } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Verify user is the review owner (customer who wrote the review)
    if (review.customerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only mark replies on your own reviews as read' });
    }

    const found = markReplyAsReadInTree(review.replies, replyId, userId);
    if (!found) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    await review.save();

    res.json({ message: 'Reply marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark all replies in a review as read
export const markReviewRepliesAsRead = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Verify user is the review owner (customer who wrote the review)
    if (review.customerId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only mark replies on your own reviews as read' });
    }

    if (review.replies && review.replies.length > 0) {
      markAllRepliesAsReadInTree(review.replies, userId);
      await review.save();
    }

    res.json({ message: 'All replies marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get unread reply count for a product
export const getProductUnreadCount = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    // Get all reviews for this product where user is the customer
    const reviews = await Review.find({
      productId,
      customerId: userId,
    });

    let unreadCount = 0;

    // Helper function to count unread replies recursively
    const countUnreadReplies = (replies, reviewOwnerId) => {
      if (!replies) return 0;
      let count = 0;
      for (let reply of replies) {
        // Count as unread if reply is not from review owner and review owner hasn't read it
        const replyUserId = reply.userId.toString();
        const isFromReviewOwner = replyUserId === reviewOwnerId.toString();
        const isRead = reply.readBy?.some(
          (read) => read.userId.toString() === reviewOwnerId.toString()
        );

        if (!isFromReviewOwner && !isRead) {
          count++;
        }

        // Recursively count nested replies
        if (reply.replies && reply.replies.length > 0) {
          count += countUnreadReplies(reply.replies, reviewOwnerId);
        }
      }
      return count;
    };

    for (let review of reviews) {
      if (review.replies && review.replies.length > 0) {
        unreadCount += countUnreadReplies(review.replies, review.customerId);
      }
    }

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get unread reply counts for all products
export const getAllProductsUnreadCounts = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all reviews where user is the customer
    const reviews = await Review.find({
      customerId: userId,
    }).populate('productId', '_id name');

    const productCounts = {};

    // Helper function to count unread replies recursively
    const countUnreadReplies = (replies, reviewOwnerId) => {
      if (!replies) return 0;
      let count = 0;
      for (let reply of replies) {
        const replyUserId = reply.userId.toString();
        const isFromReviewOwner = replyUserId === reviewOwnerId.toString();
        const isRead = reply.readBy?.some(
          (read) => read.userId.toString() === reviewOwnerId.toString()
        );

        if (!isFromReviewOwner && !isRead) {
          count++;
        }

        if (reply.replies && reply.replies.length > 0) {
          count += countUnreadReplies(reply.replies, reviewOwnerId);
        }
      }
      return count;
    };

    for (let review of reviews) {
      const productId = typeof review.productId === 'object' 
        ? review.productId._id.toString() 
        : review.productId.toString();

      if (!productCounts[productId]) {
        productCounts[productId] = 0;
      }

      if (review.replies && review.replies.length > 0) {
        const unread = countUnreadReplies(review.replies, review.customerId);
        productCounts[productId] += unread;
      }
    }

    res.json({ productCounts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
