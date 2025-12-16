import { useState } from 'react';
import { Package } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUtils';

interface ProductAvatarProps {
  imageUrl?: string | null;
  productName?: string;
  size?: number;
  className?: string;
}

export function ProductAvatar({ 
  imageUrl, 
  productName, 
  size = 40,
  className = '' 
}: ProductAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const fullImageUrl = imageUrl ? getImageUrl(imageUrl) : null;
  const showImage = fullImageUrl && !imageError;

  return (
    <div 
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 ${className}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={fullImageUrl}
          alt={productName || 'Product image'}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <Package 
          className="text-white/40" 
          style={{ width: size * 0.5, height: size * 0.5 }}
        />
      )}
    </div>
  );
}

