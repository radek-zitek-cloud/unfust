#!/bin/bash
# Common utilities for release scripts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_VERSION_FILE="${PROJECT_ROOT}/backend/app/__init__.py"
FRONTEND_PACKAGE_FILE="${PROJECT_ROOT}/frontend/package.json"

# Registry settings
REGISTRY="ghcr.io"
REPO_OWNER="radek-zitek-cloud"
REPO_NAME="unfust"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

get_version() {
    grep -oP '__version__ = "\K[^"]+' "${BACKEND_VERSION_FILE}"
}

get_previous_version() {
    git tag --sort=-version:refname | head -2 | tail -1 || echo ""
}

get_latest_tag() {
    git tag --sort=-version:refname | head -1 || echo ""
}

check_git_clean() {
    if [ -n "$(git status --porcelain)" ]; then
        log_error "Working directory is not clean. Commit or stash changes first."
        git status --short
        exit 1
    fi
}

check_branch_main() {
    local current_branch=$(git branch --show-current)
    if [ "${current_branch}" != "main" ]; then
        log_error "Must be on 'main' branch. Current: ${current_branch}"
        exit 1
    fi
}

check_branch_main_or_release() {
    local current_branch=$(git branch --show-current)
    if [ "${current_branch}" != "main" ] && [[ ! "${current_branch}" =~ ^release/v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        log_error "Must be on 'main' or 'release/vX.Y.Z' branch. Current: ${current_branch}"
        exit 1
    fi
    echo "${current_branch}"
}

check_github_auth() {
    if ! gh auth status &>/dev/null; then
        log_error "Not authenticated with GitHub CLI. Run: gh auth login"
        exit 1
    fi
}

validate_semver() {
    local version=$1
    if [[ ! ${version} =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        log_error "Invalid version format: ${version}. Expected: X.Y.Z"
        exit 1
    fi
}

sync_frontend_version() {
    local version=$1
    # Update package.json version without changing formatting too much
    cd "${PROJECT_ROOT}/frontend"
    npm version "${version}" --no-git-tag-version --allow-same-version &>/dev/null || true
    cd "${PROJECT_ROOT}"
}
