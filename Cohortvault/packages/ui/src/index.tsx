import type { ReactNode } from "react";

type ClassValue = string | undefined;

function cx(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(" ");
}

export function AppFrame(props: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <main className="cv-frame">
      <div className="cv-shell">
        <div className="cv-header">
          {props.eyebrow ? <p className="cv-eyebrow">{props.eyebrow}</p> : null}
          <h1 className="cv-title">{props.title}</h1>
        </div>
        {props.children}
      </div>
    </main>
  );
}

export function SectionCard(props: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("cv-card", props.className)}>
      <div className="cv-card-header">
        <h2>{props.title}</h2>
        {props.description ? <p>{props.description}</p> : null}
      </div>
      <div>{props.children}</div>
    </section>
  );
}

export function StatusPill(props: {
  tone?: "neutral" | "success" | "warning";
  children: ReactNode;
}) {
  return <span className={cx("cv-pill", `cv-pill-${props.tone ?? "neutral"}`)}>{props.children}</span>;
}

export function Metric(props: {
  label: string;
  value: string;
}) {
  return (
    <div className="cv-metric">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="cv-skeleton-stack">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="cv-skeleton-row" key={index} />
      ))}
    </div>
  );
}

export function ErrorMessage(props: {
  message: string;
  code?: number;
}) {
  const label =
    props.code === 403
      ? "You do not have permission to view this."
      : props.code === 404
        ? "This resource was not found."
        : props.message;

  return <p className="cv-error">{label}</p>;
}
