import { useState, useEffect } from 'react';
import { MessageSquare, Reply, Send, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserAvatar } from '../common/UserAvatar';
import { StarRating } from '../common/StarRating';
import { ReviewReply } from './ReviewReply';
import { useAuth } from '../../context/AuthContext';
import { useCreateReply, useMarkReviewRepliesAsRead } from '../../hooks/queries/useReviews';
import { useQueryClient } from '@tanstack/react-query';
import type { Review } from '../../types/reviews';
import { formatDate } from '../../utils/formatting';

interface ReviewThreadProps {
  review: Review;
  productId?: string;
  isProductCreator?: boolean;
  onReplyAdded?: () => void;
}

export function ReviewThread({ review, productId, isProductCreator = false, onReplyAdded }: ReviewThreadProps) {
  const { user, isAuthenticated } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const queryClient = useQueryClient();

  const createReplyMutation = useCreateReply();
  const markRepliesAsReadMutation = useMarkReviewRepliesAsRead();

  const customer = typeof review.customerId === 'object' ? review.customerId : null;
  const customerName = customer?.name || 'Unknown';
  const canReply = isProductCreator || (user?._id === customer?._id);
  const isReviewOwner = isAuthenticated && user && customer && user._id === customer._id;

  // Helper function to recursively check for unread replies
  const hasUnreadRepliesRecursive = (replies: typeof review.replies, userId: string): boolean => {
    if (!replies || replies.length === 0 || !userId) return false;
    
    return replies.some((reply) => {
      const replyUserId = typeof reply.userId === 'object' ? reply.userId._id : reply.userId;
      const isFromUser = replyUserId === userId;
      const isRead = reply.readBy?.some(
        (read) => {
          const readUserId = typeof read.userId === 'object' ? read.userId._id : read.userId;
          return readUserId === userId;
        }
      );
      const isUnread = !isFromUser && !isRead;
      
      // Check nested replies recursively
      const hasUnreadNested = hasUnreadRepliesRecursive(reply.replies, userId);
      
      return isUnread || hasUnreadNested;
    });
  };

  // Mark replies as read when review owner views the thread
  useEffect(() => {
    if (isReviewOwner && user && review.replies && review.replies.length > 0) {
      // Check if review has unread replies (including nested)
      const hasUnreadReplies = hasUnreadRepliesRecursive(review.replies, user._id);

      if (hasUnreadReplies) {
        markRepliesAsReadMutation.mutate(review._id, {
          onSuccess: () => {
            // Invalidate unread counts to update badges
            queryClient.invalidateQueries({ queryKey: ['all-products-unread-counts'] });
            if (productId) {
              queryClient.invalidateQueries({ queryKey: ['product-unread-count', productId] });
            }
          },
        });
      }
    }
  }, [isReviewOwner, review._id, review.replies, user, markRepliesAsReadMutation, queryClient, productId]);

  const handleReply = async () => {
    if (!replyText.trim()) return;

    try {
      await createReplyMutation.mutateAsync({
        reviewId: review._id,
        data: { comment: replyText.trim() },
      });
      setReplyText('');
      setIsReplying(false);
      onReplyAdded?.();
    } catch (error) {
      console.error('Error creating reply:', error);
    }
  };

  const totalReplies = (replies: typeof review.replies): number => {
    if (!replies) return 0;
    return replies.reduce((count, reply) => {
      return count + 1 + totalReplies(reply.replies);
    }, 0);
  };

  const totalReplyCount = totalReplies(review.replies);

  return (
    <motion.div
      className="card-gradient-hover rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.01 }}
    >
      {/* Review Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <UserAvatar
            avatarUrl={customer?.profile?.avatar}
            name={customerName}
            email={customer?.email}
            size={40}
            className="shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-white">{customerName}</span>
              <span className="text-xs text-white/50">
                {formatDate(review.createdAt, 'short')}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-xs text-white/50">{review.rating} out of 5</span>
            </div>
            {review.comment && (
              <p className="text-sm text-white/80 whitespace-pre-wrap break-words">
                {review.comment}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Reply Button */}
      {canReply && !isReplying && (
        <motion.button
          onClick={() => setIsReplying(true)}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-[#B39CD0] transition-colors mb-4"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Reply className="h-4 w-4" />
          Reply
          {totalReplyCount > 0 && (
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded">
              {totalReplyCount}
            </span>
          )}
        </motion.button>
      )}

      {/* Reply Form */}
      {isReplying && (
        <motion.div
          className="mb-4 p-3 rounded-lg border border-white/10 bg-[#1A1A1C]/50"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex gap-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              className="flex-1 rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white text-sm focus:border-[#B39CD0] focus:outline-none resize-none"
              placeholder="Write a reply..."
            />
            <div className="flex flex-col gap-1">
              <motion.button
                onClick={handleReply}
                disabled={createReplyMutation.isPending || !replyText.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-[#B39CD0] px-3 py-1.5 text-xs font-medium text-[#1A1A1C] transition hover:bg-[#C3ADD9] disabled:opacity-50 h-10"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Send className="h-3.5 w-3.5" />
              </motion.button>
              <motion.button
                onClick={() => {
                  setIsReplying(false);
                  setReplyText('');
                }}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/20 h-10"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="h-3.5 w-3.5" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Replies List */}
      {review.replies && review.replies.length > 0 && (
        <motion.div
          className="mt-4 pt-4 border-t border-white/10 space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-white/50" />
            <span className="text-sm font-medium text-white/70">
              {totalReplyCount} {totalReplyCount === 1 ? 'Reply' : 'Replies'}
            </span>
          </div>
          {review.replies.map((reply, index) => (
            <motion.div
              key={reply._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <ReviewReply
                reply={reply}
                reviewId={review._id}
                onReplyAdded={onReplyAdded}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
