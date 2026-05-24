import {
  ArrowUpRight,
  CheckSquare,
  ExternalLink,
  MessageSquarePlus,
  PencilLine,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import type { CrmWorkspaceConfig, RecordSummary } from '../../lib/crm-types';
import type { CRMType } from '../../lib/types';
import {
  getRecordFollowUpSummary,
  formatRecordCreatedDate,
  formatRelativeDateTime,
  getRecordIdentity,
  getRecordTypeLabel,
  getSourceName,
  getStageName,
} from '../../lib/record-workbench';
import { cn } from '../../lib/utils';
import type { RecordQuickActionMode } from './RecordQuickActionDrawer';

export const recordListGridClassName =
  'grid min-w-[1220px] grid-cols-[40px_minmax(300px,2.35fr)_minmax(130px,0.95fr)_minmax(190px,1.2fr)_minmax(130px,0.95fr)_minmax(170px,1.1fr)_minmax(170px,1.1fr)_minmax(140px,1fr)_64px] items-center gap-4';

interface RecordListItemProps {
  record: RecordSummary;
  config: CrmWorkspaceConfig;
  crmType: CRMType;
  isSelected: boolean;
  onToggleSelect: (recordId: string, checked: boolean) => void;
  onEditLead: (record: RecordSummary) => void;
  onOpenAction: (record: RecordSummary, mode: Exclude<RecordQuickActionMode, null>) => void;
}

function formatStatusLabel(status: string | null | undefined) {
  const value = status?.trim();

  if (!value) {
    return 'Open';
  }

  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function pillStyles(tone: 'neutral' | 'type' | 'source') {
  switch (tone) {
    case 'type':
      return 'border-[#00d2ff]/35 bg-[#00d2ff]/12 text-[#A4F4FD]';
    case 'source':
      return 'border-white/15 bg-white/[0.05] text-white/70';
    default:
      return 'border-white/15 bg-white/[0.05] text-white/70';
  }
}

function followUpStyles(tone: ReturnType<typeof getRecordFollowUpSummary>['tone']) {
  switch (tone) {
    case 'overdue':
      return 'border-rose-400/30 bg-rose-500/15 text-rose-200';
    case 'today':
      return 'border-amber-300/35 bg-amber-500/15 text-amber-200';
    case 'pending':
      return 'border-cyan-300/35 bg-cyan-500/12 text-cyan-100';
    default:
      return 'border-white/15 bg-white/[0.05] text-white/70';
  }
}

function statusPillStyles(status: string | null | undefined) {
  const normalized = status?.trim().toLowerCase().replace(/\s+/g, '_') ?? '';

  if (!normalized || normalized === 'new' || normalized === 'open') {
    return 'border-emerald-300/35 bg-emerald-500/15 text-emerald-200';
  }

  if (normalized === 'email_sent') {
    return 'border-blue-300/35 bg-blue-500/15 text-blue-200';
  }

  if (normalized === 'mobile_contacted') {
    return 'border-sky-300/35 bg-sky-500/15 text-sky-200';
  }

  if (normalized === 'replied') {
    return 'border-violet-300/35 bg-violet-500/15 text-violet-200';
  }

  if (normalized === 'interested' || normalized.includes('qualified') || normalized.includes('active')) {
    return 'border-emerald-300/35 bg-emerald-500/15 text-emerald-200';
  }

  if (normalized === 'not_interested' || normalized.includes('closed') || normalized.includes('won')) {
    return 'border-rose-400/30 bg-rose-500/15 text-rose-200';
  }

  return 'border-emerald-300/35 bg-emerald-500/15 text-emerald-200';
}

function RowActionsMenu({
  record,
  onEditLead,
  onOpenAction,
}: Pick<RecordListItemProps, 'record' | 'onEditLead' | 'onOpenAction'>) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const updateMenuPosition = useCallback(() => {
    if (!open || !triggerRef.current) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current?.getBoundingClientRect();
    const menuWidth = menuRect?.width ?? 220;
    const menuHeight = menuRect?.height ?? 280;
    const viewportPadding = 12;
    const verticalGap = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const desiredLeft = triggerRect.right - menuWidth;
    const left = Math.min(
      Math.max(viewportPadding, desiredLeft),
      Math.max(viewportPadding, viewportWidth - menuWidth - viewportPadding),
    );

    const spaceBelow = viewportHeight - triggerRect.bottom - viewportPadding;
    const spaceAbove = triggerRect.top - viewportPadding;
    const shouldOpenAbove = spaceBelow < menuHeight + verticalGap && spaceAbove > spaceBelow;

    const top = shouldOpenAbove
      ? Math.max(viewportPadding, triggerRect.top - menuHeight - verticalGap)
      : Math.min(
          Math.max(viewportPadding, triggerRect.bottom + verticalGap),
          Math.max(viewportPadding, viewportHeight - menuHeight - viewportPadding),
        );

    setMenuPosition({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    function handleViewportChange() {
      updateMenuPosition();
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open, updateMenuPosition]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    updateMenuPosition();
  }, [open, updateMenuPosition]);

  const actions: Array<{
    label: string;
    icon: typeof ExternalLink;
    onSelect: () => void;
  }> = [
    {
      label: 'View details',
      icon: ExternalLink,
      onSelect: () => navigate(`/records/${record.id}`),
    },
    {
      label: 'Edit record',
      icon: PencilLine,
      onSelect: () => onEditLead(record),
    },
    {
      label: 'Add note',
      icon: MessageSquarePlus,
      onSelect: () => onOpenAction(record, 'note'),
    },
    {
      label: 'Create task',
      icon: CheckSquare,
      onSelect: () => onOpenAction(record, 'task'),
    },
  ];

  return (
    <div className="flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        aria-label={`Open actions for ${record.title}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white/55 transition hover:bg-white/[0.1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
      >
        <PencilLine className="h-4 w-4" />
      </button>

      {open && menuPosition
        ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[90] w-56 rounded-[16px] border border-white/10 bg-[#0d0d0f] p-2 shadow-xl"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <div className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Actions
            </div>
            <div className="space-y-1">
              {actions.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.label}
                    type="button"
                    role="menuitem"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpen(false);
                      action.onSelect();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-white/75 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                  >
                    <Icon className="h-4 w-4 text-white/50" />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )
        : null}
    </div>
  );
}

export function RecordListItem({
  record,
  config,
  crmType,
  isSelected,
  onToggleSelect,
  onEditLead,
  onOpenAction,
}: RecordListItemProps) {
  const identity = useMemo(() => getRecordIdentity(record), [record]);
  const typeLabel = useMemo(() => getRecordTypeLabel(record, config, crmType), [record, config, crmType]);
  const sourceName = useMemo(
    () => getSourceName(config, record.source_id, record.imported_from ?? null),
    [config, record.source_id, record.imported_from],
  );
  const ownerName = useMemo(
    () => config.assignees.find((assignee) => assignee.userId === record.assignee_user_id)?.fullName ?? 'Unassigned',
    [config.assignees, record.assignee_user_id],
  );
  const followUp = useMemo(() => getRecordFollowUpSummary(record), [record]);
  const phone = record.phone?.trim() || null;
  const statusLabel = formatStatusLabel(record.status);
  const followUpHref = `/records/${record.id}#tasks`;
  const contactSummary = phone ?? record.email?.trim() ?? 'No contact details';

  return (
    <div
      className={cn(
        recordListGridClassName,
        'group border-b border-white/[0.06] px-5 py-3 text-[13px] transition-colors duration-150 hover:bg-white/[0.03] focus-within:bg-white/[0.03]',
      )}
    >
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(event) => onToggleSelect(record.id, event.target.checked)}
          aria-label={`Select ${identity.title}`}
          className="h-4 w-4 rounded-full border-white/20 bg-transparent text-[#00d2ff] focus:ring-[#00d2ff]"
        />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[linear-gradient(135deg,rgba(0,210,255,0.22),rgba(11,37,81,0.46))] text-sm font-semibold text-white">
            {identity.initials}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                to={`/records/${record.id}`}
                className="truncate text-[18px] font-semibold leading-[1.2] tracking-normal text-white transition group-hover:text-[#A4F4FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
              >
                {identity.title}
              </Link>
              {identity.supportingTag ? (
                <span className="rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-white/55">
                  {identity.supportingTag}
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 truncate text-[13px] font-medium text-white/50">{identity.subtitle}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
              {(record.open_task_count ?? 0) > 0 ? (
                <span className={cn('rounded-full border px-2.5 py-0.5 font-semibold', pillStyles('neutral'))}>
                  {record.open_task_count} open task{record.open_task_count === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <span className={cn('inline-flex max-w-full truncate rounded-full border px-2.5 py-1 text-[11px] font-semibold', pillStyles('type'))}>
          {typeLabel}
        </span>
      </div>

      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white/85">{sourceName}</div>
        <div className="mt-0.5 truncate text-[12px] font-medium text-white/45">{contactSummary}</div>
      </div>

      <div className="min-w-0">
        <span
          className={cn(
            'inline-flex max-w-full truncate rounded-full border px-2.5 py-1 text-[11px] font-semibold',
            statusPillStyles(record.status),
          )}
        >
          {statusLabel}
        </span>
        <div className="mt-0.5 text-[11px] font-medium text-white/45">{getStageName(config, record.stage_id)}</div>
      </div>

      <div className="min-w-0">
        <Link
          to={followUpHref}
          aria-label={`Open follow-up details for ${record.title}`}
          className="group/followup block rounded-xl px-2 py-1.5 transition hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'inline-flex max-w-full truncate rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]',
                followUpStyles(followUp.tone),
              )}
            >
              {followUp.label}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/40 transition group-hover/followup:text-white/70" />
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-white/80">{followUp.taskTitle}</div>
        </Link>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-[10px] font-semibold text-white/60">
            {ownerName.slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate text-sm font-semibold text-white/85">{ownerName}</span>
        </div>
        <div className="mt-1 text-[11px] font-medium text-white/45">{record.priority ? `${record.priority} priority` : 'No priority'}</div>
      </div>

      <div className="min-w-0">
        <div className="text-sm font-semibold text-white/85">{formatRecordCreatedDate(record.created_at)}</div>
        <div className="mt-0.5 text-[11px] font-medium text-white/45">{formatRelativeDateTime(record.last_activity_at ?? record.updated_at)}</div>
      </div>

      <RowActionsMenu record={record} onEditLead={onEditLead} onOpenAction={onOpenAction} />
    </div>
  );
}
