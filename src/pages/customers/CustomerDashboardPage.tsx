import { useProducts } from '../../hooks/queries/useProducts';
import { ProductCard } from '../../components/common/ProductCard';
import { PageHeader } from '../../components/common/PageHeader';
import { Star, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CustomerDashboardPage() {
  const { data: allProducts, isLoading, error } = useProducts({
    page: 1,
    limit: 20,
    isActive: true,
  });

  const products = allProducts?.products ?? [];

  // Get top-rated products (rating >= 4)
  const topRated = products
    .filter((p) => (p.averageRating || 0) >= 4)
    .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
    .slice(0, 6);

  // Get recently added products
  const recentlyAdded = [...products]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  // Get featured products (can be customized)
  const featured = products.slice(0, 4);

  // Get categories
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Welcome to Our Store"
        description="Discover amazing products and deals"
      />

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mb-4 text-white/60">Loading products...</div>
            <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10 mx-auto">
              <div className="h-full w-1/3 animate-pulse bg-[#B39CD0]"></div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-lg border border-white/10 bg-[#1F1F21]/70 p-6 text-center">
          <p className="text-white/70 mb-2">Unable to load products at this time.</p>
          <p className="text-sm text-white/50">Please try again later or browse our available products.</p>
        </div>
      )}

      {/* Featured Products Carousel */}
      {!isLoading && !error && featured.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-white">Featured Products</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Top Rated Products */}
      {!isLoading && !error && topRated.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Top Rated Products</h2>
            <Link
              to="/customers/products"
              className="text-sm text-[#B39CD0] hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {topRated.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Added */}
      {!isLoading && !error && recentlyAdded.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Recently Added</h2>
            <Link
              to="/customers/products"
              className="text-sm text-[#B39CD0] hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentlyAdded.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      {!isLoading && !error && categories.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-white">Shop by Category</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 8).map((category) => (
              <Link
                key={category}
                to={`/customers/products?category=${encodeURIComponent(category)}`}
                className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6 text-center transition hover:border-[#B39CD0] hover:bg-[#1A1A1C]"
              >
                <div className="text-lg font-semibold text-white">{category}</div>
                <div className="mt-2 text-sm text-white/50">
                  {products.filter((p) => p.category === category).length} products
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Statistics */}
      {!isLoading && !error && (
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-white">Store Statistics</h2>
          <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#B39CD0]/20 p-3">
                <TrendingUp className="h-6 w-6 text-[#B39CD0]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{products.length}</div>
                <div className="text-sm text-white/50">Total Products</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#B39CD0]/20 p-3">
                <Star className="h-6 w-6 text-[#B39CD0]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {categories.length}
                </div>
                <div className="text-sm text-white/50">Categories</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#B39CD0]/20 p-3">
                <Star className="h-6 w-6 text-[#B39CD0]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {topRated.length}
                </div>
                <div className="text-sm text-white/50">Top Rated Products</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Empty State - No products available */}
      {!isLoading && !error && products.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-[#1F1F21]/70 p-12 text-center">
          <p className="text-xl font-semibold text-white mb-2">No products available</p>
          <p className="text-white/60">Check back soon for new products!</p>
        </div>
      )}
    </div>
  );
}

