"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuditEvent } from "@cohortvault/types";
import { AppFrame, SectionCard } from "@cohortvault/ui";
import { fetchWorkspaceAuditEvents } from "../../../../lib/api";
import { WorkspaceNav } from "../../../../components/workspace-nav";

export default function WorkspaceAuditPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceRef = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setEvents(await fetchWorkspaceAuditEvents(workspaceRef));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unknown API error");
      }
    }

    if (workspaceRef) {
      void load();
    }
  }, [workspaceRef]);

  return (
    <AppFrame eyebrow="Audit trail" title="Audit">
      <WorkspaceNav active="audit" workspaceRef={workspaceRef} />

      <SectionCard
        title="Workspace event timeline"
        description="Uploads, invites, secure runs, secret usage, and revocations now land in one place, which maps directly to the audit page in the docs."
      >
        {error ? <p className="cv-muted">{error}</p> : null}
        <div className="cv-timeline">
          {events.map((event) => (
            <div className="cv-timeline-item" key={event.id}>
              <div className="cv-timeline-dot" />
              <div className="cv-timeline-content">
                <strong>{event.detail}</strong>
                <p className="cv-muted">
                  {event.eventType} by {event.actor} at {event.createdAt}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </AppFrame>
  );
}
