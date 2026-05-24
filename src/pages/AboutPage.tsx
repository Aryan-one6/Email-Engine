import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, Mail, Users, Zap } from 'lucide-react';

function LogoMark({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" fill="white" className={className}>
      <path d="M 0 128 C 70.692 128 128 185.308 128 256 L 64 256 C 64 220.654 35.346 192 0 192 Z M 256 192 C 220.654 192 192 220.654 192 256 L 128 256 C 128 185.308 185.308 128 256 128 Z M 128 0 C 128 70.692 70.692 128 0 128 L 0 64 C 35.346 64 64 35.346 64 0 Z M 192 0 C 192 35.346 220.654 64 256 64 L 256 128 C 185.308 128 128 70.692 128 0 Z" />
    </svg>
  );
}

function Nav() {
  return (
    <nav className="relative z-20 py-5 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5"><LogoMark /><span className="text-white font-semibold text-base">Email Engine</span></Link>
        <div className="flex items-center gap-4">
          <Link to="/signin" className="text-white/60 text-sm hover:text-white transition-colors">Sign in</Link>
          <Link to="/signup" className="rounded-full bg-white text-black font-medium text-sm px-4 py-2 hover:bg-white/90 transition-all">Get Started Free</Link>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 py-10 mt-20">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2"><LogoMark className="w-5 h-5" /><span className="text-white/60 text-xs">Email Engine</span></Link>
        <p className="text-xs text-white/30">© 2026 Email Engine. All rights reserved.</p>
        <div className="flex gap-6">
          <Link to="/privacy" className="text-xs text-white/30 hover:text-white/60">Privacy</Link>
          <Link to="/terms" className="text-xs text-white/30 hover:text-white/60">Terms</Link>
        </div>
      </div>
    </footer>
  );
}

const values = [
  { icon: Mail, title: 'Email-first, always', desc: 'We believe email is still the highest-leverage channel for building relationships. Every decision we make starts with what helps senders be more effective.' },
  { icon: Sparkles, title: 'AI as a co-pilot', desc: 'AI in Email Engine is a tool, not a replacement. It handles the patterns — you keep the voice, the strategy, and the relationships.' },
  { icon: Zap, title: 'Opinionated simplicity', desc: 'We make hard choices so you don\'t have to. The product is simple because we\'ve done the work to eliminate complexity, not because we\'ve ignored it.' },
  { icon: Users, title: 'Built for teams', desc: 'Email is a team sport. Every feature is designed to work across organizations — with roles, shared templates, and sender management for groups.' },
];

export function AboutPage() {
  return (
    <div className="relative min-h-screen bg-[#0c0c0c] text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-25 pointer-events-none"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4" />
      </div>
      <div className="relative z-10">
        <Nav />

        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/60 mb-6">
              <Sparkles className="w-3 h-3 text-[#00d2ff]" /> Our story
            </span>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-white">
              We're building the<br />
              <span style={{ background: 'linear-gradient(to right,#A4F4FD,#00d2ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                email platform we always wanted.
              </span>
            </h1>
            <p className="mt-8 text-white/60 max-w-xl mx-auto text-base leading-relaxed">
              Email Engine started as a tool we built internally to manage outreach at scale. When teams outside our company started asking to use it, we realized we were onto something.
            </p>
            <p className="mt-4 text-white/60 max-w-xl mx-auto text-base leading-relaxed">
              Today, Email Engine powers email campaigns, automated sequences, and contact management for teams ranging from solo founders to fast-growing agencies — all from one unified workspace.
            </p>
          </motion.div>
        </section>

        {/* Values */}
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <h2 className="text-center text-xs uppercase tracking-widest text-white/40 mb-10">What we believe</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="liquid-glass rounded-2xl p-6 flex gap-4">
                <div className="w-9 h-9 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-[#00d2ff]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-xs text-white/50 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-6 pb-20 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
            className="liquid-glass rounded-3xl p-10">
            <h2 className="text-2xl font-semibold text-white">Ready to ship better emails?</h2>
            <p className="mt-3 text-sm text-white/50">Free to start. No card required.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-semibold text-sm px-6 py-3 hover:bg-white/90 transition-all">
                Get Started Free →
              </Link>
              <Link to="/features" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 text-white text-sm px-6 py-3 hover:bg-white/5 transition-all">
                See all features
              </Link>
            </div>
          </motion.div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
