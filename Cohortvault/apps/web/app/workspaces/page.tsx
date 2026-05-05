"use client";

import Link from "next/link";
import type { WorkspaceSummary } from "@cohortvault/types";
import { AppFrame, ErrorMessage, LoadingSkeleton, Metric, SectionCard, StatusPill } from "@cohortvault/ui";
import { fetchWorkspaces } from "../../lib/api";
import { useFetch } from "../../lib/use-fetch";

export default function WorkspacesPage() {
  const { state, refetch } = useFetch<WorkspaceSummary[]>(() => fetchWorkspaces(), []);
  const workspaces = state.status === "success" ? state.data : [];

  return (
    <AppFrame eyebrow="Workspace index" title="Workspaces">
      <div className="cv-actions" style={{ marginBottom: 20 }}>
        <Link className="cv-button cv-button-primary" href="/onboarding">
          Create workspace
        </Link>
        <Link className="cv-button" href="/login">
          Demo personas
        </Link>
      </div>

      {state.status === "loading" ? <LoadingSkeleton rows={3} /> : null}
      {state.status === "error" ? (
        <div className="cv-inline" style={{ marginBottom: 20 }}>
          <ErrorMessage code={state.code} message={state.message} />
          <button className="cv-button" onClick={refetch} type="button">
            Retry
          </button>
        </div>
      ) : null}

      {state.status === "success" ? (
        <div className="cv-grid">
          <SectionCard
            className="cv-grid-span-4"
            title="Hackathon checklist"
            description="These modules now map more closely to the docs: workspace creation, file upload, Secure Run, audit, secrets, and review artifacts."
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              <Metric label="Workspaces" value={String(workspaces.length)} />
              <Metric label="Routes live" value="9" />
              <Metric label="Core loops" value="4" />
            </div>
          </SectionCard>

          <SectionCard
            className="cv-grid-span-4"
            title="Available workspaces"
            description="Choose a workspace to continue into the full product flow."
          >
            <div className="cv-stack">
              {workspaces.map((workspace) => (
                <Link className="cv-card cv-card-inset cv-card-link" href={`/workspaces/${workspace.slug}`} key={workspace.id}>
                  <div className="cv-inline" style={{ justifyContent: "space-between" }}>
                    <strong>{workspace.name}</strong>
                    <StatusPill tone={workspace.secureModeDefault ? "success" : "neutral"}>
                      {workspace.role}
                    </StatusPill>
                  </div>
                  <p className="cv-muted" style={{ marginTop: 10 }}>
                    {workspace.description}
                  </p>
                  <div className="cv-inline" style={{ marginTop: 14 }}>
                    <span className="cv-muted">{workspace.documentCount} docs</span>
                    <span className="cv-muted">{workspace.memberCount} members</span>
                    <span className="cv-muted">{workspace.secretCount} secrets</span>
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}
    </AppFrame>
  );
}
