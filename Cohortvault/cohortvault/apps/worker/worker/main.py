from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
import sys
from time import sleep

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "api"))

from app.config import settings
from app.store import list_jobs, process_pending_jobs


@dataclass
class WorkerStatus:
    queue_name: str
    mode: str
    queued_jobs: int


def bootstrap() -> WorkerStatus:
    return WorkerStatus(
        queue_name="cohortvault-ingestion",
        mode=f"{settings.database_backend}-job-table",
        queued_jobs=len(list_jobs("queued")),
    )


def run_once(limit: int = 10) -> int:
    processed = process_pending_jobs(limit=limit)
    for job in processed:
        print(f"[worker] processed {job}")
    return len(processed)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--limit", type=int, default=10)
    args = parser.parse_args()

    status = bootstrap()
    print(f"[worker] queue={status.queue_name} mode={status.mode} queued={status.queued_jobs}")

    if args.once:
        run_once(limit=args.limit)
        return

    while True:
        processed_count = run_once(limit=args.limit)
        if processed_count == 0:
            sleep(settings.worker_poll_interval_seconds)


if __name__ == "__main__":
    main()
