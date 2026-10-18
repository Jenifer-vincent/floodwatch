"""Storage package.

``storage`` is a process-wide singleton backed by the configured data
directory (default ``backend/data``). See ``json_storage.py``.
"""

from app.storage.json_storage import JsonStorage, storage

__all__ = ["JsonStorage", "storage"]