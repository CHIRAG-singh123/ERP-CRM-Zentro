import { useState, useMemo } from 'react';
import { getImageUrl } from '../../utils/imageUtils';

interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string;
  email?: string;
  size?: number;
  className?: string;
}

export function UserAvatar({ 
  avatarUrl, 
  name, 
  email,
  size = 32,
  className = '' 
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const fullAvatarUrl = avatarUrl ? getImageUrl(avatarUrl) : null;
  const showImage = fullAvatarUrl && !imageError;

  // Get user initials
  const initials = useMemo(() => {
    if (name) {
      const parts = name.trim().split(' ').filter(part => part.length > 0);
      if (parts.length >= 2) {
        // Multiple names: first letter of first name + first letter of last name
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts.length === 1) {
        // Single name: show only first letter
        return parts[0][0].toUpperCase();
      }
    }
    if (email) {
      // Fallback to email: show first letter
      return email[0].toUpperCase();
    }
    return 'U';
  }, [name, email]);

  // Generate a color based on name/email for consistent background
  const bgColor = useMemo(() => {
    const str = name || email || 'user';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    // Use a more vibrant and professional color scheme
    return `hsl(${hue}, 65%, 55%)`;
  }, [name, email]);

  return (
    <div 
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 ${className}`}
      style={{ 
        width: size, 
        height: size,
        backgroundColor: showImage ? 'transparent' : bgColor,
      }}
    >
      {showImage ? (
        <img
          src={fullAvatarUrl}
          alt={name || 'User avatar'}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span 
          className="flex items-center justify-center font-semibold text-white select-none"
          style={{ 
            fontSize: `${Math.max(size * 0.4, 10)}px`,
            lineHeight: '1',
            fontWeight: '600'
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

