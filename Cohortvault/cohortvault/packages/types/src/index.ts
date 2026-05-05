export type WorkspaceRole = "owner" | "builder" | "reviewer";
export type DocumentType = "pdf" | "md" | "deck" | "note";
export type DocumentStatus = "uploaded" | "indexed" | "restricted";
export type VisibilityMode = "workspace" | "restricted";
export type RunOutputMode = "full" | "redacted" | "summary_only";
export type RunStatus = "completed" | "denied";
export type SecretStatus = "active" | "revoked";

export interface DemoPersona {
  id: string;
  email: string;
  name: string;
}

export interface ActorSession {
  actor: DemoPersona;
  personas: DemoPersona[];
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  role: WorkspaceRole;
  documentCount: number;
  memberCount: number;
  secretCount: number;
  lastSecureRunAt?: string;
  secure_mode_default?: boolean;
}

export interface WorkspaceMember {
  id: string;
  email: string;
  name: string;
  role: WorkspaceRole;
  status: "active" | "pending";
  invitedBy: string;
  createdAt: string;
}

export interface DocumentSummary {
  id: string;
  name: string;
  type: DocumentType;
  status: DocumentStatus;
  visibility: VisibilityMode;
  uploadedBy: string;
  createdAt: string;
  chunkCount?: number;
  sizeBytes?: number;
}

export interface SecretSummary {
  id: string;
  name: string;
  provider: string;
  scope: string;
  status: SecretStatus;
  createdBy: string;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
}

export interface SecureRunReceipt {
  runId: string;
  adapterType: "mock-signed-receipt" | "tee-attestation";
  runtimeId: string;
  policyHash: string;
  sourcesTouched: number;
  secretAccessed: boolean;
  signedAt: string;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  actor: string;
  createdAt: string;
  detail: string;
}

export interface RunSource {
  documentId: string;
  documentName: string;
  visibility: VisibilityMode;
  snippet: string;
  redacted: boolean;
}

export interface RunSummary {
  id: string;
  prompt: string;
  status: RunStatus;
  outputMode: RunOutputMode;
  createdAt: string;
  answer?: string;
  selectedSecret?: string;
  denialReason?: string;
}

export interface RunDetail extends RunSummary {
  receipt?: SecureRunReceipt;
  sources: RunSource[];
}

export interface WorkspaceCreateInput {
  name: string;
  useCase?: string;
  secureModeDefault: boolean;
}

export interface WorkspaceInviteInput {
  email: string;
  role: WorkspaceRole;
}

export interface WorkspaceMemberRoleUpdateInput {
  role: WorkspaceRole;
}

export interface SecretCreateInput {
  name: string;
  provider: string;
  scope: string;
}

export interface SecureRunRequest {
  prompt: string;
  outputMode: RunOutputMode;
  selectedSecret?: string;
}

export interface SecureRunResponse {
  runId: string;
  status: "completed";
  answer: string;
  receipt: SecureRunReceipt;
  sources: RunSource[];
}
