#!/bin/bash
# Rollback to a previous version
# Usage: ./scripts/rollback.sh [version]
# If no version specified, rolls back to the previous version

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

TARGET_VERSION="$1"

# Get list of tags
log_info "Fetching tags..."
git fetch --tags origin

# If no target specified, show recent versions and prompt
if [ -z "${TARGET_VERSION}" ]; then
    log_info "Recent releases:"
    echo ""
    git tag --sort=-version:refname | head -10 | nl
    echo ""
    read -p "Enter version to rollback to (e.g., 0.1.0): " TARGET_VERSION
fi

# Normalize version input (add v prefix if missing)
if [[ ! ${TARGET_VERSION} =~ ^v ]]; then
    TAG="v${TARGET_VERSION}"
else
    TAG="${TARGET_VERSION}"
    TARGET_VERSION="${TARGET_VERSION#v}"
fi

# Verify tag exists
if ! git tag -l "${TAG}" | grep -q "${TAG}"; then
    log_error "Tag ${TAG} not found"
    exit 1
fi

log_info "Preparing rollback to ${TAG}"
echo ""

# Show what we're rolling back from
current=$(get_version)
log_info "Current version: ${current}"
log_info "Target version: ${TARGET_VERSION}"
echo ""

# Confirm
read -p "Are you sure you want to rollback? This will create emergency fixes. (y/N): " confirm
if [[ ! ${confirm} =~ ^[Yy]$ ]]; then
    log_info "Rollback cancelled"
    exit 0
fi

echo ""

# Step 1: Create rollback branch
log_info "Creating rollback branch..."
ROLLBACK_BRANCH="hotfix/rollback-to-${TARGET_VERSION}"

git checkout -b "${ROLLBACK_BRANCH}" "${TAG}"
log_success "Created branch: ${ROLLBACK_BRANCH}"

echo ""

# Step 2: Update version files (set as hotfix version)
log_info "Setting hotfix version..."
HOTFIX_VERSION="${TARGET_VERSION}-hotfix$(date +%Y%m%d%H%M%S)"

# Update backend version
sed -i "s/__version__ = \"[^\"]*\"/__version__ = \"${HOTFIX_VERSION}\"/" "${BACKEND_VERSION_FILE}"

# Update frontend version
python3 <<EOF
import json
with open('${FRONTEND_PACKAGE_FILE}', 'r') as f:
    data = json.load(f)
data['version'] = '${HOTFIX_VERSION}'
with open('${FRONTEND_PACKAGE_FILE}', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
EOF

git add backend/app/__init__.py frontend/package.json
git commit -m "hotfix(rollback): emergency rollback to ${TAG}"
git push -u origin "${ROLLBACK_BRANCH}"

log_success "Hotfix branch created: ${ROLLBACK_BRANCH}"
echo ""

# Step 3: Tag the rollback
ROLLBACK_TAG="v${HOTFIX_VERSION}"
git tag -a "${ROLLBACK_TAG}" -m "Hotfix rollback to ${TAG}"
git push origin "${ROLLBACK_TAG}"
log_success "Rollback tagged: ${ROLLBACK_TAG}"

echo ""

# Step 4: Build and push images
log_info "Building rollback images..."

BACKEND_IMAGE="${REGISTRY}/${REPO_OWNER}/${REPO_NAME}-backend"
FRONTEND_IMAGE="${REGISTRY}/${REPO_OWNER}/${REPO_NAME}-frontend"

docker build -t "${BACKEND_IMAGE}:${HOTFIX_VERSION}" \
    --target production ./backend

docker build -t "${FRONTEND_IMAGE}:${HOTFIX_VERSION}" \
    --target production ./frontend

log_info "Pushing rollback images..."
docker push "${BACKEND_IMAGE}:${HOTFIX_VERSION}"
docker push "${FRONTEND_IMAGE}:${HOTFIX_VERSION}"

log_success "Rollback images pushed"

echo ""
log_success "Rollback to ${TAG} completed!"
echo ""
echo "Emergency hotfix version: ${HOTFIX_VERSION}"
echo "Branch: ${ROLLBACK_BRANCH}"
echo "Tag: ${ROLLBACK_TAG}"
echo ""
echo "To deploy the rollback:"
echo "  docker pull ${BACKEND_IMAGE}:${HOTFIX_VERSION}"
echo "  docker pull ${FRONTEND_IMAGE}:${HOTFIX_VERSION}"
echo ""
echo "After rollback is verified, merge ${ROLLBACK_BRANCH} to main"
