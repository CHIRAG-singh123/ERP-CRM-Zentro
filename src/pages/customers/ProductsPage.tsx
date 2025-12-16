import { useState } from 'react';
import { Search, Grid, List } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { ProductCard } from '../../components/common/ProductCard';
import { useProducts } from '../../hooks/queries/useProducts';

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data, isLoading, error } = useProducts({
    page: 1,
    limit: 50,
    search,
    category: category || undefined,
    isActive: true,
  });

  const products = data?.products ?? [];
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Products"
        description="Browse our product catalog"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-2 transition ${
                viewMode === 'grid'
                  ? 'bg-[#B39CD0] text-[#1A1A1C]'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-lg p-2 transition ${
                viewMode === 'list'
                  ? 'bg-[#B39CD0] text-[#1A1A1C]'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-10 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#B39CD0] focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-4 py-2 text-sm text-white focus:border-[#B39CD0] focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-lg border border-white/10 bg-[#1F1F21]/70 p-6 text-center">
          <p className="text-white/70 mb-2">Unable to load products at this time.</p>
          <p className="text-sm text-white/50">Please try again later.</p>
        </div>
      )}

      {/* Products Grid/List */}
      {isLoading && products.length === 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl border border-white/10 bg-[#1A1A1C]/70"
            />
          ))}
        </div>
      ) : !error && products.length > 0 ? (
        <div
          className={
            viewMode === 'grid'
              ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'space-y-4'
          }
        >
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
          No products found.
        </div>
      )}
    </div>
  );
}

