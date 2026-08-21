import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Menu,
  Search,
  Sparkles,
  Inbox,
  Send,
  FileText,
  Archive,
  Trash2,
  Reply,
  Forward,
  MoreHorizontal,
  Paperclip,
  Zap,
  Users,
  BarChart3,
  Mail,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   PRIMITIVES
───────────────────────────────────────────── */

function LogoMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" fill="white" className={className} aria-label="Email Engine">
      <path d="M 0 128 C 70.692 128 128 185.308 128 256 L 64 256 C 64 220.654 35.346 192 0 192 Z M 256 192 C 220.654 192 192 220.654 192 256 L 128 256 C 128 185.308 185.308 128 256 128 Z M 128 0 C 128 70.692 70.692 128 0 128 L 0 64 C 35.346 64 64 35.346 64 0 Z M 192 0 C 192 35.346 220.654 64 256 64 L 256 128 C 185.308 128 128 70.692 128 0 Z" />
    </svg>
  );
}

function PrimaryButton({ label = 'Get Started Free', href = '/signup' }: { label?: string; href?: string }) {
  return (
    <a
      href={href}
      className="group inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-medium text-sm px-5 py-3 transition-all hover:bg-white/90 active:scale-[0.98]"
    >
      {label}
      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-px" />
    </a>
  );
}

function SectionEyebrow({ label, tag }: { label: string; tag?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-1.5 h-1.5 rounded-full bg-white" />
      <span className="text-xs font-medium text-white/70 uppercase tracking-widest">{label}</span>
      {tag && (
        <span className="px-2 py-0.5 rounded-full border border-white/10 text-white/50 text-xs">
          {tag}
        </span>
      )}
    </div>
  );
}

const gradientStyle: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(to right, #091020 0%, #0B2551 12.5%, #A4F4FD 32.5%, #00d2ff 50%, #0B2551 67.5%, #091020 87.5%, #091020 100%)',
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
  filter: 'url(#c3-noise)',
};

/* ─────────────────────────────────────────────
   SECTION 1 — NAVBAR
───────────────────────────────────────────── */

const navLinks = ['Features', 'Pricing', 'Documentation', 'About'];

function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative z-20 py-5"
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        {/* Left: logo + wordmark */}
        <div className="flex items-center gap-2.5">
          <LogoMark className="w-7 h-7" />
          <span className="text-white font-semibold text-base tracking-tight">Email Engine</span>
        </div>

        {/* Center: nav links */}
        <div className="hidden md:flex gap-8">
          {navLinks.map((link, i) => (
            <motion.a
              key={link}
              href="#"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
              className="text-white/70 text-sm font-medium hover:text-white transition-colors"
            >
              {link}
            </motion.a>
          ))}
        </div>

        {/* Right: CTA / mobile menu */}
        <div className="hidden md:flex items-center gap-3">
          <a href="/signin" className="text-white/70 text-sm font-medium hover:text-white transition-colors">
            Sign in
          </a>
          <PrimaryButton label="Get Started Free" />
        </div>
        <button className="md:hidden w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
          <Menu className="w-4 h-4 text-white" />
        </button>
      </div>
    </motion.nav>
  );
}

/* ─────────────────────────────────────────────
   SECTION 2 — HERO
───────────────────────────────────────────── */

function Hero() {
  return (
    <section className="pt-16 md:pt-28 pb-20 text-center flex flex-col items-center relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/60"
      >
        <Sparkles className="w-3 h-3 text-[#00d2ff]" />
        AI-powered email marketing automation
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-4xl md:text-7xl font-semibold tracking-tight leading-[0.9]"
      >
        <span className="text-white block">Email campaigns.</span>
        <span
          className="block animate-shiny"
          style={gradientStyle}
        >
          Supercharged.
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="mt-8 text-white/60 max-w-md text-base leading-[1.5]"
      >
        Email Engine is an AI-native email marketing engine — send campaigns, automate follow-ups,
        manage contacts, and track delivery, all from one unified workspace.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="mt-8 flex flex-col sm:flex-row items-center gap-3"
      >
        <PrimaryButton label="Start for free" href="/signup" />
        <a
          href="/signin"
          className="group inline-flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors"
        >
          Sign in to your workspace
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-px" />
        </a>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.4 }}
        className="mt-4 text-xs text-white/30"
      >
        No credit card required · Google & Microsoft OAuth · SMTP support
      </motion.p>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 4 — APP MOCKUP (Email campaign view)
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   SECTION 4 — APP MOCKUP (Email campaign view)
───────────────────────────────────────────── */

