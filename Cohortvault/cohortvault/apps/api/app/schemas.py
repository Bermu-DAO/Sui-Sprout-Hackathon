from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    attestation_adapter: str


class PersonaResponse(BaseModel):
    id: str
    email: str
    name: str


class SessionResponse(BaseModel):
    actor: PersonaResponse
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
    secure_mode_default: bool


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


class SecureRunReceiptResponse(BaseModel):
    runId: str
    adapterType: str
    runtimeId: str
    policyHash: str
    sourcesTouched: int
    secretAccessed: bool
    signedAt: str


class SecureRunRequest(BaseModel):
    prompt: str
    outputMode: str
    selectedSecret: str | None = None


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
