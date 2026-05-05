import type {
  ActorSession,
  AuditEvent,
  DocumentSummary,
  RunDetail,
  RunSummary,
  SecretCreateInput,
  SecretSummary,
  SecureRunRequest,
  SecureRunResponse,
  SecureRunReceipt,
  WorkspaceCreateInput,
  WorkspaceInviteInput,
  WorkspaceMember,
  WorkspaceMemberRoleUpdateInput,
  WorkspaceSummary
} from "@cohortvault/types";

export const DEFAULT_WORKSPACE_REF = "team-atlas";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function readJson<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
    credentials: "include"
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        message = payload.detail;
      }
    } catch {
      // Keep the default message when the backend response is not JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function sendJson<T>(path: string, body: unknown, method = "POST") {
  return readJson<T>(path, {
    method,
    body: JSON.stringify(body)
  });
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function fetchSession() {
  return readJson<ActorSession>("/api/v1/session");
}

export function switchActor(actorId: string) {
  return sendJson<ActorSession>("/api/v1/session/actor", { actorId });
}

export function fetchWorkspaces() {
  return readJson<WorkspaceSummary[]>("/api/v1/workspaces");
}

export function createWorkspace(payload: WorkspaceCreateInput) {
  return sendJson<WorkspaceSummary>("/api/v1/workspaces", payload);
}

export function fetchWorkspace(workspaceRef: string) {
  return readJson<WorkspaceSummary>(`/api/v1/workspaces/${workspaceRef}`);
}

export function fetchWorkspaceMembers(workspaceRef: string) {
  return readJson<WorkspaceMember[]>(`/api/v1/workspaces/${workspaceRef}/members`);
}

export function inviteWorkspaceMember(workspaceRef: string, payload: WorkspaceInviteInput) {
  return sendJson<WorkspaceMember>(`/api/v1/workspaces/${workspaceRef}/invite`, payload);
}

export function updateWorkspaceMemberRole(
  workspaceRef: string,
  memberId: string,
  payload: WorkspaceMemberRoleUpdateInput
) {
  return sendJson<WorkspaceMember>(`/api/v1/workspaces/${workspaceRef}/members/${memberId}`, payload, "PATCH");
}

export function fetchWorkspaceDocuments(workspaceRef: string) {
  return readJson<DocumentSummary[]>(`/api/v1/workspaces/${workspaceRef}/documents`);
}

export function uploadWorkspaceDocument(
  workspaceRef: string,
  file: File,
  visibility: DocumentSummary["visibility"],
  displayName?: string
) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("visibility", visibility);

  if (displayName?.trim()) {
    formData.set("display_name", displayName.trim());
  }

  return readJson<DocumentSummary>(`/api/v1/workspaces/${workspaceRef}/documents`, {
    method: "POST",
    body: formData
  });
}

export function reindexWorkspaceDocument(workspaceRef: string, documentId: string) {
  return sendJson<DocumentSummary>(`/api/v1/workspaces/${workspaceRef}/documents/${documentId}/reindex`, {});
}

export async function deleteWorkspaceDocument(workspaceRef: string, documentId: string) {
  await readJson<unknown>(`/api/v1/workspaces/${workspaceRef}/documents/${documentId}`, {
    method: "DELETE"
  });
}

export function fetchWorkspaceAuditEvents(workspaceRef: string) {
  return readJson<AuditEvent[]>(`/api/v1/workspaces/${workspaceRef}/audit`);
}

export function fetchWorkspaceSecrets(workspaceRef: string) {
  return readJson<SecretSummary[]>(`/api/v1/workspaces/${workspaceRef}/secrets`);
}

export function createWorkspaceSecret(workspaceRef: string, payload: SecretCreateInput) {
  return sendJson<SecretSummary>(`/api/v1/workspaces/${workspaceRef}/secrets`, payload);
}

export function revokeWorkspaceSecret(workspaceRef: string, secretId: string) {
  return sendJson<SecretSummary>(`/api/v1/workspaces/${workspaceRef}/secrets/${secretId}/revoke`, {});
}

export function fetchWorkspaceRuns(workspaceRef: string) {
  return readJson<RunSummary[]>(`/api/v1/workspaces/${workspaceRef}/runs`);
}

export function fetchWorkspaceRun(workspaceRef: string, runId: string) {
  return readJson<RunDetail>(`/api/v1/workspaces/${workspaceRef}/runs/${runId}`);
}

export function fetchLatestReceipt(workspaceRef: string) {
  return readJson<SecureRunReceipt>(`/api/v1/workspaces/${workspaceRef}/receipts/latest`);
}

export function fetchReceipt(workspaceRef: string, runId: string) {
  return readJson<SecureRunReceipt>(`/api/v1/workspaces/${workspaceRef}/receipts/${runId}`);
}

export function runSecureWorkflow(workspaceRef: string, payload: SecureRunRequest) {
  return sendJson<SecureRunResponse>(`/api/v1/workspaces/${workspaceRef}/runs/secure`, payload);
}
