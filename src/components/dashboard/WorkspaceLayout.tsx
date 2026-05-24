import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { WorkspaceSummary } from '../../lib/types';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardTopbar } from './DashboardTopbar';

interface WorkspaceLayoutProps {
  workspace: WorkspaceSummary;
  onSignOut: () => Promise<void>;
  children: ReactNode;
  mainBackgroundClassName?: string;
}

const sidebarCollapsedStorageKey = 'coreflow.sidebar.collapsed';

export function WorkspaceLayout({
  workspace,
  onSignOut,
  children,
}: WorkspaceLayoutProps) {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = window.localStorage.getItem(sidebarCollapsedStorageKey);
    if (stored === '1') {
      setIsSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(sidebarCollapsedStorageKey, isSidebarCollapsed ? '1' : '0');
  }, [isSidebarCollapsed]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div
      className={`min-h-screen bg-[#0c0c0c] text-white ${isSidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]'}`}
      style={{ fontFamily: "'Inter', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased' }}
    >
      <DashboardSidebar
        workspace={workspace}
        collapsed={isSidebarCollapsed}
        mobileOpen={isMobileSidebarOpen}
        onToggleCollapsed={() => setIsSidebarCollapsed((c) => !c)}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <main className="flex min-h-screen flex-1 flex-col bg-[#0c0c0c]">
        <DashboardTopbar
          workspace={workspace}
          onSignOut={onSignOut}
          onMenuToggle={() => setIsMobileSidebarOpen((c) => !c)}
        />
        <div className="flex-1">
          <div className="mx-auto w-full max-w-[1680px] px-4 py-5 lg:px-6 2xl:px-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
