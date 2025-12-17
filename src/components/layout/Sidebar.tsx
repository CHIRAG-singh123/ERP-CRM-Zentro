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
    <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card pr-2 pt-8 lg:flex animate-slide-in-left transition-colors duration-300 shadow-sm">
      <div className="space-y-8 px-6">
        <AnimatedLogo />
        {navigation.map((section, sectionIndex) => (
          <div key={section.label} className="animate-slide-in-left" style={{ animationDelay: `${sectionIndex * 50}ms` }}>
            <p className="px-2 text-[11px] font-bold uppercase tracking-[0.32em] text-foreground/60">
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
                    className={`sidebar-nav-item group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
                      active
                        ? 'bg-accent/15 text-accent shadow-sm border-2 border-accent/40 dark:bg-accent/20 dark:border-accent/50 sidebar-active'
                        : 'text-foreground/70 border-2 border-transparent hover:bg-muted/50 hover:text-foreground'
                    }`}
                    style={{ animationDelay: `${(sectionIndex * 50) + (itemIndex * 30)}ms` }}
                  >
                    <span className="flex items-center gap-2">
                      {item.icon ? (
                        <item.icon className={`h-5 w-5 transition-all duration-300 ease-in-out icon-visible ${active ? 'scale-110 text-accent' : 'text-foreground/70 group-hover:scale-110 group-hover:text-foreground'}`} />
                      ) : null}
                      <span className="font-medium">{item.label}</span>
                    </span>
                    {item.href === '/chat' && totalUnread > 0 ? (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-foreground transition-all duration-200 group-hover:opacity-90">
                        {totalUnread > 99 ? '99+' : totalUnread}
                      </span>
                    ) : item.badge ? (
                      <span className="rounded bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground transition-all duration-200 group-hover:bg-accent/10">
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

