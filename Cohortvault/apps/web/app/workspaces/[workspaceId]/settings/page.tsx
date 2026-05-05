"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useParams } from "next/navigation";
import type { SecretSummary, WorkspaceMember, WorkspaceRole, WorkspaceSummary } from "@cohortvault/types";
import { AppFrame, ErrorMessage, LoadingSkeleton, SectionCard, StatusPill } from "@cohortvault/ui";
import {
  createWorkspaceSecret,
  fetchWorkspace,
  fetchWorkspaceMembers,
  fetchWorkspaceSecrets,
  inviteWorkspaceMember,
  revokeWorkspaceSecret,
  updateWorkspaceMemberRole
} from "../../../../lib/api";
import { useFetch } from "../../../../lib/use-fetch";
import { WorkspaceNav } from "../../../../components/workspace-nav";

export default function WorkspaceSettingsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceRef = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const [inviteEmail, setInviteEmail] = useState("mentor@encode.club");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("reviewer");
  const [secretName, setSecretName] = useState("web_search_secret");
  const [secretProvider, setSecretProvider] = useState("Perplexity");
  const [secretScope, setSecretScope] = useState("market-research");
  const [secretValue, setSecretValue] = useState("");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, WorkspaceRole>>({});
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<{ message: string; code?: number } | null>(null);
  const { state, refetch } = useFetch<{
    workspace: WorkspaceSummary;
    members: WorkspaceMember[];
    secrets: SecretSummary[];
  }>(
    async () => {
      const [workspaceResult, memberResult, secretResult] = await Promise.all([
        fetchWorkspace(workspaceRef),
        fetchWorkspaceMembers(workspaceRef),
        fetchWorkspaceSecrets(workspaceRef, { limit: 100, offset: 0 })
      ]);

      return {
        workspace: workspaceResult,
        members: memberResult,
        secrets: secretResult.items
      };
    },
    [workspaceRef]
  );
  const workspace = state.status === "success" ? state.data.workspace : null;
  const members = state.status === "success" ? state.data.members : [];
  const secrets = state.status === "success" ? state.data.secrets : [];

  const canManage = workspace?.role === "owner";

  async function onInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setActionError(null);

    try {
      const member = await inviteWorkspaceMember(workspaceRef, { email: inviteEmail, role: inviteRole });
      setRoleDrafts((current) => ({ ...current, [member.id]: member.role }));
      setInviteEmail("");
      setInviteRole("reviewer");
      refetch();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown API error";
      const code = message.includes("403") ? 403 : message.includes("404") ? 404 : undefined;
      setActionError({ message, code });
    } finally {
      setLoading(false);
    }
  }

  async function onUpdateRole(memberId: string) {
    setLoading(true);
    setActionError(null);

    try {
      await updateWorkspaceMemberRole(workspaceRef, memberId, { role: roleDrafts[memberId] });
      refetch();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown API error";
      const code = message.includes("403") ? 403 : message.includes("404") ? 404 : undefined;
      setActionError({ message, code });
    } finally {
      setLoading(false);
    }
  }

  async function onCreateSecret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setActionError(null);

    try {
      await createWorkspaceSecret(workspaceRef, {
        name: secretName,
        provider: secretProvider,
        scope: secretScope,
        secretValue
      });
      setSecretName("web_search_secret");
      setSecretProvider("Perplexity");
      setSecretScope("market-research");
      setSecretValue("");
      refetch();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown API error";
      const code = message.includes("403") ? 403 : message.includes("404") ? 404 : undefined;
      setActionError({ message, code });
    } finally {
      setLoading(false);
    }
  }

  async function onRevoke(secretId: string) {
    setLoading(true);
    setActionError(null);

    try {
      await revokeWorkspaceSecret(workspaceRef, secretId);
      refetch();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown API error";
      const code = message.includes("403") ? 403 : message.includes("404") ? 404 : undefined;
      setActionError({ message, code });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppFrame eyebrow="Workspace settings" title="Settings">
      <WorkspaceNav active="settings" workspaceRef={workspaceRef} />

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
      {state.status === "success" && !canManage ? (
        <p className="cv-muted">Owner-only area: current actor is read-only for settings, role changes, and secret management.</p>
      ) : null}

      {state.status === "success" ? (
        <div className="cv-grid">
        <SectionCard
          className="cv-grid-span-4"
          title="Members and roles"
          description="The missing role update action is now live. Owner can invite, promote, or demote members from this page."
        >
          <form className="cv-form" onSubmit={onInvite}>
            <label className="cv-label">
              Invite email
              <input className="cv-input" disabled={!canManage} onChange={(event) => setInviteEmail(event.target.value)} value={inviteEmail} />
            </label>
            <label className="cv-label">
              Role
              <select
                className="cv-select"
                disabled={!canManage}
                onChange={(event) => setInviteRole(event.target.value as WorkspaceRole)}
                value={inviteRole}
              >
                <option value="builder">builder</option>
                <option value="reviewer">reviewer</option>
                <option value="owner">owner</option>
              </select>
            </label>
            <div className="cv-inline">
              <button className="cv-button cv-button-primary" disabled={loading || !canManage} type="submit">
                Invite teammate
              </button>
            </div>
          </form>

          <table className="cv-table" style={{ marginTop: 20 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>
                    <select
                      className="cv-select"
                      disabled={!canManage}
                      onChange={(event) => setRoleDrafts((current) => ({ ...current, [member.id]: event.target.value as WorkspaceRole }))}
                      value={roleDrafts[member.id] ?? member.role}
                    >
                      <option value="owner">owner</option>
                      <option value="builder">builder</option>
                      <option value="reviewer">reviewer</option>
                    </select>
                  </td>
                  <td>
                    <StatusPill tone={member.status === "active" ? "success" : "warning"}>{member.status}</StatusPill>
                  </td>
                  <td>
                    <button
                      className="cv-button"
                      disabled={!canManage || loading}
                      onClick={() => void onUpdateRole(member.id)}
                      type="button"
                    >
                      Save role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard
          className="cv-grid-span-4"
          title="Secrets"
          description="Secrets stay server-side as workspace-scoped references. Stored values require server-side encryption, and revoked secrets immediately invalidate outstanding capabilities."
        >
          <form className="cv-form" onSubmit={onCreateSecret}>
            <label className="cv-label">
              Secret name
              <input className="cv-input" disabled={!canManage} onChange={(event) => setSecretName(event.target.value)} value={secretName} />
            </label>
            <div className="cv-inline">
              <label className="cv-label" style={{ flex: 1 }}>
                Provider
                <input className="cv-input" disabled={!canManage} onChange={(event) => setSecretProvider(event.target.value)} value={secretProvider} />
              </label>
              <label className="cv-label" style={{ flex: 1 }}>
                Scope
                <input className="cv-input" disabled={!canManage} onChange={(event) => setSecretScope(event.target.value)} value={secretScope} />
              </label>
            </div>
            <label className="cv-label">
              Secret value (optional)
              <input
                className="cv-input"
                disabled={!canManage}
                onChange={(event) => setSecretValue(event.target.value)}
                placeholder="Optional. Rejected unless the server encryption key is configured."
                type="password"
                value={secretValue}
              />
            </label>
            <div className="cv-inline">
              <button className="cv-button cv-button-primary" disabled={loading || !canManage} type="submit">
                Add secret reference
              </button>
            </div>
          </form>

          <table className="cv-table" style={{ marginTop: 20 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Last used</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {secrets.map((secret) => (
                <tr key={secret.id}>
                  <td>{secret.name}</td>
                  <td>{secret.provider}</td>
                  <td>
                    <StatusPill tone={secret.status === "active" ? "success" : "warning"}>{secret.status}</StatusPill>
                  </td>
                  <td>{secret.lastUsedAt ?? "never"}</td>
                  <td>
                    <button
                      className="cv-button"
                      disabled={loading || !canManage || secret.status === "revoked"}
                      onClick={() => void onRevoke(secret.id)}
                      type="button"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
        </div>
      ) : null}
    </AppFrame>
  );
}
