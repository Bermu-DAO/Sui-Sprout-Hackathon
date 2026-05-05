from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from app.store import DEFAULT_WORKSPACE_REF, list_workspaces


def main() -> None:
    workspaces = list_workspaces("usr_owner")
    print(f"Seeded {len(workspaces)} workspace(s). Default demo workspace: {DEFAULT_WORKSPACE_REF}")
    for workspace in workspaces:
        print(f"- {workspace['name']} ({workspace['slug']})")


if __name__ == "__main__":
    main()
