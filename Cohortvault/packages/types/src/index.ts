export type WorkspaceRole = "owner" | "builder" | "reviewer";
export type DocumentType = "pdf" | "md" | "deck" | "note";
export type DocumentStatus = "uploaded" | "indexed" | "restricted" | "failed";
export type VisibilityMode = "workspace" | "restricted";
export type RunOutputMode = "full" | "redacted" | "summary_only";
export type RunStatus = "completed" | "denied";
export type SecretStatus = "active" | "revoked";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface DemoPersona {
  id: string;
  email: string;
  name: string;
}

export interface ActorSession {
  actor?: DemoPersona | null;
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
  secureModeDefault?: boolean;
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
  lastError?: string;
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

export interface ReceiptPayload {
  version: string;
  runId: string;
  outputMode: RunOutputMode;
  runtimeId: string;
  policyHash: string;
  sourceScopeHash: string;
  sourcesTouched: number;
  secretAccessed: boolean;
  signedAt: string;
  providerInfo?: ProviderInfo | null;
  runtimeMetadata?: RuntimeMetadata | null;
}

export interface SourceScope {
  documentIds: string[];
  scopeHash: string;
}

export interface ProviderInfo {
  kind: "lightweight-signed-runtime" | "tee-provider-stub" | string;
  displayName: string;
  configured: boolean;
  remotelyVerifiable: boolean;
  provesHardwareAttestation: boolean;
}

export interface RuntimeMetadata {
  runtimeId: string;
  executionClass: string;
}

export interface SecureRunReceipt {
  runId: string;
  adapterType: "mock-signed-receipt-v1" | "lightweight-runtime-receipt" | "tee-attestation" | "tee-provider-stub";
  runtimeId: string;
  runtimeMetadata?: RuntimeMetadata | null;
  providerInfo?: ProviderInfo | null;
  policyHash: string;
  sourcesTouched: number;
  secretAccessed: boolean;
  signedAt: string;
  receiptPayload?: ReceiptPayload | null;
  signature?: string | null;
  signatureAlgorithm?: string | null;
  sourceScope?: SourceScope | null;
  verified: boolean;
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
  citation?: string;
  rank?: number;
  chunkIndex?: number;
  distance?: number;
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
  secretValue?: string;
}

export interface CapabilityLease {
  capabilityId: string;
  token: string;
  secretId: string;
  scope: string;
  expiresAt: string;
}

export interface SecureRunRequest {
  /** @maxLength 4000 */
  prompt: string;
  outputMode: RunOutputMode;
  selectedSecret?: string;
  capabilityToken?: string;
}

export interface SecureRunResponse {
  runId: string;
  status: "completed";
  answer: string;
  receipt: SecureRunReceipt;
  sources: RunSource[];
}
