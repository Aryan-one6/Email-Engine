import { useState } from 'react';
import type { CrmWorkspaceConfig, RecordSaveInput, RecordSummary } from '../../lib/crm-types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

interface RecordFormProps {
  workspaceId: string;
  config: CrmWorkspaceConfig;
  initialRecord?: RecordSummary | null;
  initialCustom?: Record<string, unknown>;
  submitLabel: string;
  onSubmit: (payload: RecordSaveInput) => Promise<void>;
}

const LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'email_sent', label: 'Email sent' },
  { value: 'mobile_contacted', label: 'Mobile contacted' },
  { value: 'replied', label: 'Replied' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not interested' },
];

type RecordFormCoreState = {
  title: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  source_id: string | null;
  status: string | null;
};

export function RecordForm({
  workspaceId,
  config,
  initialRecord,
  submitLabel,
  onSubmit,
}: RecordFormProps) {
  const defaultStatus = LEAD_STATUS_OPTIONS.some((option) => option.value === (initialRecord?.status ?? ''))
    ? initialRecord?.status
    : null;
  const [core, setCore] = useState<RecordFormCoreState>({
    title: initialRecord?.title ?? '',
    full_name: initialRecord?.full_name ?? null,
    company_name: initialRecord?.company_name ?? null,
    email: initialRecord?.email ?? null,
    phone: initialRecord?.phone ?? null,
    source_id: initialRecord?.source_id ?? null,
    status: defaultStatus ?? 'new',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};

    if (!core.title.trim()) {
      nextErrors.title = 'Title is required.';
    }

    if (core.email && !/\S+@\S+\.\S+/.test(core.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit({
        workspace_id: workspaceId,
        core,
        custom: {},
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="rounded-[24px] border border-indigo-200 bg-[#EEF2FF] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-accent-blue">Lead form</div>
              <h3 className="mt-2 font-display text-3xl text-slate-900">
                {initialRecord ? 'Update lead' : 'Create lead'}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700">
                Keep it simple: add only the lead details needed for email marketing.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-700">
              <span className="rounded-full border border-indigo-200 bg-white px-3 py-1">
                {LEAD_STATUS_OPTIONS.length} statuses
              </span>
              <span className="rounded-full border border-indigo-200 bg-white px-3 py-1">
                {config.sources.length} sources
              </span>
            </div>
          </div>
        </div>

        {Object.keys(errors).length > 0 ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Fix the highlighted fields before saving this record.
          </div>
        ) : null}

        <section className="space-y-4 rounded-[24px] border border-slate-300 bg-white p-5">
          <div>
            <h4 className="font-display text-2xl text-slate-900">Lead details</h4>
            <p className="mt-1 text-sm text-slate-600">Basic title and contact information for your lead list.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Title"
              value={core.title}
              onChange={(event) => setCore((current) => ({ ...current, title: event.target.value }))}
              error={errors.title}
              placeholder="Lead title or summary"
            />
            <Input
              label="Full name"
              value={core.full_name ?? ''}
              onChange={(event) => setCore((current) => ({ ...current, full_name: event.target.value || null }))}
              placeholder="Primary contact"
            />
            <Input
              label="Company"
              value={core.company_name ?? ''}
              onChange={(event) => setCore((current) => ({ ...current, company_name: event.target.value || null }))}
              placeholder="Company or brand"
            />
            <Input
              label="Email"
              type="email"
              value={core.email ?? ''}
              onChange={(event) => setCore((current) => ({ ...current, email: event.target.value || null }))}
              error={errors.email}
              placeholder="lead@example.com"
            />
            <Input
              label="Phone"
              value={core.phone ?? ''}
              onChange={(event) => setCore((current) => ({ ...current, phone: event.target.value || null }))}
              placeholder="+1 555 010 1234"
            />
            <label className="flex w-full flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium">Source</span>
              <select
                value={core.source_id ?? ''}
                onChange={(event) => setCore((current) => ({ ...current, source_id: event.target.value || null }))}
                className="h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900"
              >
                <option value="">Select source</option>
                {config.sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-[24px] border border-slate-300 bg-white p-5">
          <div>
            <h4 className="font-display text-2xl text-slate-900">Lead status</h4>
            <p className="mt-1 text-sm text-slate-600">Track contact progress for email follow-up.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex w-full flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium">Status</span>
              <select
                value={core.status ?? ''}
                onChange={(event) => setCore((current) => ({ ...current, status: event.target.value || null }))}
                className="h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900"
              >
                {LEAD_STATUS_OPTIONS.map((statusOption) => (
                  <option key={statusOption.value} value={statusOption.value}>
                    {statusOption.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" loading={submitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
