import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, BookOpen, Zap, Shield, BarChart3 } from 'lucide-react';

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

const sections = [
  { icon: Zap, title: 'Quick Start', items: ['Create your account', 'Connect a sender (Google OAuth, Microsoft, or SMTP)', 'Import your contact list (CSV)', 'Build your first campaign or sequence', 'Review deliverability and launch'] },
  { icon: BookOpen, title: 'Campaigns', items: ['One-off campaign sends', 'Segment your recipient list', 'Track opens, clicks, and bounces', 'Schedule sends for a future time', 'Export campaign analytics'] },
  { icon: Zap, title: 'Sequences', items: ['Build multi-step drip flows', 'Set delays between steps', 'Conditional branching by opens/clicks', 'Pause or resume sequences', 'Per-contact sequence state tracking'] },
  { icon: BarChart3, title: 'Analytics', items: ['Real-time open & click rates', 'Bounce and unsubscribe tracking', 'Per-campaign breakdown', 'Export as CSV', 'AI-powered send-time recommendations'] },
  { icon: Shield, title: 'Deliverability', items: ['SPF, DKIM, and DMARC setup guide', 'Domain warm-up checklist', 'Bounce management', 'Unsubscribe list management', 'Spam score pre-send check'] },
];

export function DocumentationPage() {
  return (
    <div className="relative min-h-screen bg-[#0c0c0c] text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-25 pointer-events-none"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4" />
      </div>
      <div className="relative z-10">
        <Nav />
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-12 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/60 mb-6">
              <Sparkles className="w-3 h-3 text-[#00d2ff]" /> Documentation
            </span>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-white">
              Everything you need<br />
              <span style={{ background: 'linear-gradient(to right,#A4F4FD,#00d2ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                to get sending.
              </span>
            </h1>
            <p className="mt-6 text-white/60 max-w-md mx-auto text-base">
              Step-by-step guides, API references, and tutorials for every Email Engine feature.
            </p>
          </motion.div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map(({ icon: Icon, title, items }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.5 }}
                className="liquid-glass rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#00d2ff]" />
                  </div>
                  <h2 className="text-sm font-semibold text-white">{title}</h2>
                </div>
                <ul className="space-y-2">
                  {items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-xs text-white/60 hover:text-white/90 cursor-pointer transition-colors">
                      <span className="w-1 h-1 rounded-full bg-white/30 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-10 liquid-glass rounded-2xl p-8 text-center">
            <h3 className="text-lg font-semibold text-white">Need help getting started?</h3>
            <p className="mt-2 text-sm text-white/50">Create your account and follow the in-app setup guide — it takes less than 5 minutes.</p>
            <Link to="/signup" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white text-black font-medium text-sm px-5 py-2.5 hover:bg-white/90 transition-all">
              Start for free →
            </Link>
          </motion.div>
        </section>
        <Footer />
      </div>
    </div>
  );
}
