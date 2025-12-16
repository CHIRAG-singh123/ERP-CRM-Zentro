import { Link } from 'react-router-dom';
import { StarRating } from './StarRating';
import { getImageUrl } from '../../utils/imageUtils';

interface ProductCardProps {
  product: {
    _id: string;
    name: string;
    price: number;
    category: string;
    averageRating?: number;
    reviewCount?: number;
    images?: string[];
    description?: string;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.images && product.images.length > 0 
    ? getImageUrl(product.images[0]) 
    : undefined;

  return (
    <Link
      to={`/customers/products/${product._id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1A1A1C]/70 transition-all hover:border-white/20 hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-white/5">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/30">
            <svg
              className="h-16 w-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2">
          <span className="text-xs uppercase tracking-wide text-white/50">{product.category}</span>
        </div>
        <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-white group-hover:text-[#B39CD0] transition-colors">
          {product.name}
        </h3>
        {product.description && (
          <p className="mb-3 line-clamp-2 text-sm text-white/60">{product.description}</p>
        )}

        {/* Rating */}
        {product.averageRating !== undefined && (
          <div className="mb-3 flex items-center gap-2">
            <StarRating rating={product.averageRating} size="sm" showValue />
            {product.reviewCount !== undefined && (
              <span className="text-xs text-white/50">({product.reviewCount} reviews)</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="mt-auto flex items-center justify-between">
          <span className="text-xl font-bold text-[#B39CD0]">${product.price.toFixed(2)}</span>
        </div>
      </div>
    </Link>
  );
}

