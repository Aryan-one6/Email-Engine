import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Forward,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  Reply,
  Search,
  Sparkles,
  Timer,
  Trash2,
  TrendingUp,
  Archive,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { WorkspaceLayout } from '../components/dashboard/WorkspaceLayout';
import { FullPageLoader } from '../components/ui/FullPageLoader';
import { useAuth } from '../hooks/useAuth';
import { useCrmWorkspace } from '../hooks/useCrmWorkspace';
import { listWorkspaceRecords } from '../lib/crm-service';
import type { RecordListQuery, RecordSummary } from '../lib/crm-types';
import {
  buildOperationalMetrics,
  formatRelativeDateTime,
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
  return record.title?.trim() || record.full_name?.trim() || record.company_name?.trim() || record.email?.trim() || 'Untitled';
}

async function fetchDashboardRecords(sessionToken: Parameters<typeof listWorkspaceRecords>[0], workspaceId: string): Promise<DashboardRecordsSnapshot> {
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
    const pageResult = await listWorkspaceRecords(sessionToken, { ...baseQuery, page, pageSize: DASHBOARD_PAGE_SIZE });
    if (page === 1) totalRecords = pageResult.total;
    allRecords.push(...pageResult.items);
    if (!pageResult.hasNextPage) return { records: allRecords, totalRecords, truncated: false };
    page += 1;
  }

  return { records: allRecords, totalRecords, truncated: true };
}

/* ─── Static campaign inbox data (mirrors landing page InboxMockup) ──────── */

const inboxCampaigns = [
  { id: '1', from: 'Onboarding Sequence', subject: 'Welcome to Email Engine — Day 1', preview: '3,240 sent · 68% open · 24% clicked', time: '9:41 AM', unread: true, active: true, tag: 'Active', tagColor: '#00d2ff', openRate: '68%', clickRate: '24%', sent: '3,240' },
  { id: '2', from: 'Product Update', subject: 'New AI features just shipped 🚀', preview: '12,480 sent · 52% open · 18% clicked', time: '8:12 AM', unread: true, active: false, tag: 'Active', tagColor: '#00d2ff', openRate: '52%', clickRate: '18%', sent: '12,480' },
  { id: '3', from: 'Re-engagement', subject: "We miss you — here's what's new", preview: '5,600 sent · 41% open · 9% clicked', time: 'Yesterday', unread: false, active: false, tag: 'Completed', tagColor: '#10b981', openRate: '41%', clickRate: '9%', sent: '5,600' },
  { id: '4', from: 'Follow-up Sequence', subject: 'Did you get a chance to check in?', preview: '890 queued · Auto-sends in 2h 14m', time: 'Yesterday', unread: false, active: false, tag: 'Queued', tagColor: '#f59e0b', openRate: '—', clickRate: '—', sent: '890' },
  { id: '5', from: 'Weekly Digest', subject: 'Your team sent 42 emails this week', preview: '12 sequences active · 3 paused', time: 'Mon', unread: false, active: false, tag: 'Report', tagColor: '#A4F4FD', openRate: '—', clickRate: '—', sent: '—' },
  { id: '6', from: 'Cold Outreach v4', subject: 'Template approved by team', preview: 'Sarah approved your template edit.', time: 'Mon', unread: false, active: false, tag: 'Template', tagColor: '#a78bfa', openRate: '—', clickRate: '—', sent: '—' },
];

/* ─── Dark metric card ───────────────────────────────────────────────────── */

