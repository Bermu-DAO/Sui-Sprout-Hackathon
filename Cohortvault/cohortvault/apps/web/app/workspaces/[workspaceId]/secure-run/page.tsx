"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { SecretSummary, SecureRunResponse, WorkspaceSummary } from "@cohortvault/types";
import { AppFrame, SectionCard, StatusPill } from "@cohortvault/ui";
import { fetchWorkspace, fetchWorkspaceSecrets, runSecureWorkflow } from "../../../../lib/api";
import { WorkspaceNav } from "../../../../components/workspace-nav";

export default function WorkspaceSecureRunPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceRef = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const [prompt, setPrompt] = useState(
    "Summarize the strongest product wedge from the uploaded materials and keep the answer safe for a builder role."
  );
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [outputMode, setOutputMode] = useState<"summary_only" | "redacted" | "full">("redacted");
  const [secrets, setSecrets] = useState<SecretSummary[]>([]);
  const [selectedSecret, setSelectedSecret] = useState<string>("");
  const [result, setResult] = useState<SecureRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [workspaceResult, secretResult] = await Promise.all([
          fetchWorkspace(workspaceRef),
          fetchWorkspaceSecrets(workspaceRef)
        ]);
        setWorkspace(workspaceResult);
        setSecrets(secretResult);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unknown API error");
      }
    }

    if (workspaceRef) {
      void load();
    }
  }, [workspaceRef]);

  const activeSecrets = useMemo(() => secrets.filter((secret) => secret.status === "active"), [secrets]);
  const canRun = workspace?.role === "owner" || workspace?.role === "builder";

  useEffect(() => {
    if (!selectedSecret && activeSecrets[0]) {
      setSelectedSecret(activeSecrets[0].id);
    }
  }, [activeSecrets, selectedSecret]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await runSecureWorkflow(workspaceRef, {
        prompt,
        outputMode,
        selectedSecret: selectedSecret || undefined
      });
      setResult(response);
    } catch (submitError) {
      setResult(null);
      setError(submitError instanceof Error ? submitError.message : "Unknown API error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppFrame eyebrow="Secure Run" title="Secure Run">
      <WorkspaceNav active="secure-run" workspaceRef={workspaceRef} />

      <div className="cv-hero">
        <SectionCard
          title="Run a protected workflow"
          description="This page now uses real workspace data: it retrieves indexed chunks, applies output-mode filtering, persists a receipt, and records audit events."
        >
          <form className="cv-form" onSubmit={onSubmit}>
            <label className="cv-label">
              Task prompt
              <textarea className="cv-textarea" onChange={(event) => setPrompt(event.target.value)} value={prompt} />
            </label>
            <label className="cv-label">
              Output mode
              <select
                className="cv-select"
                onChange={(event) => setOutputMode(event.target.value as "summary_only" | "redacted" | "full")}
                value={outputMode}
              >
                <option value="summary_only">Summary only</option>
                <option value="redacted">Redacted</option>
                <option value="full">Full</option>
              </select>
            </label>
            <label className="cv-label">
              Delegated secret
              <select className="cv-select" onChange={(event) => setSelectedSecret(event.target.value)} value={selectedSecret}>
                <option value="">No secret</option>
                {secrets.map((secret) => (
                  <option key={secret.id} value={secret.id}>
                    {secret.name} ({secret.status})
                  </option>
                ))}
              </select>
            </label>
            <div className="cv-inline">
              <button className="cv-button cv-button-primary" disabled={loading || !canRun} type="submit">
                {loading ? "Running..." : "Run Securely"}
              </button>
              <StatusPill tone={activeSecrets.length > 0 ? "success" : "warning"}>
                {activeSecrets.length > 0 ? "secret broker enabled" : "no active secret"}
              </StatusPill>
            </div>
            {!canRun ? <p className="cv-muted">Current actor cannot execute Secure Run.</p> : null}
            {error ? <p className="cv-muted">{error}</p> : null}
          </form>
        </SectionCard>

        <SectionCard
          title="Execution receipt"
          description="The result includes the persisted receipt plus source metadata shaped for the reviewer page."
        >
          {result ? (
            <div className="cv-stack">
              <StatusPill tone="success">verified</StatusPill>
              <div className="cv-answer">{result.answer}</div>
              <table className="cv-table">
                <tbody>
                  <tr>
                    <th>Run ID</th>
                    <td>{result.runId}</td>
                  </tr>
                  <tr>
                    <th>Adapter</th>
                    <td>{result.receipt.adapterType}</td>
                  </tr>
                  <tr>
                    <th>Policy Hash</th>
                    <td>{result.receipt.policyHash}</td>
                  </tr>
                  <tr>
                    <th>Sources</th>
                    <td>{result.receipt.sourcesTouched}</td>
                  </tr>
                  <tr>
                    <th>Secret Accessed</th>
                    <td>{result.receipt.secretAccessed ? "yes" : "no"}</td>
                  </tr>
                </tbody>
              </table>
              <div className="cv-stack">
                {result.sources.map((source) => (
                  <div className="cv-card cv-card-inset" key={`${result.runId}-${source.documentId}`}>
                    <div className="cv-inline" style={{ justifyContent: "space-between" }}>
                      <strong>{source.documentName}</strong>
                      <StatusPill tone={source.redacted ? "warning" : "success"}>
                        {source.redacted ? "redacted" : "visible"}
                      </StatusPill>
                    </div>
                    <p className="cv-muted" style={{ marginTop: 10 }}>
                      {source.snippet}
                    </p>
                  </div>
                ))}
              </div>
              <Link className="cv-button" href={`/workspaces/${workspaceRef}/review/${result.runId}`}>
                Open reviewer artifact
              </Link>
            </div>
          ) : (
            <p className="cv-muted">No run yet. Submit the form to generate a persisted receipt and source list.</p>
          )}
        </SectionCard>
      </div>
    </AppFrame>
  );
}
