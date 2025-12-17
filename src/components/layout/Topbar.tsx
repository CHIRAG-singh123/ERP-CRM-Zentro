import { Fragment, useState, useMemo } from 'react';
import { useLocation, useMatches, useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
  const { theme, toggleTheme } = useTheme();
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
    <header className="relative z-[9998] border-b border-border bg-card/90 backdrop-blur shadow-sm animate-slide-in-down transition-colors duration-300">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-foreground/60">Workspace</p>
          <h1 className="text-base sm:text-lg font-bold text-foreground">
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
              className="lg:hidden rounded-md p-2 text-foreground/70 hover:bg-muted hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <nav className="hidden items-center gap-2 text-xs font-semibold text-foreground/60 sm:flex">
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={crumb.href}>
                <a
                  href={crumb.href}
                  className="uppercase tracking-[0.32em] transition-colors duration-200 hover:text-foreground hover:scale-105"
                >
                  {crumb.label}
                </a>
                {index < breadcrumbs.length - 1 && <span className="text-foreground/30">/</span>}
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
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground/70 transition-all duration-200 hover:scale-105 hover:border-accent hover:text-foreground hover:bg-accent/5 active:scale-95"
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
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent/80 to-accent-secondary/70 text-sm font-semibold text-accent-foreground transition-all duration-200 hover:scale-110 hover:opacity-90 active:scale-95 overflow-hidden"
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
                    <div className="fixed right-4 top-16 z-[9999] w-52 animate-scale-in rounded-md border border-border bg-card shadow-lg overflow-hidden user-menu-dropdown">
                      <div className="border-b border-border px-4 py-3 bg-card">
                        <p className="text-sm font-medium text-foreground">{user?.name}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                      <div className="p-1 bg-card">
                        <button
                          type="button"
                          onClick={() => {
                            navigate('/settings/profile');
                            setShowUserMenu(false);
                          }}
                          className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-all duration-200 hover:scale-[1.02] hover:bg-muted hover:text-foreground"
                        >
                          Profile settings
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toggleTheme();
                            setShowUserMenu(false);
                          }}
                          className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-all duration-200 hover:scale-[1.02] hover:bg-muted hover:text-foreground flex items-center gap-2"
                        >
                          {theme === 'dark' ? (
                            <>
                              <Sun className="h-4 w-4" />
                              Switch to Light
                            </>
                          ) : (
                            <>
                              <Moon className="h-4 w-4" />
                              Switch to Dark
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-all duration-200 hover:scale-[1.02] hover:bg-muted hover:text-foreground"
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
                className="rounded-md bg-gradient-to-r from-accent to-accent-secondary px-4 py-2 text-sm font-semibold text-accent-foreground transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-accent/50 active:scale-95"
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

