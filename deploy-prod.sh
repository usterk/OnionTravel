#!/bin/bash

# OnionTravel Production Deployment Script
# Unified script for release creation and production deployment
#
# Usage:
#   ./deploy-prod.sh --yes-deploy-current-state-to-production
#   ./deploy-prod.sh --yes-deploy-current-state-to-production --version 1.2.0 --release-notes /tmp/release.md

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER="root@jola209.mikrus.xyz"
PORT="10209"
REMOTE_DIR="/root/OnionTravel"

# Parse arguments
DEPLOY_CONFIRMED=false
VERSION=""
RELEASE_NOTES_FILE=""
SKIP_TESTS=false
FORCE_BRANCH=false

show_help() {
    echo -e "${GREEN}🚀 OnionTravel Production Deployment${NC}"
    echo -e "${GREEN}=====================================${NC}"
    echo ""
    echo "Usage:"
    echo "  $0 --yes-deploy-current-state-to-production [OPTIONS]"
    echo ""
    echo "Required:"
    echo "  --yes-deploy-current-state-to-production"
    echo "      Confirms deployment to production (safety flag)"
    echo ""
    echo "Optional:"
    echo "  --version X.Y.Z"
    echo "      Semantic version for release (e.g., 1.2.0)"
    echo "      Required if --release-notes is provided"
    echo ""
    echo "  --release-notes FILE"
    echo "      Path to markdown file with release notes"
    echo "      If provided, creates a git tag with this version"
    echo ""
    echo "  --skip-tests"
    echo "      Skip validation checks (use with caution)"
    echo ""
    echo "  --force"
    echo "      Force deployment in the following cases:"
    echo "        - From non-main branch"
    echo "        - With uncommitted changes"
    echo "        - With unpushed commits"
    echo "      Note: Cannot be used with --release-notes (releases require clean state)"
    echo ""
    echo "  --help"
    echo "      Show this help message"
    echo ""
    echo "Examples:"
    echo ""
    echo "  # Deploy without creating a release tag"
    echo "  $0 --yes-deploy-current-state-to-production"
    echo ""
    echo "  # Deploy and create release v1.2.0"
    echo "  $0 --yes-deploy-current-state-to-production \\"
    echo "     --version 1.2.0 \\"
    echo "     --release-notes /tmp/OnionTravel_v1.2.0.md"
    echo ""
    echo "Release Notes Format (Markdown):"
    echo "  # Summary"
    echo "  Brief description of this release."
    echo ""
    echo "  ## Features"
    echo "  - New feature 1"
    echo "  - New feature 2"
    echo ""
    echo "  ## Bug Fixes"
    echo "  - Fixed issue #123"
    echo ""
    echo "  ## Breaking Changes"
    echo "  - Changed API endpoint from X to Y"
    echo ""
}

# Show help if no arguments
if [ $# -eq 0 ]; then
    show_help
    exit 0
fi

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --yes-deploy-current-state-to-production)
            DEPLOY_CONFIRMED=true
            shift
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        --release-notes)
            RELEASE_NOTES_FILE="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --force)
            FORCE_BRANCH=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Error: Unknown option: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
done

# Validate required flag
if [ "$DEPLOY_CONFIRMED" != true ]; then
    echo -e "${RED}❌ Error: Deployment not confirmed${NC}"
    echo ""
    echo "You must use: --yes-deploy-current-state-to-production"
    echo ""
    show_help
    exit 1
fi

# Validate version format if provided
if [ -n "$VERSION" ]; then
    if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo -e "${RED}❌ Error: Invalid version format${NC}"
        echo "Please use semantic versioning: MAJOR.MINOR.PATCH (e.g., 1.2.0)"
        exit 1
    fi
fi

# Validate release notes requirements
if [ -n "$RELEASE_NOTES_FILE" ]; then
    if [ -z "$VERSION" ]; then
        echo -e "${RED}❌ Error: --version is required when --release-notes is provided${NC}"
        exit 1
    fi

    if [ ! -f "$RELEASE_NOTES_FILE" ]; then
        echo -e "${RED}❌ Error: Release notes file not found: $RELEASE_NOTES_FILE${NC}"
        exit 1
    fi

    if [ "$FORCE_BRANCH" = true ]; then
        echo -e "${RED}❌ Error: --force cannot be used with --release-notes${NC}"
        echo "Release tags must be created from main branch only"
        exit 1
    fi
