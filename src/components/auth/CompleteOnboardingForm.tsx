import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { completePendingSignupIfAvailable, completeSignup, getPendingSignupPayloadFromUser } from '../../lib/auth-helpers';
import { getDashboardPath, isValidWorkspaceSlug, slugify } from '../../lib/utils';
import type { AppPageGuide } from '../../context/AppGuideContext';
import { useAuth } from '../../hooks/useAuth';
import { usePageGuide } from '../../hooks/useAppGuide';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { WorkspaceSetupFields } from './WorkspaceSetupFields';

export function CompleteOnboardingForm() {
  const navigate = useNavigate();
  const { session, user, refreshWorkspace, workspace } = useAuth();
  const [fullName, setFullName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<'fullName' | 'workspaceName' | 'workspaceSlug', string>>
  >({});
  const autoCompleteAttemptedRef = useRef(false);
  const pendingSignupPayload = useMemo(() => getPendingSignupPayloadFromUser(user), [user]);

  const guide = useMemo<AppPageGuide>(
    () => ({
      key: 'auth-complete-onboarding',
      title: 'Finish workspace onboarding',
      summary:
        'This page appears when the account exists but the shared Email Engine workspace has not been created yet. Completing it unlocks the app.',
      nextStep: 'Confirm the user profile, set workspace details, and finish onboarding.',
      highlights: ['Workspace creation', 'Shared platform setup'],
      autoStart: 'once' as const,
      steps: [
        {
          id: 'onboarding-name',
          title: 'Confirm the profile name',
          body: 'This name is used inside the workspace for ownership and activity history.',
          targetId: 'complete-onboarding-name',
        },
        {
          id: 'onboarding-workspace',
          title: 'Set the workspace identity',
          body: 'The workspace name and slug become the shared context for templates, imports, and automation settings.',
          targetId: 'complete-onboarding-workspace-name',
        },
        {
          id: 'onboarding-submit',
          title: 'Finish and enter the platform',
          body: 'Submitting here creates the workspace, links the account, and routes the user into the email workspace.',
          targetId: 'complete-onboarding-submit',
          placement: 'top',
        },
      ],
    }),
    [],
  );

  usePageGuide(guide);

  useEffect(() => {
    setFullName(
      (user?.user_metadata?.full_name as string | undefined) ??
        (user?.user_metadata?.name as string | undefined) ??
        '',
    );
  }, [user]);

  useEffect(() => {
    if (!pendingSignupPayload) {
      return;
    }

    setFullName((current) => current || pendingSignupPayload.full_name);
    setWorkspaceName((current) => current || pendingSignupPayload.workspace_name);
    setWorkspaceSlug((current) => current || pendingSignupPayload.workspace_slug);
  }, [pendingSignupPayload]);

  useEffect(() => {
    if (workspace) {
      navigate(getDashboardPath(workspace), { replace: true });
    }
  }, [navigate, workspace]);

  useEffect(() => {
    if (!session || workspace || !pendingSignupPayload || autoCompleteAttemptedRef.current) {
      return;
    }

    autoCompleteAttemptedRef.current = true;
    setLoading(true);

    void completePendingSignupIfAvailable(session, user)
      .then(async (nextWorkspace) => {
        if (!nextWorkspace) {
          return;
        }

        await refreshWorkspace(session);
        toast.success('Workspace created. Welcome to Email Engine.');
        navigate(getDashboardPath(nextWorkspace), { replace: true });
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? `${error.message} Review your workspace details below to finish setup.`
            : 'Automatic workspace setup could not be completed. Review your details below.';
        toast.error(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate, pendingSignupPayload, refreshWorkspace, session, user, workspace]);

  function updateWorkspaceName(value: string) {
    setWorkspaceName(value);
    if (!slugTouched) {
      setWorkspaceSlug(slugify(value));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: typeof errors = {};
    if (fullName.trim().length < 2) nextErrors.fullName = 'Enter your name.';
    if (workspaceName.trim().length < 2) nextErrors.workspaceName = 'Workspace name is required.';
    if (!isValidWorkspaceSlug(workspaceSlug)) {
      nextErrors.workspaceSlug = 'Use 3+ lowercase characters, numbers, and hyphens only.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !session) {
      return;
    }

    setLoading(true);

    try {
      const nextWorkspace = await completeSignup(
        {
          full_name: fullName.trim(),
          workspace_name: workspaceName.trim(),
          workspace_slug: workspaceSlug.trim(),
        },
        session,
      );

      await refreshWorkspace(session);
      toast.success('Onboarding complete. Your workspace is ready.');
      navigate(getDashboardPath(nextWorkspace), { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to finish onboarding.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Input
        label="Your name"
        data-guide-id="complete-onboarding-name"
        placeholder="Jordan Lee"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        error={errors.fullName}
      />

      <WorkspaceSetupFields
        workspaceName={workspaceName}
        workspaceSlug={workspaceSlug}
        guideIds={{
          workspaceName: 'complete-onboarding-workspace-name',
          workspaceSlug: 'complete-onboarding-workspace-slug',
        }}
        errors={errors}
        onWorkspaceNameChange={updateWorkspaceName}
        onWorkspaceSlugChange={(value) => {
          setSlugTouched(true);
          setWorkspaceSlug(slugify(value));
        }}
      />

      <Button type="submit" className="w-full" loading={loading} data-guide-id="complete-onboarding-submit">
        Finish onboarding
      </Button>
    </form>
  );
}
