import { DatabaseZap, MoreVertical, SearchX } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { CrmWorkspaceConfig, RecordListPageResult, RecordSummary } from '../../lib/crm-types';
import type { CRMType } from '../../lib/types';
import { getWorkbenchEmptyState } from '../../lib/record-workbench';
import { Card } from '../ui/Card';
import type { RecordQuickActionMode } from './RecordQuickActionDrawer';
import { RecordListItem, recordListGridClassName } from './RecordListItem';

interface RecordListProps {
  records: RecordSummary[];
  config: CrmWorkspaceConfig;
  crmType: CRMType;
  hasActiveFilters: boolean;
  isRefreshing?: boolean;
  selectedRecordIds: Set<string>;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  isDeletingSelected?: boolean;
  pagination: Pick<RecordListPageResult, 'page' | 'pageSize' | 'total' | 'totalPages' | 'hasNextPage' | 'hasPrevPage'>;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onCreateRecord: () => void;
  onClearFilters: () => void;
  onToggleSelectAllVisible: (checked: boolean) => void;
  onToggleRecordSelection: (recordId: string, checked: boolean) => void;
  onRequestDeleteSelected: () => void;
  onEditLead: (record: RecordSummary) => void;
  onOpenAction: (record: RecordSummary, mode: Exclude<RecordQuickActionMode, null>) => void;
}

interface RecordListSkeletonProps {
  rows?: number;
}