const campaigns = [
  {
    from: 'Onboarding Sequence',
    subject: 'Welcome to Email Engine — Day 1',
    preview: '3,240 sent · 68% open rate · 24% clicked...',
    time: '9:41 AM',
    unread: true,
    active: true,
  },
  {
    from: 'Product Update',
    subject: 'New AI features just shipped 🚀',
    preview: '12,480 sent · 52% open rate · 18% clicked...',
    time: '8:12 AM',
    unread: true,
    active: false,
  },
  {
    from: 'Re-engagement',
    subject: 'We miss you — here\'s what\'s new',
    preview: '5,600 sent · 41% open rate · 9% clicked...',
    time: 'Yesterday',
    unread: false,
    active: false,
  },
  {
    from: 'Follow-up Sequence',
    subject: 'Did you get a chance to check in?',
    preview: '890 queued · Auto-sends in 2h 14m...',
    time: 'Yesterday',
    unread: false,
    active: false,
  },
  {
    from: 'Weekly Digest',
    subject: 'Your team sent 42 emails this week',
    preview: '12 sequences active · 3 paused · 1 draft...',
    time: 'Mon',
    unread: false,
    active: false,
  },
  {
    from: 'Template Library',
    subject: 'Cold outreach v4 — approved',
    preview: 'Sarah approved your template edit.',
    time: 'Mon',
    unread: false,
    active: false,
  },
];

const sidebarNav = [
  { icon: Inbox, label: 'Campaigns', count: 12, active: true },
  { icon: Zap, label: 'Sequences', count: 3, active: false },
  { icon: FileText, label: 'Templates', count: null, active: false },
  { icon: Users, label: 'Contacts', count: null, active: false },
  { icon: BarChart3, label: 'Analytics', count: null, active: false },
  { icon: Send, label: 'Sent', count: null, active: false },
];

const labels = [
  { name: 'Onboarding', color: '#00d2ff' },
  { name: 'Product', color: '#A4F4FD' },
  { name: 'Outreach', color: '#f59e0b' },
  { name: 'Re-engage', color: '#10b981' },
];

