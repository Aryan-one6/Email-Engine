const routePreloaders = [
  { match: (path: string) => path === '/', load: () => import('../pages/HomePage') },
  { match: (path: string) => path === '/blogs', load: () => import('../pages/BlogsPage') },
  { match: (path: string) => path.startsWith('/blogs/'), load: () => import('../pages/BlogDetailPage') },
  { match: (path: string) => path === '/signin', load: () => import('../pages/SignInPage') },
  { match: (path: string) => path === '/signup', load: () => import('../pages/SignUpPage') },
  { match: (path: string) => path === '/invite/accept', load: () => import('../pages/InviteAcceptPage') },
  { match: (path: string) => path === '/onboarding/complete', load: () => import('../pages/CompleteOnboardingPage') },
  { match: (path: string) => path === '/dashboard', load: () => import('../pages/DashboardPage') },
  { match: (path: string) => path.startsWith('/dashboard/'), load: () => import('../pages/DashboardPage') },
  { match: (path: string) => path === '/account', load: () => import('../pages/AccountPage') },
  { match: (path: string) => path === '/team', load: () => import('../pages/TeamPage') },
  { match: (path: string) => path === '/email', load: () => import('../pages/EmailPage') },
  { match: (path: string) => path === '/email/templates', load: () => import('../pages/EmailTemplatesPage') },
  { match: (path: string) => path === '/records', load: () => import('../pages/RecordsPage') },
  { match: (path: string) => path === '/records/new', load: () => import('../pages/RecordCreatePage') },
  { match: (path: string) => path === '/records/form-builder', load: () => import('../pages/RecordFormBuilderPage') },
  { match: (path: string) => path.startsWith('/records/'), load: () => import('../pages/RecordDetailPage') },
  { match: (path: string) => path === '/imports', load: () => import('../pages/ImportsPage') },
];

const preloadedRoutes = new Set<string>();

export function preloadRoute(path: string) {
  if (preloadedRoutes.has(path)) {
    return;
  }

  const loader = routePreloaders.find((entry) => entry.match(path))?.load;
  if (!loader) {
    return;
  }

  preloadedRoutes.add(path);
  void loader().catch(() => {
    preloadedRoutes.delete(path);
  });
}
