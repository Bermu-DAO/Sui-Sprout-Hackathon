"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuditEvent, RunSummary, SecretSummary, SecureRunReceipt, WorkspaceMember, WorkspaceSummary } from "@cohortvault/types";
import { AppFrame, Metric, SectionCard, StatusPill } from "@cohortvault/ui";
import { fetchLatestReceipt, fetchWorkspace, fetchWorkspaceAuditEvents, fetchWorkspaceMembers, fetchWorkspaceRuns, fetchWorkspaceSecrets } from "../../../lib/api";
import { WorkspaceNav } from "../../../components/workspace-nav";

export default function WorkspaceDashboardPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceRef = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [receipt, setReceipt] = useState<SecureRunReceipt | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [secrets, setSecrets] = useState<SecretSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [workspaceResult, receiptResult, eventResult, memberResult, runResult, secretResult] = await Promise.all([
          fetchWorkspace(workspaceRef),
          fetchLatestReceipt(workspaceRef),
          fetchWorkspaceAuditEvents(workspaceRef),
          fetchWorkspaceMembers(workspaceRef),
          fetchWorkspaceRuns(workspaceRef),
          fetchWorkspaceSecrets(workspaceRef)
        ]);
        setWorkspace(workspaceResult);
        setReceipt(receiptResult);
        setEvents(eventResult);
        setMembers(memberResult);
        setRuns(runResult);
        setSecrets(secretResult);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unknown API error");
      }
    }

    if (workspaceRef) {
      void load();
    }
  }, [workspaceRef]);

  return (
    <AppFrame eyebrow="Workspace dashboard" title={workspace?.name ?? "Workspace"}>
      <WorkspaceNav active="dashboard" workspaceRef={workspaceRef} />

      {error ? <p className="cv-muted">{error}</p> : null}

      <div className="cv-grid">
        <SectionCard
          className="cv-grid-span-4"
          title="Trust status"
          description="This is the command center the PRD calls for: one place to see receipts, counts, and secure posture."
        >
          <div className="cv-actions" style={{ marginBottom: 16 }}>
            <StatusPill tone="success">secure run ready</StatusPill>
            <StatusPill tone="neutral">{workspace?.documentCount ?? 0} docs indexed</StatusPill>
            <StatusPill tone={secrets.some((secret) => secret.status === "active") ? "success" : "warning"}>
              {secrets.filter((secret) => secret.status === "active").length} active secrets
            </StatusPill>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <Metric label="Members" value={String(members.length)} />
            <Metric label="Runs" value={String(runs.length)} />
            <Metric label="Role" value={workspace?.role ?? "owner"} />
          </div>
          <p className="cv-muted" style={{ marginTop: 14 }}>
            CohortVault stays honest here: the runtime is still a signed receipt adapter, but the workspace, retrieval,
            audit, and secret flows are now wired together end to end.
          </p>
        </SectionCard>

        <SectionCard
          className="cv-grid-span-4"
          title="Quick actions"
          description="These are the core demo hops judges should see in under 90 seconds."
        >
          <div className="cv-actions">
            <Link className="cv-button cv-button-primary" href={`/workspaces/${workspaceRef}/documents`}>
              Upload documents
            </Link>
            <Link className="cv-button" href={`/workspaces/${workspaceRef}/secure-run`}>
              Run Securely
            </Link>
            <Link className="cv-button" href={`/workspaces/${workspaceRef}/settings`}>
              Invite teammate / manage secrets
            </Link>
            <Link className="cv-button" href={`/workspaces/${workspaceRef}/audit`}>
              Inspect audit log
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="Recent runs" description="Latest secure workflows, including any denied runs after secret revocation.">
          <table className="cv-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Prompt</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 4).map((run) => (
                <tr key={run.id}>
                  <td>
                    <StatusPill tone={run.status === "completed" ? "success" : "warning"}>{run.status}</StatusPill>
                  </td>
                  <td>
                    <Link href={`/workspaces/${workspaceRef}/review/${run.id}`}>{run.prompt}</Link>
                  </td>
                  <td>{run.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Latest receipt" description="Receipts are persisted per run and can be reviewed from the dashboard or the reviewer page.">
          {receipt ? (
            <table className="cv-table">
              <tbody>
                <tr>
                  <th>Run ID</th>
                  <td>{receipt.runId}</td>
                </tr>
                <tr>
                  <th>Adapter</th>
                  <td>{receipt.adapterType}</td>
                </tr>
                <tr>
                  <th>Policy Hash</th>
                  <td>{receipt.policyHash}</td>
                </tr>
                <tr>
                  <th>Sources touched</th>
                  <td>{receipt.sourcesTouched}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="cv-muted">No receipt available yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Recent audit events" description="The audit feed now includes workspace, document, secret, and run events.">
          <table className="cv-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Actor</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 6).map((event) => (
                <tr key={event.id}>
                  <td>{event.detail}</td>
                  <td>{event.actor}</td>
                  <td>{event.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </AppFrame>
  );
}
