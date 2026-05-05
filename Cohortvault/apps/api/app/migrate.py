from __future__ import annotations

from pathlib import Path
from typing import Iterable

import psycopg
from psycopg import sql as pgsql

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
                  filename text primary key,
                  applied_at timestamptz not null default now()
                )
                """
            )
            cur.execute(
                """
                select column_name
                from information_schema.columns
                where table_name = 'schema_migrations'
                """
            )
            columns = {row[0] for row in cur.fetchall()}
            tracking_column = "filename" if "filename" in columns else "version"

            cur.execute(
                pgsql.SQL("select {} from schema_migrations").format(pgsql.Identifier(tracking_column))
            )
            existing = {row[0] for row in cur.fetchall()}

            for migration in _migration_files():
                if migration.name in existing:
                    continue
                # Migration SQL comes from versioned files on disk, not from user input.
                cur.execute(migration.read_text(encoding="utf-8"))  # type: ignore[arg-type]
                cur.execute(
                    pgsql.SQL("insert into schema_migrations ({}) values (%s)").format(
                        pgsql.Identifier(tracking_column)
                    ),
                    (migration.name,),
                )
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
