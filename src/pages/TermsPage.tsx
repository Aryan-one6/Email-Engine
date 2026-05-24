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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-base font-semibold text-white mb-3">{title}</h2>
      <div className="text-sm text-white/60 leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export function TermsPage() {
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
          <h1 className="text-4xl font-semibold text-white mb-2">Terms of Service</h1>
          <p className="text-sm text-white/40 mb-12">Last updated May 24, 2026</p>

          <div className="liquid-glass rounded-2xl p-8">
            <Section title="1. Acceptance of Terms">
              <p>By accessing or using Email Engine ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</p>
            </Section>

            <Section title="2. Use of the Service">
              <p>You may use Email Engine to send email campaigns, manage contacts, and automate email sequences for lawful purposes only.</p>
              <p>You agree not to use the Service to send unsolicited commercial email (spam), harass recipients, transmit malware, or engage in any activity that violates applicable laws.</p>
              <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
            </Section>

            <Section title="3. Email Sending Policy">
              <p>You must have explicit permission or a legitimate interest basis to email contacts in your list. Email Engine reserves the right to suspend accounts with high bounce or spam complaint rates.</p>
              <p>You agree to honor unsubscribe requests and maintain a clean contact list. Email Engine provides built-in unsubscribe handling to assist with compliance.</p>
            </Section>

            <Section title="4. Data and Privacy">
              <p>You retain ownership of your contact data, email content, and campaign results. We do not claim any rights to your content.</p>
              <p>Our handling of your data is governed by our <Link to="/privacy" className="text-[#00d2ff] hover:underline">Privacy Policy</Link>.</p>
            </Section>

            <Section title="5. Service Availability">
              <p>We aim for high availability but do not guarantee uninterrupted service. Scheduled maintenance will be communicated in advance where possible.</p>
              <p>We reserve the right to suspend or terminate accounts that violate these Terms, with or without prior notice.</p>
            </Section>

            <Section title="6. Limitation of Liability">
              <p>Email Engine is provided "as is." We make no warranties regarding uptime, deliverability rates, or fitness for a particular purpose.</p>
              <p>In no event shall Email Engine be liable for indirect, incidental, or consequential damages arising from your use of the Service.</p>
            </Section>

            <Section title="7. Changes to Terms">
              <p>We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the revised terms.</p>
            </Section>

            <Section title="8. Contact">
              <p>For questions about these terms, contact us at <span className="text-[#00d2ff]">legal@emailengine.app</span>.</p>
            </Section>
          </div>
        </motion.div>
        <Footer />
      </div>
    </div>
  );
}