fi

# Check if version is provided without release notes (warning only)
if [ -n "$VERSION" ] && [ -z "$RELEASE_NOTES_FILE" ]; then
    echo -e "${YELLOW}⚠️  Warning: --version provided without --release-notes${NC}"
    echo "No git tag will be created. To create a release, provide --release-notes."
    echo ""
fi

echo -e "${GREEN}🚀 OnionTravel Production Deployment${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

# Show configuration
echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Deployment: CONFIRMED ✅"
if [ -n "$VERSION" ]; then
    echo "  Version: $VERSION"
fi
if [ -n "$RELEASE_NOTES_FILE" ]; then
    echo "  Release Notes: $RELEASE_NOTES_FILE"
    echo "  → Will create git tag v$VERSION"
fi
if [ "$FORCE_BRANCH" = true ]; then
    echo ""
    echo -e "${RED}⚠️  WARNING: --force flag enabled${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}Using --force is against repository best practices!${NC}"
    echo -e "${RED}This deployment may:${NC}"
    echo -e "${RED}  • Deploy from non-main branch (inconsistent state)${NC}"
    echo -e "${RED}  • Deploy uncommitted changes (not version controlled)${NC}"
    echo -e "${RED}  • Deploy unpushed commits (not backed up remotely)${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    read -p "Are you absolutely sure you want to continue? (type 'yes' to confirm) " -r
    echo
    if [[ ! $REPLY = "yes" ]]; then
        echo "Deployment cancelled"
        exit 0
    fi
fi
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.yml not found!${NC}"
    echo "Please run this script from the OnionTravel directory"
    exit 1
fi

