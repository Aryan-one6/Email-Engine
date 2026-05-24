import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { AppPageGuide } from '../context/AppGuideContext';
import { WorkspaceLayout } from '../components/dashboard/WorkspaceLayout';
import { RecordCreateDrawer } from '../components/records/RecordCreateDrawer';
import { RecordEditDrawer } from '../components/records/RecordEditDrawer';
import { RecordList, RecordListSkeleton } from '../components/records/RecordList';
import { RecordQuickActionDrawer, type RecordQuickActionMode } from '../components/records/RecordQuickActionDrawer';
import { Card } from '../components/ui/Card';
import { FullPageLoader } from '../components/ui/FullPageLoader';
import { SectionSkeleton } from '../components/ui/SectionSkeleton';
import { useAuth } from '../hooks/useAuth';
import { usePageGuide } from '../hooks/useAppGuide';
import { useCrmWorkspace } from '../hooks/useCrmWorkspace';
import {
  addRecordNote,
  createRecordTask,
  deleteWorkspaceRecords,
  getCachedWorkspaceRecords,
  listWorkspaceRecords,
  moveRecordStage,
  updateRecord,
} from '../lib/crm-service';
import type { RecordListFilters, RecordListPageResult, RecordListQuery, RecordSummary } from '../lib/crm-types';
import { buildActiveFilterChips, buildOperationalMetrics } from '../lib/record-workbench';

const defaultFilters: Omit<RecordListFilters, 'workspace_id'> = {
  search: '',
  stage_id: null,
  source_id: null,
  assignee_user_id: null,
  status: null,
  include_archived: false,
};
const defaultPage = 1;
const defaultPageSize = 10;
const metricCardTheme = {
  border: 'border-white/[0.08]',
  background: 'bg-[linear-gradient(140deg,rgba(255,255,255,0.045)_0%,rgba(255,255,255,0.02)_62%,rgba(255,255,255,0.01)_100%)]',
  glow: 'bg-[radial-gradient(circle,rgba(0,210,255,0.14)_0%,rgba(0,210,255,0)_74%)]',
  topAccent: 'bg-[linear-gradient(90deg,rgba(0,210,255,0.46)_0%,rgba(164,244,253,0.32)_60%,rgba(11,37,81,0.2)_100%)]',
  value: 'text-white',
};

function createEmptyRecordPage(page = defaultPage, pageSize = defaultPageSize): RecordListPageResult {
  return {
    items: [],
    records: [],
    page,
    pageSize,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };
}

function updateVisibleRecordPage(
  current: RecordListPageResult,
  updater: (records: RecordSummary[]) => RecordSummary[],
): RecordListPageResult {
  const nextItems = updater(current.items);

  return {
    ...current,
    items: nextItems,
    records: nextItems,
  };
}

function mergeFollowUpDate(currentValue: string | null | undefined, nextValue: string | null) {
  if (!currentValue) {
    return nextValue;
  }

  if (!nextValue) {
    return currentValue;
  }

  return new Date(nextValue).getTime() < new Date(currentValue).getTime() ? nextValue : currentValue;
}

