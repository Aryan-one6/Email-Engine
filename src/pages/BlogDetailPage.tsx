import { PortableText, type PortableTextComponents } from '@portabletext/react';
import { ArrowLeft, CalendarDays, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HomeFooter } from '../components/home/HomeFooter';
import { HomeNavbar } from '../components/home/HomeNavbar';
import { getBlogPostBySlug, type BlogPostDetail } from '../lib/blog-service';

const portableTextComponents: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="mt-5 text-base leading-8 text-slate-700">{children}</p>,
    h2: ({ children }) => <h2 className="mt-10 text-2xl font-semibold text-slate-900">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-8 text-xl font-semibold text-slate-900">{children}</h3>,
    blockquote: ({ children }) => (
      <blockquote className="mt-6 border-l-4 border-indigo-300 bg-indigo-50/70 px-4 py-3 text-slate-700">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700">{children}</ul>,
    number: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6 text-slate-700">{children}</ol>,
  },
  marks: {
    link: ({ children, value }) => {
      const href = typeof value?.href === 'string' ? value.href : '#';
      const isExternal = href.startsWith('http');

      return (
        <a
          href={href}
          className="font-medium text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-600"
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noreferrer noopener' : undefined}
        >
          {children}
        </a>
      );
    },
  },
};

function formatPublishedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unscheduled';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function BlogDetailPage() {
  const { slug = '' } = useParams();
  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!slug) {
        setError('Invalid post slug.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await getBlogPostBySlug(slug);
        if (!mounted) {
          return;
        }
        setPost(result);
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        const message = loadError instanceof Error ? loadError.message : 'Failed to load blog post.';
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
  }, [slug]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#c7d2fe_0%,_#e2e8f0_34%,_#f8fafc_62%,_#eef2ff_100%)]">
      <HomeNavbar />

      <main className="section-shell pb-16 pt-10 sm:pt-14">
        <Link
          to="/blogs"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white/80 px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blogs
        </Link>

        {loading ? (
          <div className="mt-6 space-y-5 rounded-3xl border border-slate-200 bg-white/85 p-8 shadow-card">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200/80" />
            <div className="h-10 w-[78%] animate-pulse rounded bg-slate-200/80" />
            <div className="h-[21rem] animate-pulse rounded-2xl bg-slate-200/80" />
            <div className="h-5 w-full animate-pulse rounded bg-slate-200/70" />
            <div className="h-5 w-[92%] animate-pulse rounded bg-slate-200/70" />
          </div>
        ) : null}

        {!loading && error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-card">
            <p className="font-semibold">Unable to load this blog post</p>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        ) : null}

        {!loading && !error && !post ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white/85 p-10 text-center shadow-card">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-slate-900">Post not found</h1>
            <p className="mt-2 text-sm text-slate-600">This post may be unpublished or the URL is incorrect.</p>
          </div>
        ) : null}

        {!loading && !error && post ? (
          <article className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white/88 shadow-[0_20px_45px_rgba(15,23,42,0.14)]">
            <div className="border-b border-slate-200/90 bg-gradient-to-r from-white via-slate-50 to-indigo-50/60 p-7 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">Blog</p>
              <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.02em] text-slate-900 sm:text-4xl">
                {post.title}
              </h1>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatPublishedDate(post.publishedAt)}
              </div>
            </div>

            {post.imageUrl ? (
              <div className="relative h-[18rem] w-full overflow-hidden bg-slate-200 sm:h-[26rem]">
                <img
                  src={`${post.imageUrl}?auto=format&fit=crop&w=1800&h=1000`}
                  alt={post.title}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
            ) : null}

            <div className="p-7 sm:p-10">
              <p className="text-base leading-8 text-slate-700">{post.excerpt}</p>
              {post.body.length > 0 ? <PortableText value={post.body} components={portableTextComponents} /> : null}
            </div>
          </article>
        ) : null}
      </main>

      <HomeFooter />
    </div>
  );
}
