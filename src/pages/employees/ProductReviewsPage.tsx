import { useState, useMemo } from 'react';
import { MessageSquare, Search, Star, TrendingUp, Package, Reply } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageHeader } from '../../components/common/PageHeader';
import { ReviewThread } from '../../components/reviews/ReviewThread';
import { StarRating } from '../../components/common/StarRating';
import { MetricCard } from '../../components/common/MetricCard';
import { AnimatedNumber } from '../../components/common/AnimatedNumber';
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

  // Metrics configuration
  const metrics = [
    {
      id: 'totalReviews',
      value: stats.totalReviews,
      valueFormat: 'number' as const,
      label: 'Total Reviews',
      icon: MessageSquare,
    },
    {
      id: 'averageRating',
      value: stats.averageRating,
      valueFormat: 'number' as const,
      label: 'Average Rating',
      trend: <StarRating rating={stats.averageRating} size="sm" />,
      icon: Star,
    },
    {
      id: 'totalReplies',
      value: stats.totalReplies,
      valueFormat: 'number' as const,
      label: 'Total Replies',
      icon: Reply,
    },
    {
      id: 'replyRate',
      value: stats.replyRate,
      valueFormat: 'percentage' as const,
      label: 'Reply Rate',
      icon: TrendingUp,
    },
  ];

  if (isLoading) {
    return (
      <motion.div
        className="space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PageHeader title="Product Reviews" description="Manage reviews on your products" />
        </motion.div>
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <motion.div
              key={index}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <div className="skeleton-enhanced h-32 rounded-2xl" />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <PageHeader
          title="Product Reviews"
          description="View and reply to reviews on products you created"
        />
      </motion.div>

      {/* Statistics Dashboard */}
      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
      >
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          
          let valueDisplay: React.ReactNode;
          if (metric.valueFormat === 'percentage') {
            valueDisplay = (
              <AnimatedNumber 
                value={metric.value} 
                format="percentage" 
                decimals={0}
              />
            );
          } else {
            valueDisplay = (
              <AnimatedNumber 
                value={metric.value} 
                format="number" 
                decimals={metric.id === 'averageRating' ? 1 : 0}
              />
            );
          }
          
          return (
            <MetricCard
              key={metric.id}
              index={index}
              value={valueDisplay}
              label={metric.label}
              trend={metric.trend}
              icon={<Icon className="h-5 w-5" />}
            />
          );
        })}
      </motion.div>

      {/* Filters */}
      <motion.section
        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 p-6 chart-container-enhanced"
        variants={{
          hidden: { opacity: 0, scale: 0.95 },
          visible: { opacity: 1, scale: 1 },
        }}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.5, delay: 0.3 }}
        whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(168, 218, 220, 0.2)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#A8DADC]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        <div className="relative">
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
      </motion.section>

      {/* Reviews List */}
      {filteredReviews.length > 0 ? (
        <motion.section
          className="space-y-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {filteredReviews.map((review, index) => {
            const productId = typeof review.productId === 'object' && review.productId !== null
              ? review.productId._id
              : review.productId;
            const productName = typeof review.productId === 'object' && review.productId !== null
              ? review.productId.name
              : 'Unknown Product';
            
            return (
              <motion.div
                key={review._id}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
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
              </motion.div>
            );
          })}
        </motion.section>
      ) : (
        <motion.div
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1A1A1C]/90 to-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50 chart-container-enhanced"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 30px rgba(179, 156, 208, 0.2)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#B39CD0]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
          <div className="relative">
            {search || productFilter !== 'all' || ratingFilter !== null
              ? 'No reviews match your filters.'
              : 'No reviews yet on your products.'}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
