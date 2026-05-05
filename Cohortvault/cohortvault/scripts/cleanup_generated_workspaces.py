from pathlib import Path
import argparse
import os
import sys

ROOT = Path(__file__).resolve().parents[1]


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key, value)


load_env_file(ROOT / ".env")
os.environ.setdefault("COHORTVAULT_API_DATABASE_BACKEND", "sqlite")

sys.path.insert(0, str(ROOT / "apps" / "api"))

from app.store import delete_workspace, list_workspaces


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prefix", default="research-guild-", help="Workspace slug prefix to delete.")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    workspaces = list_workspaces("usr_owner")
    targets = [workspace for workspace in workspaces if workspace["slug"].startswith(args.prefix)]
    print("backend", os.environ.get("COHORTVAULT_API_DATABASE_BACKEND", "sqlite"))
    print("matched", len(targets))

    for workspace in targets:
        print("workspace", workspace["slug"])
        if not args.dry_run:
            delete_workspace("usr_owner", workspace["slug"])


if __name__ == "__main__":
    main()
