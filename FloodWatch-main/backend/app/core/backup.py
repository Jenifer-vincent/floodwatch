"""Lightweight on-disk backup of the JSON data store.

On application startup a timestamped snapshot of the (non-empty) JSON
collections is copied from ``data/`` into ``backups/``. Only the most recent
``_KEEP`` snapshots are retained so the folder does not grow unboundedly.

Together with the atomic temp-file + rename writes in ``json_storage.py``,
this gives a simple recovery path for a local-file persistence backend.
"""

from __future__ import annotations

import logging
import shutil
from datetime import datetime
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger("floodwatch.backup")

_KEEP = 5


def snapshot_backup() -> None:
    data_dir = settings.data_path
    if not data_dir.is_dir():
        return

    files = sorted(data_dir.glob("*.json"))
    if not files:
        return

    backup_root = settings.data_path.parent / "backups"
    backup_root.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    target = backup_root / stamp
    target.mkdir(parents=True, exist_ok=True)

    copied = 0
    for src in files:
        try:
            shutil.copy2(src, target / src.name)
            copied += 1
        except OSError as exc:  # pragma: no cover - defensive
            logger.warning("Backup copy failed for %s: %s", src, exc)

    if copied:
        logger.info("Backed up %d JSON collections to %s", copied, target)

    _prune(backup_root)


def _prune(backup_root: Path) -> None:
    snapshots = sorted(
        (p for p in backup_root.iterdir() if p.is_dir()),
        key=lambda p: p.name,
        reverse=True,
    )
    for stale in snapshots[_KEEP:]:
        try:
            shutil.rmtree(stale)
        except OSError:  # pragma: no cover - defensive
            logger.warning("Could not prune stale backup %s", stale)
