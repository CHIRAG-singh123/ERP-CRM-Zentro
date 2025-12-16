import { NavLink, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { getNavigationForRole } from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';
import { AnimatedLogo } from './AnimatedLogo';
import { useChats } from '../../hooks/queries/useChat';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function isActivePath(currentPath: string, href: string, allHrefs: string[]) {
  if (href === '/') {
    return currentPath === '/' || currentPath === '';
  }

  // Exact match takes priority
  if (currentPath === href) {
    return true;
  }

  // Check if this is a child path (starts with href + '/')
  // But only if no other href is an exact match
  const hasExactMatch = allHrefs.some(h => currentPath === h);
  if (hasExactMatch) {
    return false; // Don't highlight parent if exact match exists
  }

  // Check if current path is a child of this href
  return currentPath.startsWith(`${href}/`);
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const navigation = getNavigationForRole(user?.role);
  const { data: chatsData } = useChats();

  // Calculate total unread messages for chat badge
  const totalUnread = chatsData?.chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0) || 0;

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-50 h-full w-72 flex-col border-r border-white/10 bg-[#1A1A1C] pr-2 pt-8 lg:hidden animate-slide-in-left">
        <div className="space-y-8 px-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <AnimatedLogo />
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-white/60 hover:bg-white/10 hover:text-white ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {navigation.map((section) => (
            <div key={section.label}>
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/40">
                {section.label}
              </p>
              <nav className="mt-3 space-y-1">
                {section.items.map((item) => {
                  // Collect all hrefs in current section for precise matching
                  const allHrefs = section.items.map(i => i.href);
                  const active = isActivePath(location.pathname, item.href, allHrefs);
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={onClose}
                      className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-all duration-200 ${
                        active
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {item.icon ? <item.icon className="h-4 w-4" /> : null}
                        <span>{item.label}</span>
                      </span>
                      {item.href === '/chat' && totalUnread > 0 ? (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#B39CD0] px-1.5 text-[10px] font-semibold text-[#1A1A1C]">
                          {totalUnread > 99 ? '99+' : totalUnread}
                        </span>
                      ) : item.badge ? (
                        <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/70">
                          {item.badge}
                        </span>
                      ) : null}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

