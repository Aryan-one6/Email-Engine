// AuthLayout.tsx — dark cinematic design matching Email Engine landing page
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  leftPanel?: ReactNode;
  rightPanelClassName?: string;
  layoutVariant?: 'default' | 'signin';
}

function LogoMark({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" fill="white" className={className}>
      <path d="M 0 128 C 70.692 128 128 185.308 128 256 L 64 256 C 64 220.654 35.346 192 0 192 Z M 256 192 C 220.654 192 192 220.654 192 256 L 128 256 C 128 185.308 185.308 128 256 128 Z M 128 0 C 128 70.692 70.692 128 0 128 L 0 64 C 35.346 64 64 35.346 64 0 Z M 192 0 C 192 35.346 220.654 64 256 64 L 256 128 C 185.308 128 128 70.692 128 0 Z" />
    </svg>
  );
}

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
  rightPanelClassName: _rightPanelClassName,
  layoutVariant: _layoutVariant = 'default',
}: AuthLayoutProps) {
  return (
    <div
      className="relative min-h-screen w-screen overflow-hidden bg-[#0c0c0c] text-white"
      style={{ fontFamily: "'Inter', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased' }}
    >
      {/* Background video */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video
          autoPlay loop muted playsInline
          className="w-full h-full object-cover opacity-40 pointer-events-none"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4"
        />
        {/* Dark overlay to make form readable */}
        <div className="absolute inset-0 bg-[#0c0c0c]/70" />
      </div>

      {/* Subtle radial glow top-center */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,210,255,0.08), transparent)' }} />

      {/* Navbar */}
      <nav className="relative z-20 py-5 border-b border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <LogoMark className="w-7 h-7" />
            <span className="text-white font-semibold text-base tracking-tight">Email Engine</span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-white/50">
            <Link to="/features" className="hover:text-white transition-colors hidden sm:block">Features</Link>
            <Link to="/pricing" className="hover:text-white transition-colors hidden sm:block">Pricing</Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-10 flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {/* Glass card */}
          <div
            className="relative overflow-hidden rounded-3xl border border-white/10 p-8"
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(24px)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 32px 64px rgba(0,0,0,0.5)',
            }}
          >
            {/* Inner top glow */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Eyebrow */}
            <div className="mb-6">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-semibold uppercase tracking-widest text-white/50">
                {eyebrow}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold text-white tracking-tight leading-snug">
              {title}
            </h1>
            {description && (
              <p className="mt-2 text-sm text-white/50 leading-relaxed">{description}</p>
            )}

            {/* Form */}
            <div className="mt-8">{children}</div>

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-white/[0.08] text-xs text-white/40 text-center">
              {footer}
            </div>
          </div>

          {/* Below-card trust note */}
          <p className="mt-5 text-center text-xs text-white/25">
            Secured by Supabase Auth · No credit card required
          </p>
        </motion.div>
      </div>
    </div>
  );
}
