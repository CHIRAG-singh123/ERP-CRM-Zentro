import { Fragment, useState, useMemo } from 'react';
import { useLocation, useMatches, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GlobalSearchInput } from '../common/GlobalSearchInput';
import { NotificationBell } from '../common/NotificationBell';

type BreadcrumbFactory = (match: ReturnType<typeof useMatches>[number]) => string;

interface BreadcrumbHandle {
  breadcrumb?: string | BreadcrumbFactory;
}

function useBreadcrumbs() {
  const matches = useMatches();
  const breadcrumbs = matches
    .map((match) => {
      const handle = match.handle as BreadcrumbHandle | undefined;
      if (!handle?.breadcrumb) {
        return null;
      }

      const label =
        typeof handle.breadcrumb === 'function' ? handle.breadcrumb(match) : handle.breadcrumb;

      return {
        href: match.pathname || '/',
        label,
      };
    })
    .filter(Boolean) as Array<{ href: string; label: string }>;

  return breadcrumbs;
}

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation();
  const breadcrumbs = useBreadcrumbs();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // Log error but continue with redirect
      console.error('Logout error:', error);
    } finally {
      // Use window.location.href to force full page navigation
      // This prevents route guards from intercepting the redirect
      window.location.href = '/customers/dashboard';
    }
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper to construct full avatar URL from relative path
  const avatarUrl = useMemo(() => {
    const url = user?.profile?.avatar;
    if (!url || avatarError) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    // Construct full URL from relative path
    const serverBase = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${serverBase}${url.startsWith('/') ? url : `/${url}`}`;
  }, [user?.profile?.avatar, avatarError]);

  return (
    <header className="relative z-[9998] border-b border-white/10 bg-[#1F1F21]/70 backdrop-blur animate-slide-in-down">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="animate-fade-in">
          <p className="text-xs uppercase tracking-[0.32em] text-white/40">Workspace</p>
          <h1 className="text-base sm:text-lg font-semibold text-white">
            {breadcrumbs.length > 0
              ? breadcrumbs[breadcrumbs.length - 1]?.label
              : location.pathname === '/' || location.pathname === ''
                ? 'Dashboard'
                : location.pathname
                    .split('/')
                    .filter(Boolean)
                    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
                    .join(' · ')}
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <nav className="hidden items-center gap-2 text-xs font-medium text-white/60 sm:flex">
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={crumb.href}>
                <a
                  href={crumb.href}
                  className="uppercase tracking-[0.32em] transition-colors duration-200 hover:text-white hover:scale-105"
                >
                  {crumb.label}
                </a>
                {index < breadcrumbs.length - 1 && <span className="text-white/20">/</span>}
              </Fragment>
            ))}
          </nav>
          <div className="relative flex items-center gap-2 sm:gap-3">
            {isAuthenticated && (
              <>
                <div className="hidden sm:block">
                  <GlobalSearchInput />
                </div>
                <NotificationBell />
                <button
                  type="button"
                  className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-white/70 transition-all duration-200 hover:scale-105 hover:border-white/20 hover:text-white active:scale-95"
                >
                  Switch Org
                </button>
              </>
            )}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#A8DADC]/80 to-[#B39CD0]/70 text-sm font-semibold text-[#1A1A1C] transition-all duration-200 hover:scale-110 hover:opacity-90 active:scale-95 overflow-hidden"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user?.name || 'User avatar'}
                      className="h-full w-full object-cover transition-transform duration-200 hover:scale-110"
                      onError={() => {
                        // Fallback to initials if image fails to load
                        setAvatarError(true);
                      }}
                    />
                  ) : (
                    getUserInitials()
                  )}
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed right-4 top-16 z-[9999] w-48 animate-scale-in rounded-md border border-white/10 bg-[#1F1F21] shadow-lg overflow-hidden user-menu-dropdown">
                      <div className="border-b border-white/10 px-4 py-3 bg-[#1F1F21]">
                        <p className="text-sm font-medium text-white">{user?.name}</p>
                        <p className="text-xs text-white/60">{user?.email}</p>
                      </div>
                      <div className="p-1 bg-[#1F1F21]">
                        <button
                          type="button"
                          onClick={() => {
                            navigate('/settings/profile');
                            setShowUserMenu(false);
                          }}
                          className="w-full rounded-md px-3 py-2 text-left text-sm text-white/70 transition-all duration-200 hover:scale-[1.02] hover:bg-white/5 hover:text-white"
                        >
                          Profile settings
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full rounded-md px-3 py-2 text-left text-sm text-white/70 transition-all duration-200 hover:scale-[1.02] hover:bg-white/5 hover:text-white"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                    <div
                      className="fixed inset-0 z-[9998] animate-fade-in"
                      onClick={() => setShowUserMenu(false)}
                    />
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="rounded-md bg-gradient-to-r from-[#A8DADC] to-[#B39CD0] px-4 py-2 text-sm font-semibold text-[#1A1A1C] transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-[#B39CD0]/50 active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

