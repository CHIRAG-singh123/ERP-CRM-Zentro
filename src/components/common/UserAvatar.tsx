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
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
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
    return `hsl(${hue}, 60%, 50%)`;
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
          className="text-xs font-semibold text-white"
          style={{ fontSize: size * 0.35 }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

