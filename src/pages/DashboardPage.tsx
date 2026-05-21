import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  RefreshCw,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { WorkspaceLayout } from '../components/dashboard/WorkspaceLayout';
import { buttonStyles } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FullPageLoader } from '../components/ui/FullPageLoader';
import { SectionSkeleton } from '../components/ui/SectionSkeleton';
import { useAuth } from '../hooks/useAuth';
import { useCrmWorkspace } from '../hooks/useCrmWorkspace';
import { listWorkspaceRecords } from '../lib/crm-service';
import type { RecordListQuery, RecordSummary } from '../lib/crm-types';
import {
  buildOperationalMetrics,
  formatActivityLabel,
  formatFollowUpDateTime,
  formatRelativeDateTime,
  getRecordFollowUpSummary,
  getSourceName,
  getStageName,
} from '../lib/record-workbench';

const DASHBOARD_PAGE_SIZE = 150;
const DASHBOARD_MAX_PAGES = 20;
const numberFormatter = new Intl.NumberFormat('en-US');

interface DashboardRecordsSnapshot {
  records: RecordSummary[];
  totalRecords: number;
  truncated: boolean;
}

function buildDisplayName(record: RecordSummary) {
  const title = record.title?.trim();
  if (title) {
    return title;
  }

  const fullName = record.full_name?.trim();
  if (fullName) {
    return fullName;
  }

  const companyName = record.company_name?.trim();
  if (companyName) {
    return companyName;
  }

  const email = record.email?.trim();
  if (email) {
    return email;
  }

  return 'Untitled record';
}

