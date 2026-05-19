import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { FullPageLoader } from '../components/ui/FullPageLoader';
import { CrmWorkspaceRoute } from './CrmWorkspaceRoute';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';

const HomePage = lazy(async () => import('../pages/HomePage').then((module) => ({ default: module.HomePage })));
const SignInPage = lazy(async () => import('../pages/SignInPage').then((module) => ({ default: module.SignInPage })));
const SignUpPage = lazy(async () => import('../pages/SignUpPage').then((module) => ({ default: module.SignUpPage })));
const InviteAcceptPage = lazy(async () =>
  import('../pages/InviteAcceptPage').then((module) => ({ default: module.InviteAcceptPage })),
);
const CompleteOnboardingPage = lazy(async () =>
  import('../pages/CompleteOnboardingPage').then((module) => ({ default: module.CompleteOnboardingPage })),
);
const AccountPage = lazy(async () => import('../pages/AccountPage').then((module) => ({ default: module.AccountPage })));
const EmailPage = lazy(async () => import('../pages/EmailPage').then((module) => ({ default: module.EmailPage })));
const EmailTemplatesPage = lazy(async () =>
  import('../pages/EmailTemplatesPage').then((module) => ({ default: module.EmailTemplatesPage })),
);
const ImportsPage = lazy(async () => import('../pages/ImportsPage').then((module) => ({ default: module.ImportsPage })));
const RecordsPage = lazy(async () => import('../pages/RecordsPage').then((module) => ({ default: module.RecordsPage })));
const RecordCreatePage = lazy(async () =>
  import('../pages/RecordCreatePage').then((module) => ({ default: module.RecordCreatePage })),
);
const RecordDetailPage = lazy(async () =>
  import('../pages/RecordDetailPage').then((module) => ({ default: module.RecordDetailPage })),
);
const RecordFormBuilderPage = lazy(async () =>
  import('../pages/RecordFormBuilderPage').then((module) => ({ default: module.RecordFormBuilderPage })),
);
const TeamPage = lazy(async () => import('../pages/TeamPage').then((module) => ({ default: module.TeamPage })));

function withPageLoader(children: ReactNode, variant: 'app' | 'auth' = 'app') {
  return <Suspense fallback={<FullPageLoader variant={variant} />}>{children}</Suspense>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={withPageLoader(<HomePage />)} />
      <Route path="/invite/accept" element={withPageLoader(<InviteAcceptPage />, 'auth')} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/signin" element={withPageLoader(<SignInPage />)} />
        <Route path="/signup" element={withPageLoader(<SignUpPage />, 'auth')} />
      </Route>

      <Route element={<ProtectedRoute allowWithoutWorkspace />}>
        <Route path="/onboarding/complete" element={withPageLoader(<CompleteOnboardingPage />)} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Navigate to="/email" replace />} />
        <Route path="/dashboard/:crmType" element={<Navigate to="/email" replace />} />

        <Route element={<CrmWorkspaceRoute />}>
          <Route path="/account" element={withPageLoader(<AccountPage />)} />
          <Route path="/team" element={withPageLoader(<TeamPage />)} />
          <Route path="/email" element={withPageLoader(<EmailPage />)} />
          <Route path="/email/templates" element={withPageLoader(<EmailTemplatesPage />)} />
          <Route path="/records" element={withPageLoader(<RecordsPage />)} />
          <Route path="/records/new" element={withPageLoader(<RecordCreatePage />)} />
          <Route path="/records/:recordId" element={withPageLoader(<RecordDetailPage />)} />
          <Route path="/records/form-builder" element={withPageLoader(<RecordFormBuilderPage />)} />
          <Route path="/imports" element={withPageLoader(<ImportsPage />)} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/email" replace />} />
    </Routes>
  );
}
