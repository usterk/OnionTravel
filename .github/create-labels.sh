#!/bin/bash

# Script to create GitHub version labels for OnionTravel repository
# Usage: ./create-labels.sh

set -e

echo "Creating GitHub version labels..."
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    echo "Install it from: https://cli.github.com/"
    echo ""
    echo "Alternatively, create labels manually in GitHub UI:"
    echo "https://github.com/YOUR_USERNAME/OnionTravel/labels"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub CLI."
    echo "Run: gh auth login"
    exit 1
fi

echo "Creating version:major label..."
gh label create "version:major" \
  --description "Breaking changes - bumps major version (X.0.0)" \
  --color "d73a4a" \
  2>/dev/null && echo "  ✓ Created version:major" || echo "  ℹ version:major already exists"

echo "Creating version:minor label..."
gh label create "version:minor" \
  --description "New features - bumps minor version (0.X.0)" \
  --color "0e8a16" \
  2>/dev/null && echo "  ✓ Created version:minor" || echo "  ℹ version:minor already exists"

echo "Creating version:patch label..."
gh label create "version:patch" \
  --description "Bug fixes - bumps patch version (0.0.X)" \
  --color "0366d6" \
  2>/dev/null && echo "  ✓ Created version:patch" || echo "  ℹ version:patch already exists"

echo ""
echo "Done! Version labels are ready."
echo ""
echo "View labels at:"
gh repo view --web --branch labels 2>/dev/null || echo "$(git remote get-url origin | sed 's/\.git$//')/labels"
echo ""
echo "Next steps:"
echo "1. Configure GitHub Secrets (see .github/DEPLOYMENT_SETUP.md)"
echo "2. Test deployment workflow"
echo "3. Start using version labels on PRs!"
