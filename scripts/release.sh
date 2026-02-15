#!/bin/bash
# Full release workflow script
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

BUMP_TYPE="${1:-patch}"
DRY_RUN="${DRY_RUN:-false}"

# Validate bump type
if [[ ! ${BUMP_TYPE} =~ ^(patch|minor|major)$ ]]; then
    log_error "Invalid bump type: ${BUMP_TYPE}. Use: patch, minor, or major"
    exit 1
fi

log_info "Starting release workflow (bump: ${BUMP_TYPE})"
echo ""

# Step 1: Pre-flight checks
log_info "Step 1: Pre-flight checks..."

# Check we're on main or release branch
CURRENT_BRANCH=$(check_branch_main_or_release)
ON_RELEASE_BRANCH=false
if [[ "${CURRENT_BRANCH}" =~ ^release/v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    ON_RELEASE_BRANCH=true
    log_info "Already on release branch: ${CURRENT_BRANCH}"
fi

# Check working directory is clean
check_git_clean

# Pull latest changes
if [ "${ON_RELEASE_BRANCH}" == "true" ]; then
    log_info "Pulling latest changes from origin/${CURRENT_BRANCH}..."
    git pull origin "${CURRENT_BRANCH}" || true
else
    log_info "Pulling latest changes from origin/main..."
    git pull origin main
fi

# Check GitHub auth (optional for dry-run)
if [ "${DRY_RUN}" != "true" ]; then
    check_github_auth
fi

log_success "Pre-flight checks passed"
echo ""

# Step 2: Run tests and type checks
log_info "Step 2: Running pre-release checks..."

cd "${PROJECT_ROOT}"

log_info "Running backend tests..."
cd backend
uv run pytest tests/ -v --tb=short
cd "${PROJECT_ROOT}"
log_success "Tests passed"

log_info "Running frontend type check..."
cd frontend
npx react-router typegen
npx tsc --noEmit
cd "${PROJECT_ROOT}"
log_success "Type check passed"

echo ""

# Step 3: Bump version
log_info "Step 3: Bumping version..."

if [ "${DRY_RUN}" == "true" ]; then
    NEW_VERSION=$(python3 "${SCRIPT_DIR}/bump-version.py" "${BUMP_TYPE}" --dry-run 2>/dev/null | tail -1)
    log_info "Would bump to: ${NEW_VERSION}"
else
    NEW_VERSION=$(python3 "${SCRIPT_DIR}/bump-version.py" "${BUMP_TYPE}" 2>/dev/null | tail -1)
    log_success "Version bumped to: ${NEW_VERSION}"
fi

validate_semver "${NEW_VERSION}"

echo ""

# Step 4: Create or use release branch
log_info "Step 4: Setting up release branch..."

RELEASE_BRANCH="release/v${NEW_VERSION}"

if [ "${ON_RELEASE_BRANCH}" == "true" ]; then
    # Already on a release branch, just commit changes
    if [ "${DRY_RUN}" == "true" ]; then
        log_info "Would commit version changes to current branch: ${CURRENT_BRANCH}"
    else
        git add backend/app/__init__.py frontend/package.json
        git commit -m "chore(release): bump version to ${NEW_VERSION}" || true
        git push origin "${CURRENT_BRANCH}"
        RELEASE_BRANCH="${CURRENT_BRANCH}"
        log_success "Version changes committed to ${CURRENT_BRANCH}"
    fi
else
    # Create new release branch from main
    if [ "${DRY_RUN}" == "true" ]; then
        log_info "Would create branch: ${RELEASE_BRANCH}"
        log_info "Would commit version changes"
    else
        git checkout -b "${RELEASE_BRANCH}"
        git add backend/app/__init__.py frontend/package.json
        git commit -m "chore(release): bump version to ${NEW_VERSION}"
        git push -u origin "${RELEASE_BRANCH}"
        log_success "Release branch created: ${RELEASE_BRANCH}"
    fi
fi

echo ""

# Step 5: Create and push tag
log_info "Step 5: Creating git tag..."

TAG="v${NEW_VERSION}"

# Check if tag already exists
if git tag -l "${TAG}" | grep -q "${TAG}"; then
    log_warn "Tag ${TAG} already exists, skipping tag creation"
else
    if [ "${DRY_RUN}" == "true" ]; then
        log_info "Would create tag: ${TAG}"
    else
        # Create annotated tag
        git tag -a "${TAG}" -m "Release ${TAG}"
        git push origin "${TAG}"
        log_success "Tag created and pushed: ${TAG}"
    fi
fi

echo ""

# Step 6: Generate changelog
log_info "Step 6: Generating changelog..."

CHANGELOG_FILE="/tmp/changelog-${NEW_VERSION}.md"

# Generate changelog - handle case where no commits exist
if ! python3 "${SCRIPT_DIR}/changelog.py" --version "${TAG}" --output "${CHANGELOG_FILE}" 2>/dev/null; then
    # If no commits or other error, create a default changelog
    echo "## Release ${TAG}" > "${CHANGELOG_FILE}"
    echo "" >> "${CHANGELOG_FILE}"
    echo "Release ${TAG}" >> "${CHANGELOG_FILE}"
fi

# Ensure changelog file exists and has content
if [ ! -f "${CHANGELOG_FILE}" ] || [ ! -s "${CHANGELOG_FILE}" ]; then
    echo "## Release ${TAG}" > "${CHANGELOG_FILE}"
    echo "" >> "${CHANGELOG_FILE}"
    echo "Release ${TAG}" >> "${CHANGELOG_FILE}"
fi

log_success "Changelog generated"

echo ""

# Step 7: Create GitHub Release
log_info "Step 7: Creating GitHub release..."

if [ "${DRY_RUN}" == "true" ]; then
    log_info "Would create GitHub release: ${TAG}"
    log_info "Changelog preview:"
    cat "${CHANGELOG_FILE}"
else
    # Check if release already exists
    if gh release view "${TAG}" &>/dev/null; then
        log_warn "GitHub release ${TAG} already exists, skipping"
    else
        # Create release using gh CLI
        gh release create "${TAG}" \
            --title "${TAG}" \
            --notes-file "${CHANGELOG_FILE}" \
            --target "${RELEASE_BRANCH}"
        log_success "GitHub release created: ${TAG}"
    fi
fi

echo ""

# Step 8: Build and push Docker images
log_info "Step 8: Building and pushing Docker images..."

BACKEND_IMAGE="${REGISTRY}/${REPO_OWNER}/${REPO_NAME}-backend"
FRONTEND_IMAGE="${REGISTRY}/${REPO_OWNER}/${REPO_NAME}-frontend"

if [ "${DRY_RUN}" == "true" ]; then
    log_info "Would build images:"
    log_info "  - ${BACKEND_IMAGE}:${NEW_VERSION}"
    log_info "  - ${FRONTEND_IMAGE}:${NEW_VERSION}"
    log_info "Would tag and push to ${REGISTRY}"
else
    log_info "Building backend image..."
    docker build -t "${BACKEND_IMAGE}:${NEW_VERSION}" -t "${BACKEND_IMAGE}:latest" \
        --target production ./backend
    
    log_info "Building frontend image..."
    docker build -t "${FRONTEND_IMAGE}:${NEW_VERSION}" -t "${FRONTEND_IMAGE}:latest" \
        --target production ./frontend
    
    log_info "Pushing images to ${REGISTRY}..."
    docker push "${BACKEND_IMAGE}:${NEW_VERSION}"
    docker push "${BACKEND_IMAGE}:latest"
    docker push "${FRONTEND_IMAGE}:${NEW_VERSION}"
    docker push "${FRONTEND_IMAGE}:latest"
    
    log_success "Images pushed successfully"
fi

echo ""

# Step 9: Cleanup and summary
rm -f "${CHANGELOG_FILE}"

if [ "${DRY_RUN}" == "true" ]; then
    log_warn "DRY RUN completed. No changes were made."
    echo ""
    echo "To perform the actual release, run without DRY_RUN=true"
else
    log_success "Release ${TAG} completed successfully!"
    echo ""
    echo "Summary:"
    echo "  - Version: ${NEW_VERSION}"
    echo "  - Branch: ${RELEASE_BRANCH}"
    echo "  - Tag: ${TAG}"
    echo "  - Images:"
    echo "    - ${BACKEND_IMAGE}:${NEW_VERSION}"
    echo "    - ${FRONTEND_IMAGE}:${NEW_VERSION}"
    echo ""
    if [ "${ON_RELEASE_BRANCH}" != "true" ]; then
        echo "Next steps:"
        echo "  1. Create a PR to merge ${RELEASE_BRANCH} into main"
    fi
fi