export function RecordListSkeleton({ rows = 6 }: RecordListSkeletonProps) {
  return (
    <Card className="overflow-hidden border border-white/[0.08] bg-white/[0.03] p-0 shadow-[0_18px_30px_-24px_rgba(0,0,0,0.8)]">
      <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-3 w-32 rounded-full bg-white/10" />
          <div className="mt-3 h-6 w-56 rounded-full bg-white/10" />
        </div>
        <div className="h-8 w-28 rounded-full bg-white/10" />
      </div>

      <div className="overflow-x-auto">
        <div className={recordListGridClassName + ' border-b border-white/[0.08] bg-white/[0.03] px-5 py-3'}>
          <div className="h-4 w-4 rounded-full bg-white/10" />
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-3 w-20 rounded-full bg-white/10" />
          ))}
        </div>

        <div>
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className={recordListGridClassName + ' border-b border-white/[0.06] px-5 py-3'}>
              <div className="h-4 w-4 rounded-full bg-white/10" />
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-white/10" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-40 rounded-full bg-white/10" />
                  <div className="mt-2 h-3 w-56 rounded-full bg-white/10" />
                  <div className="mt-3 flex gap-2">
                    <div className="h-6 w-20 rounded-full bg-white/10" />
                    <div className="h-6 w-24 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
              <div className="h-4 w-20 rounded-full bg-white/10" />
              <div className="h-8 w-24 rounded-full bg-white/10" />
              <div className="h-4 w-32 rounded-full bg-white/10" />
              <div className="h-6 w-20 rounded-full bg-white/10" />
              <div className="h-8 w-28 rounded-full bg-white/10" />
              <div>
                <div className="h-5 w-28 rounded-full bg-white/10" />
                <div className="mt-2 h-3 w-24 rounded-full bg-white/10" />
              </div>
              <div className="h-4 w-24 rounded-full bg-white/10" />
              <div className="ml-auto h-10 w-10 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function RecordList({
  records,
  config,
  crmType,
  hasActiveFilters,
  isRefreshing = false,
  selectedRecordIds,
  allVisibleSelected,
  someVisibleSelected,
  isDeletingSelected = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onCreateRecord,
  onClearFilters,
  onToggleSelectAllVisible,
  onToggleRecordSelection,
  onRequestDeleteSelected,
  onEditLead,
  onOpenAction,
}: RecordListProps) {
  const selectedCount = selectedRecordIds.size;
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }

    selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
  }, [allVisibleSelected, someVisibleSelected]);

  if (records.length === 0) {
    const emptyState = getWorkbenchEmptyState(crmType, hasActiveFilters);
    const EmptyIcon = hasActiveFilters ? SearchX : DatabaseZap;

    return (
      <Card className="border border-white/[0.08] bg-white/[0.03] p-10 shadow-[0_18px_30px_-24px_rgba(0,0,0,0.8)]">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white/65">
            <EmptyIcon className="h-7 w-7" />
          </div>
          <div className="mt-5 inline-flex rounded-full border border-white/12 bg-white/[0.05] px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
            Shared lead queue
          </div>
          <h3 className="mt-5 font-display text-3xl tracking-tight text-white">{emptyState.title}</h3>
          <p className="mt-3 text-sm font-medium leading-7 text-white/55">{emptyState.body}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onCreateRecord}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Create record
            </button>
            <Link
              to="/imports"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-white/75 transition hover:bg-white/[0.1] hover:text-white"
            >
              Import leads
            </Link>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-transparent px-4 text-sm font-semibold text-white/65 transition hover:bg-white/[0.05] hover:text-white"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-white/[0.08] bg-white/[0.03] p-0 shadow-[0_18px_30px_-24px_rgba(0,0,0,0.8)]">
      <div className="flex items-start justify-between border-b border-white/[0.08] px-5 py-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Records table</div>
          <h3 className="mt-2 text-[38px] font-semibold tracking-tight text-white">Clean queue view</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md border border-white/10 bg-white/[0.05] px-2.5 py-1 font-medium text-white/65">
              {records.length} visible record{records.length === 1 ? '' : 's'}
            </span>
            <span className="rounded-md border border-white/10 bg-white/[0.05] px-2.5 py-1 font-medium text-white/65">{config.sources.length} sources</span>
            {isRefreshing ? <span className="rounded-md border border-white/10 bg-white/[0.05] px-2.5 py-1 font-medium text-white/65">Refreshing</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/50">
          {selectedCount > 0 ? (
            <button
              type="button"
              onClick={onRequestDeleteSelected}
              disabled={isDeletingSelected}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/20 px-4 text-sm font-medium text-rose-100 transition hover:bg-rose-500/30 disabled:opacity-50"
            >
              Delete selected
            </button>
          ) : null}
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] transition hover:bg-white/[0.09] hover:text-white">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className={recordListGridClassName + ' border-b border-white/[0.08] bg-white/[0.03] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45'}>
          <div className="flex items-center justify-center">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allVisibleSelected}
              onChange={(event) => onToggleSelectAllVisible(event.target.checked)}
              aria-label="Select all visible records"
              className="h-4 w-4 rounded-full border-white/20 bg-transparent text-[#00d2ff] focus:ring-[#00d2ff]"
            />
          </div>
          <div>Record Name</div>
          <div>Type</div>
          <div>Source / Contact</div>
          <div>Status</div>
          <div>Follow-up</div>
          <div>Assigned Agent</div>
          <div>Updated</div>
          <div className="text-right">Actions</div>
        </div>

        <div>
          {records.map((record) => (
            <RecordListItem
              key={record.id}
              record={record}
              config={config}
              crmType={crmType}
              isSelected={selectedRecordIds.has(record.id)}
              onToggleSelect={onToggleRecordSelection}
              onEditLead={onEditLead}
              onOpenAction={onOpenAction}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/[0.08] px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-sm font-medium text-white/55">
          Showing {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}-
          {Math.min(pagination.total, pagination.page * pagination.pageSize)} of {pagination.total} records
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-white/55">
            <span>Rows</span>
            <select
              value={pagination.pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-9 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white/80 focus:border-white/20 focus:outline-none"
            >
              {[10, 20, 25].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="text-sm font-medium text-white/55">
            Page {pagination.page} of {pagination.totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!pagination.hasPrevPage}
              onClick={() => onPageChange(pagination.page - 1)}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-medium text-white/75 transition hover:bg-white/[0.1] hover:text-white disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!pagination.hasNextPage}
              onClick={() => onPageChange(pagination.page + 1)}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-medium text-white/75 transition hover:bg-white/[0.1] hover:text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
