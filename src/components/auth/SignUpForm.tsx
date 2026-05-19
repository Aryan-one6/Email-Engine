// SignUpForm.tsx
import { Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { toast } from 'sonner';
import { clearPendingSignupMetadata, completeSignup } from '../../lib/auth-helpers';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { getDashboardPath, isValidWorkspaceSlug, slugify } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { ConfigurationNotice } from '../ui/ConfigurationNotice';
import { Input } from '../ui/Input';

type FormErrors = Partial<
  Record<
    | 'fullName'
    | 'email'
    | 'password'
    | 'confirmPassword'
    | 'workspaceName'
    | 'workspaceSlug'
    | 'terms',
    string
  >
>;

const smoothEase = [0.21, 0.47, 0.32, 0.98] as const;

const formVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: smoothEase },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    transition: { duration: 0.3 },
  }),
};

export function SignUpForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSupabaseReady, refreshWorkspace } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const inviteMode = searchParams.get('invite') === '1';
  const invitedEmail = searchParams.get('email')?.trim() ?? '';
  const [step, setStep] = useState<1 | 2>(1);
  const [direction, setDirection] = useState(0);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  function validateAccountStep() {
    const nextErrors: FormErrors = {};

    if (fullName.trim().length < 2) nextErrors.fullName = 'Enter your full name.';
    if (!/\S+@\S+\.\S+/.test(email)) nextErrors.email = 'Enter a valid email address.';
    if (!/^(?=.*\d).{8,}$/.test(password)) {
      nextErrors.password = 'Use at least 8 characters and include a number.';
    }
    if (confirmPassword !== password) nextErrors.confirmPassword = 'Passwords do not match.';

    return nextErrors;
  }

  function validateWorkspaceStep() {
    const nextErrors: FormErrors = {};

    if (workspaceName.trim().length < 2) nextErrors.workspaceName = 'Workspace name is required.';
    if (!isValidWorkspaceSlug(workspaceSlug)) {
      nextErrors.workspaceSlug = 'Use 3+ lowercase characters, numbers, and hyphens only.';
    }
    if (!termsAccepted) nextErrors.terms = 'You need to accept the terms to continue.';

    return nextErrors;
  }

  function updateWorkspaceName(value: string) {
    setWorkspaceName(value);

    if (!slugTouched) {
      setWorkspaceSlug(slugify(value));
    }
  }

  function goToStep(newStep: 1 | 2) {
    setDirection(newStep === 2 ? 1 : -1);
    setStep(newStep);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = {
      ...validateAccountStep(),
      ...(step === 2 ? validateWorkspaceStep() : {}),
    };
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (step === 1 && !inviteMode) {
      goToStep(2);
      return;
    }

    if (!isSupabaseReady) {
      toast.error('Add your Supabase environment variables to enable sign up.');
      return;
    }

    setLoading(true);

    try {
      const client = getSupabaseClient();
      const signUpMetadata = inviteMode
        ? {
            full_name: fullName.trim(),
          }
        : {
            full_name: fullName.trim(),
            pending_workspace_name: workspaceName.trim(),
            pending_workspace_slug: workspaceSlug.trim(),
          };
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: signUpMetadata,
          ...(!inviteMode && typeof window !== 'undefined'
            ? {
                emailRedirectTo: `${window.location.origin}/onboarding/complete`,
              }
            : {}),
        },
      });

      if (error) {
        throw error;
      }

      let session = data.session;

      if (!session) {
        const signInResult = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInResult.error) {
          toast.success('Account created. Verify your email, then sign in to finish onboarding.');
          navigate('/signin', { replace: true, state: { prefillEmail: email.trim() } });
          return;
        }

        session = signInResult.data.session;
      }

      if (!session) {
        throw new Error('Unable to open a session after signup.');
      }

      if (inviteMode) {
        const workspace = await refreshWorkspace(session);

        if (!workspace) {
          throw new Error('No pending workspace invite was found for this account.');
        }

        toast.success('Workspace access granted. Welcome to Email Engine.');
        navigate(getDashboardPath(workspace), { replace: true });
        return;
      }

      const workspace = await completeSignup(
        {
          full_name: fullName.trim(),
          workspace_name: workspaceName.trim(),
          workspace_slug: workspaceSlug.trim(),
        },
        session,
      );

      await clearPendingSignupMetadata().catch(() => undefined);
      await refreshWorkspace(session);
      toast.success('Workspace created. Welcome to Email Engine.');
      navigate(getDashboardPath(workspace), { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete signup.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="relative space-y-5" onSubmit={handleSubmit}>

      {!isSupabaseReady ? <ConfigurationNotice /> : null}

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 || inviteMode ? (
            <motion.section
              key="step1"
              custom={direction}
              variants={formVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-4"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700">
                  {inviteMode ? 'Join workspace' : 'Account details'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {inviteMode
                    ? 'Create your login with the invited email address, then Email Engine will attach your workspace automatically.'
                    : 'Add your personal login details first.'}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Input
                  label="Full name"
                  fieldSize="lg"
                  placeholder="Jordan Lee"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  error={errors.fullName}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Input
                  label="Email"
                  fieldSize="lg"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  error={errors.email}
                  hint={inviteMode ? 'Use the same email address that was invited to the workspace.' : undefined}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="grid gap-3.5 lg:grid-cols-2"
              >
                <Input
                  label="Password"
                  fieldSize="lg"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  error={errors.password}
                  hint="At least 8 characters and one number."
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="text-slate-600 transition hover:text-slate-900"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
                <Input
                  label="Confirm password"
                  fieldSize="lg"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  error={errors.confirmPassword}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="text-slate-600 transition hover:text-slate-900"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
              </motion.div>
            </motion.section>
          ) : (
            <motion.section
              key="step2"
              custom={direction}
              variants={formVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-4"
            >
              <div className="grid gap-3">
                <div>
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700">Workspace setup</h2>
                  <p className="mt-1 text-sm text-slate-600">Launch your Email Engine workspace.</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    label="Workspace name"
                    fieldSize="lg"
                    placeholder="Email Engine Workspace"
                    value={workspaceName}
                    onChange={(event) => updateWorkspaceName(event.target.value)}
                    error={errors.workspaceName}
                  />
                  <Input
                    label="Workspace slug"
                    fieldSize="lg"
                    placeholder="email-engine-workspace"
                    value={workspaceSlug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      setWorkspaceSlug(slugify(event.target.value));
                    }}
                    error={errors.workspaceSlug}
                    hint="Lowercase letters, numbers, and hyphens."
                  />
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs text-indigo-800">
                  Workspace mode is set to <strong>Email Marketing</strong> by default.
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-300 bg-white p-3 text-xs leading-5 text-slate-700">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-white text-white transition peer-checked:border-accent-blue peer-checked:bg-accent-blue">
                    {termsAccepted ? <CheckCircle2 className="h-4 w-4" /> : null}
                  </span>
                  <span>
                    I agree to the terms, privacy expectations, and workspace ownership rules for this launch build.
                  </span>
                </label>
                {errors.terms ? <p className="text-xs text-rose-500 animate-shake">{errors.terms}</p> : null}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end"
      >
        {step === 2 && !inviteMode ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => goToStep(1)}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </motion.button>
        ) : null}
        <Button
          type="submit"
          size="md"
          className="w-full sm:w-auto group relative h-11 overflow-hidden rounded-xl px-5 text-sm font-semibold disabled:hover:bg-indigo-600"
          loading={loading}
        >
          <span className="relative z-10">
            {inviteMode ? 'Join workspace' : step === 1 ? 'Continue to workspace setup' : 'Start my workspace'}
          </span>
          <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
          <span className="absolute inset-0 bg-gradient-to-r from-accent-blue to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="border-t border-slate-200 pt-4 text-center text-[10px] uppercase leading-4 tracking-[0.16em] text-slate-500"
      >
        {inviteMode ? 'Workspace access will be attached automatically after sign up' : 'No credit card required | Takes less than a minute'}
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="text-center text-sm leading-7 text-slate-600"
      >
        Already have an account?{' '}
        <Link
          to={inviteMode ? `/signin?invite=1&email=${encodeURIComponent(email.trim() || invitedEmail)}` : '/signin'}
          className="group relative font-medium text-accent-blue transition-all hover:text-accent-blue/80"
        >
          Sign in
          <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-accent-blue transition-all duration-300 group-hover:w-full" />
        </Link>
      </motion.p>
    </form>
  );
}
