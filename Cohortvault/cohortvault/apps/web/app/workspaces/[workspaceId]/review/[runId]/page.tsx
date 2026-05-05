"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { RunDetail } from "@cohortvault/types";
import { AppFrame, SectionCard, StatusPill } from "@cohortvault/ui";
import { fetchWorkspaceRun } from "../../../../../lib/api";

export default function WorkspaceReviewPage() {
  const params = useParams<{ workspaceId: string; runId: string }>();
  const workspaceRef = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const runId = Array.isArray(params.runId) ? params.runId[0] : params.runId;
  const [run, setRun] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setRun(await fetchWorkspaceRun(workspaceRef, runId));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unknown API error");
      }
    }

    if (workspaceRef && runId) {
      void load();
    }
  }, [runId, workspaceRef]);

  return (
    <AppFrame eyebrow="Reviewer artifact" title="Review">
      {error ? <p className="cv-muted">{error}</p> : null}

      {run ? (
        <div className="cv-grid">
          <SectionCard
            className="cv-grid-span-4"
            title="Run summary"
            description="This page is meant for judges, mentors, or reviewers who need provenance without raw material exposure."
          >
            <div className="cv-inline" style={{ justifyContent: "space-between", marginBottom: 14 }}>
              <strong>{run.prompt}</strong>
              <StatusPill tone={run.status === "completed" ? "success" : "warning"}>{run.status}</StatusPill>
            </div>
            <div className="cv-answer">{run.answer ?? run.denialReason ?? "No output available."}</div>
          </SectionCard>

          <SectionCard
            className="cv-grid-span-4"
            title="Receipt"
            description="Receipt metadata persists separately from the UI and can be re-opened by run ID."
          >
            {run.receipt ? (
              <table className="cv-table">
                <tbody>
                  <tr>
                    <th>Run ID</th>
                    <td>{run.receipt.runId}</td>
                  </tr>
                  <tr>
                    <th>Runtime</th>
                    <td>{run.receipt.runtimeId}</td>
                  </tr>
                  <tr>
                    <th>Policy hash</th>
                    <td>{run.receipt.policyHash}</td>
                  </tr>
                  <tr>
                    <th>Sources touched</th>
                    <td>{run.receipt.sourcesTouched}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="cv-muted">No receipt was created for this run.</p>
            )}
          </SectionCard>

          <SectionCard title="Sources" description="Sources are visible as redacted or full snippets depending on output policy.">
            <div className="cv-stack">
              {run.sources.map((source) => (
                <div className="cv-card cv-card-inset" key={`${run.id}-${source.documentId}`}>
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
      ) : (
        <p className="cv-muted">Loading run review...</p>
      )}
    </AppFrame>
  );
}
