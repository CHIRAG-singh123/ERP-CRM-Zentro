import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { Sidebar } from './Sidebar';
import { MobileSidebar } from './MobileSidebar';
import { Topbar } from './Topbar';
import { Chatbot } from '../chatbot/Chatbot';

export function AppLayout() {
  const location = useLocation();
  const [isPageChanging, setIsPageChanging] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setIsPageChanging(true);
    const timer = setTimeout(() => setIsPageChanging(false), 400);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      <Sidebar />
      <MobileSidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className={`mx-auto w-full max-w-6xl transition-all duration-400 ${isPageChanging ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0 animate-slide-fade'}`}>
            <Outlet />
          </div>
        </main>
      </div>
      <Chatbot />
    </div>
  );
}

