import {
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutDashboard,
  ListChecks,
  Mail,
  Palette,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { preloadRoute } from '../../routes/routePreload';
import type { WorkspaceSummary } from '../../lib/types';
import { isWorkspaceOwner } from '../../lib/utils';

function LogoMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" fill="white" className={className} aria-label="Email Engine">
      <path d="M 0 128 C 70.692 128 128 185.308 128 256 L 64 256 C 64 220.654 35.346 192 0 192 Z M 256 192 C 220.654 192 192 220.654 192 256 L 128 256 C 128 185.308 185.308 128 256 128 Z M 128 0 C 128 70.692 70.692 128 0 128 L 0 64 C 35.346 64 64 35.346 64 0 Z M 192 0 C 192 35.346 220.654 64 256 64 L 256 128 C 185.308 128 128 70.692 128 0 Z" />
    </svg>
  );
}

interface SidebarNavItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  to: string;
  end?: boolean;
}

interface DashboardSidebarProps {
  workspace: WorkspaceSummary;
  collapsed?: boolean;
  mobileOpen?: boolean;
  onToggleCollapsed?: () => void;
  onMobileClose?: () => void;
}

export function DashboardSidebar({
  workspace,
  collapsed = false,
  mobileOpen = false,
  onToggleCollapsed,
  onMobileClose,
}: DashboardSidebarProps) {
  const isOwner = isWorkspaceOwner(workspace);

  const workspaceItems: SidebarNavItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', end: true },
    { label: 'Records', icon: ListChecks, to: '/records', end: true },
    { label: 'Email', icon: Mail, to: '/email', end: true },
    { label: 'Templates', icon: Palette, to: '/email/templates', end: true },
    { label: 'Import Leads', icon: Download, to: '/imports', end: true },
    ...(isOwner ? [{ label: 'Team', icon: Users, to: '/team', end: true }] : []),
    { label: 'Account', icon: UserCircle2, to: '/account', end: true },
  ];

  function renderNavItem(item: SidebarNavItem, mode: 'desktop' | 'mobile') {
    const Icon = item.icon;
    const isCompact = mode === 'desktop' && collapsed;

    return (
      <NavLink
        key={`${mode}-${item.label}`}
        to={item.to}
        end={item.end}
        onMouseEnter={() => preloadRoute(item.to)}
        onFocus={() => preloadRoute(item.to)}
        onClick={() => { if (mode === 'mobile') onMobileClose?.(); }}
        title={isCompact ? item.label : undefined}
        className={({ isActive }) =>
          `group flex items-center rounded-xl py-2 text-[13px] font-medium transition-all duration-150 ${
            isActive
              ? 'bg-white/10 text-white [&_svg]:text-[#00d2ff]'
              : 'text-white/50 hover:bg-white/[0.05] hover:text-white/90 [&_svg]:text-white/30 hover:[&_svg]:text-white/70'
          } ${isCompact ? 'w-full justify-center px-2' : 'w-full gap-3 px-3'}`
        }
      >
        <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-[1.03]" />
        {!isCompact ? <span>{item.label}</span> : null}
      </NavLink>
    );
  }

  const sidebarContent = (collapsed_: boolean) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex h-16 items-center border-b border-white/[0.07] ${collapsed_ ? 'justify-center px-2' : 'px-5 gap-3'}`}>
        <LogoMark className="w-6 h-6 flex-shrink-0" />
        {!collapsed_ && (
          <span className="text-white font-semibold text-sm tracking-tight">Email Engine</span>
        )}
        {!collapsed_ && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="ml-auto rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
        {collapsed_ && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <div className={`relative flex flex-1 flex-col overflow-y-auto py-4 ${collapsed_ ? 'px-2' : 'px-3'}`}>
        {!collapsed_ && (
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">
            Workspace
          </p>
        )}
        <nav className="space-y-0.5">
          {workspaceItems.map((item) => renderNavItem(item, 'desktop'))}
        </nav>
      </div>

      {/* Workspace badge */}
      {!collapsed_ && (
        <div className="px-3 pb-4">
          <div className="liquid-glass rounded-xl px-3 py-2.5 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00d2ff] to-[#0B2551] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{workspace.name}</p>
              <p className="text-[10px] text-white/40 truncate">{workspace.slug}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden border-r border-white/[0.07] bg-[#0d0d0f] transition-[width] duration-200 lg:flex ${
          collapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        {/* Subtle glow */}
        <div className="pointer-events-none absolute -left-10 top-20 h-40 w-40 rounded-full bg-[#00d2ff]/5 blur-3xl" />
        {sidebarContent(collapsed)}
      </aside>

      {/* Mobile overlay */}
      <div className={`fixed inset-0 z-40 lg:hidden ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={onMobileClose}
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-[260px] overflow-hidden border-r border-white/[0.07] bg-[#0d0d0f] shadow-2xl transition-transform duration-200 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-white/[0.07] px-4">
            <div className="flex items-center gap-2.5">
              <LogoMark className="w-5 h-5" />
              <span className="text-white font-semibold text-sm">Email Engine</span>
            </div>
            <button
              type="button"
              onClick={onMobileClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 hover:text-white transition"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-[calc(100%-4rem)] overflow-y-auto px-3 py-4">
            <nav className="space-y-0.5">
              {workspaceItems.map((item) => renderNavItem(item, 'mobile'))}
            </nav>
          </div>
        </aside>
      </div>
    </>
  );
}
