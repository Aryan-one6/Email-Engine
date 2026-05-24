import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, Mail, BarChart3, Users, Sparkles, GitBranch, Shield, Clock } from 'lucide-react';

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
          <Link to="/signup" className="inline-flex items-center gap-1.5 rounded-full bg-white text-black font-medium text-sm px-4 py-2 hover:bg-white/90 transition-all">
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
        <Link to="/" className="flex items-center gap-2">
          <LogoMark className="w-5 h-5" />
          <span className="text-white/60 text-xs font-medium">Email Engine</span>
        </Link>
        <p className="text-xs text-white/30">© 2026 Email Engine. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link to="/privacy" className="text-xs text-white/30 hover:text-white/60 transition-colors">Privacy</Link>
          <Link to="/terms" className="text-xs text-white/30 hover:text-white/60 transition-colors">Terms</Link>
        </div>
      </div>
    </footer>
  );
}

const features = [
  { icon: Mail, title: 'Campaign Engine', desc: 'Send one-off or scheduled campaigns to any segment with full deliverability control and real-time tracking.' },
  { icon: Zap, title: 'Smart Sequences', desc: 'Multi-step drip flows that auto-pause, branch, and adapt based on recipient behavior and signals.' },
  { icon: BarChart3, title: 'Live Analytics', desc: 'Track opens, clicks, bounces, and reply rates in real-time with per-campaign drill-downs and exports.' },
  { icon: Users, title: 'Team Workspace', desc: 'Invite teammates, assign roles, and manage sender identities across Google, Microsoft & SMTP.' },
  { icon: Sparkles, title: 'AI Insights', desc: 'AI-generated send-time recommendations, subject line A/B suggestions, and open rate predictions.' },
  { icon: GitBranch, title: 'Sequence Branching', desc: 'Build conditional paths in your sequences — different messages for openers, clickers, and non-responders.' },
  { icon: Shield, title: 'Deliverability First', desc: 'Built-in bounce management, unsubscribe handling, and domain warm-up guidance out of the box.' },
  { icon: Clock, title: 'Scheduled Sends', desc: 'Queue campaigns for the perfect moment — timezone-aware, throttled, with live queue monitoring.' },
];

export function FeaturesPage() {
  return (
    <div className="relative min-h-screen bg-[#0c0c0c] text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-30 pointer-events-none"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4" />
      </div>
      <div className="relative z-10">
        <MarketingNav />
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-12 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/60 mb-6">
              <Sparkles className="w-3 h-3 text-[#00d2ff]" /> Everything you need
            </span>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-white">
              Built for email that <br /><span style={{ background: 'linear-gradient(to right,#A4F4FD,#00d2ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>actually converts.</span>
            </h1>
            <p className="mt-6 text-white/60 max-w-lg mx-auto text-base leading-relaxed">
              Every feature in Email Engine is designed around one goal: helping your messages reach the right person at the right time, with measurable results.
            </p>
          </motion.div>
        </section>
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.5 }}
                className="liquid-glass rounded-2xl p-5 flex flex-col gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5 text-[#00d2ff]" style={{ width: 18, height: 18 }} />
                </div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </section>
        <section className="max-w-3xl mx-auto px-6 pb-20 text-center">
          <div className="liquid-glass rounded-3xl p-10">
            <h2 className="text-3xl font-semibold text-white">Start sending in minutes.</h2>
            <p className="mt-4 text-white/60 text-sm">No credit card required. Connect your sender and launch your first campaign today.</p>
            <Link to="/signup" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white text-black font-semibold text-sm px-6 py-3 hover:bg-white/90 transition-all">
              Get Started Free →
            </Link>
          </div>
        </section>
        <MarketingFooter />
      </div>
    </div>
  );
}
