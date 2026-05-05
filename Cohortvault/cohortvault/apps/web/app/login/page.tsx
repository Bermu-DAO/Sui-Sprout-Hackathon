"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ActorSession } from "@cohortvault/types";
import { AppFrame, SectionCard, StatusPill } from "@cohortvault/ui";
import { fetchSession, switchActor } from "../../lib/api";

const roleNotes: Record<string, string> = {
  owner: "Owner can manage members, upload and delete documents, attach secrets, and revoke access.",
  builder: "Builder can run secure workflows and inspect workspace outputs, but cannot manage secrets or members.",
  reviewer: "Reviewer can inspect receipts, audit trails, and review artifacts without privileged write actions."
};

export default function LoginPage() {
  const [session, setSession] = useState<ActorSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingActorId, setLoadingActorId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setSession(await fetchSession());
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unknown API error");
      }
    }

    void load();
  }, []);

  async function onSwitch(actorId: string) {
    setLoadingActorId(actorId);
    setError(null);
    try {
      setSession(await switchActor(actorId));
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "Unknown API error");
    } finally {
      setLoadingActorId(null);
    }
  }

  return (
    <AppFrame eyebrow="Session control" title="Login">
      <div className="cv-grid">
        <SectionCard
          title="Switch demo actor"
          description="This is now a real cookie-backed session. The backend reads the current actor from the session cookie instead of pinning every request to the owner."
        >
          {error ? <p className="cv-muted">{error}</p> : null}
          <div className="cv-stack">
            {session?.personas.map((persona) => {
              const role = persona.email.includes("owner")
                ? "owner"
                : persona.email.includes("builder")
                  ? "builder"
                  : "reviewer";

              return (
                <div className="cv-card cv-card-inset" key={persona.id}>
                  <div className="cv-inline" style={{ justifyContent: "space-between" }}>
                    <strong>{persona.name}</strong>
                    <StatusPill tone={session.actor.id === persona.id ? "success" : "neutral"}>
                      {session.actor.id === persona.id ? "active" : role}
                    </StatusPill>
                  </div>
                  <p className="cv-muted" style={{ marginTop: 10 }}>
                    {roleNotes[role]}
                  </p>
                  <div className="cv-inline" style={{ marginTop: 14 }}>
                    <button
                      className="cv-button cv-button-primary"
                      disabled={loadingActorId === persona.id || session.actor.id === persona.id}
                      onClick={() => void onSwitch(persona.id)}
                      type="button"
                    >
                      {loadingActorId === persona.id ? "Switching..." : "Use this actor"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Continue into the product"
          description="Switch actor here, then open the workspace again to verify role-specific access and output filtering."
        >
          <div className="cv-stack">
            <p className="cv-muted">
              Current actor: <strong>{session?.actor.name ?? "loading"}</strong>
            </p>
            <div className="cv-actions">
              <Link className="cv-button cv-button-primary" href="/workspaces">
                Open workspace index
              </Link>
              <Link className="cv-button" href="/onboarding">
                Create workspace
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppFrame>
  );
}
