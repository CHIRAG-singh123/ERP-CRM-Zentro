import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useProduct } from '../../hooks/queries/useProducts';
import { useProductReviews, useCreateReview, useDeleteReview, useMarkReviewRepliesAsRead } from '../../hooks/queries/useReviews';
import { StarRating } from '../../components/common/StarRating';
import { ReviewThread } from '../../components/reviews/ReviewThread';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Trash2, ShoppingCart, Eye, X, Loader2 } from 'lucide-react';
import { PaymentModal } from '../../components/customers/PaymentModal';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { logger } from '../../utils/logger';
import { getImageUrl, getModel3dUrl } from '../../utils/imageUtils';

// Lazy load GlbViewer to reduce initial bundle size
const GlbViewer = lazy(() => import('model-viewer/GlbViewer').then(module => ({ default: module.GlbViewer })));

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [show3dModal, setShow3dModal] = useState(false);
  const [isPreloadingModel, setIsPreloadingModel] = useState(false);
  const preloadLinkRef = useRef<HTMLLinkElement | null>(null);
  const { success: showSuccessToast } = useToast();

  const { data: productData, isLoading: productLoading } = useProduct(id || '');
  const { data: reviewsData, isLoading: reviewsLoading } = useProductReviews(id || '', {
    page: 1,
    limit: 20,
  });
  const createReviewMutation = useCreateReview();
  const deleteReviewMutation = useDeleteReview();
  const markRepliesAsReadMutation = useMarkReviewRepliesAsRead();

  const product = productData?.product;
  const reviews = reviewsData?.reviews ?? [];
  const averageRating = reviewsData?.averageRating ?? 0;

  // Cleanup preload link on unmount
  useEffect(() => {
    return () => {
      if (preloadLinkRef.current && preloadLinkRef.current.parentNode) {
        preloadLinkRef.current.parentNode.removeChild(preloadLinkRef.current);
      }
    };
  }, []);

  // Mark all replies as read when customer views the product
  useEffect(() => {
    if (isAuthenticated && user && reviews.length > 0) {
      // Find reviews owned by the current user and mark their replies as read
      const userReviews = reviews.filter((review) => {
        const customerId = typeof review.customerId === 'object' ? review.customerId._id : review.customerId;
        return customerId === user._id;
      });

      // Mark replies as read for each user review
      userReviews.forEach((review) => {
        // Check if review has unread replies
        const hasUnreadReplies = review.replies?.some((reply) => {
          const replyUserId = typeof reply.userId === 'object' ? reply.userId._id : reply.userId;
          const isFromUser = replyUserId === user._id;
          const isRead = reply.readBy?.some(
            (read) => {
              const readUserId = typeof read.userId === 'object' ? read.userId._id : read.userId;
              return readUserId === user._id;
            }
          );
          return !isFromUser && !isRead;
        });

        if (hasUnreadReplies) {
          markRepliesAsReadMutation.mutate(review._id, {
            onSuccess: () => {
              // Invalidate unread counts to update badges
              queryClient.invalidateQueries({ queryKey: ['all-products-unread-counts'] });
              queryClient.invalidateQueries({ queryKey: ['product-unread-count', id] });
            },
          });
        }
      });
    }
  }, [isAuthenticated, user, reviews, id, markRepliesAsReadMutation, queryClient]);

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
            <div className="mt-2 flex items-center gap-2">
              <h1 className="text-3xl font-bold text-white">{product.name}</h1>
              <button
                type="button"
                onClick={() => {
                  setShow3dModal(true);
                  // Preload the model URL if available
                  if (product.model3dUrl) {
                    const modelUrl = getModel3dUrl(product.model3dUrl);
                    if (modelUrl) {
                      // Prefetch the GLB file
                      const link = document.createElement('link');
                      link.rel = 'prefetch';
                      link.as = 'fetch';
                      link.href = modelUrl;
                      link.crossOrigin = 'anonymous';
                      document.head.appendChild(link);
                      preloadLinkRef.current = link;
                    }
                  }
                }}
                onMouseEnter={() => {
                  // Start preloading on hover for faster click response
                  if (product.model3dUrl && !isPreloadingModel) {
                    setIsPreloadingModel(true);
                    const modelUrl = getModel3dUrl(product.model3dUrl);
                    if (modelUrl) {
                      // Prefetch the GLB file
                      const link = document.createElement('link');
                      link.rel = 'prefetch';
                      link.as = 'fetch';
                      link.href = modelUrl;
                      link.crossOrigin = 'anonymous';
                      document.head.appendChild(link);
                      preloadLinkRef.current = link;
                    }
                  }
                }}
                className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                title={product.model3dUrl ? 'View 3D model' : 'View 3D model (not available for this product)'}
              >
                <Eye className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <StarRating rating={averageRating} size="lg" showValue />
              <span className="text-sm text-white/50">
                ({reviewsData?.totalReviews || 0} reviews)
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-4">
            <div className="text-3xl font-bold text-[#B39CD0]">${product.price.toFixed(2)}</div>
            {isAuthenticated ? (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#B39CD0] px-4 py-3 text-sm font-medium text-[#1A1A1C] transition hover:bg-[#C3ADD9]"
              >
                <ShoppingCart className="h-4 w-4" />
                Order now
              </button>
            ) : (
              <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-sm text-white/70">
                  Please{' '}
                  <button
                    onClick={() => navigate('/login')}
                    className="text-[#B39CD0] hover:underline"
                  >
                    log in
                  </button>{' '}
                  to place an order.
                </p>
              </div>
            )}
          </div>

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
            {reviews.map((review) => (
              <div key={review._id} className="relative">
                <ReviewThread
                  review={review}
                  productId={id!}
                  onReplyAdded={() => {
                    if (id) {
                      queryClient.invalidateQueries({ queryKey: ['product-reviews', id] });
                    }
                  }}
                />
                {isReviewOwner(review) && (
                  <button
                    onClick={() => handleDeleteReview(review._id)}
                    disabled={deleteReviewMutation.isPending}
                    className="absolute top-2 right-2 rounded-lg p-1.5 text-white/50 transition hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                    title="Delete review"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
            No reviews yet. Be the first to review!
          </div>
        )}
      </div>

      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          product={{ _id: product._id, name: product.name, price: product.price }}
          onSuccess={() => {
            showSuccessToast('Payment successful. Receipt sent to your email.');
          }}
        />
      )}

      {show3dModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-[6.5px] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShow3dModal(false);
            }}
          >
            <div
              className="relative flex flex-col rounded-xl border border-white/10 bg-transparent shadow-2xl overflow-hidden"
              style={{ width: 1000, height: 1000, maxWidth: 'min(100vw - 2rem, 1000px)', maxHeight: 'min(100vh - 2rem, 1000px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-white/10 bg-[#1A1A1C] px-4 py-2">
                <span className="text-sm font-medium text-white">3D View — {product.name}</span>
                <button
                  type="button"
                  onClick={() => setShow3dModal(false)}
                  className="relative z-10 rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="relative z-0 flex-1 min-h-0 flex items-center justify-center" style={{ width: '100%', height: 968 }}>
                {product.model3dUrl ? (
                  <Suspense
                    fallback={
                      <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-white/5 p-8 text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-[#B39CD0]" />
                        <p className="text-lg font-medium text-white/80">Loading 3D viewer...</p>
                        <p className="text-sm text-white/50">Preparing your model</p>
                      </div>
                    }
                  >
                    <GlbViewer
                      url={getModel3dUrl(product.model3dUrl)}
                      siteName={product.name}
                      width={1000}
                      height={968}
                      backgroundColor="#282C34"
                    />
                  </Suspense>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-white/5 p-8 text-center">
                    <Eye className="h-16 w-16 text-white/30" />
                    <p className="text-lg font-medium text-white/80">No 3D model available</p>
                    <p className="text-sm text-white/50 max-w-md">
                      A 3D model (.glb) has not been uploaded for this product. Admins or employees can add one when editing the product.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

