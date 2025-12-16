import { NavLink, useLocation } from 'react-router-dom';

import { getNavigationForRole } from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';
import { AnimatedLogo } from './AnimatedLogo';
import { useChats } from '../../hooks/queries/useChat';

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

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const navigation = getNavigationForRole(user?.role);
  const { data: chatsData } = useChats();

  // Calculate total unread messages for chat badge
  const totalUnread = chatsData?.chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0) || 0;

  if (navigation.length === 0) {
    return null; // Don't render sidebar if no navigation
  }

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-white/10 bg-[#1A1A1C] pr-2 pt-8 lg:flex animate-slide-in-left">
      <div className="space-y-8 px-6">
        <AnimatedLogo />
        {navigation.map((section, sectionIndex) => (
          <div key={section.label} className="animate-slide-in-left" style={{ animationDelay: `${sectionIndex * 50}ms` }}>
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/40">
              {section.label}
            </p>
            <nav className="mt-3 space-y-1">
              {section.items.map((item, itemIndex) => {
                // Collect all hrefs in current section for precise matching
                const allHrefs = section.items.map(i => i.href);
                const active = isActivePath(location.pathname, item.href, allHrefs);
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-all duration-200 ${
                      active
                        ? 'bg-white/10 text-white shadow-sm scale-[1.02]'
                        : 'text-white/60 hover:bg-white/5 hover:text-white hover:translate-x-1'
                    }`}
                    style={{ animationDelay: `${(sectionIndex * 50) + (itemIndex * 30)}ms` }}
                  >
                    <span className="flex items-center gap-2">
                      {item.icon ? (
                        <item.icon className={`h-4 w-4 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                      ) : null}
                      <span>{item.label}</span>
                    </span>
                    {item.href === '/chat' && totalUnread > 0 ? (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#B39CD0] px-1.5 text-[10px] font-semibold text-[#1A1A1C] transition-all duration-200 group-hover:bg-[#C3ADD9]">
                        {totalUnread > 99 ? '99+' : totalUnread}
                      </span>
                    ) : item.badge ? (
                      <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/70 transition-all duration-200 group-hover:bg-white/20">
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
  );
}

