import { Star } from 'lucide-react';
import { useState } from 'react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showValue?: boolean;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onRatingChange,
  showValue = false,
}: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(rating);

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const displayRating = interactive ? (hoveredRating || selectedRating) : rating;
  const roundedRating = Math.round(displayRating * 2) / 2; // Round to nearest 0.5

  const handleClick = (value: number) => {
    if (interactive && onRatingChange) {
      setSelectedRating(value);
      onRatingChange(value);
    }
  };

  const handleMouseEnter = (value: number) => {
    if (interactive) {
      setHoveredRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoveredRating(0);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {Array.from({ length: maxRating }, (_, i) => {
          const starValue = i + 1;
          const isFilled = starValue <= roundedRating;
          const isHalfFilled = starValue - 0.5 === roundedRating;

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => handleMouseEnter(starValue)}
              onMouseLeave={handleMouseLeave}
              disabled={!interactive}
              className={`${interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'} ${sizeClasses[size]}`}
            >
              <Star
                className={`${sizeClasses[size]} ${
                  isFilled || isHalfFilled
                    ? 'fill-[#B39CD0] text-[#B39CD0]'
                    : 'fill-transparent text-white/30'
                } transition-colors`}
              />
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="ml-1 text-sm text-white/70">
          {roundedRating.toFixed(1)} / {maxRating}
        </span>
      )}
    </div>
  );
}

