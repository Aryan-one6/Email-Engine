import { Bell, LogOut, Menu, Search, X } from 'lucide-react';
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
    { id: 'workspace-check', title: 'Workspace ready', message: 'Sender, templates, and scheduling are set up.', time: 'Just now' },
    { id: 'reminder-follow-up', title: 'Action needed', message: 'Review queued campaigns and follow-up sequences.', time: '5 min ago' },
  ];

  useEffect(() => {
    if (!isNotificationsOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsNotificationsOpen(false);
    }

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isNotificationsOpen]);

  return (
    <header
      className="sticky top-0 z-20 border-b border-white/[0.07]"
      style={{ background: 'rgba(13,13,15,0.85)', backdropFilter: 'blur(16px)' }}
    >
      <div className="relative mx-auto flex h-14 w-full max-w-[1680px] items-center gap-3 px-3 sm:px-4 lg:px-6 2xl:px-8">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Search bar */}
        <div className="hidden w-[320px] items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-sm text-white/30 transition hover:border-white/15 hover:bg-white/[0.06] lg:flex cursor-text">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Search campaigns, templates, leads…</span>
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Workspace chip */}
          <div className="hidden cursor-default items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 lg:flex">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#00d2ff] to-[#0B2551] flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            <span className="max-w-[130px] truncate text-xs font-medium text-white/70">{workspace.name}</span>
          </div>

          {/* Bell */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
              aria-label="Notifications"
              onClick={() => setIsNotificationsOpen((c) => !c)}
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#00d2ff]" />
            </button>

            {isNotificationsOpen && (
              <div
                className="absolute right-0 top-11 z-40 w-[300px] rounded-2xl border border-white/10 p-3 shadow-2xl"
                style={{ background: 'rgba(13,13,15,0.96)', backdropFilter: 'blur(24px)' }}
              >
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 px-1 mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Notifications</p>
                  <button onClick={() => setIsNotificationsOpen(false)} className="text-white/30 hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-1">
                  {notifications.map((n) => (
                    <div key={n.id} className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                      <p className="text-xs font-semibold text-white">{n.title}</p>
                      <p className="mt-0.5 text-[11px] text-white/50">{n.message}</p>
                      <p className="mt-1 text-[10px] text-white/30">{n.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={() => void onSignOut()}
            className="hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white lg:flex"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
