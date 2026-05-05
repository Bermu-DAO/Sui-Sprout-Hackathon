"use client";

import Link from "next/link";
import { useState } from "react";
import type { ActorSession } from "@cohortvault/types";
import { AppFrame, ErrorMessage, LoadingSkeleton, SectionCard, StatusPill } from "@cohortvault/ui";
import { fetchSession, switchActor } from "../../lib/api";
import { useFetch } from "../../lib/use-fetch";

const roleNotes: Record<string, string> = {
  owner: "Owner can manage members, upload and delete documents, attach secrets, and revoke access.",
  builder: "Builder can run secure workflows and inspect workspace outputs, but cannot manage secrets or members.",
  reviewer: "Reviewer can inspect receipts, audit trails, and review artifacts without privileged write actions."
};

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loadingActorId, setLoadingActorId] = useState<string | null>(null);
  const { state: sessionState, refetch } = useFetch<ActorSession>(() => fetchSession(), []);
  const session = sessionState.status === "success" ? sessionState.data : null;

  async function onSwitch(actorId: string) {
    setLoadingActorId(actorId);
    setError(null);
    try {
      await switchActor(actorId);
      refetch();
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
          description="This now uses a signed demo session token. Persona switching stays fast for the hackathon, but the browser can no longer claim an arbitrary role by editing a raw actor cookie."
        >
          {sessionState.status === "loading" || sessionState.status === "idle" ? <LoadingSkeleton rows={3} /> : null}
          {sessionState.status === "error" ? (
            <div className="cv-stack">
              <ErrorMessage code={sessionState.code} message={sessionState.message} />
              <div>
                <button className="cv-button" onClick={refetch} type="button">
                  Retry
                </button>
              </div>
            </div>
          ) : null}
          {sessionState.status === "success" ? (
            <div className="cv-stack">
              {error ? <ErrorMessage message={error} /> : null}
              {session!.personas.map((persona) => {
                const role = persona.email.includes("owner")
                  ? "owner"
                  : persona.email.includes("builder")
                    ? "builder"
                    : "reviewer";

                return (
                  <div className="cv-card cv-card-inset" key={persona.id}>
                    <div className="cv-inline" style={{ justifyContent: "space-between" }}>
                      <strong>{persona.name}</strong>
                      <StatusPill tone={session?.actor?.id === persona.id ? "success" : "neutral"}>
                        {session?.actor?.id === persona.id ? "active" : role}
                      </StatusPill>
                    </div>
                    <p className="cv-muted" style={{ marginTop: 10 }}>
                      {roleNotes[role]}
                    </p>
                    <div className="cv-inline" style={{ marginTop: 14 }}>
                      <button
                        className="cv-button cv-button-primary"
                        disabled={loadingActorId === persona.id || session?.actor?.id === persona.id}
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
          ) : null}
        </SectionCard>

        <SectionCard
          title="Continue into the product"
          description="Switch actor here, then open the workspace again to verify role-specific access and output filtering."
        >
          <div className="cv-stack">
            <p className="cv-muted">
              Current actor: <strong>{session?.actor?.name ?? "not signed in"}</strong>
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
