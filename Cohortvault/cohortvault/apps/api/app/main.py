from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.schemas import (
    AuditEventResponse,
    DocumentSummaryResponse,
    HealthResponse,
    InviteMemberRequest,
    PersonaResponse,
    RunDetailResponse,
    RunSummaryResponse,
    SecretCreateRequest,
    SecretSummaryResponse,
    SecureRunRequest,
    SecureRunResponse,
    SecureRunReceiptResponse,
    SessionActorRequest,
    SessionResponse,
    UpdateMemberRoleRequest,
    WorkspaceCreateRequest,
    WorkspaceMemberResponse,
    WorkspaceSummaryResponse,
)
from app.store import (
    add_secret,
    create_workspace,
    delete_document,
    delete_workspace,
    get_actor,
    get_audit_events,
    get_documents,
    get_latest_receipt,
    get_members,
    get_receipt,
    get_run,
    get_runs,
    get_secrets,
    get_workspace,
    invite_member,
    list_personas,
    list_workspaces,
    register_document_upload,
    reindex_document,
    revoke_secret,
    secure_run,
    update_member_role,
)

app = FastAPI(title=settings.app_name, version="0.3.0")
upload_root = Path(__file__).resolve().parent.parent / settings.upload_dir
upload_root.mkdir(parents=True, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _bad_request(error: Exception) -> HTTPException:
    return HTTPException(status_code=400, detail=str(error))


def _not_found(error: Exception) -> HTTPException:
    return HTTPException(status_code=404, detail=str(error))


def _forbidden(error: Exception) -> HTTPException:
    return HTTPException(status_code=403, detail=str(error))


def _current_actor(request: Request) -> dict:
    return get_actor(request.cookies.get(settings.session_cookie_name))


def _set_actor_cookie(response: Response, actor_id: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=actor_id,
        httponly=True,
        samesite="lax",
        secure=False,
    )


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        attestation_adapter=settings.attestation_adapter,
    )


@app.get("/api/v1/session", response_model=SessionResponse)
def read_session(request: Request) -> SessionResponse:
    actor = _current_actor(request)
    personas = list_personas()
    return SessionResponse(
        actor=PersonaResponse(**actor),
        personas=[PersonaResponse(**persona) for persona in personas],
    )


@app.post("/api/v1/session/actor", response_model=SessionResponse)
def switch_actor(payload: SessionActorRequest, request: Request, response: Response) -> SessionResponse:
    try:
        actor = get_actor(payload.actorId)
    except KeyError as error:
        raise _bad_request(error) from error
    _set_actor_cookie(response, actor["id"])
    personas = list_personas()
    return SessionResponse(
        actor=PersonaResponse(**actor),
        personas=[PersonaResponse(**persona) for persona in personas],
    )


@app.get("/api/v1/workspaces", response_model=list[WorkspaceSummaryResponse])
def workspaces_index(request: Request) -> list[WorkspaceSummaryResponse]:
    actor = _current_actor(request)
    return [WorkspaceSummaryResponse(**workspace) for workspace in list_workspaces(actor["id"])]


@app.post("/api/v1/workspaces", response_model=WorkspaceSummaryResponse)
def create_workspace_route(payload: WorkspaceCreateRequest, request: Request) -> WorkspaceSummaryResponse:
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Workspace name is required.")
    actor = _current_actor(request)
    workspace = create_workspace(actor["id"], payload.name, payload.useCase, payload.secureModeDefault)
    return WorkspaceSummaryResponse(**workspace)


@app.delete("/api/v1/workspaces/{workspace_ref}", status_code=204)
def delete_workspace_route(workspace_ref: str, request: Request) -> Response:
    actor = _current_actor(request)
    try:
        delete_workspace(actor["id"], workspace_ref)
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error
    return Response(status_code=204)