# Git validation (if not skipping tests)
if [ "$SKIP_TESTS" != true ]; then
    echo -e "${BLUE}🔍 Validating git repository...${NC}"

    # Check if on main branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "main" ]; then
        if [ "$FORCE_BRANCH" = true ]; then
            echo -e "${YELLOW}⚠️  Warning: Not on main branch${NC}"
            echo "  Current branch: $CURRENT_BRANCH"
            echo "  Forcing deployment with --force flag"
            echo ""
        else
            echo -e "${RED}❌ Error: Must be on main branch${NC}"
            echo "Current branch: $CURRENT_BRANCH"
            echo ""
            echo "Options:"
            echo "  1. Switch to main: git checkout main"
            echo "  2. Force deploy from current branch: --force (not recommended)"
            echo "  3. Skip validation: --skip-tests (not recommended)"
            exit 1
        fi
    else
        echo "  ✅ On main branch"
    fi

    # Check for uncommitted changes
    if [[ -n $(git status -s) ]]; then
        if [ "$FORCE_BRANCH" = true ]; then
            echo -e "${YELLOW}⚠️  Warning: Uncommitted changes detected${NC}"
            echo "  Forcing deployment with --force flag"
            git status -s
            echo ""
        else
            echo -e "${RED}❌ Error: Uncommitted changes detected${NC}"
            echo "Please commit or stash your changes before deployment"
            echo ""
            git status -s
            echo ""
            echo "Options:"
            echo "  1. Commit changes: git add . && git commit -m 'message'"
            echo "  2. Stash changes: git stash"
            echo "  3. Force deploy with uncommitted changes: --force (not recommended)"
            echo "  4. Skip validation: --skip-tests (not recommended)"
            exit 1
        fi
    else
        if [ "$CURRENT_BRANCH" = "main" ]; then
            echo "  ✅ No uncommitted changes"
        fi
    fi

    # Check for unpushed commits (only on main branch)
    if [ "$CURRENT_BRANCH" = "main" ]; then
        # Fetch to get latest remote state (quietly)
        git fetch origin main --quiet 2>/dev/null || true

        # Check if local is ahead of remote
        LOCAL=$(git rev-parse @ 2>/dev/null)
        REMOTE=$(git rev-parse @{u} 2>/dev/null)

        if [ -n "$LOCAL" ] && [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
            AHEAD=$(git rev-list --count @{u}..@ 2>/dev/null || echo "0")

            if [ "$AHEAD" -gt 0 ]; then
                if [ "$FORCE_BRANCH" = true ]; then
                    echo -e "${YELLOW}⚠️  Warning: $AHEAD unpushed commit(s) detected${NC}"
                    echo "  Forcing deployment with --force flag"
                    echo ""
                else
                    echo -e "${RED}❌ Error: $AHEAD unpushed commit(s) detected${NC}"
                    echo "Your local branch is ahead of origin/main"
                    echo ""
                    echo "Recent unpushed commits:"
                    git log --oneline @{u}.. | head -5
                    echo ""
                    echo "Options:"
                    echo "  1. Push commits: git push origin main"
                    echo "  2. Force deploy with unpushed commits: --force (not recommended)"
                    echo "  3. Skip validation: --skip-tests (not recommended)"
                    exit 1
                fi
            else
                echo "  ✅ No unpushed commits"
            fi
        fi
    fi
    echo ""
fi

# Create release if release notes provided
if [ -n "$RELEASE_NOTES_FILE" ]; then
    echo -e "${BLUE}📦 Creating Release v${VERSION}...${NC}"
    echo ""

    # Check if tag already exists
    if git rev-parse "v$VERSION" >/dev/null 2>&1; then
        echo -e "${RED}❌ Error: Tag v${VERSION} already exists${NC}"
        echo ""
        echo "Existing tags:"
        git tag -l | tail -5
        exit 1
    fi

    # Update frontend/package.json
    echo "  • Updating frontend/package.json..."
    sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" frontend/package.json

    # Update frontend/src/version.ts
    echo "  • Updating frontend/src/version.ts..."
    cat > frontend/src/version.ts << EOF
// Application version
// This file is automatically updated by deploy-prod.sh
export const APP_VERSION = '$VERSION';
export const APP_NAME = 'OnionTravel';
EOF

    # Show what changed
    echo ""
    echo -e "${YELLOW}📋 Version file changes:${NC}"
    git diff frontend/package.json frontend/src/version.ts
    echo ""

    # Show release notes
    echo -e "${YELLOW}📝 Release Notes:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat "$RELEASE_NOTES_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Confirm release
    read -p "Create release v${VERSION} and deploy to production? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        git checkout frontend/package.json frontend/src/version.ts 2>/dev/null || true
        exit 0
    fi

    # Commit changes
    echo ""
    echo "  • Creating release commit..."
    git add frontend/package.json frontend/src/version.ts
    git commit -m "Release v${VERSION}

Bump version to ${VERSION} in:
- frontend/package.json
- frontend/src/version.ts"

    # Create annotated tag with release notes
    echo "  • Creating git tag v$VERSION..."
    RELEASE_NOTES_CONTENT=$(cat "$RELEASE_NOTES_FILE")
    git tag -a "v$VERSION" -m "Version $VERSION

$RELEASE_NOTES_CONTENT"

    # Push commit and tag
    echo "  • Pushing to origin..."
    git push origin main
    git push origin "v$VERSION"

    echo ""
    echo -e "${GREEN}✅ Release v${VERSION} created successfully!${NC}"
    echo ""
    echo "GitHub Release: https://github.com/usterk/OnionTravel/releases/tag/v${VERSION}"
    echo ""
fi

# Deployment section (same as deploy.sh)
echo -e "${BLUE}🚀 Starting Deployment...${NC}"
echo ""

# Load configuration from backend/.env.example (production values)
if [ -f "backend/.env.example" ]; then
    export BASE_PATH=$(grep "^BASE_PATH=" backend/.env.example | cut -d '=' -f2)
    export PRODUCTION_DOMAIN=$(grep "^PRODUCTION_DOMAIN=" backend/.env.example | cut -d '=' -f2)
else
    echo -e "${YELLOW}⚠️  Warning: backend/.env.example not found, using defaults${NC}"
    export BASE_PATH="/OnionTravel"
    export PRODUCTION_DOMAIN="oniontravel.bieda.it"
fi

echo "  BASE_PATH: ${BASE_PATH}"
echo "  PRODUCTION_DOMAIN: ${PRODUCTION_DOMAIN}"
echo ""

# Generate nginx config from template
echo "🔧 Generating nginx configuration from template..."
if [ ! -f "nginx/oniontravel.conf.template" ]; then
    echo -e "${RED}❌ Error: nginx/oniontravel.conf.template not found!${NC}"
    exit 1
fi

# Use envsubst to replace variables in template
envsubst '${PRODUCTION_DOMAIN} ${BASE_PATH}' < nginx/oniontravel.conf.template > nginx/oniontravel.conf
echo "  ✅ Generated nginx/oniontravel.conf with PRODUCTION_DOMAIN=${PRODUCTION_DOMAIN} and BASE_PATH=${BASE_PATH}"
echo ""

echo "📤 Step 1: Copying files to production server..."
echo ""

# Copy nginx configuration to sites-available
echo "  • Copying nginx configuration..."
scp -P $PORT nginx/oniontravel.conf ${SERVER}:/etc/nginx/sites-available/oniontravel

# Copy docker-compose.yml
echo "  • Copying docker-compose.yml..."
scp -P $PORT docker-compose.yml ${SERVER}:${REMOTE_DIR}/docker-compose.yml

# Copy backend files
echo "  • Copying backend files..."
rsync -avz --delete -e "ssh -p $PORT" \
  --exclude='venv' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='.pytest_cache' \
  --exclude='htmlcov' \
  --exclude='data' \
  --exclude='uploads' \
  ./backend/ ${SERVER}:${REMOTE_DIR}/backend/

# Copy frontend files
echo "  • Copying frontend files..."
rsync -avz --delete -e "ssh -p $PORT" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.vite' \
  ./frontend/ ${SERVER}:${REMOTE_DIR}/frontend/

# Copy scripts
echo "  • Copying scripts..."
scp -P $PORT update.sh check-health.sh ${SERVER}:${REMOTE_DIR}/

echo ""
echo "✅ Files copied successfully!"
echo ""

echo "🔨 Step 2: Deploying on server..."
echo ""

ssh -p $PORT ${SERVER} << 'ENDSSH'
cd /root/OnionTravel

echo "  • Enabling nginx site configuration..."
ln -sf /etc/nginx/sites-available/oniontravel /etc/nginx/sites-enabled/oniontravel

echo "  • Disabling default nginx site..."
rm -f /etc/nginx/sites-enabled/default

echo "  • Testing nginx configuration..."
if ! nginx -t; then
    echo "❌ Nginx configuration test failed!"
    exit 1
fi

echo "  • Reloading nginx..."
systemctl reload nginx

echo "  • Stopping old containers..."
docker compose down

echo "  • Removing old nginx container and network (if exists)..."
docker rm -f oniontravel-nginx 2>/dev/null || true

echo "  • Rebuilding containers with no cache..."
docker compose build --no-cache

echo "  • Starting containers..."
docker compose up -d

echo ""
echo "⏳ Waiting for containers to become healthy..."
echo ""

MAX_WAIT=120
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $MAX_WAIT ]; do
    # Check container health
    BACKEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' oniontravel-backend 2>/dev/null || echo "unknown")
    FRONTEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' oniontravel-frontend 2>/dev/null || echo "unknown")

    echo "  Backend: $BACKEND_HEALTH | Frontend: $FRONTEND_HEALTH"

    # Check if all healthy
    if [ "$BACKEND_HEALTH" = "healthy" ] && [ "$FRONTEND_HEALTH" = "healthy" ]; then
        echo ""
        echo "✅ All containers are healthy!"
        break
    fi

    # Check for unhealthy containers
    if [ "$BACKEND_HEALTH" = "unhealthy" ] || [ "$FRONTEND_HEALTH" = "unhealthy" ]; then
        echo ""
        echo "❌ One or more containers are unhealthy!"
        echo ""
        echo "Container status:"
        docker compose ps
        echo ""
        echo "Logs:"
        [ "$BACKEND_HEALTH" = "unhealthy" ] && echo "--- Backend ---" && docker compose logs --tail=20 backend
        [ "$FRONTEND_HEALTH" = "unhealthy" ] && echo "--- Frontend ---" && docker compose logs --tail=20 frontend
        exit 1
    fi

    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo ""
    echo "⚠️  Timeout waiting for containers to become healthy"
    echo ""
    echo "Container status:"
    docker compose ps
    echo ""
    echo "Check logs with: docker compose logs"
    exit 1
