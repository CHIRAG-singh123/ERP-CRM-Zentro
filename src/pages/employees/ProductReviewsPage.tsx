import { useState, useMemo } from 'react';
import { MessageSquare, Search, Star, TrendingUp, Package, Reply } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { ReviewThread } from '../../components/reviews/ReviewThread';
import { StarRating } from '../../components/common/StarRating';
import { useEmployeeAllReviews } from '../../hooks/queries/useReviews';
import { useQueryClient } from '@tanstack/react-query';
import { formatDate } from '../../utils/formatting';

export function ProductReviewsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  const { data, isLoading } = useEmployeeAllReviews();
  const reviews = data?.reviews || [];
  const products = data?.products || [];

  // Filter reviews
  const filteredReviews = useMemo(() => {
    let filtered = reviews;

    // Product filter
    if (productFilter !== 'all') {
      filtered = filtered.filter((review) => {
        const productId = typeof review.productId === 'object' && review.productId !== null
          ? review.productId._id
          : review.productId;
        return productId === productFilter;
      });
    }

    // Rating filter
    if (ratingFilter !== null) {
      filtered = filtered.filter((review) => review.rating === ratingFilter);
    }

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((review) => {
        const customerName = typeof review.customerId === 'object' ? review.customerId.name : '';
        const comment = review.comment || '';
        const productName = typeof review.productId === 'object' && review.productId !== null
          ? review.productId.name
          : '';
        return (
          customerName.toLowerCase().includes(searchLower) ||
          comment.toLowerCase().includes(searchLower) ||
          productName.toLowerCase().includes(searchLower)
        );
      });
    }

    return filtered;
  }, [reviews, productFilter, ratingFilter, search]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;
    const totalReplies = reviews.reduce((count, review) => {
      const countReplies = (replies: typeof review.replies): number => {
        if (!replies) return 0;
        return replies.reduce((c, reply) => {
          return c + 1 + countReplies(reply.replies);
        }, 0);
      };
      return count + countReplies(review.replies);
    }, 0);
    const repliedCount = reviews.filter((review) => (review.replies?.length || 0) > 0).length;
    const replyRate = totalReviews > 0 ? (repliedCount / totalReviews) * 100 : 0;

    return {
      totalReviews,
      averageRating,
      totalReplies,
      repliedCount,
      replyRate,
    };
  }, [reviews]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['employee-all-reviews'] });
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader title="Product Reviews" description="Manage reviews on your products" />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-white/60 animate-pulse">Loading reviews...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Product Reviews"
        description="View and reply to reviews on products you created"
      />

      {/* Statistics Dashboard */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Total Reviews</span>
            <MessageSquare className="h-5 w-5 text-[#B39CD0]" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalReviews}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Average Rating</span>
            <Star className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">
              {stats.averageRating.toFixed(1)}
            </span>
            <StarRating rating={stats.averageRating} size="sm" />
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Total Replies</span>
            <Reply className="h-5 w-5 text-[#A8DADC]" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalReplies}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Reply Rate</span>
            <TrendingUp className="h-5 w-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.replyRate.toFixed(0)}%</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reviews by customer, comment, or product..."
                className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 pl-10 pr-4 py-2 text-white placeholder-white/50 focus:border-[#B39CD0] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-4 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
            >
              <option value="all">All Products</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </select>
            <select
              value={ratingFilter === null ? 'all' : ratingFilter.toString()}
              onChange={(e) =>
                setRatingFilter(e.target.value === 'all' ? null : parseInt(e.target.value))
              }
              className="rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-4 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const productId = typeof review.productId === 'object' && review.productId !== null
              ? review.productId._id
              : review.productId;
            const productName = typeof review.productId === 'object' && review.productId !== null
              ? review.productId.name
              : 'Unknown Product';
            
            return (
              <div key={review._id} className="relative">
                <div className="mb-2 flex items-center gap-2 text-sm text-white/60">
                  <Package className="h-4 w-4" />
                  <span
                    onClick={() => navigate(`/employees/products/${productId}`)}
                    className="hover:text-[#B39CD0] cursor-pointer transition-colors"
                  >
                    {productName}
                  </span>
                  <span>•</span>
                  <span>{formatDate(review.createdAt, 'short')}</span>
                </div>
                <ReviewThread
                  review={review}
                  productId={productId}
                  isProductCreator={true}
                  onReplyAdded={handleRefresh}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
          {search || productFilter !== 'all' || ratingFilter !== null
            ? 'No reviews match your filters.'
            : 'No reviews yet on your products.'}
        </div>
      )}
    </div>
  );
}
