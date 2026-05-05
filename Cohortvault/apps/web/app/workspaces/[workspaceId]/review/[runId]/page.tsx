"use client";

import { useParams } from "next/navigation";
import type { RunDetail, WorkspaceSummary } from "@cohortvault/types";
import { AppFrame, ErrorMessage, LoadingSkeleton, SectionCard, StatusPill } from "@cohortvault/ui";
import { fetchWorkspace, fetchWorkspaceRun } from "../../../../../lib/api";
import { useFetch } from "../../../../../lib/use-fetch";

export default function WorkspaceReviewPage() {
  const params = useParams<{ workspaceId: string; runId: string }>();
  const workspaceRef = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const runId = Array.isArray(params.runId) ? params.runId[0] : params.runId;
  const { state, refetch } = useFetch<{
    workspace: WorkspaceSummary;
    run: RunDetail;
  }>(
    async () => {
      const [workspace, run] = await Promise.all([fetchWorkspace(workspaceRef), fetchWorkspaceRun(workspaceRef, runId)]);
      return { workspace, run };
    },
    [runId, workspaceRef]
  );

  return (
    <AppFrame eyebrow="Reviewer artifact" title="Review">
      {state.status === "loading" ? <LoadingSkeleton rows={4} /> : null}
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
            title="Viewer access"
            description="Output review is clipped again for the current viewer."
          >
            {state.data.workspace.role === "owner" ? (
              <p className="cv-muted">Owner view: full administrative output visibility, including signed receipt metadata and unclipped source scope.</p>
            ) : null}
            {state.data.workspace.role === "builder" ? (
              <p className="cv-muted">Read-only view: builders can inspect outputs, but owner-only fields and restricted source scope stay clipped unless they created the run.</p>
            ) : null}
            {state.data.workspace.role === "reviewer" ? (
              <p className="cv-muted">Output-only review artifact: reviewers can inspect receipts and filtered answers, but not the underlying workspace inputs.</p>
            ) : null}
          </SectionCard>

          <SectionCard
            className="cv-grid-span-4"
            title="Run summary"
            description="This page is meant for judges, mentors, or reviewers who need provenance without raw material exposure."
          >
            <div className="cv-inline" style={{ justifyContent: "space-between", marginBottom: 14 }}>
              <strong>{state.data.run.prompt}</strong>
              <StatusPill tone={state.data.run.status === "completed" ? "success" : "warning"}>{state.data.run.status}</StatusPill>
            </div>
            <div className="cv-answer">{state.data.run.answer ?? state.data.run.denialReason ?? "No output available."}</div>
          </SectionCard>

          <SectionCard
            className="cv-grid-span-4"
            title="Receipt"
            description="This is a signed receipt v1 with explicit provider metadata. It remains separate from any real SGX, Nitro, or dstack attestation claim unless a validated provider is configured."
          >
            {state.data.run.receipt ? (
              <div className="cv-stack">
                <StatusPill tone={state.data.run.receipt.verified ? "success" : "warning"}>
                  {state.data.run.receipt.verified ? "verified" : "unverified"}
                </StatusPill>
                <table className="cv-table">
                  <tbody>
                    <tr>
                      <th>Run ID</th>
                      <td>{state.data.run.receipt.runId}</td>
                    </tr>
                    <tr>
                      <th>Provider</th>
                      <td>{state.data.run.receipt.providerInfo?.displayName ?? state.data.run.receipt.adapterType}</td>
                    </tr>
                    <tr>
                      <th>Runtime</th>
                      <td>{state.data.run.receipt.runtimeId}</td>
                    </tr>
                    <tr>
                      <th>Execution class</th>
                      <td>{state.data.run.receipt.runtimeMetadata?.executionClass ?? "application-runtime"}</td>
                    </tr>
                    <tr>
                      <th>Policy hash</th>
                      <td>{state.data.run.receipt.policyHash}</td>
                    </tr>
                    <tr>
                      <th>Signature</th>
                      <td>{state.data.run.receipt.signature ?? "Legacy unsigned receipt"}</td>
                    </tr>
                    <tr>
                      <th>Source scope</th>
                      <td>
                        {state.data.run.receipt.sourceScope?.documentIds.length
                          ? state.data.run.receipt.sourceScope.documentIds.join(", ")
                          : state.data.run.receipt.sourceScope?.scopeHash
                            ? `Clipped for current viewer (${state.data.run.receipt.sourceScope.scopeHash})`
                            : "Not captured"}
                      </td>
                    </tr>
                    <tr>
                      <th>Sources touched</th>
                      <td>{state.data.run.receipt.sourcesTouched}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="cv-muted">No receipt was created for this run.</p>
            )}
          </SectionCard>

          <SectionCard title="Sources" description="Sources are re-redacted for the current viewer. Full-mode runs stay fully visible only to the run creator or a workspace owner.">
            <div className="cv-stack">
              {state.data.run.sources.map((source) => (
                <div className="cv-card cv-card-inset" key={`${state.data.run.id}-${source.documentId}`}>
                  <div className="cv-inline" style={{ justifyContent: "space-between" }}>
                    <strong>{source.documentName}</strong>
                    <StatusPill tone={source.redacted ? "warning" : "success"}>
                      {source.redacted ? "redacted" : "full"}
                    </StatusPill>
                  </div>
                  <p className="cv-muted" style={{ marginTop: 10 }}>
                    {source.snippet}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}
    </AppFrame>
  );
}
