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
import { LogoMark } from '../ui/LogoMark';

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
        onClick={() => {
          if (mode === 'mobile') {
            onMobileClose?.();
          }
        }}
        title={isCompact ? item.label : undefined}
        className={({ isActive }) =>
          `group flex items-center rounded-xl border py-2.5 text-[15px] font-medium transition-all duration-150 ${
            isActive
              ? 'border-indigo-200/80 bg-[linear-gradient(135deg,rgba(99,102,241,0.16),rgba(14,165,233,0.12))] text-slate-900 shadow-[0_14px_28px_-22px_rgba(30,64,175,0.35)] [&_svg]:text-indigo-600'
              : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-white/80 hover:text-slate-900 [&_svg]:text-slate-400 hover:[&_svg]:text-indigo-600'
          } ${isCompact ? 'w-full justify-center px-2' : 'w-full gap-3 px-3.5'}`
        }
      >
        <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-[1.03]" />
        {!isCompact ? <span>{item.label}</span> : null}
      </NavLink>
    );
  }

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden border-r border-slate-200/80 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_55%,#e8f0ff_100%)] shadow-[12px_0_30px_-24px_rgba(15,23,42,0.32)] transition-[width] duration-200 lg:flex ${
          collapsed ? 'w-[88px]' : 'w-[256px]'
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-14 -top-14 h-40 w-40 rounded-full bg-sky-300/30 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-indigo-300/20 blur-3xl"
        />

        <div className={`relative flex h-20 items-center border-b border-slate-200/80 ${collapsed ? 'justify-center px-2' : 'px-6'}`}>
          {collapsed ? (
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_8px_20px_-18px_rgba(15,23,42,0.5)]">
              <img
                src="/favicon.webp"
                alt="Platform icon"
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <LogoMark />
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`absolute top-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white/80 p-1.5 text-slate-500 transition hover:bg-white hover:text-slate-800 ${
              collapsed ? 'right-2' : 'right-3'
            }`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div className={`relative flex flex-1 flex-col overflow-y-auto py-5 ${collapsed ? 'px-2' : 'px-4'}`}>
          {!collapsed ? <div className="mb-2 pl-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Email Workspace</div> : null}
          <nav className="mt-2 space-y-1">{workspaceItems.map((item) => renderNavItem(item, 'desktop'))}</nav>
        </div>
      </aside>

      <div className={`fixed inset-0 z-40 lg:hidden ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={onMobileClose}
          className={`absolute inset-0 bg-slate-950/55 transition-opacity duration-200 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <aside
          className={`absolute inset-y-0 left-0 w-[286px] overflow-hidden border-r border-slate-200/80 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_55%,#e8f0ff_100%)] shadow-[16px_0_40px_-28px_rgba(15,23,42,0.38)] transition-transform duration-200 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="relative flex h-20 items-center justify-between border-b border-slate-200/80 px-4">
            <LogoMark />
            <button
              type="button"
              onClick={onMobileClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-500 transition hover:bg-white hover:text-slate-800"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="h-[calc(100%-5rem)] overflow-y-auto px-3 py-4">
            <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Email Workspace
            </div>
            <nav className="space-y-1">{workspaceItems.map((item) => renderNavItem(item, 'mobile'))}</nav>
          </div>
        </aside>
      </div>
    </>
  );
}
