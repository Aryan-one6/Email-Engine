import lottie, { type AnimationItem } from 'lottie-web';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type LoaderVariant = 'app' | 'auth';

interface FullPageLoaderProps {
  label?: string;
  variant?: LoaderVariant;
}

function LottieLoader({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let animation: AnimationItem | null = null;
    let cancelled = false;
    const controller = new AbortController();

    void fetch('/Email_Loader.json', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Unable to load loader animation.');
        }

        return (await response.json()) as Record<string, unknown>;
      })
      .then((data) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        animation = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: data,
          rendererSettings: {
            preserveAspectRatio: 'xMidYMid meet',
          },
        });

        setHasError(false);
      })
      .catch(() => {
        if (!cancelled) {
          setHasError(true);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
      animation?.destroy();
    };
  }, []);

  if (hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-transparent text-sky-500">
        <LoaderCircle className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}

export function FullPageLoader({ label = 'Loading Email Intelligence...', variant = 'app' }: FullPageLoaderProps) {
  if (variant === 'auth') {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-transparent px-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <div className="h-48 w-48 sm:h-42 sm:w-42">
            <LottieLoader className="h-full w-full" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-display text-xl font-semibold text-slate-900/95">Preparing your workspace</h1>
            <p className="text-sm text-slate-600">{label}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-transparent px-4">
      <div className="flex flex-col items-center">
        <div className="h-32 w-32 sm:h-36 sm:w-36">
          <LottieLoader className="h-full w-full" />
        </div>
        <div className="mt-1 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Email Intelligence</p>
          <p className="text-sm font-medium text-slate-700">{label}</p>
        </div>
      </div>
    </div>
  );
}
