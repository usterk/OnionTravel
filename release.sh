#!/bin/bash

# OnionTravel Release Script
# Creates a new release with proper versioning

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if version argument provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Version number required${NC}"
    echo "Usage: ./release.sh <version>"
    echo "Example: ./release.sh 1.2.0"
    exit 1
fi

VERSION=$1

# Validate version format (semantic versioning)
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}❌ Error: Invalid version format${NC}"
    echo "Please use semantic versioning: MAJOR.MINOR.PATCH (e.g., 1.2.0)"
    exit 1
fi

echo -e "${GREEN}🚀 OnionTravel Release Script${NC}"
echo -e "${GREEN}==============================${NC}"
echo ""
echo -e "${YELLOW}Version: ${VERSION}${NC}"
echo ""

# Check if on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Error: Must be on main branch to create a release${NC}"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}❌ Error: Uncommitted changes detected${NC}"
    echo "Please commit or stash your changes before creating a release"
    git status -s
    exit 1
fi

# Check if tag already exists
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: Tag v${VERSION} already exists${NC}"
    exit 1
fi

# Update frontend/package.json
echo "📦 Updating frontend/package.json..."
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" frontend/package.json

# Update frontend/src/version.ts
echo "📝 Updating frontend/src/version.ts..."
cat > frontend/src/version.ts << EOF
// Application version
// This file is automatically updated by release.sh
export const APP_VERSION = '$VERSION';
export const APP_NAME = 'OnionTravel';
EOF

# Show what changed
echo ""
echo -e "${GREEN}📋 Changes:${NC}"
git diff frontend/package.json frontend/src/version.ts

# Confirm
echo ""
read -p "Create release v${VERSION}? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Release cancelled"
    git checkout frontend/package.json frontend/src/version.ts
    exit 0
fi

# Commit changes
echo ""
echo "💾 Creating release commit..."
git add frontend/package.json frontend/src/version.ts
git commit -m "Release v${VERSION}

Bump version to ${VERSION} in:
- frontend/package.json
- frontend/src/version.ts"

# Create annotated tag
echo "🏷️  Creating git tag..."
git tag -a "v$VERSION" -m "Version $VERSION

Release notes:
- TODO: Add release notes here
"

# Push
echo "⬆️  Pushing to origin..."
git push origin main
git push origin "v$VERSION"

echo ""
echo -e "${GREEN}✅ Release v${VERSION} created successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. SSH to server: ssh root@YOUR_IP -p 10XXX"
echo "2. Update production: cd ~/OnionTravel && ./update.sh"
echo ""
echo "View release: https://github.com/usterk/OnionTravel/releases/tag/v${VERSION}"
