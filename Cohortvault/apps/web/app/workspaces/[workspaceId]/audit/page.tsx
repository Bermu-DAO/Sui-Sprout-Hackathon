"use client";

import { useParams } from "next/navigation";
import type { AuditEvent } from "@cohortvault/types";
import { AppFrame, ErrorMessage, LoadingSkeleton, SectionCard } from "@cohortvault/ui";
import { fetchWorkspaceAuditEvents } from "../../../../lib/api";
import { useFetch } from "../../../../lib/use-fetch";
import { WorkspaceNav } from "../../../../components/workspace-nav";

export default function WorkspaceAuditPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceRef = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;
  const { state, refetch } = useFetch<AuditEvent[]>(
    async () => {
      const response = await fetchWorkspaceAuditEvents(workspaceRef, { limit: 100, offset: 0 });
      return response.items;
    },
    [workspaceRef]
  );
  const events = state.status === "success" ? state.data : [];

  return (
    <AppFrame eyebrow="Audit trail" title="Audit">
      <WorkspaceNav active="audit" workspaceRef={workspaceRef} />

      <SectionCard
        title="Workspace event timeline"
        description="Uploads, invites, secure runs, secret usage, and revocations now land in one place, which maps directly to the audit page in the docs."
      >
        {state.status === "loading" ? <LoadingSkeleton rows={4} /> : null}
        {state.status === "error" ? (
          <div className="cv-inline">
            <ErrorMessage code={state.code} message={state.message} />
            <button className="cv-button" onClick={refetch} type="button">
              Retry
            </button>
          </div>
        ) : null}
        {state.status === "success" ? (
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
        ) : null}
      </SectionCard>
    </AppFrame>
  );
}
