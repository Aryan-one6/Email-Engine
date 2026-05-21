import { Bell, Building2, LogOut, Menu, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { WorkspaceSummary } from '../../lib/types';

interface DashboardTopbarProps {
  workspace: WorkspaceSummary;
  onSignOut: () => Promise<void>;
  onMenuToggle?: () => void;
}

export function DashboardTopbar({ workspace, onSignOut, onMenuToggle }: DashboardTopbarProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const notifications = [
    {
      id: 'workspace-check',
      title: 'Workspace check-in complete',
      message: 'Email sender, templates, and scheduling are ready.',
      time: 'Just now',
    },
    {
      id: 'reminder-follow-up',
      title: 'Reminder',
      message: 'Review queued campaigns and follow-up sequences.',
      time: '5 min ago',
    },
  ];

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false);
      }
    }

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isNotificationsOpen]);

  return (
    <header className="sticky top-0 z-20 border-b border-white/35 bg-gradient-to-r from-[#f8fbff]/82 via-white/76 to-[#f6faff]/82 backdrop-blur-xl shadow-[0_10px_28px_-24px_rgba(15,23,42,0.55)]">
      <div className="relative mx-auto flex h-16 w-full max-w-[1680px] items-center gap-2 px-3 sm:px-4 lg:px-6 2xl:px-8">
        <button
          type="button"
          onClick={onMenuToggle}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/75 bg-white/85 text-slate-600 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.55)] transition hover:bg-white hover:text-slate-800 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white/85 shadow-[0_8px_18px_-16px_rgba(15,23,42,0.5)]">
            <img src="/favicon.webp" alt="Platform icon" className="h-7 w-7 object-contain" />
          </div>
        </div>

        {/* Search bar */}
        <div className="hidden w-[360px] items-center gap-2.5 rounded-2xl border border-white/65 bg-white/65 px-3.5 py-2 text-sm text-slate-400 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.6)] transition hover:border-slate-200 hover:bg-white/80 lg:flex">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">Search templates, campaigns, or leads</span>
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2.5">
          {/* Workspace selector chip */}
          <div className="hidden cursor-default items-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.55)] lg:flex">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="max-w-[150px] truncate">{workspace.name}</span>
          </div>

          {/* Bell */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-2xl border border-white/75 bg-white/80 text-slate-500 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.55)] transition hover:bg-white hover:text-slate-700"
              aria-label="Notifications"
              aria-expanded={isNotificationsOpen}
              aria-haspopup="dialog"
              onClick={() => setIsNotificationsOpen((current) => !current)}
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
            </button>

            {isNotificationsOpen ? (
              <div className="absolute right-0 top-11 z-40 w-[320px] rounded-2xl border border-white/70 bg-white/90 p-3 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.7)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-slate-200/70 px-1 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notifications</p>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                    {notifications.length} new
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className="w-full rounded-xl border border-transparent px-2 py-2 text-left transition hover:border-slate-200/80 hover:bg-white/75"
                    >
                      <p className="text-sm font-semibold text-slate-800">{notification.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{notification.message}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{notification.time}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Sign out */}
          <button
            onClick={() => void onSignOut()}
            className="hidden items-center gap-1.5 rounded-2xl border border-white/75 bg-white/80 px-3.5 py-1.5 text-sm font-semibold text-slate-600 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.58)] transition hover:bg-white hover:text-slate-800 lg:flex"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
