from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    model_config = ConfigDict(populate_by_name=True)

    items: list[T]
    total: int
    limit: int
    offset: int
    has_more: bool = Field(serialization_alias="hasMore")


class HealthResponse(BaseModel):
    status: str
    service: str
    attestation_adapter: str
    llm_configured: bool


class PersonaResponse(BaseModel):
    id: str
    email: str
    name: str


class SessionResponse(BaseModel):
    actor: PersonaResponse | None = None
    personas: list[PersonaResponse]


class SessionActorRequest(BaseModel):
    actorId: str


class WorkspaceSummaryResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: str
    role: str
    documentCount: int
    memberCount: int
    secretCount: int
    lastSecureRunAt: str | None = None
    secureModeDefault: bool


class WorkspaceCreateRequest(BaseModel):
    name: str
    useCase: str | None = None
    secureModeDefault: bool = True


class WorkspaceMemberResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    status: str
    invitedBy: str
    createdAt: str


class InviteMemberRequest(BaseModel):
    email: str
    role: str


class UpdateMemberRoleRequest(BaseModel):
    role: str


class DocumentSummaryResponse(BaseModel):
    id: str
    name: str
    type: str
    status: str
    visibility: str
    uploadedBy: str
    createdAt: str
    chunkCount: int | None = None
    sizeBytes: int | None = None
    lastError: str | None = None


class SecretSummaryResponse(BaseModel):
    id: str
    name: str
    provider: str
    scope: str
    status: str
    createdBy: str
    createdAt: str
    lastUsedAt: str | None = None
    revokedAt: str | None = None


class SecretCreateRequest(BaseModel):
    name: str
    provider: str
    scope: str
    secretValue: str | None = None


class CapabilityLeaseResponse(BaseModel):
    capabilityId: str
    token: str
    secretId: str
    scope: str
    expiresAt: str


class AuditEventResponse(BaseModel):
    id: str
    eventType: str
    actor: str
    createdAt: str
    detail: str


class RunSourceResponse(BaseModel):
    documentId: str
    documentName: str
    visibility: str
    snippet: str
    redacted: bool
    citation: str | None = None
    rank: int | None = None
    chunkIndex: int | None = None
    distance: float | None = None


class ReceiptPayloadResponse(BaseModel):
    version: str
    runId: str
    outputMode: str
    runtimeId: str
    policyHash: str
    sourceScopeHash: str
    sourcesTouched: int
    secretAccessed: bool
    signedAt: str
    providerInfo: ProviderInfoResponse | None = None
    runtimeMetadata: RuntimeMetadataResponse | None = None


class SourceScopeResponse(BaseModel):
    documentIds: list[str]
    scopeHash: str


class ProviderInfoResponse(BaseModel):
    kind: str
    displayName: str
    configured: bool
    remotelyVerifiable: bool
    provesHardwareAttestation: bool


class RuntimeMetadataResponse(BaseModel):
    runtimeId: str
    executionClass: str


class SecureRunReceiptResponse(BaseModel):
    runId: str
    adapterType: str
    runtimeId: str
    runtimeMetadata: RuntimeMetadataResponse | None = None
    providerInfo: ProviderInfoResponse | None = None
    policyHash: str
    sourcesTouched: int
    secretAccessed: bool
    signedAt: str
    receiptPayload: ReceiptPayloadResponse | None = None
    signature: str | None = None
    signatureAlgorithm: str | None = None
    sourceScope: SourceScopeResponse | None = None
    verified: bool = False


class SecureRunRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    outputMode: str
    selectedSecret: str | None = None
    capabilityToken: str | None = None


class SecureRunResponse(BaseModel):
    runId: str
    status: str
    answer: str
    receipt: SecureRunReceiptResponse
    sources: list[RunSourceResponse]


class RunSummaryResponse(BaseModel):
    id: str
    prompt: str
    status: str
    outputMode: str
    createdAt: str
    answer: str | None = None
    selectedSecret: str | None = None
    denialReason: str | None = None


class RunDetailResponse(RunSummaryResponse):
    receipt: SecureRunReceiptResponse | None = None
    sources: list[RunSourceResponse]
