"""Zip the Python code the browser runs into public/py/engine.zip.

The archive holds pyplAI (the exact version in uv.lock) and pyplai_web. The worker unpacks it
into Pyodide's file system, so the browser runs the same code as the tests.

    uv run python scripts/bundle_python.py
"""

from __future__ import annotations

import zipfile
from pathlib import Path

import pyplAI

import pyplai_web

TARGET = Path(__file__).resolve().parent.parent / "public" / "py" / "engine.zip"


def add_package(archive: zipfile.ZipFile, package_dir: Path) -> int:
    count = 0
    for path in sorted(package_dir.rglob("*.py")):
        archive.write(path, path.relative_to(package_dir.parent).as_posix())
        count += 1
    return count


if __name__ == "__main__":
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(TARGET, "w", zipfile.ZIP_DEFLATED) as archive:
        count = sum(
            add_package(archive, Path(module.__file__).parent)
            for module in (pyplAI, pyplai_web)
            if module.__file__ is not None
        )
    print(f"Wrote {count} modules (pyplAI {pyplAI.__version__}) to {TARGET}")
