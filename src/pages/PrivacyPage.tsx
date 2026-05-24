import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

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

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-base font-semibold text-white mb-3">{title}</h2>
      <div className="text-sm text-white/60 leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-[#0c0c0c] text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-20 pointer-events-none"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4" />
      </div>
      <div className="relative z-10">
        <Nav />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto px-6 pt-16 pb-20">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-4">Legal</p>
          <h1 className="text-4xl font-semibold text-white mb-2">Privacy Policy</h1>
          <p className="text-sm text-white/40 mb-12">Last updated May 24, 2026</p>

          <div className="liquid-glass rounded-2xl p-8">
            <LegalSection title="1. Information We Collect">
              <p>We collect information you provide when you create an account, including your name, email address, and workspace details.</p>
              <p>We automatically collect usage data including pages visited, features used, campaign performance metrics, and error logs to improve the product.</p>
              <p>Email send activity — including recipient addresses, open events, and click events — is stored per campaign and associated with your workspace.</p>
            </LegalSection>

            <LegalSection title="2. How We Use Your Information">
              <p>To provide, maintain, and improve the Email Engine platform and its features.</p>
              <p>To send you product updates, account notifications, and support communications.</p>
              <p>To analyze usage patterns and improve product reliability and performance.</p>
              <p>We do not sell your personal information or your contact lists to third parties.</p>
            </LegalSection>

            <LegalSection title="3. Data Storage & Security">
              <p>Your data is stored on Supabase infrastructure with encryption at rest and in transit. Email credentials are encrypted with AES-256 before storage.</p>
              <p>We follow industry best practices for securing user data and conduct regular security reviews.</p>
            </LegalSection>

            <LegalSection title="4. Third-Party Services">
              <p>Email Engine integrates with Google, Microsoft, and SMTP providers on your behalf. OAuth tokens and credentials are stored securely and used only to send emails you authorize.</p>
              <p>We use Supabase for authentication and database, and Vercel for hosting. These providers have their own privacy policies.</p>
            </LegalSection>

            <LegalSection title="5. Your Rights">
              <p>You may request deletion of your account and all associated data at any time via your account settings or by contacting us.</p>
              <p>You may export your contact lists and campaign data at any time from your workspace.</p>
            </LegalSection>

            <LegalSection title="6. Contact">
              <p>For privacy-related questions or requests, contact us at <span className="text-[#00d2ff]">privacy@emailengine.app</span>.</p>
            </LegalSection>
          </div>
        </motion.div>
        <Footer />
      </div>
    </div>
  );
}
