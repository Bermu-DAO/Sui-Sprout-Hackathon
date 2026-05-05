"use client";

import { useParams } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import type { DocumentSummary, WorkspaceSummary } from "@cohortvault/types";
import { AppFrame, ErrorMessage, LoadingSkeleton, SectionCard, StatusPill } from "@cohortvault/ui";
import { deleteWorkspaceDocument, fetchWorkspace, fetchWorkspaceDocuments, reindexWorkspaceDocument, uploadWorkspaceDocument } from "../../../../lib/api";
import { useFetch } from "../../../../lib/use-fetch";
import { WorkspaceNav } from "../../../../components/workspace-nav";

export default function WorkspaceDocumentsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceRef = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const [displayName, setDisplayName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<DocumentSummary["visibility"]>("workspace");
  const [submitting, setSubmitting] = useState(false);
  const [workingDocumentId, setWorkingDocumentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ message: string; code?: number } | null>(null);
  const { state, refetch } = useFetch<{
    workspace: WorkspaceSummary;
    documents: DocumentSummary[];
    documentsForbidden: boolean;
  }>(
    async () => {
      const workspaceResult = await fetchWorkspace(workspaceRef);
      try {
        const documentResult = await fetchWorkspaceDocuments(workspaceRef, { limit: 100, offset: 0 });

        return {
          workspace: workspaceResult,
          documents: documentResult.items,
          documentsForbidden: false
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown API error";
        if (message.includes("Reviewer role can inspect outputs")) {
          return {
            workspace: workspaceResult,
            documents: [],
            documentsForbidden: true
          };
        }
        throw error;
      }
    },
    [workspaceRef]
  );
  const workspace = state.status === "success" ? state.data.workspace : null;
  const documents = state.status === "success" ? state.data.documents : [];
  const documentsForbidden = state.status === "success" ? state.data.documentsForbidden : false;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setActionError({ message: "Choose a local file before uploading." });
      return;
    }

    const form = event.currentTarget;
    setSubmitting(true);
    setActionError(null);

    try {
      await uploadWorkspaceDocument(workspaceRef, selectedFile, visibility, displayName);
      setDisplayName("");
      setSelectedFile(null);
      setVisibility("workspace");
      form.reset();
      refetch();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown API error";
      const code = message.includes("403") ? 403 : message.includes("404") ? 404 : undefined;
      setActionError({ message, code });
    } finally {
      setSubmitting(false);
    }
  }

  async function onReindex(documentId: string) {
    setWorkingDocumentId(documentId);
    setActionError(null);
    try {
      await reindexWorkspaceDocument(workspaceRef, documentId);
      refetch();
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "Unknown API error";
      const code = message.includes("403") ? 403 : message.includes("404") ? 404 : undefined;
      setActionError({ message, code });
    } finally {
      setWorkingDocumentId(null);
    }
  }

  async function onDelete(documentId: string) {
    setWorkingDocumentId(documentId);
    setActionError(null);
    try {
      await deleteWorkspaceDocument(workspaceRef, documentId);
      refetch();
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "Unknown API error";
      const code = message.includes("403") ? 403 : message.includes("404") ? 404 : undefined;
      setActionError({ message, code });
    } finally {
      setWorkingDocumentId(null);
    }
  }

  const canManageDocuments = workspace?.role === "owner";
  const isBuilderView = workspace?.role === "builder";
  const isReviewerView = workspace?.role === "reviewer";

  return (
    <AppFrame eyebrow="Workspace documents" title="Documents">
      <WorkspaceNav active="documents" workspaceRef={workspaceRef} />

      {state.status === "loading" ? <LoadingSkeleton rows={4} /> : null}
      {state.status === "error" ? (
        <div className="cv-inline" style={{ marginBottom: 20 }}>
          <ErrorMessage code={state.code} message={state.message} />
          <button className="cv-button" onClick={refetch} type="button">
            Retry
          </button>
        </div>
      ) : null}

      {actionError ? (
        <div className="cv-inline" style={{ marginBottom: 20 }}>
          <ErrorMessage code={actionError.code} message={actionError.message} />
        </div>
      ) : null}

      {state.status === "success" ? (
        <>
      <SectionCard
        title="Access posture"
        description="Input browsing and document management are clipped per viewer."
      >
        {canManageDocuments ? (
          <p className="cv-muted">Owner-only view: upload, reindex, and delete are enabled. Owner also sees restricted inputs in this list.</p>
        ) : null}
        {isBuilderView ? (
          <p className="cv-muted">Read-only view: builders can inspect workspace-visible inputs here, but restricted documents are removed from the list.</p>
        ) : null}
        {isReviewerView ? (
          <p className="cv-muted">Forbidden view: reviewers can inspect output artifacts and receipts, but cannot browse workspace inputs.</p>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Upload and ingest"
        description="Uploads now only queue ingestion. The worker reads the Postgres job table, parses the file, and writes chunks back into persistent storage."
      >
        <form className="cv-form" onSubmit={onSubmit}>
          <label className="cv-label">
            Local file
            <input
              accept=".md,.markdown,.pdf,.ppt,.pptx,.txt,.doc,.docx"
              className="cv-input"
              disabled={!canManageDocuments}
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
                setActionError(null);
              }}
              type="file"
            />
          </label>
          <label className="cv-label">
            Display name (optional)
            <input
              className="cv-input"
              disabled={!canManageDocuments}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Defaults to the local filename"
              value={displayName}
            />
          </label>
          <label className="cv-label">
            Visibility
            <select
              className="cv-select"
              disabled={!canManageDocuments}
              onChange={(event) => setVisibility(event.target.value as DocumentSummary["visibility"])}
              value={visibility}
            >
              <option value="workspace">workspace</option>
              <option value="restricted">restricted</option>
            </select>
          </label>
          {!canManageDocuments ? (
            <p className="cv-muted">{isReviewerView ? "Owner-only action: reviewers cannot upload inputs." : "Owner-only action: current actor is read-only for document management."}</p>
          ) : null}
          {selectedFile ? (
            <p className="cv-muted">
              Ready to upload: <strong>{selectedFile.name}</strong>
            </p>
          ) : null}
          <div className="cv-inline">
            <button className="cv-button cv-button-primary" disabled={submitting || !selectedFile || !canManageDocuments} type="submit">
              {submitting ? "Uploading..." : "Upload document"}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Workspace corpus"
        description="Use reindex to enqueue the worker again. Uploaded means the worker has not finished yet."
      >
        {documentsForbidden ? (
          <ErrorMessage code={403} message="Reviewer role can inspect outputs, not workspace inputs." />
        ) : (
          <table className="cv-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Visibility</th>
                <th>Chunks</th>
                <th>Uploaded by</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td>{document.name}</td>
                  <td>
                    <StatusPill tone={document.status === "indexed" ? "success" : "warning"}>{document.status}</StatusPill>
                    {document.lastError ? (
                      <p className="cv-muted" style={{ marginTop: 8 }}>
                        {document.lastError}
                      </p>
                    ) : null}
                  </td>
                  <td>{document.visibility}</td>
                  <td>{document.chunkCount ?? 0}</td>
                  <td>{document.uploadedBy}</td>
                  <td>
                    <div className="cv-inline">
                      <button
                        className="cv-button"
                        disabled={!canManageDocuments || workingDocumentId === document.id}
                        onClick={() => void onReindex(document.id)}
                        type="button"
                      >
                        Reindex
                      </button>
                      <button
                        className="cv-button"
                        disabled={!canManageDocuments || workingDocumentId === document.id}
                        onClick={() => void onDelete(document.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
        </>
      ) : null}
    </AppFrame>
  );
}