@app.get("/api/v1/workspaces/{workspace_ref}", response_model=WorkspaceSummaryResponse)
def workspace_detail(workspace_ref: str, request: Request) -> WorkspaceSummaryResponse:
    actor = _current_actor(request)
    try:
        return WorkspaceSummaryResponse(**get_workspace(actor["id"], workspace_ref))
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error


@app.get("/api/v1/workspaces/{workspace_ref}/members", response_model=list[WorkspaceMemberResponse])
def workspace_members(workspace_ref: str, request: Request) -> list[WorkspaceMemberResponse]:
    actor = _current_actor(request)
    try:
        return [WorkspaceMemberResponse(**member) for member in get_members(actor["id"], workspace_ref)]
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error


@app.post("/api/v1/workspaces/{workspace_ref}/invite", response_model=WorkspaceMemberResponse)
def invite_workspace_member(workspace_ref: str, payload: InviteMemberRequest, request: Request) -> WorkspaceMemberResponse:
    actor = _current_actor(request)
    try:
        return WorkspaceMemberResponse(**invite_member(actor["id"], workspace_ref, payload.email, payload.role))
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error
    except ValueError as error:
        raise _bad_request(error) from error


@app.patch("/api/v1/workspaces/{workspace_ref}/members/{member_id}", response_model=WorkspaceMemberResponse)
def update_workspace_member(
    workspace_ref: str,
    member_id: str,
    payload: UpdateMemberRoleRequest,
    request: Request,
) -> WorkspaceMemberResponse:
    actor = _current_actor(request)
    try:
        member = update_member_role(actor["id"], workspace_ref, member_id, payload.role)
        return WorkspaceMemberResponse(**member)
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error
    except ValueError as error:
        raise _bad_request(error) from error


@app.get("/api/v1/workspaces/{workspace_ref}/documents", response_model=list[DocumentSummaryResponse])
def workspace_documents(workspace_ref: str, request: Request) -> list[DocumentSummaryResponse]:
    actor = _current_actor(request)
    try:
        return [DocumentSummaryResponse(**document) for document in get_documents(actor["id"], workspace_ref)]
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error


@app.post("/api/v1/workspaces/{workspace_ref}/documents", response_model=DocumentSummaryResponse)
async def create_workspace_document(
    workspace_ref: str,
    request: Request,
    file: UploadFile = File(...),
    visibility: str = Form(...),
    display_name: str | None = Form(default=None),
) -> DocumentSummaryResponse:
    if visibility not in {"workspace", "restricted"}:
        raise HTTPException(status_code=400, detail="Visibility must be workspace or restricted.")

    file_name = Path(file.filename or "").name
    if not file_name:
        raise HTTPException(status_code=400, detail="Uploaded file must include a filename.")

    file_bytes = await file.read()
    await file.close()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    stored_name = f"{uuid4().hex}_{file_name}"
    destination = upload_root / stored_name
    destination.write_bytes(file_bytes)
    actor = _current_actor(request)

    try:
        document = register_document_upload(
            actor["id"],
            workspace_ref,
            file_name=file_name,
            storage_path=str(destination),
            visibility=visibility,
            content_type=file.content_type,
            size_bytes=len(file_bytes),
            display_name=display_name,
        )
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        destination.unlink(missing_ok=True)
        raise _forbidden(error) from error
    except ValueError as error:
        destination.unlink(missing_ok=True)
        raise _bad_request(error) from error

    return DocumentSummaryResponse(**document)


@app.post("/api/v1/workspaces/{workspace_ref}/documents/{document_id}/reindex", response_model=DocumentSummaryResponse)
def reindex_workspace_document(workspace_ref: str, document_id: str, request: Request) -> DocumentSummaryResponse:
    actor = _current_actor(request)
    try:
        document = reindex_document(actor["id"], workspace_ref, document_id)
        return DocumentSummaryResponse(**document)
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error


