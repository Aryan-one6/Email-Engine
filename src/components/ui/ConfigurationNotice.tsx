import { AlertTriangle } from 'lucide-react';

export function ConfigurationNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div>
          <p className="font-semibold">Appwrite env vars are not configured yet.</p>
          <p className="mt-1 text-amber-700">
            Add <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">VITE_APPWRITE_ENDPOINT</code>{' '}
            and{' '}
            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">VITE_APPWRITE_PROJECT_ID</code>{' '}
            to enable sign in, sign up, and dashboard routing.
          </p>
        </div>
      </div>
    </div>
  );
}
