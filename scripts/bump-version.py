#!/usr/bin/env python3
"""
Bump version in backend/app/__init__.py and frontend/package.json
Supports: patch, minor, major
"""

import argparse
import json
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
BACKEND_VERSION_FILE = PROJECT_ROOT / "backend" / "app" / "__init__.py"
FRONTEND_PACKAGE_FILE = PROJECT_ROOT / "frontend" / "package.json"


def get_current_version() -> str:
    """Read current version from backend __init__.py"""
    content = BACKEND_VERSION_FILE.read_text()
    match = re.search(r'__version__ = "([^"]+)"', content)
    if not match:
        raise ValueError("Could not find __version__ in backend/app/__init__.py")
    return match.group(1)


def bump_version(version: str, bump_type: str) -> str:
    """Bump version according to semver rules"""
    parts = version.split(".")
    if len(parts) != 3:
        raise ValueError(f"Invalid version format: {version}")
    
    major, minor, patch = map(int, parts)
    
    if bump_type == "major":
        major += 1
        minor = 0
        patch = 0
    elif bump_type == "minor":
        minor += 1
        patch = 0
    elif bump_type == "patch":
        patch += 1
    else:
        raise ValueError(f"Unknown bump type: {bump_type}")
    
    return f"{major}.{minor}.{patch}"


def update_backend_version(new_version: str) -> None:
    """Update version in backend/app/__init__.py"""
    content = BACKEND_VERSION_FILE.read_text()
    new_content = re.sub(
        r'__version__ = "[^"]+"',
        f'__version__ = "{new_version}"',
        content
    )
    BACKEND_VERSION_FILE.write_text(new_content)
    print(f"Updated {BACKEND_VERSION_FILE}: {new_version}")


def update_frontend_version(new_version: str) -> None:
    """Update version in frontend/package.json"""
    content = FRONTEND_PACKAGE_FILE.read_text()
    data = json.loads(content)
    data["version"] = new_version
    
    # Preserve formatting (2-space indent, trailing newline)
    FRONTEND_PACKAGE_FILE.write_text(
        json.dumps(data, indent=2) + "\n"
    )
    print(f"Updated {FRONTEND_PACKAGE_FILE}: {new_version}")


def main():
    parser = argparse.ArgumentParser(description="Bump project version")
    parser.add_argument(
        "bump_type",
        choices=["patch", "minor", "major"],
        help="Which part of the version to bump"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would change without making changes"
    )
    
    args = parser.parse_args()
    
    current = get_current_version()
    new_version = bump_version(current, args.bump_type)
    
    print(f"Current version: {current}")
    print(f"New version:     {new_version}")
    
    if args.dry_run:
        print("(dry run - no changes made)")
        return
    
    update_backend_version(new_version)
    update_frontend_version(new_version)
    
    # Output the new version for scripts to capture
    print(new_version)


if __name__ == "__main__":
    main()
