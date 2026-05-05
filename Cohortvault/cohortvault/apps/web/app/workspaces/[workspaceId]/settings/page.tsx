"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { SecretSummary, WorkspaceMember, WorkspaceRole, WorkspaceSummary } from "@cohortvault/types";
import { AppFrame, SectionCard, StatusPill } from "@cohortvault/ui";
import {
  createWorkspaceSecret,
  fetchWorkspace,
  fetchWorkspaceMembers,
  fetchWorkspaceSecrets,
  inviteWorkspaceMember,
  revokeWorkspaceSecret,
  updateWorkspaceMemberRole
} from "../../../../lib/api";
import { WorkspaceNav } from "../../../../components/workspace-nav";

export default function WorkspaceSettingsPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceRef = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [secrets, setSecrets] = useState<SecretSummary[]>([]);
  const [inviteEmail, setInviteEmail] = useState("mentor@encode.club");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("reviewer");
  const [secretName, setSecretName] = useState("web_search_secret");
  const [secretProvider, setSecretProvider] = useState("Perplexity");
  const [secretScope, setSecretScope] = useState("market-research");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, WorkspaceRole>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [workspaceResult, memberResult, secretResult] = await Promise.all([
          fetchWorkspace(workspaceRef),
          fetchWorkspaceMembers(workspaceRef),
          fetchWorkspaceSecrets(workspaceRef)
        ]);
        setWorkspace(workspaceResult);
        setMembers(memberResult);
        setSecrets(secretResult);
        setRoleDrafts(
          Object.fromEntries(memberResult.map((member) => [member.id, member.role]))
        );
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unknown API error");
      }
    }

    if (workspaceRef) {
      void load();
    }
  }, [workspaceRef]);

  const canManage = workspace?.role === "owner";

  async function onInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const member = await inviteWorkspaceMember(workspaceRef, { email: inviteEmail, role: inviteRole });
      setMembers((current) => [...current, member]);
      setRoleDrafts((current) => ({ ...current, [member.id]: member.role }));
      setInviteEmail("");
      setInviteRole("reviewer");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown API error");
    } finally {
      setLoading(false);
    }
  }

  async function onUpdateRole(memberId: string) {
    setLoading(true);
    setError(null);

    try {
      const updated = await updateWorkspaceMemberRole(workspaceRef, memberId, { role: roleDrafts[memberId] });
      setMembers((current) => current.map((member) => (member.id === updated.id ? updated : member)));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown API error");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateSecret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const secret = await createWorkspaceSecret(workspaceRef, {
        name: secretName,
        provider: secretProvider,
        scope: secretScope
      });
      setSecrets((current) => [secret, ...current]);
      setSecretName("web_search_secret");
      setSecretProvider("Perplexity");
      setSecretScope("market-research");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown API error");
    } finally {
      setLoading(false);
    }
  }

  async function onRevoke(secretId: string) {
    setLoading(true);
    setError(null);

    try {
      const updated = await revokeWorkspaceSecret(workspaceRef, secretId);
      setSecrets((current) => current.map((secret) => (secret.id === updated.id ? updated : secret)));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown API error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppFrame eyebrow="Workspace settings" title="Settings">
      <WorkspaceNav active="settings" workspaceRef={workspaceRef} />

      {error ? <p className="cv-muted">{error}</p> : null}
      {!canManage ? <p className="cv-muted">Current actor is read-only for settings and secret management.</p> : null}

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
          description="Secrets stay as references in persistent storage and now block future Secure Run calls after revocation."
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
    </AppFrame>
  );
}
