import { ArrowRight, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HomeFooter } from '../components/home/HomeFooter';
import { HomeNavbar } from '../components/home/HomeNavbar';
import { getPublishedBlogs, type BlogPostSummary } from '../lib/blog-service';

const titleClampStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical' as const,
  overflow: 'hidden',
};

const excerptClampStyle = {
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical' as const,
  overflow: 'hidden',
};

function formatPublishedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unscheduled';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function BlogCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-card">
      <div className="h-44 animate-pulse bg-slate-200/80" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-200/80" />
        <div className="h-6 w-[85%] animate-pulse rounded bg-slate-200/80" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-200/70" />
        <div className="h-4 w-[72%] animate-pulse rounded bg-slate-200/70" />
      </div>
    </div>
  );
}

export function BlogsPage() {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getPublishedBlogs();
        if (!mounted) {
          return;
        }
        setPosts(result);
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        const message = loadError instanceof Error ? loadError.message : 'Failed to load blogs.';
        setError(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#c7d2fe_0%,_#e2e8f0_34%,_#f8fafc_62%,_#eef2ff_100%)]">
      <HomeNavbar />

      <main className="section-shell pb-16 pt-10 sm:pt-14">
        <section className="rounded-3xl border border-slate-300/80 bg-white/75 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">Insights</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-5xl">
            Email Intelligence Blog
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700 sm:text-base">
            Product updates, automation playbooks, and growth execution strategies from our team.
          </p>
        </section>

        <section className="mt-8">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <BlogCardSkeleton key={index} />
              ))}
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-card">
              <p className="font-semibold">Unable to load blogs</p>
              <p className="mt-2 text-sm">{error}</p>
            </div>
          ) : null}

          {!loading && !error && posts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-10 text-center shadow-card">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <FileText className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-slate-900">No blogs published yet</h2>
              <p className="mt-2 text-sm text-slate-600">Publish posts in Sanity Studio and they will appear here.</p>
            </div>
          ) : null}

          {!loading && !error && posts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/85 shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(15,23,42,0.2)]"
                >
                  <Link to={`/blogs/${post.slug}`} className="block">
                    <div className="relative h-44 overflow-hidden bg-slate-200/70">
                      {post.imageUrl ? (
                        <img
                          src={`${post.imageUrl}?auto=format&fit=crop&w=1000&h=560`}
                          alt={post.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-sky-100 text-slate-500">
                          <FileText className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
                        {formatPublishedDate(post.publishedAt)}
                      </p>
                      <h2 className="text-xl font-semibold leading-snug text-slate-900" style={titleClampStyle}>
                        {post.title}
                      </h2>
                      <p className="text-sm leading-6 text-slate-600" style={excerptClampStyle}>
                        {post.excerpt?.trim() || 'Read this post for practical guidance and updates.'}
                      </p>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700">
                        Read post
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}