async function fetchDashboardRecords(sessionToken: Parameters<typeof listWorkspaceRecords>[0], workspaceId: string) {
  const baseQuery = {
    workspace_id: workspaceId,
    search: '',
    stage_id: null,
    source_id: null,
    assignee_user_id: null,
    status: null,
    include_archived: false,
  } satisfies Omit<RecordListQuery, 'page' | 'pageSize'>;

  let page = 1;
  let totalRecords = 0;
  const allRecords: RecordSummary[] = [];

  while (page <= DASHBOARD_MAX_PAGES) {
    const pageResult = await listWorkspaceRecords(sessionToken, {
      ...baseQuery,
      page,
      pageSize: DASHBOARD_PAGE_SIZE,
    });

    if (page === 1) {
      totalRecords = pageResult.total;
    }

    allRecords.push(...pageResult.items);

    if (!pageResult.hasNextPage) {
      return {
        records: allRecords,
        totalRecords,
        truncated: false,
      } satisfies DashboardRecordsSnapshot;
    }

    page += 1;
  }

  return {
    records: allRecords,
    totalRecords,
    truncated: true,
  } satisfies DashboardRecordsSnapshot;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { session, workspace, signOut } = useAuth();
  const { config, configError, configLoading, configRefreshing } = useCrmWorkspace();
  const workspaceId = workspace?.id ?? null;
  const requestIdRef = useRef(0);

  const [records, setRecords] = useState<RecordSummary[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isTruncated, setIsTruncated] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataRefreshing, setDataRefreshing] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !workspaceId) {
      return;
    }

    const requestId = ++requestIdRef.current;

    setDataLoading(true);
    setDataRefreshing(false);
    setDataError(null);

    void fetchDashboardRecords(session, workspaceId)
      .then((snapshot) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setRecords(snapshot.records);
        setTotalRecords(snapshot.totalRecords);
        setIsTruncated(snapshot.truncated);
      })
      .catch((error) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unable to load dashboard records.';
        setDataError(message);
        toast.error(message);
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setDataLoading(false);
      });
  }, [session, workspaceId]);

  async function handleSignOut() {
    await signOut();
    toast.success('Signed out successfully.');
    navigate('/signin', { replace: true, state: { existingUser: true } });
  }

  async function handleRefresh() {
    if (!session || !workspaceId) {
      return;
    }

    const requestId = ++requestIdRef.current;

    setDataRefreshing(true);
    setDataError(null);

    try {
      const snapshot = await fetchDashboardRecords(session, workspaceId);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setRecords(snapshot.records);
      setTotalRecords(snapshot.totalRecords);
      setIsTruncated(snapshot.truncated);
      toast.success('Dashboard refreshed.');
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Unable to refresh dashboard records.';
      setDataError(message);
      toast.error(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setDataRefreshing(false);
      }
    }
  }

  const metrics = useMemo(() => (config ? buildOperationalMetrics(records, config) : []), [records, config]);

  const metricValueByLabel = useMemo(() => {
    return new Map(metrics.map((metric) => [metric.label, metric.value]));
  }, [metrics]);

  const stageDistribution = useMemo(() => {
    if (!config) {
      return [] as Array<{ id: string; name: string; count: number; color: string }>;
    }

    const counts = new Map<string, number>();
    for (const record of records) {
      const stageId = record.stage_id ?? 'unstaged';
      counts.set(stageId, (counts.get(stageId) ?? 0) + 1);
    }

    const stages = config.pipelines
      .flatMap((pipeline) => pipeline.stages)
      .sort((left, right) => left.position - right.position)
      .map((stage) => ({
        id: stage.id,
        name: stage.name,
        count: counts.get(stage.id) ?? 0,
        color: stage.color ?? '#64748b',
      }));

    const unstagedCount = counts.get('unstaged') ?? 0;
    if (unstagedCount > 0) {
      stages.push({
        id: 'unstaged',
        name: 'Unstaged',
        count: unstagedCount,
        color: '#94a3b8',
      });
    }

    return stages.filter((item) => item.count > 0);
  }, [config, records]);

  const sourceDistribution = useMemo(() => {
    if (!config) {
      return [] as Array<{ name: string; count: number }>;
    }

    const counts = new Map<string, number>();

    for (const record of records) {
      const sourceName = getSourceName(config, record.source_id, record.imported_from);
      counts.set(sourceName, (counts.get(sourceName) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8);
  }, [config, records]);

  const statusDistribution = useMemo(() => {
    const counts = new Map<string, number>();

    for (const record of records) {
      const rawStatus = record.status?.trim();
      const statusName = rawStatus && rawStatus.length > 0
        ? rawStatus
            .split('_')
            .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
            .join(' ')
        : 'Unspecified';

      counts.set(statusName, (counts.get(statusName) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 7);
  }, [records]);

  const followUps = useMemo(() => {
    return records
      .map((record) => {
        const summary = getRecordFollowUpSummary(record);
        const dueAt = record.next_follow_up_at ? new Date(record.next_follow_up_at).getTime() : Number.POSITIVE_INFINITY;

        return {
          record,
          summary,
          dueAt,
        };
      })
      .filter((item) => item.summary.tone !== 'none' || (item.record.open_task_count ?? 0) > 0)
      .sort((left, right) => left.dueAt - right.dueAt)
      .slice(0, 8);
  }, [records]);

  const recentActivity = useMemo(() => {
    return [...records]
      .sort((left, right) => {
        const leftTime = new Date(left.last_activity_at ?? left.updated_at).getTime();
        const rightTime = new Date(right.last_activity_at ?? right.updated_at).getTime();
        return rightTime - leftTime;
      })
      .slice(0, 8);
  }, [records]);

  const effectiveTotalRecords = totalRecords > 0 ? totalRecords : records.length;

  const metricCards = useMemo(
    () => [
      {
        label: 'Total records',
        value: effectiveTotalRecords,
        hint: 'All active records in this workspace.',
        icon: BarChart3,
        accent: 'from-sky-500/20 via-blue-500/10 to-transparent',
      },
      {
        label: 'Open records',
        value: metricValueByLabel.get('Open records') ?? 0,
        hint: 'Still in active outreach stages.',
        icon: Activity,
        accent: 'from-indigo-500/20 via-violet-500/10 to-transparent',
      },
      {
        label: 'Follow-ups due today',
        value: metricValueByLabel.get('Follow-ups due today') ?? 0,
        hint: 'Needs action before end of day.',
        icon: CalendarDays,
        accent: 'from-amber-500/24 via-orange-400/14 to-transparent',
      },
      {
        label: 'Updated today',
        value: metricValueByLabel.get('Updated today') ?? 0,
        hint: 'Touched by your team today.',
        icon: RefreshCw,
        accent: 'from-cyan-500/20 via-teal-500/10 to-transparent',
      },
      {
        label: 'Closed this week',
        value: metricValueByLabel.get('Closed this week') ?? 0,
        hint: 'Records moved to closed outcomes.',
        icon: CheckCircle2,
        accent: 'from-emerald-500/20 via-teal-500/12 to-transparent',
      },
      {
        label: 'Stale records',
        value: metricValueByLabel.get('Stale records') ?? 0,
        hint: 'No activity for at least 7 days.',
        icon: Timer,
        accent: 'from-rose-500/20 via-orange-500/12 to-transparent',
      },
    ],
    [effectiveTotalRecords, metricValueByLabel],
  );

  if (!session || !workspace) {
    return <FullPageLoader label="Loading workspace dashboard..." />;
  }

  return (
    <WorkspaceLayout
      workspace={workspace}
      onSignOut={handleSignOut}
      mainBackgroundClassName="bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.26),transparent_45%),radial-gradient(circle_at_82%_12%,rgba(153,246,228,0.24),transparent_46%),#eef2f8]"
    >
      <div className="space-y-5">
        <Card className="relative overflow-hidden border border-[#dbe6f5] bg-[linear-gradient(145deg,#ffffff_0%,#f5fbff_50%,#f0f7ff_100%)] p-5 shadow-[0_24px_55px_-36px_rgba(15,23,42,0.55)] sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18)_0%,rgba(56,189,248,0)_72%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.12)_0%,rgba(34,197,94,0)_72%)]"
          />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Command Center</div>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Dashboard overview
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Track record velocity, follow-up pressure, and stage health from one place.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              
                {isTruncated ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">
                    Showing the latest {numberFormatter.format(records.length)} records
                  </span>
                ) : null}
                {configRefreshing ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-700">
                    Updating workspace config...
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={dataRefreshing || dataLoading}
                className={buttonStyles('secondary', 'md')}
              >
                <RefreshCw className={`h-4 w-4 ${dataRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link to="/imports" className={buttonStyles('secondary', 'md')}>
                <Download className="h-4 w-4" />
                Import CSV
              </Link>
              <Link to="/records" className={buttonStyles('primary', 'md')}>
                <ArrowUpRight className="h-4 w-4" />
                Open records queue
              </Link>
            </div>
          </div>
        </Card>

        {configError ? (
          <Card className="border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">{configError}</Card>
        ) : null}

        {dataError ? (
          <Card className="border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">{dataError}</Card>
        ) : null}

        {configLoading || dataLoading || !config ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SectionSkeleton title="Loading metrics" rows={3} />
            <SectionSkeleton title="Loading stage health" rows={4} />
            <SectionSkeleton title="Loading activity" rows={4} />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {metricCards.map((card) => {
                const Icon = card.icon;

                return (
                  <Card
                    key={card.label}
                    className="relative overflow-hidden border border-[#d7e4f2] bg-[linear-gradient(148deg,#ffffff_0%,#f7fbff_70%,#f2f8ff_100%)] p-5"
                  >
                    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent}`} />
                    <div className="relative flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
                        <p className="mt-3 font-display text-3xl font-semibold text-slate-900">
                          {numberFormatter.format(card.value)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/80 p-2.5 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.55)]">
                        <Icon className="h-4 w-4 text-slate-600" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="grid gap-4 xl:grid-cols-12">
              <Card className="border border-[#d7e4f2] bg-white/95 p-5 xl:col-span-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-slate-900">Pipeline stage health</h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {stageDistribution.length} stages
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {stageDistribution.length > 0 ? (
                    stageDistribution.map((stage) => {
                      const percent = effectiveTotalRecords > 0 ? Math.round((stage.count / effectiveTotalRecords) * 100) : 0;

                      return (
                        <div key={stage.id} className="rounded-2xl border border-slate-200/85 bg-slate-50/55 p-3">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
                              <span className="truncate font-medium text-slate-700">{stage.name}</span>
                            </div>
                            <span className="font-semibold text-slate-700">{numberFormatter.format(stage.count)}</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/80">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: stage.color }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="rounded-xl border border-slate-200 bg-slate-50/75 p-3 text-sm text-slate-500">
                      No staged records available yet.
                    </p>
                  )}
                </div>
              </Card>

              <Card className="border border-[#d7e4f2] bg-white/95 p-5 xl:col-span-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-slate-900">Source performance</h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">
                    <Activity className="h-3.5 w-3.5" />
                    Top sources
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  {sourceDistribution.length > 0 ? (
                    sourceDistribution.map((source) => {
                      const percent = effectiveTotalRecords > 0 ? Math.round((source.count / effectiveTotalRecords) * 100) : 0;

                      return (
                        <div key={source.name} className="rounded-2xl border border-slate-200/90 bg-slate-50/60 px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate font-medium text-slate-700">{source.name}</span>
                            <span className="whitespace-nowrap font-semibold text-slate-700">
                              {numberFormatter.format(source.count)} · {percent}%
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="rounded-xl border border-slate-200 bg-slate-50/75 p-3 text-sm text-slate-500">
                      Import or create records to see source split.
                    </p>
                  )}
                </div>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-12">
              <Card className="border border-[#d7e4f2] bg-white/95 p-5 xl:col-span-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-slate-900">Priority follow-ups</h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Next actions
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  {followUps.length > 0 ? (
                    followUps.map((item) => {
                      const stageLabel = config ? getStageName(config, item.record.stage_id) : 'Unstaged';

                      return (
                        <Link
                          key={item.record.id}
                          to={`/records/${item.record.id}`}
                          className="block rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 transition hover:border-sky-200 hover:bg-sky-50/45"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-slate-800">{buildDisplayName(item.record)}</p>
                            <span className="text-xs text-slate-500">{stageLabel}</span>
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">{item.summary.taskTitle}</p>
                          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-600">{item.summary.label}</span>
                            <span className="text-slate-500">{formatFollowUpDateTime(item.record.next_follow_up_at)}</span>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <p className="rounded-xl border border-slate-200 bg-slate-50/75 p-3 text-sm text-slate-500">
                      No pending follow-up tasks found.
                    </p>
                  )}
                </div>
              </Card>

              <Card className="border border-[#d7e4f2] bg-white/95 p-5 xl:col-span-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-slate-900">Recent record activity</h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    Live feed
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((record) => (
                      <Link
                        key={record.id}
                        to={`/records/${record.id}`}
                        className="block rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 transition hover:border-cyan-200 hover:bg-cyan-50/45"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-800">{buildDisplayName(record)}</p>
                          <span className="text-xs text-slate-500">{formatRelativeDateTime(record.last_activity_at ?? record.updated_at)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span>{formatActivityLabel(record.last_activity_type)}</span>
                          <span>{record.open_task_count ?? 0} open tasks</span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="rounded-xl border border-slate-200 bg-slate-50/75 p-3 text-sm text-slate-500">
                      Activity appears here as records are updated.
                    </p>
                  )}
                </div>
              </Card>
            </div>

            <Card className="border border-[#d7e4f2] bg-white/95 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-display text-xl font-semibold text-slate-900">Status distribution</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Snapshot
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {statusDistribution.length > 0 ? (
                  statusDistribution.map((status) => (
                    <div
                      key={status.name}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
                    >
                      <span className="font-medium">{status.name}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                        {numberFormatter.format(status.count)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No status data yet.</p>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}