function InboxMockup() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0e1014]/90 backdrop-blur-2xl"
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
          </div>
          <span className="text-xs text-white/50">Email Engine — Campaigns</span>
          <div className="w-14" />
        </div>

        {/* Body */}
        <div className="grid grid-cols-12 h-[520px]">
          {/* Sidebar */}
          <div className="col-span-3 border-r border-white/10 bg-black/30 p-4 flex flex-col gap-4 overflow-y-auto">
            <button className="flex items-center gap-2 rounded-lg bg-white text-black text-xs font-semibold px-3 py-2 w-full">
              <Sparkles className="w-3.5 h-3.5" />
              New Campaign
            </button>

            <nav className="flex flex-col gap-0.5">
              {sidebarNav.map(({ icon: Icon, label, count, active }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs cursor-default transition-colors ${active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {count !== null && (
                    <span className="text-[10px] text-white/40">{count}</span>
                  )}
                </div>
              ))}
            </nav>

            <div className="mt-2">
              <p className="text-[9px] uppercase tracking-widest text-white/30 font-semibold mb-2 px-2.5">
                Tags
              </p>
              <div className="flex flex-col gap-1.5">
                {labels.map(({ name, color }) => (
                  <div key={name} className="flex items-center gap-2.5 px-2.5 py-1 cursor-default">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-xs text-white/60">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Campaign list */}
          <div className="col-span-4 border-r border-white/10 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
              <Search className="w-3.5 h-3.5 text-white/30" />
              <span className="text-xs text-white/30">Search campaigns</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {campaigns.map((msg) => (
                <div
                  key={msg.subject}
                  className={`px-3 py-3 border-b border-white/[0.05] cursor-default transition-colors ${msg.active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.03]'
                    }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <span className={`text-xs font-semibold truncate ${msg.unread ? 'text-white' : 'text-white/60'}`}>
                      {msg.from}
                    </span>
                    <span className="text-[10px] text-white/30 flex-shrink-0">{msg.time}</span>
                  </div>
                  <p className={`text-[11px] truncate mb-0.5 ${msg.unread ? 'text-white/80' : 'text-white/50'}`}>
                    {msg.subject}
                  </p>
                  <p className="text-[11px] text-white/30 truncate">{msg.preview}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Campaign detail / Reader */}
          <div className="col-span-5 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-white/10">
              {[Reply, Forward, Archive, Trash2].map((Icon, i) => (
                <button
                  key={i}
                  className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center transition-colors"
                >
                  <Icon className="w-3.5 h-3.5 text-white/50" />
                </button>
              ))}
              <div className="flex-1" />
              <button className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center transition-colors">
                <MoreHorizontal className="w-3.5 h-3.5 text-white/50" />
              </button>
            </div>

            {/* Campaign content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-white">Welcome to Email Engine — Day 1</h2>

              {/* Sender / campaign meta */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00d2ff] to-[#0B2551] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                  OB
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">Onboarding Sequence</span>
                    <span className="text-[10px] text-white/40">sent · 9:41 AM</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-white/50 flex-shrink-0">
                  Active
                </span>
              </div>

              {/* AI insight card */}
              <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: '#A4F4FD' }} />
                  <span className="text-[11px] font-semibold text-white/80">AI Insights by Email Engine</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Open rate is 68% — 22 pts above your baseline. Best send time: Tuesday 9 AM. Suggest A/B testing subject line for 15% of list.
                </p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Sent', value: '3,240' },
                  { label: 'Opened', value: '68%' },
                  { label: 'Clicked', value: '24%' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-center">
                    <p className="text-sm font-semibold text-white">{value}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Body */}
              <div className="flex flex-col gap-3 text-[12px] text-white/70 leading-relaxed">
                <p>Hi {'{{first_name}}'},</p>
                <p>
                  Welcome to Email Engine. You're now set up to send smarter email campaigns with built-in
                  AI sequencing, template design, and real-time delivery analytics.
                </p>
                <p>
                  Your first campaign is queued and ready to go. Head to your dashboard to review
                  the sequence schedule and tweak your subject line before the first send.
                </p>
                <p className="text-white/50">— The Email Engine team</p>
              </div>

              {/* Attachment */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] w-fit">
                <Paperclip className="w-3.5 h-3.5 text-white/40" />
                <span className="text-[11px] text-white/60">onboarding-guide.pdf</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION 5 — FEATURE: AI AUTOMATION
───────────────────────────────────────────── */

const triageCategories = [
  {
    label: 'Scheduled',
    count: 8,
    color: '#ffffff',
    items: ['Onboarding Day 3 — sends in 2h', 'Product update blast — tomorrow 9 AM'],
  },
  {
    label: 'In Progress',
    count: 4,
    color: '#e5e5e5',
    items: ['Re-engagement sequence — step 2', 'Cold outreach — 220 contacts'],
  },
  {
    label: 'Delivered',
    count: 31,
    color: '#a3a3a3',
    items: ['Welcome series — 3,240 delivered', 'Weekly digest — 5,600 delivered'],
  },
  {
    label: 'Paused',
    count: 3,
    color: '#525252',
    items: ['Summer promo · A/B test · Holiday'],
  },
];

const chips = ['Auto follow-up', 'Smart scheduling', 'AI subject lines', 'Bounce handling'];

function FeatureTriage() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 relative z-10">
      <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <SectionEyebrow label="Automation" tag="AI-native" />
          <h2 className="mt-5 text-3xl md:text-5xl font-semibold tracking-tight leading-[1.02] text-white">
            Send smarter.
            <br />
            Scale faster.
          </h2>
          <p className="mt-6 text-white/60 text-base leading-[1.6] max-w-md">
            Email Engine's AI reads your audience signals and auto-schedules sequences at the perfect
            moment. Set up once — let the engine handle the rest.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="text-xs text-white/70 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]"
              >
                {chip}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Right: automation status card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="liquid-glass rounded-2xl p-5 flex flex-col gap-3"
        >
          <p className="text-xs text-white/40 mb-1">Today · 46 emails dispatched</p>
          {triageCategories.map(({ label, count, color, items }) => (
            <div key={label} className="liquid-glass rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold" style={{ color }}>
                  {label}
                </span>
                <span className="text-[10px] text-white/30">{count}</span>
              </div>
              <div className="flex flex-col gap-1">
                {items.map((item) => (
                  <p key={item} className="text-[11px] text-white/50">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 6 — LOGO CLOUD (Integrations)
───────────────────────────────────────────── */

const logoNames = ['Google', 'Microsoft', 'Appwrite', 'Vercel', 'Stripe', 'HubSpot', 'Slack', 'Zapier'];

function LogoCloud() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 md:py-20 relative z-10">
      <p className="text-center text-xs uppercase tracking-widest text-white/40">
        Connects with the tools your team already uses
      </p>
      <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6">
        {logoNames.map((name, i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="flex items-center justify-center"
          >
            <span className="text-sm font-semibold tracking-tight text-white/50 hover:text-white transition-colors cursor-default">
              {name}
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 7 — TESTIMONIALS
───────────────────────────────────────────── */

const testimonials = [
  {
    quote:
      'Email Engine cut our outreach setup time in half. The AI sequences feel like having an extra SDR on the team, 24/7.',
    name: 'Priya Mehta',
    role: 'Head of Growth',
    company: 'STAGELINK',
  },
  {
    quote:
      "We migrated from Mailchimp in a day. The template editor and delivery analytics are miles ahead of anything we've tried.",
    name: 'James Okafor',
    role: 'Marketing Lead',
    company: 'NEXARBIT',
  },
  {
    quote:
      'Auto follow-ups with smart scheduling changed everything. Our reply rate jumped 34% in the first week.',
    name: 'Celine Rousseau',
    role: 'Founder & CEO',
    company: 'FLOWCRAFT',
  },
];

function Testimonials() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 border-t border-white/10 relative z-10">
      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map(({ quote, name, role, company }, i) => (
          <motion.figure
            key={name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.6 }}
            className="liquid-glass rounded-2xl p-6"
          >
            <blockquote className="text-sm text-white/80 leading-[1.6]">"{quote}"</blockquote>
            <figcaption className="mt-6 pt-5 border-t border-white/10">
              <p className="text-sm font-semibold text-white">{name}</p>
              <p className="text-xs text-white/50 mt-0.5">{role}</p>
              <p className="text-xs text-white font-semibold tracking-wide mt-1">{company}</p>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 8 — PRICING
───────────────────────────────────────────── */

const plans = [
  {
    tier: 'Starter',
    monthlyPrice: 'Free',
    yearlyPrice: 'Free',
    desc: 'Perfect for solo founders and small teams just getting started.',
    features: [
      'Up to 500 contacts',
      '3 active email sequences',
      'Basic template library',
      'Google & Microsoft OAuth',
      'Delivery & open tracking',
    ],
    pro: false,
  },
  {
    tier: 'Growth',
    monthlyPrice: '$29/mo',
    yearlyPrice: '$290/yr',
    desc: 'For growing teams that need scale, automation, and deeper insights.',
    features: [
      'Up to 10,000 contacts',
      'Unlimited sequences',
      'AI subject line suggestions',
      'Team collaboration (5 seats)',
      'Priority delivery + bounce mgmt',
    ],
    pro: false,
  },
  {
    tier: 'Pro',
    monthlyPrice: '$79/mo',
    yearlyPrice: '$790/yr',
    desc: 'For agencies and high-volume teams running full outreach operations.',
    features: [
      'Unlimited contacts',
      'Unlimited seats',
      'AI-generated campaign drafts',
      'Custom sending domains',
      'Advanced analytics & exports',
    ],
    pro: true,
  },
];

function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section className="c3-pricing-section relative z-10">
      {/* Pricing-specific SVG noise filter */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id="c3-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves={2} stitchTiles="stitch" />
          <feComponentTransfer>
            <feFuncA type="linear" slope={0.075} />
          </feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" result="noise" />
          <feBlend in="SourceGraphic" in2="noise" mode="overlay" />
        </filter>
      </svg>

      {/* Watermark */}
      <div className="c3-watermark-container">
        <div className="c3-watermark-main">
          <span className="c3-watermark-line-1">Email campaigns.</span>
          <span className="c3-watermark-line-2">Supercharged.</span>
        </div>
      </div>

      {/* Cards */}
      <div className="c3-grid">
        {plans.map(({ tier, monthlyPrice, yearlyPrice, desc, features, pro }) => (
          <div key={tier} className={`c3-card ${pro ? 'c3-card-pro' : ''}`}>
            <p className="c3-tier-small">{tier}</p>
            <p className="c3-tier-large">{yearly ? yearlyPrice : monthlyPrice}</p>
            <p className="c3-desc">{desc}</p>
            <ul className="c3-list">
              {features.map((f) => (
                <li key={f}>
                  <span className="c3-check">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <a href="/signup" className="c3-btn">Get Started</a>
          </div>
        ))}
      </div>

      {/* Toggle */}
      <div className="c3-toggle-wrap">
        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Save 17% yearly</span>
        <button
          className={`c3-toggle ${yearly ? 'active' : ''}`}
          onClick={() => setYearly(!yearly)}
          aria-label="Toggle yearly pricing"
        >
          <span className="c3-toggle-knob" />
        </button>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SECTION 9 — FINAL CTA
───────────────────────────────────────────── */

function FinalCTA() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 md:py-32 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="liquid-glass relative overflow-hidden rounded-3xl px-8 py-16 md:py-24 text-center"
      >
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(600px circle at 50% 0%, rgba(255,255,255,0.15), transparent 70%)',
            opacity: 0.3,
          }}
        />

        <h2 className="relative text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02] text-white">
          Ship better emails.
          <br />
          Grow faster.
        </h2>
        <p className="relative mt-6 text-white/60 max-w-md mx-auto text-sm leading-[1.6]">
          Join teams using Email Engine to automate their outreach, run smarter campaigns, and close
          more — without the complexity.
        </p>
        <div className="relative mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <PrimaryButton label="Start for free" href="/signup" />
          <a
            href="/signin"
            className="group inline-flex items-center justify-center gap-1 rounded-full border border-white/15 text-white text-sm font-medium px-5 py-3 hover:bg-white/5 transition-all"
          >
            Sign in
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-px" />
          </a>
        </div>
        <p className="relative mt-6 text-xs text-white/30">
          Free plan · No credit card · Setup in under 5 minutes
        </p>
      </motion.div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FEATURES STRIP (between hero stats)
───────────────────────────────────────────── */

const features = [
  { icon: Mail, title: 'Campaign Engine', desc: 'Send one-off or scheduled campaigns to any segment with full deliverability control.' },
  { icon: Zap, title: 'Smart Sequences', desc: 'Build multi-step drip flows that auto-pause, branch, and adapt based on recipient behaviour.' },
  { icon: BarChart3, title: 'Live Analytics', desc: 'Track opens, clicks, bounces, and reply rates in real-time with per-campaign drill-downs.' },
  { icon: Users, title: 'Team Workspace', desc: 'Invite teammates, assign roles, and manage sender identities across Google, Microsoft & SMTP.' },
];

function FeaturesStrip() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 relative z-10 border-t border-white/10">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {features.map(({ icon: Icon, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.6 }}
            className="flex flex-col gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
              <Icon className="w-4.5 h-4.5 text-white/70" style={{ width: 18, height: 18 }} />
            </div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-xs text-white/50 leading-[1.6]">{desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   ROOT — HOMEPAGE
───────────────────────────────────────────── */

export function HomePage() {
  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-[#0c0c0c] text-white"
      style={{ fontFamily: "'Inter', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased' }}
    >
      {/* Root SVG noise filter for shiny headline */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id="c3-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
          <feComposite in2="SourceGraphic" operator="in" result="noise" />
          <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
        </filter>
      </svg>

      {/* Background video */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover pointer-events-none"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4"
        />
      </div>

      {/* Page content */}
      <div className="relative z-10">
        <Navbar />
        <Hero />
        <InboxMockup />
        <FeaturesStrip />
        <FeatureTriage />
        <LogoCloud />
        <Testimonials />
        <Pricing />
        <FinalCTA />

        {/* Footer */}
        <footer className="border-t border-white/10 py-10 relative z-10">
          <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <LogoMark className="w-5 h-5" />
              <span className="text-white/60 text-xs font-medium">Email Engine</span>
            </div>
            <p className="text-xs text-white/30">© 2026 Email Engine. All rights reserved.</p>
            <div className="flex items-center gap-6">
              {['Privacy', 'Terms', 'Status'].map((link) => (
                <a key={link} href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