fi

echo ""
echo "🧪 Testing endpoints (internal)..."
echo ""

# Test backend on localhost:7011
if curl -s -f http://localhost:7011/health > /dev/null 2>&1; then
    echo "  ✅ Backend (localhost:7011)"
else
    echo "  ❌ Backend (localhost:7011) - not responding"
fi

# Test frontend on localhost:7010
if curl -s -f http://localhost:7010 > /dev/null 2>&1; then
    echo "  ✅ Frontend (localhost:7010)"
else
    echo "  ❌ Frontend (localhost:7010) - not responding"
fi

# Test HTTPS frontend (through nginx)
if curl -k -s -f https://localhost:30209/OnionTravel > /dev/null 2>&1; then
    echo "  ✅ Frontend (nginx HTTPS)"
else
    echo "  ⚠️  Frontend (nginx HTTPS) - not responding"
fi

# Test HTTP redirect
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:20209/OnionTravel 2>/dev/null)
if [ "$HTTP_CODE" = "301" ]; then
    echo "  ✅ HTTP → HTTPS redirect"
else
    echo "  ⚠️  HTTP redirect returned: $HTTP_CODE (expected 301)"
fi

echo ""
echo "📊 Container status:"
docker compose ps

echo ""
echo "🌐 Nginx status:"
systemctl status nginx | head -5

