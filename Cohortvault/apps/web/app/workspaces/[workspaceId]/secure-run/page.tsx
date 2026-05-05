"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { SecretSummary, SecureRunResponse, WorkspaceSummary } from "@cohortvault/types";
import { AppFrame, ErrorMessage, LoadingSkeleton, SectionCard, StatusPill } from "@cohortvault/ui";
import { fetchWorkspace, fetchWorkspaceSecrets, issueSecretCapability, runSecureWorkflow } from "../../../../lib/api";
import { useFetch } from "../../../../lib/use-fetch";
import { WorkspaceNav } from "../../../../components/workspace-nav";

export default function WorkspaceSecureRunPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceRef = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const [prompt, setPrompt] = useState(
    "Summarize the strongest product wedge from the uploaded materials and keep the answer safe for a builder role."
  );
  const [outputMode, setOutputMode] = useState<"summary_only" | "redacted" | "full">("redacted");
  const [selectedSecret, setSelectedSecret] = useState<string>("");
  const [result, setResult] = useState<SecureRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state: loadState, refetch } = useFetch<{
    workspace: WorkspaceSummary;
    secrets: SecretSummary[];
  }>(
    async () => {
      if (!workspaceRef) {
        throw new Error("Missing workspace reference");
      }
      const [workspaceResult, secretResult] = await Promise.all([
        fetchWorkspace(workspaceRef),
        fetchWorkspaceSecrets(workspaceRef, { limit: 100, offset: 0 })
      ]);
      return { workspace: workspaceResult, secrets: secretResult.items };
    },
    [workspaceRef]
  );
  const workspace = loadState.status === "success" ? loadState.data.workspace : null;
  const secrets = loadState.status === "success" ? loadState.data.secrets : [];

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
      let capabilityToken: string | undefined;
      if (selectedSecret) {
        const capability = await issueSecretCapability(workspaceRef, selectedSecret);
        capabilityToken = capability.token;
      }
      const response = await runSecureWorkflow(workspaceRef, {
        prompt,
        outputMode,
        capabilityToken
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
      {loadState.status === "loading" ? <LoadingSkeleton rows={3} /> : null}
      {loadState.status === "error" ? (
        <div className="cv-inline" style={{ marginBottom: 20 }}>
          <ErrorMessage code={loadState.code} message={loadState.message} />
          <button className="cv-button" onClick={refetch} type="button">
            Retry
          </button>
        </div>
      ) : null}

      {loadState.status === "success" ? (
        <div className="cv-hero">
          <SectionCard
            title="Access posture"
            description="Execution access is separate from document browsing and from output review."
          >
            {workspace?.role === "owner" ? (
              <p className="cv-muted">Owner-only powers remain in settings and documents. Owners can also execute Secure Run with delegated secret capabilities.</p>
            ) : null}
            {workspace?.role === "builder" ? (
              <p className="cv-muted">Read-only operator view: builders can execute Secure Run, but cannot manage members, secrets, or raw secret values.</p>
            ) : null}
            {workspace?.role === "reviewer" ? (
              <p className="cv-muted">Forbidden: reviewers can inspect receipts and review artifacts, but cannot execute Secure Run.</p>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Run a controlled workflow"
            description="This page uses indexed workspace data, OpenAI chat, output-mode filtering, signed receipt v1 records, and audit events."
          >
            <form className="cv-form" onSubmit={onSubmit}>
              <label className="cv-label">
                Task prompt
                <textarea
                  className="cv-textarea"
                  maxLength={4000}
                  onChange={(event) => setPrompt(event.target.value)}
                  value={prompt}
                />
                <p className="cv-muted" style={{ marginTop: 4, textAlign: "right" }}>
                  {4000 - prompt.length} characters remaining
                </p>
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
              {!canRun ? <p className="cv-muted">Forbidden: current actor cannot execute Secure Run.</p> : null}
              {error ? <ErrorMessage message={error} /> : null}
            </form>
          </SectionCard>

          <SectionCard
            title="Execution receipt"
            description="The result includes a signed receipt v1 plus explicit provider metadata. This is application-level evidence unless a real TEE provider is wired in and validated."
          >
            {result ? (
              <div className="cv-stack">
                <StatusPill tone={result.receipt.verified ? "success" : "warning"}>
                  {result.receipt.verified ? "verified" : "unverified"}
                </StatusPill>
                <div className="cv-answer">{result.answer}</div>
                <table className="cv-table">
                  <tbody>
                    <tr>
                      <th>Run ID</th>
                      <td>{result.runId}</td>
                    </tr>
                    <tr>
                      <th>Provider</th>
                      <td>{result.receipt.providerInfo?.displayName ?? result.receipt.adapterType}</td>
                    </tr>
                    <tr>
                      <th>Execution class</th>
                      <td>{result.receipt.runtimeMetadata?.executionClass ?? "application-runtime"}</td>
                    </tr>
                    <tr>
                      <th>Signature</th>
                      <td>{result.receipt.signature ?? "Legacy unsigned receipt"}</td>
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
              <p className="cv-muted">No run yet. Submit the form to generate a persisted signed receipt v1 and source list.</p>
            )}
          </SectionCard>
        </div>
      ) : null}
    </AppFrame>
  );
}
