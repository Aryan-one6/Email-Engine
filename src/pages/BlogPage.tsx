import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, Clock } from 'lucide-react';

function LogoMark({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" fill="white" className={className}>
      <path d="M 0 128 C 70.692 128 128 185.308 128 256 L 64 256 C 64 220.654 35.346 192 0 192 Z M 256 192 C 220.654 192 192 220.654 192 256 L 128 256 C 128 185.308 185.308 128 256 128 Z M 128 0 C 128 70.692 70.692 128 0 128 L 0 64 C 35.346 64 64 35.346 64 0 Z M 192 0 C 192 35.346 220.654 64 256 64 L 256 128 C 185.308 128 128 70.692 128 0 Z" />
    </svg>
  );
}

function MarketingNav() {
  return (
    <nav className="relative z-20 py-5 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-white font-semibold text-base tracking-tight">Email Engine</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/signin" className="text-white/60 text-sm hover:text-white transition-colors">Sign in</Link>
          <Link to="/signup" className="inline-flex items-center rounded-full bg-white text-black font-medium text-sm px-4 py-2 hover:bg-white/90 transition-all">
            Get Started Free
          </Link>
        </div>
      </div>
    </nav>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 py-10 mt-20">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2"><LogoMark className="w-5 h-5" /><span className="text-white/60 text-xs font-medium">Email Engine</span></Link>
        <p className="text-xs text-white/30">© 2026 Email Engine. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link to="/privacy" className="text-xs text-white/30 hover:text-white/60 transition-colors">Privacy</Link>
          <Link to="/terms" className="text-xs text-white/30 hover:text-white/60 transition-colors">Terms</Link>
        </div>
      </div>
    </footer>
  );
}

const posts = [
  { slug: 'ai-subject-lines', title: 'How AI subject lines boosted our open rates by 34%', category: 'Product', date: 'May 20, 2026', read: '4 min read', excerpt: 'We tested AI-generated subject lines against hand-written ones across 12 campaigns. Here\'s exactly what happened.' },
  { slug: 'onboarding-sequences', title: 'The 5-email onboarding sequence that converts new signups', category: 'Strategy', date: 'May 14, 2026', read: '6 min read', excerpt: 'A step-by-step breakdown of the onboarding sequence template built into Email Engine and why each email exists.' },
  { slug: 'deliverability-guide', title: 'Email deliverability in 2026: what actually matters', category: 'Guide', date: 'May 7, 2026', read: '8 min read', excerpt: 'SPF, DKIM, DMARC, and domain warm-up — a practical guide to landing in inboxes, not spam folders.' },
  { slug: 'cold-outreach-sequences', title: 'Cold outreach sequences that still work in 2026', category: 'Strategy', date: 'Apr 29, 2026', read: '5 min read', excerpt: 'The cold email playbook has changed. We analyzed 2,400 campaigns to find what\'s still driving replies.' },
  { slug: 'google-oauth-setup', title: 'Setting up Google Workspace OAuth for Email Engine', category: 'Tutorial', date: 'Apr 22, 2026', read: '3 min read', excerpt: 'A complete walkthrough of connecting your Google Workspace sender with OAuth for reliable outbound delivery.' },
  { slug: 'team-collaboration', title: 'Running email campaigns with a distributed team', category: 'Product', date: 'Apr 15, 2026', read: '5 min read', excerpt: 'How to structure roles, approval flows, and sender management when your email team spans time zones.' },
];

const categoryColors: Record<string, string> = {
  Product: 'text-[#00d2ff] bg-[#00d2ff]/10 border-[#00d2ff]/20',
  Strategy: 'text-[#A4F4FD] bg-[#A4F4FD]/10 border-[#A4F4FD]/20',
  Guide: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Tutorial: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};

export function BlogPage() {
  return (
    <div className="relative min-h-screen bg-[#0c0c0c] text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-25 pointer-events-none"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4" />
      </div>
      <div className="relative z-10">
        <MarketingNav />

        <section className="max-w-6xl mx-auto px-6 pt-20 pb-12 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/60 mb-6">
              <Sparkles className="w-3 h-3 text-[#00d2ff]" /> Email Engine Blog
            </span>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-white">
              Insights on email,<br />
              <span style={{ background: 'linear-gradient(to right,#A4F4FD,#00d2ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                automation & growth.
              </span>
            </h1>
            <p className="mt-6 text-white/60 max-w-md mx-auto text-base">
              Guides, strategies, and product updates from the Email Engine team.
            </p>
          </motion.div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(({ title, category, date, read, excerpt }, i) => (
              <motion.article key={title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.5 }}
                className="liquid-glass rounded-2xl p-6 flex flex-col gap-3 group cursor-pointer hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${categoryColors[category] ?? 'text-white/50 bg-white/5 border-white/10'}`}>
                    {category}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-white/30">
                    <Clock className="w-3 h-3" /> {read}
                  </span>
                </div>
                <h2 className="text-sm font-semibold text-white leading-snug group-hover:text-[#A4F4FD] transition-colors">{title}</h2>
                <p className="text-xs text-white/50 leading-relaxed flex-1">{excerpt}</p>
                <p className="text-[10px] text-white/30 mt-2">{date}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <MarketingFooter />
      </div>
    </div>
  );
}
