"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { AppFrame, ErrorMessage, SectionCard } from "@cohortvault/ui";
import { createWorkspace } from "../../lib/api";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("Team Atlas Clone");
  const [useCase, setUseCase] = useState("Private research planning and investor prep");
  const [secureModeDefault, setSecureModeDefault] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const workspace = await createWorkspace({
        name,
        useCase,
        secureModeDefault
      });
      router.push(`/workspaces/${workspace.slug}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown API error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppFrame eyebrow="Workspace setup" title="Onboarding">
      <SectionCard
        title="Create a secure workspace"
        description="This matches the first step of the README demo flow: create a workspace, land inside the dashboard, then invite teammates and upload documents."
      >
        <form className="cv-form" onSubmit={onSubmit}>
          <label className="cv-label">
            Workspace name
            <input className="cv-input" onChange={(event) => setName(event.target.value)} value={name} />
          </label>
          <label className="cv-label">
            Team use case
            <textarea className="cv-textarea" onChange={(event) => setUseCase(event.target.value)} value={useCase} />
          </label>
          <label className="cv-inline">
            <input
              checked={secureModeDefault}
              onChange={(event) => setSecureModeDefault(event.target.checked)}
              type="checkbox"
            />
            Start new workspaces in Secure Run mode by default
          </label>
          <div className="cv-inline">
            <button className="cv-button cv-button-primary" disabled={submitting} type="submit">
              {submitting ? "Creating..." : "Create workspace"}
            </button>
          </div>
          {error ? <ErrorMessage message={error} /> : null}
        </form>
      </SectionCard>
    </AppFrame>
  );
}
