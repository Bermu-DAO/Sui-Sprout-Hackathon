import Link from "next/link";

export function WorkspaceNav(props: {
  workspaceRef: string;
  active: "dashboard" | "documents" | "secure-run" | "audit" | "settings";
}) {
  const items = [
    { id: "dashboard", label: "Dashboard", href: `/workspaces/${props.workspaceRef}` },
    { id: "documents", label: "Documents", href: `/workspaces/${props.workspaceRef}/documents` },
    { id: "secure-run", label: "Secure Run", href: `/workspaces/${props.workspaceRef}/secure-run` },
    { id: "audit", label: "Audit", href: `/workspaces/${props.workspaceRef}/audit` },
    { id: "settings", label: "Settings", href: `/workspaces/${props.workspaceRef}/settings` }
  ] as const;

  return (
    <div className="cv-nav">
      <Link className="cv-button" href="/workspaces">
        All workspaces
      </Link>
      <Link className="cv-button" href="/login">
        Session
      </Link>
      {items.map((item) => (
        <Link
          key={item.id}
          className={`cv-button${item.id === props.active ? " cv-button-primary" : ""}`}
          href={item.href}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
