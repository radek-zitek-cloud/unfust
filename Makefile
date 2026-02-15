# UNFUST Development Workflow Makefile
# Quick reference:
#   make dev          - Start development environment
#   make check        - Run all pre-release checks
#   make release      - Full release workflow
#   make rollback     - Emergency rollback

.PHONY: help dev up down logs build build-dev test typecheck check version \
        bump-patch bump-minor bump-major release-branch tag push-images release \
        rollback clean

# Default target
help:
	@echo "UNFUST Development Workflow"
	@echo ""
	@echo "Development:"
	@echo "  make dev          Start dev stack with hot reload"
	@echo "  make up           Start dev containers (docker-compose.dev.yml)"
	@echo "  make down         Stop all containers"
	@echo "  make logs         Follow container logs"
	@echo ""
	@echo "Docker:"
	@echo "  make build        Build production images (tagged with version)"
	@echo "  make build-dev    Build development images"
	@echo "  make push-images  Push images to ghcr.io"
	@echo ""
	@echo "Quality Checks:"
	@echo "  make test         Run backend tests"
	@echo "  make typecheck    Frontend type checking"
	@echo "  make check        Run all checks (tests + typecheck)"
	@echo ""
	@echo "Version Management:"
	@echo "  make version      Show current version"
	@echo "  make bump-patch   Bump patch version (0.1.1 -> 0.1.2)"
	@echo "  make bump-minor   Bump minor version (0.1.1 -> 0.2.0)"
	@echo "  make bump-major   Bump major version (0.1.1 -> 1.0.0)"
	@echo ""
	@echo "Release Workflow:"
	@echo "  make release-branch  Create release branch"
	@echo "  make tag             Create and push git tag"
	@echo "  make release         Full release (check → bump → tag → release → images)"
	@echo "  make rollback        Emergency rollback to previous version"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean        Remove build artifacts, containers, volumes"

# =============================================================================
# Development
# =============================================================================

# Start development environment with hot reload
dev: check-env
	@echo "🚀 Starting development environment..."
	docker compose -f docker-compose.dev.yml up --build

# Start dev containers
dev-up: check-env
	docker compose -f docker-compose.dev.yml up -d --build

# Stop all containers
down:
	@echo "🛑 Stopping containers..."
	docker compose -f docker-compose.dev.yml down
	docker compose down 2>/dev/null || true

# Follow container logs
logs:
	docker compose -f docker-compose.dev.yml logs -f

# =============================================================================
# Docker Images
# =============================================================================

# Get current version
VERSION := $(shell grep -oP '__version__ = "\K[^"]+' backend/app/__init__.py)
REGISTRY := ghcr.io
OWNER := radek-zitek-cloud
REPO := unfust

# Build production images with version tag
build:
	@echo "🔨 Building production images (version: $(VERSION))..."
	docker build -t $(REGISTRY)/$(OWNER)/$(REPO)-backend:$(VERSION) \
		-t $(REGISTRY)/$(OWNER)/$(REPO)-backend:latest \
		--target production ./backend
	docker build -t $(REGISTRY)/$(OWNER)/$(REPO)-frontend:$(VERSION) \
		-t $(REGISTRY)/$(OWNER)/$(REPO)-frontend:latest \
		--target production ./frontend
	@echo "✅ Images built:"
	@echo "  - $(REGISTRY)/$(OWNER)/$(REPO)-backend:$(VERSION)"
	@echo "  - $(REGISTRY)/$(OWNER)/$(REPO)-frontend:$(VERSION)"

# Build development images
build-dev:
	@echo "🔨 Building development images..."
	docker build -t $(REPO)-backend:dev --target development ./backend
	docker build -t $(REPO)-frontend:dev --target development ./frontend

# Push images to GitHub Container Registry
push-images: build
	@echo "📤 Pushing images to $(REGISTRY)..."
	docker push $(REGISTRY)/$(OWNER)/$(REPO)-backend:$(VERSION)
	docker push $(REGISTRY)/$(OWNER)/$(REPO)-backend:latest
	docker push $(REGISTRY)/$(OWNER)/$(REPO)-frontend:$(VERSION)
	docker push $(REGISTRY)/$(OWNER)/$(REPO)-frontend:latest
	@echo "✅ Images pushed successfully"

# =============================================================================
# Quality Checks
# =============================================================================

# Run backend tests
test:
	@echo "🧪 Running backend tests..."
	cd backend && uv run pytest tests/ -v --tb=short

# Frontend type checking
typecheck:
	@echo "🔍 Running frontend type check..."
	cd frontend && npx react-router typegen && npx tsc --noEmit

# Run all checks (pre-release)
check: test typecheck
	@echo "✅ All checks passed"

# =============================================================================
# Version Management
# =============================================================================

# Show current version
version:
	@echo "Current version: $(VERSION)"

# Bump patch version
bump-patch:
	@python3 scripts/bump-version.py patch

# Bump minor version
bump-minor:
	@python3 scripts/bump-version.py minor

# Bump major version
bump-major:
	@python3 scripts/bump-version.py major

# =============================================================================
# Release Workflow
# =============================================================================

# Create release branch (must specify VERSION)
release-branch:
	@if [ -z "$(VERSION)" ]; then \
		echo "Error: VERSION not set"; \
		exit 1; \
	fi
	@git checkout -b release/v$(VERSION)
	@git add backend/app/__init__.py frontend/package.json
	@git commit -m "chore(release): bump version to $(VERSION)"
	@git push -u origin release/v$(VERSION)
	@echo "✅ Release branch created: release/v$(VERSION)"

# Create and push git tag
tag:
	@git tag -a v$(VERSION) -m "Release v$(VERSION)"
	@git push origin v$(VERSION)
	@echo "✅ Tag pushed: v$(VERSION)"

# Full release workflow
# Usage: make release BUMP=patch|minor|major
release:
	@if [ -z "$(BUMP)" ]; then \
		echo "Usage: make release BUMP=patch|minor|major"; \
		echo "Or use: make release-patch, make release-minor, make release-major"; \
		exit 1; \
	fi
	@./scripts/release.sh $(BUMP)

# Convenience targets for release
release-patch:
	@./scripts/release.sh patch

release-minor:
	@./scripts/release.sh minor

release-major:
	@./scripts/release.sh major

# =============================================================================
# Rollback
# =============================================================================

# Emergency rollback
# Usage: make rollback [VERSION=x.y.z]
rollback:
	@./scripts/rollback.sh $(VERSION)

# =============================================================================
# Utilities
# =============================================================================

# Check environment
check-env:
	@if [ ! -f .env ]; then \
		echo "⚠️  Warning: .env file not found. Copy from .env.example:"; \
		echo "   cp .env.example .env"; \
		echo "   # Edit .env and set JWT_SECRET_KEY"; \
	fi

# Clean up build artifacts and containers
clean:
	@echo "🧹 Cleaning up..."
	docker compose -f docker-compose.dev.yml down -v 2>/dev/null || true
	docker compose down -v 2>/dev/null || true
	docker rmi $$(docker images -q $(REPO)-*) 2>/dev/null || true
	docker rmi $$(docker images -q $(REGISTRY)/$(OWNER)/$(REPO)-*) 2>/dev/null || true
	@echo "✅ Cleanup complete"

# Show help on undefined targets
%:
	@echo "Unknown target: $@"
	@echo "Run 'make help' for available targets"
