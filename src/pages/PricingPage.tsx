import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';

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

const plans = [
  {
    tier: 'Starter',
    monthlyPrice: 'Free',
    yearlyPrice: 'Free',
    desc: 'Perfect for solo founders and small teams just getting started.',
    features: ['Up to 500 contacts', '3 active email sequences', 'Basic template library', 'Google & Microsoft OAuth', 'Delivery & open tracking'],
    cta: 'Start for free',
    href: '/signup',
    highlight: false,
  },
  {
    tier: 'Growth',
    monthlyPrice: '$29',
    yearlyPrice: '$290',
    period: '/mo',
    yearlyPeriod: '/yr',
    desc: 'For growing teams that need scale, automation, and deeper insights.',
    features: ['Up to 10,000 contacts', 'Unlimited sequences', 'AI subject line suggestions', 'Team collaboration (5 seats)', 'Priority delivery + bounce mgmt'],
    cta: 'Start Growth',
    href: '/signup',
    highlight: true,
  },
  {
    tier: 'Pro',
    monthlyPrice: '$79',
    yearlyPrice: '$790',
    period: '/mo',
    yearlyPeriod: '/yr',
    desc: 'For agencies and high-volume teams running full outreach operations.',
    features: ['Unlimited contacts', 'Unlimited seats', 'AI-generated campaign drafts', 'Custom sending domains', 'Advanced analytics & exports'],
    cta: 'Start Pro',
    href: '/signup',
    highlight: false,
  },
];

export function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#0c0c0c] text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-30 pointer-events-none"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4" />
      </div>
      <div className="relative z-10">
        <MarketingNav />

        <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/60 mb-6">
              <Sparkles className="w-3 h-3 text-[#00d2ff]" /> Simple pricing
            </span>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-white">
              Start free.<br />
              <span style={{ background: 'linear-gradient(to right,#A4F4FD,#00d2ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Scale as you grow.
              </span>
            </h1>
            <p className="mt-6 text-white/60 max-w-md mx-auto text-base">
              No credit card required. Upgrade when your team and volume demand it.
            </p>

            {/* Toggle */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <span className="text-sm text-white/60">Monthly</span>
              <button
                onClick={() => setYearly(!yearly)}
                className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? 'bg-white/20' : 'bg-white'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full transition-all ${yearly ? 'left-7 bg-white' : 'left-1 bg-black'}`} />
              </button>
              <span className="text-sm text-white/60">Yearly <span className="text-[#00d2ff]">−17%</span></span>
            </div>
          </motion.div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map(({ tier, monthlyPrice, yearlyPrice, period, yearlyPeriod, desc, features, cta, href, highlight }, i) => (
              <motion.div key={tier} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.6 }}
                className={`liquid-glass rounded-3xl p-8 flex flex-col ${highlight ? 'ring-1 ring-white/30' : ''}`}>
                <p className="text-white/60 text-sm">{tier}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-medium text-white">{yearly ? yearlyPrice : monthlyPrice}</span>
                  {period && <span className="text-white/40 text-sm">{yearly ? yearlyPeriod : period}</span>}
                </div>
                <p className="mt-3 text-xs text-white/40 leading-relaxed">{desc}</p>
                <ul className="mt-8 flex-1 space-y-3">
                  {features.map(f => (
                    <li key={f} className="flex items-start gap-3 text-sm text-white/70">
                      <svg className="w-4 h-4 mt-0.5 text-[#00d2ff] flex-shrink-0" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={href}
                  className={`mt-8 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium transition-all ${highlight ? 'bg-white text-black hover:bg-white/90' : 'border border-white/20 text-white hover:bg-white/5'}`}>
                  {cta} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
        <MarketingFooter />
      </div>
    </div>
  );
}
