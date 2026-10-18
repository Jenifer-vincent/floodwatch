"""Small, safe JSON file storage layer.

Data survives server restarts. Every collection is a single JSON file
inside ``settings.data_path``. Writes are atomic (temp file + rename) and
empty/missing files are handled gracefully.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from threading import Lock
from typing import Any

from app.core.config import settings

logger = logging.getLogger("floodwatch.storage")

_FILE_LOCKS: dict[str, Lock] = {}


class JsonStorage:
    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, name: str) -> Path:
        safe = Path(name)
        if safe.suffix != ".json":
            safe = Path(f"{name}.json")
        return self.data_dir / safe

    def load(self, name: str, default: Any) -> Any:
        """Load a JSON collection, returning ``default`` when missing/corrupt."""
        path = self._path(name)
        if not path.exists():
            return default
        try:
            with open(path, "r", encoding="utf-8") as fh:
                text = fh.read().strip()
            if not text:
                return default
            return json.loads(text)
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("Could not read %s (%s); falling back to default", path, exc)
            return default

    def save(self, name: str, data: Any) -> None:
        """Atomically persist a collection to disk."""
        path = self._path(name)
        path.parent.mkdir(parents=True, exist_ok=True)
        lock = _FILE_LOCKS.setdefault(str(path), Lock())
        tmp = path.with_suffix(".json.tmp")
        with lock:
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(data, fh, ensure_ascii=False, indent=2)
            os.replace(tmp, path)


storage = JsonStorage(settings.data_path)