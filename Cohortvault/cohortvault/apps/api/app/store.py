from __future__ import annotations

from app.config import settings


if settings.database_backend == "postgres":
    from app.store_postgres import *  # noqa: F401,F403
else:
    from app.store_sqlite import *  # noqa: F401,F403
