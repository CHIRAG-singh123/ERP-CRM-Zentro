import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useProduct } from '../../hooks/queries/useProducts';
import { useProductReviews, useCreateReview, useDeleteReview } from '../../hooks/queries/useReviews';
import { StarRating } from '../../components/common/StarRating';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { ArrowLeft, Trash2, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import { getImageUrl } from '../../utils/imageUtils';
import type { User } from '../../services/api/auth';
import { OrderModal } from '../../components/orders/OrderModal';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const { data: productData, isLoading: productLoading } = useProduct(id || '');
  const { data: reviewsData, isLoading: reviewsLoading } = useProductReviews(id || '', {
    page: 1,
    limit: 20,
  });
  const createReviewMutation = useCreateReview();
  const deleteReviewMutation = useDeleteReview();

  const product = productData?.product;
  const reviews = reviewsData?.reviews ?? [];
  const averageRating = reviewsData?.averageRating ?? 0;

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      alert('Please login to submit a review');
      navigate('/login');
      return;
    }

    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    try {
      await createReviewMutation.mutateAsync({
        productId: id!,
        data: { rating, comment },
      });
      setRating(0);
      setComment('');
      alert('Review submitted successfully!');
    } catch (error) {
      logger.error('Error submitting review:', error);
      alert('Error submitting review. You may have already reviewed this product.');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteReviewMutation.mutateAsync(reviewId);
      // Invalidate specific product query to update average rating
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['product', id] });
        queryClient.invalidateQueries({ queryKey: ['product-reviews', id] });
      }
    } catch (error) {
      logger.error('Error deleting review:', error);
      alert('Error deleting review. Please try again.');
    }
  };

  const isReviewOwner = (review: { customerId: { _id: string } | string }) => {
    if (!user || !isAuthenticated) return false;
    const customerId = typeof review.customerId === 'object' ? review.customerId._id : review.customerId;
    return customerId === user._id;
  };

  const getCustomerAvatar = (customerId: User | string): string | null => {
    if (typeof customerId === 'string') return null;
    const avatarUrl = customerId.profile?.avatar;
    return avatarUrl ? getImageUrl(avatarUrl) : null;
  };

  const getCustomerInitials = (customerId: User | string): string => {
    if (typeof customerId === 'string') return 'U';
    const name = customerId.name || 'Unknown';
    return name.charAt(0).toUpperCase();
  };

  if (productLoading) {
    return (
      <div className="space-y-8">
        <div className="h-96 animate-pulse rounded-xl border border-white/10 bg-[#1A1A1C]/70" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
        Product not found.
      </div>
    );
  }

  const imageUrl = product.images && product.images.length > 0 
    ? getImageUrl(product.images[0]) 
    : undefined;

  return (
    <div className="space-y-8">
      <button
        onClick={() => navigate('/customers/products')}
        className="flex items-center gap-2 text-white/70 hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </button>

      {/* Product Details */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Image */}
        <div className="aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/5">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/30">
              <svg className="h-32 w-32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <span className="text-xs uppercase tracking-wide text-white/50">{product.category}</span>
            <h1 className="mt-2 text-3xl font-bold text-white">{product.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <StarRating rating={averageRating} size="lg" showValue />
              <span className="text-sm text-white/50">
                ({reviewsData?.totalReviews || 0} reviews)
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-4">
            <div className="text-3xl font-bold text-[#B39CD0]">${product.price.toFixed(2)}</div>
          </div>

          {/* Place Order Button - Only for authenticated customers */}
          {isAuthenticated && user?.role === 'customer' && (
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="w-full rounded-lg bg-[#B39CD0] px-6 py-3 text-lg font-medium text-[#1A1A1C] transition hover:bg-[#C3ADD9] flex items-center justify-center gap-2"
            >
              <ShoppingCart className="h-5 w-5" />
              Place Order
            </button>
          )}

          {product.description && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-white">Description</h2>
              <p className="text-white/70">{product.description}</p>
            </div>
          )}

          {product.tags && product.tags.length > 0 && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-white">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-white">Reviews</h2>

        {/* Review Form */}
        {isAuthenticated ? (
          <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Write a Review</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Rating</label>
                <StarRating
                  rating={rating}
                  interactive
                  onRatingChange={setRating}
                  size="lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Comment</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                  placeholder="Share your thoughts about this product..."
                />
              </div>
              <button
                onClick={handleSubmitReview}
                disabled={createReviewMutation.isPending || rating === 0}
                className="rounded-lg bg-[#B39CD0] px-6 py-2 text-sm font-medium text-[#1A1A1C] transition hover:bg-[#C3ADD9] disabled:opacity-50"
              >
                Submit Review
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6 text-center">
            <p className="text-white/70">
              Please{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-[#B39CD0] hover:underline"
              >
                login
              </button>{' '}
              to write a review.
            </p>
          </div>
        )}

        {/* Reviews List */}
        {reviewsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-white/10 bg-[#1A1A1C]/70" />
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => {
              const isOwner = isReviewOwner(review);
              const customer = typeof review.customerId === 'object' ? review.customerId : null;
              const customerName = customer?.name || 'Unknown';
              const avatarUrl = getCustomerAvatar(review.customerId);
              const initials = getCustomerInitials(review.customerId);
              
              return (
                <div
                  key={review._id}
                  className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#B39CD0]/20 text-[#B39CD0]">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={customerName}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // Fallback to initials if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = initials;
                                parent.className = 'flex h-10 w-10 items-center justify-center rounded-full bg-[#B39CD0]/20 text-[#B39CD0]';
                              }
                            }}
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white">
                          {customerName}
                        </div>
                        <div className="text-xs text-white/50">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StarRating rating={review.rating} size="sm" />
                      {isOwner && (
                        <button
                          onClick={() => handleDeleteReview(review._id)}
                          disabled={deleteReviewMutation.isPending}
                          className="rounded-lg p-1.5 text-white/50 transition hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                          title="Delete review"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-white/70">{review.comment}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
            No reviews yet. Be the first to review!
          </div>
        )}
      </div>

      {/* Order Modal */}
      {product && (
        <OrderModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          product={product}
          onSuccess={(order) => {
            logger.info('Order placed successfully:', order);
            // Optionally show a success message or navigate
          }}
        />
      )}
    </div>
  );
}

