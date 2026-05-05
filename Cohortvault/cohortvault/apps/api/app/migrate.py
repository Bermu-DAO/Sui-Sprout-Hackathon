from __future__ import annotations

from pathlib import Path
from typing import Iterable

import psycopg

from app.config import settings


MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def _migration_files() -> Iterable[Path]:
    return sorted(MIGRATIONS_DIR.glob("*.sql"))


def run_migrations() -> list[str]:
    applied: list[str] = []
    with psycopg.connect(settings.database_url, autocommit=False) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                create table if not exists schema_migrations (
                  version text primary key,
                  applied_at timestamptz not null default now()
                )
                """
            )
            cur.execute("select version from schema_migrations")
            existing = {row[0] for row in cur.fetchall()}

            for migration in _migration_files():
                if migration.name in existing:
                    continue
                cur.execute(migration.read_text(encoding="utf-8"))
                cur.execute("insert into schema_migrations (version) values (%s)", (migration.name,))
                applied.append(migration.name)
        conn.commit()
    return applied


def main() -> None:
    applied = run_migrations()
    if applied:
        print(f"Applied migrations: {', '.join(applied)}")
    else:
        print("No migrations to apply.")


if __name__ == "__main__":
    main()