ENDSSH

echo ""
echo "🧪 Testing external endpoints..."
echo ""

# Test from local machine
if curl -k -s -f https://jola209.mikrus.xyz:30209/OnionTravel/ > /dev/null 2>&1; then
    echo "  ✅ Frontend (external HTTPS): https://jola209.mikrus.xyz:30209/OnionTravel/"
else
    echo "  ❌ Frontend (external HTTPS) - not responding"
fi

if curl -k -s -f https://jola209.mikrus.xyz:30209/OnionTravel/docs > /dev/null 2>&1; then
    echo "  ✅ API Docs (external): https://jola209.mikrus.xyz:30209/OnionTravel/docs"
else
    echo "  ❌ API Docs (external) - not responding"
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://jola209.mikrus.xyz:20209/OnionTravel 2>/dev/null)
if [ "$HTTP_CODE" = "301" ]; then
    echo "  ✅ HTTP redirect (external): http://jola209.mikrus.xyz:20209"
else
    echo "  ⚠️  HTTP redirect returned: $HTTP_CODE (expected 301)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -n "$VERSION" ] && [ -n "$RELEASE_NOTES_FILE" ]; then
    echo -e "${GREEN}🎉 Release v${VERSION} deployed successfully!${NC}"
    echo ""
    echo "📦 Release Information:"
    echo "  Version: v${VERSION}"
    echo "  Tag: https://github.com/usterk/OnionTravel/releases/tag/v${VERSION}"
    echo ""
fi

echo "🏗️  Architecture:"
echo "  Internet → System Nginx (ports 20209/30209)"
echo "           → Frontend Container (localhost:7010)"
echo "           → Backend Container (localhost:7011)"
echo ""
echo "🌐 Application URLs:"
echo "  Frontend:  https://jola209.mikrus.xyz:30209/OnionTravel/"
echo "  API Docs:  https://jola209.mikrus.xyz:30209/OnionTravel/docs"
echo "  HTTP:      http://jola209.mikrus.xyz:20209 (redirects to HTTPS)"
echo ""
echo "💡 Server Management:"
echo "  ssh -p 10209 root@jola209.mikrus.xyz"
echo "  cd /root/OnionTravel"
echo ""
echo "  # Quick commands"
echo "  docker compose ps              # Container status"
echo "  docker compose logs -f         # Live logs"
echo "  ./check-health.sh              # Health check"
echo "  nginx -t                       # Test nginx config"
echo ""
