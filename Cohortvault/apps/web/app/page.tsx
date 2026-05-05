import Link from "next/link";
import { SECURE_RUN_SYSTEM_PROMPT } from "@cohortvault/prompts";
import { AppFrame, Metric, SectionCard, StatusPill } from "@cohortvault/ui";
import { DEFAULT_WORKSPACE_REF } from "../lib/api";

const trustFacts = [
  "Workspace creation, invite flows, uploads, audit logs, and secret revocation are connected",
  "Private document retrieval now feeds Secure Run with source-aware output filtering",
  "Signed receipt v1 records persist by run and can be reopened in the reviewer artifact view",
  "Secrets stay as references and can block future runs once revoked"
];

export default function HomePage() {
  return (
    <AppFrame eyebrow="Shape Rotator Submission Build" title="CohortVault">
      <div className="cv-hero">
        <SectionCard
          title="Controlled AI collaboration for research-heavy teams"
          description="Create a workspace, upload sensitive materials, run Secure Run workflows, inspect signed receipt v1 records, and prove revocation works."
        >
          <div className="cv-actions" style={{ marginBottom: 18 }}>
            <Link className="cv-button cv-button-primary" href="/onboarding">
              Create secure workspace
            </Link>
            <Link className="cv-button" href={`/workspaces/${DEFAULT_WORKSPACE_REF}`}>
              Open seeded demo
            </Link>
            <Link className="cv-button" href="/login">
              Demo personas
            </Link>
          </div>
          <ul>
            {trustFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </SectionCard>

        <div className="cv-receipt">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <p className="cv-eyebrow">Execution receipt</p>
              <h2 style={{ margin: 0 }}>Secure Run runtime card</h2>
            </div>
            <StatusPill tone="success">signed v1</StatusPill>
          </div>
          <dl>
            <div>
              <dt>Adapter</dt>
              <dd>mock-signed-receipt-v1</dd>
            </div>
            <div>
              <dt>Runtime</dt>
              <dd>cv-runtime-dev-01</dd>
            </div>
            <div>
              <dt>Routes live</dt>
              <dd>9 product pages</dd>
            </div>
            <div>
              <dt>Secret path</dt>
              <dd>active + revoked</dd>
            </div>
            <div>
              <dt>Policy hash</dt>
              <dd>sha256 policy profile</dd>
            </div>
            <div>
              <dt>Prompt profile</dt>
              <dd>{SECURE_RUN_SYSTEM_PROMPT.includes("Secure Run") ? "secure-run" : "unknown"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="cv-grid" style={{ marginTop: 20 }}>
        <SectionCard className="cv-grid-span-4" title="Why it fits the hackathon" description="Built for the TEE + AI track and aligned to the cohort-as-user framing.">
          <ul>
            <li>Turns privacy and trust-boundary ideas into a product judges can use immediately</li>
            <li>Demonstrates a full secure workflow instead of just static UI</li>
            <li>Stays honest about MVP trust claims while remaining accelerator-friendly</li>
          </ul>
        </SectionCard>

        <SectionCard className="cv-grid-span-4" title="MVP metrics" description="Current build status for the submission branch.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            <Metric label="Pages scaffolded" value="9" />
            <Metric label="Runtime modes" value="2" />
            <Metric label="Core loops" value="5" />
          </div>
        </SectionCard>
      </div>
    </AppFrame>
  );
}