export function RecordsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, workspace, signOut } = useAuth();
  const workspaceId = workspace?.id ?? null;
  const { config, configError, configLoading, configRefreshing } = useCrmWorkspace();
  const [filters, setFilters] = useState<Omit<RecordListFilters, 'workspace_id'>>(defaultFilters);
  const [page, setPage] = useState(defaultPage);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [recordPage, setRecordPage] = useState<RecordListPageResult>(() =>
    workspaceId
      ? (getCachedWorkspaceRecords({
          workspace_id: workspaceId,
          ...defaultFilters,
          page: defaultPage,
          pageSize: defaultPageSize,
        }) ??
        createEmptyRecordPage())
      : createEmptyRecordPage(),
  );
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordSummary | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [actionRecord, setActionRecord] = useState<RecordSummary | null>(null);
  const [activeActionMode, setActiveActionMode] = useState<RecordQuickActionMode>(null);
  const [loading, setLoading] = useState(() => recordPage.items.length === 0 && recordPage.total === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingRecords, setDeletingRecords] = useState(false);
  const requestIdRef = useRef(0);
  const filtersRef = useRef(filters);
  const paginationRef = useRef({ page: defaultPage, pageSize: defaultPageSize });

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    paginationRef.current = { page, pageSize };
  }, [page, pageSize]);

  useEffect(() => {
    const shouldOpenCreateRecord = Boolean((location.state as { openCreateRecord?: boolean } | null)?.openCreateRecord);

    if (!shouldOpenCreateRecord) {
      return;
    }

    setIsCreateDrawerOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    const visibleIds = new Set(recordPage.items.map((record) => record.id));

    setSelectedRecordIds((current) => {
      if (current.size === 0) {
        return current;
      }

      const next = new Set([...current].filter((recordId) => visibleIds.has(recordId)));
      return next.size === current.size ? current : next;
    });
  }, [recordPage.items]);

  const metrics = useMemo(() => (config ? buildOperationalMetrics(recordPage.items, config) : []), [recordPage.items, config]);
  const activeFilterChips = useMemo(
    () => (config ? buildActiveFilterChips(filters, config) : []),
    [filters, config],
  );
  const hasActiveFilters = activeFilterChips.length > 0;
  const visibleRecordIds = useMemo(() => recordPage.items.map((record) => record.id), [recordPage.items]);
  const metricCards = useMemo(() => metrics.slice(0, 4), [metrics]);
  const activeQueueTab = useMemo(() => {
    if (filters.include_archived) {
      return 'archived';
    }

    if (filters.status) {
      return filters.status;
    }

    return 'all';
  }, [filters.include_archived, filters.status]);
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      }),
    [],
  );
  const selectedVisibleRecordIds = useMemo(
    () => visibleRecordIds.filter((recordId) => selectedRecordIds.has(recordId)),
    [selectedRecordIds, visibleRecordIds],
  );
  const allVisibleSelected = visibleRecordIds.length > 0 && selectedVisibleRecordIds.length === visibleRecordIds.length;
  const someVisibleSelected = selectedVisibleRecordIds.length > 0 && !allVisibleSelected;
  const guide = useMemo<AppPageGuide>(
    () => ({
      key: 'records-queue',
      title: 'Work the lead queue',
      summary:
        'This page is the main lead queue for email marketing. Users can filter leads, create new leads, and update follow-up actions without leaving the list.',
      nextStep:
        recordPage.total === 0
          ? 'Create a lead or import a CSV so the queue has live leads to work from.'
          : hasActiveFilters
            ? 'Review the filtered queue, then use actions to update statuses, notes, and tasks.'
            : 'Use the filters to narrow the queue or open the next record that needs action.',
      highlights: ['Lead queue view', 'Live filters', 'Create and import entry points'],
      autoStart: 'once' as const,
      steps: [
        {
          id: 'records-create',
          title: 'Add a lead manually',
          body: 'Use this when a user needs to log a lead directly without importing a file.',
          targetId: 'records-create-button',
          placement: 'bottom',
        },
        {
          id: 'records-import',
          title: 'Bring leads in from a CSV',
          body: 'The import flow is the fastest way to load a batch of leads and map their columns.',
          targetId: 'records-import-button',
          placement: 'bottom',
        },
        {
          id: 'records-filters',
          title: 'Filter the daily queue',
          body: 'Use source and status filters to focus on leads that need attention right now.',
          targetId: 'records-search-input',
        },
        {
          id: 'records-list',
          title: 'Work the queue without leaving the page',
          body: 'The list supports quick actions so the user can keep moving records forward without bouncing across multiple screens.',
          targetId: 'records-list',
          placement: 'top',
        },
      ],
    }),
    [hasActiveFilters, recordPage.total],
  );

  usePageGuide(guide);

  async function handleSignOut() {
    await signOut();
    toast.success('Signed out successfully.');
    navigate('/signin', { replace: true, state: { existingUser: true } });
  }

  async function loadData(nextFilters = filtersRef.current, nextPagination = paginationRef.current) {
    if (!session || !workspaceId) {
      return;
    }

    const requestId = ++requestIdRef.current;
    const requestFilters: RecordListQuery = {
      workspace_id: workspaceId,
      ...nextFilters,
      ...nextPagination,
    };
    const cachedRecords = getCachedWorkspaceRecords(requestFilters);

    if (cachedRecords) {
      setRecordPage(cachedRecords);
      if (cachedRecords.page !== page) {
        setPage(cachedRecords.page);
      }
      if (cachedRecords.pageSize !== pageSize) {
        setPageSize(cachedRecords.pageSize);
      }
      setLoading(false);
      setRefreshing(true);
    } else if (recordPage.items.length > 0 || recordPage.total > 0) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextRecords = await listWorkspaceRecords(session, requestFilters);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setRecordPage(nextRecords);

      if (nextRecords.page !== nextPagination.page) {
        setPage(nextRecords.page);
      }

      if (nextRecords.pageSize !== nextPagination.pageSize) {
        setPageSize(nextRecords.pageSize);
      }
    } catch (error) {
      if (requestId === requestIdRef.current) {
        const message = error instanceof Error ? error.message : 'Unable to load records.';
        toast.error(message);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    if (!session || !workspaceId) {
      return;
    }

    const debounceMs = filters.search.trim() ? 280 : 0;
    const timer = window.setTimeout(() => {
      void loadData(filters);
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    session,
    workspaceId,
    page,
    pageSize,
    filters.search,
    filters.stage_id,
    filters.source_id,
    filters.assignee_user_id,
    filters.status,
    filters.include_archived,
  ]);

  async function handleMoveStage(record: RecordSummary, stageId: string) {
    if (!session || !workspaceId) {
      throw new Error('Workspace is not ready.');
    }

    try {
      const detail = await moveRecordStage(session, workspaceId, record.id, stageId);
      const touchedAt = new Date().toISOString();

      setRecordPage((current) =>
        updateVisibleRecordPage(current, (records) =>
          records.map((item) =>
            item.id === record.id
              ? {
                  ...item,
                  ...detail.record,
                  last_activity_at: touchedAt,
                  last_activity_type: 'stage_changed',
                }
              : item,
          ),
        ),
      );
      toast.success('Stage updated.');
      void loadData(filtersRef.current);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to move stage.';
      toast.error(message);
      throw error;
    }
  }

  async function handleAddNote(record: RecordSummary, body: string) {
    if (!session || !workspaceId) {
      throw new Error('Workspace is not ready.');
    }

    try {
      await addRecordNote(session, workspaceId, record.id, body);
      const touchedAt = new Date().toISOString();

      setRecordPage((current) =>
        updateVisibleRecordPage(current, (records) =>
          records.map((item) =>
            item.id === record.id
              ? {
                  ...item,
                  updated_at: touchedAt,
                  last_activity_at: touchedAt,
                  last_activity_type: 'note_added',
                }
              : item,
          ),
        ),
      );
      toast.success('Note added.');
      void loadData(filtersRef.current);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to add note.';
      toast.error(message);
      throw error;
    }
  }

  async function handleCreateTask(
    record: RecordSummary,
    payload: { title: string; description: string | null; priority: string; due_at: string | null; assigned_to: string | null },
  ) {
    if (!session || !workspaceId) {
      throw new Error('Workspace is not ready.');
    }

    try {
      await createRecordTask(session, workspaceId, record.id, payload);
      const touchedAt = new Date().toISOString();

      setRecordPage((current) =>
        updateVisibleRecordPage(current, (records) =>
          records.map((item) =>
            item.id === record.id
              ? {
                  ...item,
                  updated_at: touchedAt,
                  last_activity_at: touchedAt,
                  last_activity_type: 'task_created',
                  open_task_count: (item.open_task_count ?? 0) + 1,
                  next_follow_up_at: mergeFollowUpDate(item.next_follow_up_at, payload.due_at),
                  next_task_title:
                    !item.next_task_title || !item.next_task_due_at || Boolean(payload.due_at && payload.due_at <= item.next_task_due_at)
                      ? payload.title
                      : item.next_task_title,
                  next_task_due_at: mergeFollowUpDate(item.next_task_due_at, payload.due_at),
                }
              : item,
          ),
        ),
      );
      toast.success('Task created.');
      void loadData(filtersRef.current);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create task.';
      toast.error(message);
      throw error;
    }
  }

  async function handleAssignOwner(record: RecordSummary, assigneeId: string | null) {
    if (!session || !workspaceId) {
      throw new Error('Workspace is not ready.');
    }

    try {
      const detail = await updateRecord(session, record.id, {
        workspace_id: workspaceId,
        core: {
          assignee_user_id: assigneeId,
        },
        custom: {},
      });
      const touchedAt = new Date().toISOString();

      setRecordPage((current) =>
        updateVisibleRecordPage(current, (records) =>
          records.map((item) =>
            item.id === record.id
              ? {
                  ...item,
                  ...detail.record,
                  last_activity_at: touchedAt,
                  last_activity_type: 'assignment_changed',
                }
              : item,
          ),
        ),
      );
      toast.success('Owner updated.');
      void loadData(filtersRef.current);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update owner.';
      toast.error(message);
      throw error;
    }
  }

  function handleOpenEditDrawer(record: RecordSummary) {
    setEditingRecord(record);
    setIsEditDrawerOpen(true);
  }

  function handleOpenCreateDrawer() {
    setIsCreateDrawerOpen(true);
  }

  function handlePageChange(nextPage: number) {
    setPage(Math.max(1, nextPage));
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(defaultPage);
  }

  function handleToggleRecordSelection(recordId: string, checked: boolean) {
    setSelectedRecordIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(recordId);
      } else {
        next.delete(recordId);
      }

      return next;
    });
  }

  function handleToggleSelectAllVisible(checked: boolean) {
    setSelectedRecordIds((current) => {
      const next = new Set(current);

      for (const recordId of visibleRecordIds) {
        if (checked) {
          next.add(recordId);
        } else {
          next.delete(recordId);
        }
      }

      return next;
    });
  }

  function handleRequestDeleteSelected() {
    if (selectedVisibleRecordIds.length === 0) {
      toast.error('Select at least one record to delete.');
      return;
    }

    setIsDeleteConfirmOpen(true);
  }

  function updateFilters(nextUpdater: (current: Omit<RecordListFilters, 'workspace_id'>) => Omit<RecordListFilters, 'workspace_id'>) {
    setFilters((current) => nextUpdater(current));
    setPage(defaultPage);
  }

  function handleCloseCreateDrawer() {
    setIsCreateDrawerOpen(false);
  }

  function handleCloseEditDrawer() {
    setIsEditDrawerOpen(false);
  }

  function handleOpenQuickAction(record: RecordSummary, mode: Exclude<RecordQuickActionMode, null>) {
    setActionRecord(record);
    setActiveActionMode(mode);
  }

  function handleCloseQuickAction() {
    setActiveActionMode(null);
  }

  function handleRecordSaved(detail: { record: RecordSummary }) {
    setEditingRecord(detail.record);
    setActionRecord(detail.record);
    setRecordPage((current) =>
      updateVisibleRecordPage(current, (records) =>
        records.map((item) => (item.id === detail.record.id ? { ...item, ...detail.record } : item)),
      ),
    );
    void loadData(filtersRef.current);
  }

  function handleRecordCreated() {
    setPage(defaultPage);
    void loadData(filtersRef.current, { page: defaultPage, pageSize: paginationRef.current.pageSize });
  }

  async function handleConfirmDeleteSelected() {
    if (!session || !workspaceId || selectedVisibleRecordIds.length === 0) {
      return;
    }

    setDeletingRecords(true);

    try {
      const result = await deleteWorkspaceRecords(session, {
        workspace_id: workspaceId,
        record_ids: selectedVisibleRecordIds,
      });

      setIsDeleteConfirmOpen(false);
      setSelectedRecordIds(new Set());

      if (result.deleted_count > 0) {
        toast.success(`Deleted ${result.deleted_count} record${result.deleted_count === 1 ? '' : 's'}.`);
      } else {
        toast.error('No records were deleted.');
      }

      void loadData(filtersRef.current, paginationRef.current);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete records.';
      toast.error(message);
    } finally {
      setDeletingRecords(false);
    }
  }

  if (!workspace || !session || !workspaceId) {
    return <FullPageLoader label="Loading records..." />;
  }

  return (
    <WorkspaceLayout workspace={workspace} onSignOut={handleSignOut}>
      <div className="workspace-theme space-y-5 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00d2ff]">Email workspace</div>
            <h1 className="mt-1 font-display text-[44px] leading-[1.02] tracking-tight text-white">Records</h1>
            <p className="mt-2 text-sm font-medium text-white/50">Simple lead queue for email campaigns and follow-ups.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-semibold text-white/75">
              <CalendarDays className="h-4 w-4" />
              {todayLabel}
            </span>
            <Link
              to="/imports"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white/70 transition hover:bg-white/[0.09] hover:text-white"
              data-guide-id="records-import-button"
            >
              <Download className="h-4 w-4" />
              Import CSV
            </Link>
            <button
              type="button"
              onClick={handleOpenCreateDrawer}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-black shadow-[0_12px_24px_-16px_rgba(255,255,255,0.58)] transition hover:bg-white/90"
              data-guide-id="records-create-button"
            >
              <Plus className="h-4 w-4" />
              Add Lead
            </button>
          </div>
        </div>

        {configRefreshing ? (
          <Card className="border border-white/[0.08] bg-white/[0.03] p-4 text-sm font-medium text-white/65 shadow-none">
            Refreshing workspace config in the background...
          </Card>
        ) : null}

        {configError && !config ? (
          <Card className="border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{configError}</Card>
        ) : null}

        {config ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((metric) => {
              const trendValue = recordPage.total > 0 ? (metric.value / recordPage.total) * 100 : 0;
              const theme = metricCardTheme;

              return (
                <Card
                  key={metric.label}
                  className={`group relative overflow-hidden p-5 shadow-[0_18px_30px_-24px_rgba(0,0,0,0.8)] transition duration-200 hover:-translate-y-0.5 hover:border-white/15 ${theme.border} ${theme.background}`}
                >
                  <div className={`pointer-events-none absolute inset-x-0 top-0 h-1 ${theme.topAccent} opacity-85 transition group-hover:opacity-100`} />
                  <div className={`pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full ${theme.glow}`} />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_45%)]" />

                  <div className="flex items-center justify-between gap-3">
                    <div className="relative text-xs font-semibold uppercase tracking-[0.14em] text-white/45">{metric.label}</div>
                    <span className="relative rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/55">
                      +{trendValue.toFixed(1)}%
                    </span>
                  </div>
                  <div className={`relative mt-5 font-display text-4xl font-semibold tracking-tight ${theme.value}`}>
                    {metric.value.toLocaleString()}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionSkeleton title="Operational metrics" rows={2} />
            <SectionSkeleton title="Operational metrics" rows={2} />
          </div>
        )}

        {config ? (
          <Card className="border border-white/[0.08] bg-white/[0.03] p-0 shadow-[0_18px_30px_-24px_rgba(0,0,0,0.8)]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-5 border-b border-white/[0.08] px-5 py-3">
                {[
                  { key: 'all', label: 'All Leads', status: null, includeArchived: false },
                  { key: 'new', label: 'New', status: 'new', includeArchived: false },
                  { key: 'email_sent', label: 'Email Sent', status: 'email_sent', includeArchived: false },
                  { key: 'mobile_contacted', label: 'Mobile Contacted', status: 'mobile_contacted', includeArchived: false },
                  { key: 'replied', label: 'Replied', status: 'replied', includeArchived: false },
                  { key: 'interested', label: 'Interested', status: 'interested', includeArchived: false },
                  { key: 'not_interested', label: 'Not Interested', status: 'not_interested', includeArchived: false },
                ].map((tab) => {
                  const isActive = activeQueueTab === tab.key;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() =>
                        updateFilters((current) => ({
                          ...current,
                          status: tab.status,
                          include_archived: tab.includeArchived,
                        }))
                      }
                      className={
                        isActive
                          ? 'border-b-2 border-[#00d2ff] px-0.5 py-1 text-xs font-semibold text-[#A4F4FD]'
                          : 'border-b-2 border-transparent px-0.5 py-1 text-xs font-semibold text-white/45 transition hover:text-white/75'
                      }
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3 px-5 pb-4 md:grid-cols-2">
                <select
                  value={filters.source_id ?? ''}
                  onChange={(event) =>
                    updateFilters((current) => ({
                      ...current,
                      source_id: event.target.value || null,
                    }))
                  }
                  className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm font-medium text-white/80 focus:border-white/20 focus:outline-none"
                >
                  <option value="">All sources</option>
                  {config.sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setFilters(defaultFilters);
                    setPage(defaultPage);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white/80 transition hover:bg-white/[0.1] hover:text-white"
                >
                  Reset filters
                </button>
              </div>

              {activeFilterChips.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeFilterChips.map((chip) => (
                    <button
                      key={`${chip.key}-${chip.value}`}
                      type="button"
                      onClick={() =>
                        updateFilters((current) => ({
                          ...current,
                          [chip.key]: chip.key === 'search' ? '' : null,
                          include_archived: chip.key === 'status' ? false : current.include_archived,
                        }))
                      }
                      className="ml-5 rounded-md border border-white/12 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white/70 transition hover:border-white/20 hover:text-white"
                    >
                      {chip.label}: {chip.value} x
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>
        ) : (
          <SectionSkeleton title="Queue filters" rows={3} />
        )}

        <div data-guide-id="records-list">
          {config ? (
            loading && recordPage.items.length === 0 && recordPage.total === 0 ? (
              <RecordListSkeleton rows={6} />
            ) : (
              <RecordList
                records={recordPage.items}
                config={config}
                crmType={workspace.crmType}
                hasActiveFilters={hasActiveFilters}
                isRefreshing={refreshing}
                selectedRecordIds={selectedRecordIds}
                allVisibleSelected={allVisibleSelected}
                someVisibleSelected={someVisibleSelected}
                isDeletingSelected={deletingRecords}
                pagination={recordPage}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onCreateRecord={handleOpenCreateDrawer}
                onClearFilters={() => {
                  setFilters(defaultFilters);
                  setPage(defaultPage);
                }}
                onToggleSelectAllVisible={handleToggleSelectAllVisible}
                onToggleRecordSelection={handleToggleRecordSelection}
                onRequestDeleteSelected={handleRequestDeleteSelected}
                onEditLead={handleOpenEditDrawer}
                onOpenAction={handleOpenQuickAction}
              />
            )
          ) : loading || configLoading ? (
            <RecordListSkeleton rows={6} />
          ) : null}
        </div>
      </div>

      {config ? (
        <RecordCreateDrawer
          isOpen={isCreateDrawerOpen}
          workspaceId={workspaceId}
          session={session}
          config={config}
          onClose={handleCloseCreateDrawer}
          onCreated={handleRecordCreated}
        />
      ) : null}

      {config ? (
        <RecordEditDrawer
          isOpen={isEditDrawerOpen}
          record={editingRecord}
          workspaceId={workspaceId}
          session={session}
          config={config}
          onClose={handleCloseEditDrawer}
          onSaved={handleRecordSaved}
        />
      ) : null}

      {config ? (
        <RecordQuickActionDrawer
          isOpen={activeActionMode !== null}
          mode={activeActionMode}
          record={actionRecord}
          config={config}
          onClose={handleCloseQuickAction}
          onMoveStage={handleMoveStage}
          onAddNote={handleAddNote}
          onCreateTask={handleCreateTask}
          onAssignOwner={handleAssignOwner}
        />
      ) : null}

      {isDeleteConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close delete confirmation"
            onClick={() => {
              if (!deletingRecords) {
                setIsDeleteConfirmOpen(false);
              }
            }}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0d0f] p-6 shadow-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-300">Delete records</div>
            <h3 className="mt-2 font-display text-2xl text-white">Confirm bulk delete</h3>
            <p className="mt-2 text-sm text-white/55">
              You selected {selectedVisibleRecordIds.length} record{selectedVisibleRecordIds.length === 1 ? '' : 's'}.
              This action cannot be undone.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={deletingRecords}
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-medium text-white/75 transition hover:bg-white/[0.1] hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingRecords}
                onClick={() => void handleConfirmDeleteSelected()}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/20 px-4 text-sm font-medium text-rose-100 transition hover:bg-rose-500/30 disabled:opacity-50"
              >
                {deletingRecords ? 'Deleting...' : 'Confirm delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </WorkspaceLayout>
  );
}
