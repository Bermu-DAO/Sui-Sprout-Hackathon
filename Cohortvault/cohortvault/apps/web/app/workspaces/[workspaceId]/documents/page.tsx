"use client";

import { useParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { DocumentSummary, WorkspaceSummary } from "@cohortvault/types";
import { AppFrame, SectionCard, StatusPill } from "@cohortvault/ui";
import { deleteWorkspaceDocument, fetchWorkspace, fetchWorkspaceDocuments, reindexWorkspaceDocument, uploadWorkspaceDocument } from "../../../../lib/api";
import { WorkspaceNav } from "../../../../components/workspace-nav";

export default function WorkspaceDocumentsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceRef = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<DocumentSummary["visibility"]>("workspace");
  const [submitting, setSubmitting] = useState(false);
  const [workingDocumentId, setWorkingDocumentId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [workspaceResult, documentResult] = await Promise.all([
          fetchWorkspace(workspaceRef),
          fetchWorkspaceDocuments(workspaceRef)
        ]);
        setWorkspace(workspaceResult);
        setDocuments(documentResult);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unknown API error");
      }
    }

    if (workspaceRef) {
      void load();
    }
  }, [workspaceRef]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setError("Choose a local file before uploading.");
      return;
    }

    const form = event.currentTarget;
    setSubmitting(true);
    setError(null);

    try {
      const document = await uploadWorkspaceDocument(workspaceRef, selectedFile, visibility, displayName);
      setDocuments((current) => [document, ...current]);
      setDisplayName("");
      setSelectedFile(null);
      setVisibility("workspace");
      form.reset();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown API error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onReindex(documentId: string) {
    setWorkingDocumentId(documentId);
    setError(null);
    try {
      const updated = await reindexWorkspaceDocument(workspaceRef, documentId);
      setDocuments((current) => current.map((document) => (document.id === updated.id ? updated : document)));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unknown API error");
    } finally {
      setWorkingDocumentId(null);
    }
  }

  async function onDelete(documentId: string) {
    setWorkingDocumentId(documentId);
    setError(null);
    try {
      await deleteWorkspaceDocument(workspaceRef, documentId);
      setDocuments((current) => current.filter((document) => document.id !== documentId));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unknown API error");
    } finally {
      setWorkingDocumentId(null);
    }
  }

  const canManageDocuments = workspace?.role === "owner";

  return (
    <AppFrame eyebrow="Workspace documents" title="Documents">
      <WorkspaceNav active="documents" workspaceRef={workspaceRef} />

      <SectionCard
        title="Upload and ingest"
        description="Uploads now only queue ingestion. The worker reads the sqlite job table, parses the file, and writes chunks back into persistent storage."
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
                setError(null);
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
            <p className="cv-muted">Current actor is read-only for document management.</p>
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
          {error ? <p className="cv-muted">{error}</p> : null}
        </form>
      </SectionCard>

      <SectionCard
        title="Workspace corpus"
        description="Use reindex to enqueue the worker again. Uploaded means the worker has not finished yet."
      >
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
      </SectionCard>
    </AppFrame>
  );
}
