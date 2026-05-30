"""Build the loadable extension zip served at /static/meetpilot-extension.zip.

The Dashboard's Extension Download card links here. Users download, unzip,
and Load Unpacked via chrome://extensions. Run manually before each demo:

    python backend/scripts/make_extension_zip.py

The zip is build output, not source — gitignored. Re-run any time
extension/ source files change. Skips OS cruft (.DS_Store) and any
dev artifacts (__pycache__, node_modules) that may appear later.
"""

from __future__ import annotations

import os
import sys
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
EXTENSION_DIR = REPO_ROOT / "extension"
OUT_DIR = REPO_ROOT / "backend" / "static"
OUT_FILE = OUT_DIR / "meetpilot-extension.zip"

# Files/directories never included in the loadable zip. Skipping at walk
# time keeps the zip clean and small.
SKIP_DIR_NAMES = {"__pycache__", "node_modules", ".git"}
SKIP_FILE_NAMES = {".DS_Store"}


def build_zip() -> int:
    if not EXTENSION_DIR.is_dir():
        print(f"ERROR: extension dir not found: {EXTENSION_DIR}", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if OUT_FILE.exists():
        OUT_FILE.unlink()

    file_count = 0
    with zipfile.ZipFile(OUT_FILE, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(EXTENSION_DIR):
            dirs[:] = [d for d in dirs if d not in SKIP_DIR_NAMES]
            for fname in files:
                if fname in SKIP_FILE_NAMES:
                    continue
                src = Path(root) / fname
                # Archive paths are relative to the extension dir so the
                # unzipped tree mirrors the source layout exactly.
                arcname = src.relative_to(EXTENSION_DIR)
                zf.write(src, arcname=str(arcname))
                file_count += 1

    size_kb = OUT_FILE.stat().st_size / 1024
    print(f"Wrote {OUT_FILE.relative_to(REPO_ROOT)} ({file_count} files, {size_kb:.1f} KiB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(build_zip())