@app.delete("/api/v1/workspaces/{workspace_ref}/documents/{document_id}", status_code=204)
def delete_workspace_document(workspace_ref: str, document_id: str, request: Request) -> Response:
    actor = _current_actor(request)
    try:
        delete_document(actor["id"], workspace_ref, document_id)
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error
    return Response(status_code=204)


@app.get("/api/v1/workspaces/{workspace_ref}/audit", response_model=list[AuditEventResponse])
def workspace_audit(workspace_ref: str, request: Request) -> list[AuditEventResponse]:
    actor = _current_actor(request)
    try:
        return [AuditEventResponse(**event) for event in get_audit_events(actor["id"], workspace_ref)]
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error


@app.get("/api/v1/workspaces/{workspace_ref}/secrets", response_model=list[SecretSummaryResponse])
def workspace_secrets(workspace_ref: str, request: Request) -> list[SecretSummaryResponse]:
    actor = _current_actor(request)
    try:
        return [SecretSummaryResponse(**secret) for secret in get_secrets(actor["id"], workspace_ref)]
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error


@app.post("/api/v1/workspaces/{workspace_ref}/secrets", response_model=SecretSummaryResponse)
def create_workspace_secret(workspace_ref: str, payload: SecretCreateRequest, request: Request) -> SecretSummaryResponse:
    actor = _current_actor(request)
    try:
        return SecretSummaryResponse(**add_secret(actor["id"], workspace_ref, payload.name, payload.provider, payload.scope))
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error
    except ValueError as error:
        raise _bad_request(error) from error


@app.post("/api/v1/workspaces/{workspace_ref}/secrets/{secret_id}/revoke", response_model=SecretSummaryResponse)
def revoke_workspace_secret(workspace_ref: str, secret_id: str, request: Request) -> SecretSummaryResponse:
    actor = _current_actor(request)
    try:
        return SecretSummaryResponse(**revoke_secret(actor["id"], workspace_ref, secret_id))
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error


@app.get("/api/v1/workspaces/{workspace_ref}/runs", response_model=list[RunSummaryResponse])
def workspace_runs(workspace_ref: str, request: Request) -> list[RunSummaryResponse]:
    actor = _current_actor(request)
    try:
        return [RunSummaryResponse(**run) for run in get_runs(actor["id"], workspace_ref)]
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error


@app.get("/api/v1/workspaces/{workspace_ref}/runs/{run_id}", response_model=RunDetailResponse)
def workspace_run_detail(workspace_ref: str, run_id: str, request: Request) -> RunDetailResponse:
    actor = _current_actor(request)
    try:
        return RunDetailResponse(**get_run(actor["id"], workspace_ref, run_id))
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error


@app.get("/api/v1/workspaces/{workspace_ref}/receipts/latest", response_model=SecureRunReceiptResponse)
def workspace_receipt(workspace_ref: str, request: Request) -> SecureRunReceiptResponse:
    actor = _current_actor(request)
    try:
        return SecureRunReceiptResponse(**get_latest_receipt(actor["id"], workspace_ref))
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error


@app.get("/api/v1/workspaces/{workspace_ref}/receipts/{run_id}", response_model=SecureRunReceiptResponse)
def receipt_detail(workspace_ref: str, run_id: str, request: Request) -> SecureRunReceiptResponse:
    actor = _current_actor(request)
    try:
        return SecureRunReceiptResponse(**get_receipt(actor["id"], workspace_ref, run_id))
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error


@app.post("/api/v1/workspaces/{workspace_ref}/runs/secure", response_model=SecureRunResponse)
def secure_run_route(workspace_ref: str, payload: SecureRunRequest, request: Request) -> SecureRunResponse:
    actor = _current_actor(request)
    try:
        return SecureRunResponse(**secure_run(actor["id"], workspace_ref, payload.prompt, payload.outputMode, payload.selectedSecret))
    except KeyError as error:
        raise _not_found(error) from error
    except PermissionError as error:
        raise _forbidden(error) from error
    except ValueError as error:
        raise _bad_request(error) from error