function MetricCard({ label, value, hint, icon: Icon, glow }: { label: string; value: number | string; hint: string; icon: React.ComponentType<{ className?: string }>; glow: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
      <div className="absolute inset-0 pointer-events-none" style={{ background: glow }} />
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{typeof value === 'number' ? numberFormatter.format(value) : value}</p>
          <p className="mt-1 text-xs text-white/40">{hint}</p>
        </div>
        <div className="w-8 h-8 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-white/50" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main DashboardPage ─────────────────────────────────────────────────── */

export function DashboardPage() {
  const navigate = useNavigate();
  const { session, workspace, signOut } = useAuth();
  const { config, configLoading } = useCrmWorkspace();
  const workspaceId = workspace?.id ?? null;
  const requestIdRef = useRef(0);

  const [records, setRecords] = useState<RecordSummary[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataRefreshing, setDataRefreshing] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(inboxCampaigns[0]);

  useEffect(() => {
    if (!session || !workspaceId) return;
    const requestId = ++requestIdRef.current;
    setDataLoading(true);

    void fetchDashboardRecords(session, workspaceId)
      .then((snapshot) => {
        if (requestId !== requestIdRef.current) return;
        setRecords(snapshot.records);
        setTotalRecords(snapshot.totalRecords);
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        toast.error(err instanceof Error ? err.message : 'Failed to load dashboard.');
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setDataLoading(false);
      });
  }, [session, workspaceId]);

  async function handleSignOut() {
    await signOut();
    toast.success('Signed out.');
    navigate('/signin', { replace: true });
  }

  async function handleRefresh() {
    if (!session || !workspaceId) return;
    const requestId = ++requestIdRef.current;
    setDataRefreshing(true);
    try {
      const snapshot = await fetchDashboardRecords(session, workspaceId);
      if (requestId !== requestIdRef.current) return;
      setRecords(snapshot.records);
      setTotalRecords(snapshot.totalRecords);
      toast.success('Dashboard refreshed.');
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      toast.error(err instanceof Error ? err.message : 'Refresh failed.');
    } finally {
      if (requestId === requestIdRef.current) setDataRefreshing(false);
    }
  }

  const metrics = useMemo(() => (config ? buildOperationalMetrics(records, config) : []), [records, config]);
  const metricValueByLabel = useMemo(() => new Map(metrics.map((m) => [m.label, m.value])), [metrics]);
  const effectiveTotalRecords = totalRecords > 0 ? totalRecords : records.length;

  const recentActivity = useMemo(() =>
    [...records]
      .sort((a, b) => new Date(b.last_activity_at ?? b.updated_at).getTime() - new Date(a.last_activity_at ?? a.updated_at).getTime())
      .slice(0, 6),
    [records]
  );

  const metricCards = [
    { label: 'Total Records', value: effectiveTotalRecords, hint: 'All active records', icon: BarChart3, glow: 'radial-gradient(circle at 0% 0%, rgba(0,210,255,0.07), transparent 60%)' },
    { label: 'Open Records', value: metricValueByLabel.get('Open records') ?? 0, hint: 'Active outreach stages', icon: Activity, glow: 'radial-gradient(circle at 0% 0%, rgba(164,244,253,0.07), transparent 60%)' },
    { label: 'Follow-ups Today', value: metricValueByLabel.get('Follow-ups due today') ?? 0, hint: 'Needs action today', icon: CalendarDays, glow: 'radial-gradient(circle at 0% 0%, rgba(245,158,11,0.07), transparent 60%)' },
    { label: 'Updated Today', value: metricValueByLabel.get('Updated today') ?? 0, hint: 'Touched by your team', icon: RefreshCw, glow: 'radial-gradient(circle at 0% 0%, rgba(16,185,129,0.07), transparent 60%)' },
    { label: 'Closed This Week', value: metricValueByLabel.get('Closed this week') ?? 0, hint: 'Records closed', icon: CheckCircle2, glow: 'radial-gradient(circle at 0% 0%, rgba(16,185,129,0.07), transparent 60%)' },
    { label: 'Stale Records', value: metricValueByLabel.get('Stale records') ?? 0, hint: 'No activity 7+ days', icon: Timer, glow: 'radial-gradient(circle at 0% 0%, rgba(239,68,68,0.07), transparent 60%)' },
  ];

  if (!session || !workspace) {
    return <FullPageLoader label="Loading workspace…" />;
  }

  return (
    <WorkspaceLayout workspace={workspace} onSignOut={handleSignOut}>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#00d2ff] font-semibold">Email Engine</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Dashboard</h1>
            <p className="mt-0.5 text-sm text-white/40">Campaigns, records, and activity — from one place.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={dataRefreshing || dataLoading}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${dataRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link to="/imports" className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
              <Download className="h-3.5 w-3.5" />
              Import CSV
            </Link>
            <Link to="/email" className="flex items-center gap-1.5 rounded-xl bg-white text-black font-semibold text-xs px-4 py-2 transition hover:bg-white/90">
              <Sparkles className="h-3.5 w-3.5" />
              New Campaign
            </Link>
          </div>
        </div>

        {/* ── Metrics grid ── */}
        {!configLoading && !dataLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {metricCards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </div>
        )}
        {(configLoading || dataLoading) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 h-28 animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Campaign Inbox (main section) ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Campaign Inbox</h2>
            <Link to="/email" className="text-xs text-white/40 hover:text-white transition-colors">View all →</Link>
          </div>

          {/* Inbox container — mirrors landing page InboxMockup */}
          <div
            className="relative rounded-2xl overflow-hidden border border-white/10"
            style={{ background: 'rgba(14,16,20,0.9)', backdropFilter: 'blur(24px)' }}
          >
            {/* Title bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                <span className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                <span className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
              </div>
              <span className="text-xs text-white/40">Email Engine — Campaigns</span>
              <div className="w-14" />
            </div>

            <div className="grid grid-cols-12 h-[480px]">
              {/* Campaign list */}
              <div className="col-span-12 md:col-span-5 border-r border-white/[0.07] flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.07]">
                  <Search className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-xs text-white/30">Search campaigns</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {inboxCampaigns.map((campaign) => (
                    <button
                      key={campaign.id}
                      onClick={() => setSelectedCampaign(campaign)}
                      className={`w-full text-left px-3 py-3 border-b border-white/[0.05] transition-colors ${
                        selectedCampaign.id === campaign.id ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <span className={`text-xs font-semibold truncate ${campaign.unread ? 'text-white' : 'text-white/60'}`}>
                          {campaign.from}
                        </span>
                        <span className="text-[10px] text-white/30 flex-shrink-0">{campaign.time}</span>
                      </div>
                      <p className={`text-[11px] truncate mb-0.5 ${campaign.unread ? 'text-white/80' : 'text-white/50'}`}>
                        {campaign.subject}
                      </p>
                      <p className="text-[11px] text-white/30 truncate">{campaign.preview}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Campaign detail */}
              <div className="hidden md:flex md:col-span-7 flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center gap-1 px-4 py-2 border-b border-white/[0.07]">
                  {[Reply, Forward, Archive, Trash2].map((Icon, i) => (
                    <button key={i} className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center transition-colors">
                      <Icon className="w-3.5 h-3.5 text-white/40" />
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center">
                    <MoreHorizontal className="w-3.5 h-3.5 text-white/40" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                  <h2 className="text-sm font-semibold text-white">{selectedCampaign.subject}</h2>

                  {/* Sender row */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00d2ff] to-[#0B2551] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                      {selectedCampaign.from.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{selectedCampaign.from}</span>
                        <span className="text-[10px] text-white/40">{selectedCampaign.time}</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 flex-shrink-0" style={{ color: selectedCampaign.tagColor, borderColor: `${selectedCampaign.tagColor}30` }}>
                      {selectedCampaign.tag}
                    </span>
                  </div>

                  {/* AI insight card */}
                  <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3.5 h-3.5" style={{ color: '#A4F4FD' }} />
                      <span className="text-[11px] font-semibold text-white/80">AI Insights</span>
                    </div>
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      {selectedCampaign.sent !== '—'
                        ? `${selectedCampaign.sent} sent · ${selectedCampaign.openRate} open rate · ${selectedCampaign.clickRate} click rate. ${Number(selectedCampaign.openRate) > 60 ? 'Open rate is above baseline — strong subject line.' : 'Consider A/B testing the subject line.'}`
                        : 'No send data available for this item yet.'}
                    </p>
                  </div>

                  {/* Stats */}
                  {selectedCampaign.sent !== '—' && (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Sent', value: selectedCampaign.sent },
                        { label: 'Opened', value: selectedCampaign.openRate },
                        { label: 'Clicked', value: selectedCampaign.clickRate },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
                          <p className="text-sm font-semibold text-white">{value}</p>
                          <p className="text-[10px] text-white/40 mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Body */}
                  <div className="text-[12px] text-white/60 leading-relaxed space-y-2">
                    <p>This campaign is part of your <span className="text-white/80 font-medium">{selectedCampaign.from}</span> flow.</p>
                    <p>Recipients receive this message based on their enrollment trigger. You can edit the template, adjust the send delay, or pause the sequence from the Email page.</p>
                    <p className="text-white/40">— Email Engine</p>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] w-fit">
                    <Paperclip className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-[11px] text-white/60">campaign-report.pdf</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom row: recent activity + stage health ── */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Recent record activity */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
              <span className="flex items-center gap-1 text-[10px] text-white/30">
                <Clock3 className="h-3 w-3" /> Live feed
              </span>
            </div>
            <div className="space-y-2">
              {recentActivity.length > 0 ? (
                recentActivity.map((record) => (
                  <Link
                    key={record.id}
                    to={`/records/${record.id}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 hover:bg-white/[0.05] hover:border-white/10 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{buildDisplayName(record)}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">{record.open_task_count ?? 0} open tasks</p>
                    </div>
                    <span className="text-[10px] text-white/30 flex-shrink-0">{formatRelativeDateTime(record.last_activity_at ?? record.updated_at)}</span>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-center">
                  <p className="text-xs text-white/30">Activity appears as records are updated.</p>
                </div>
              )}
            </div>
          </div>

          {/* Campaign performance summary */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Campaign Performance</h2>
              <span className="flex items-center gap-1 text-[10px] text-white/30">
                <TrendingUp className="h-3 w-3" /> This week
              </span>
            </div>
            <div className="space-y-2">
              {inboxCampaigns.filter(c => c.sent !== '—').map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white/80 truncate">{campaign.from}</p>
                    <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: campaign.openRate !== '—' ? campaign.openRate : '0%', background: 'linear-gradient(to right, #00d2ff, #A4F4FD)' }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-white">{campaign.openRate}</p>
                    <p className="text-[10px] text-white/30">open rate</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </WorkspaceLayout>
  );
}
