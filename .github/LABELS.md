# GitHub Labels Configuration

This document describes the required labels for the OnionTravel repository, specifically for the automated deployment workflow.

## Version Labels (Required for PRs)

These labels control the automated version bumping during deployment to production.

### `version:major`
- **Color**: `#d73a4a` (red)
- **Description**: Breaking changes - bumps major version (X.0.0)
- **Use when**:
  - Breaking API changes
  - Major architectural changes
  - Removing deprecated features
  - Changes requiring migration or user action
- **Example**: `1.3.0` → `2.0.0`

### `version:minor`
- **Color**: `#0e8a16` (green)
- **Description**: New features - bumps minor version (0.X.0)
- **Use when**:
  - New features added (backward compatible)
  - New API endpoints
  - Significant improvements
  - New functionality
- **Example**: `1.3.0` → `1.4.0`

### `version:patch`
- **Color**: `#0366d6` (blue)
- **Description**: Bug fixes and small improvements - bumps patch version (0.0.X)
- **Use when**:
  - Bug fixes
  - Small improvements
  - Documentation updates
  - Performance improvements
  - Dependency updates
- **Example**: `1.3.0` → `1.3.1`

## How Version Labels Work

1. **During PR creation**: Add one of the version labels to your pull request
2. **PR Label Check Workflow**: Automatically checks if a version label is present
   - If missing: Adds a reminder comment (non-blocking)
   - If multiple: Fails the check (blocking)
   - If exactly one: Passes the check
3. **On merge to main**: The deployment workflow:
   - Reads the PR label
   - Bumps the version accordingly
   - Creates a git tag
   - Deploys to production
   - Creates a GitHub Release

## Default Behavior

**If no version label is added**, the deployment will default to a **patch version bump** (+0.0.1).

## Creating the Labels

Run these commands to create the labels in your repository:

```bash
# Make sure you're in the repository directory
cd /path/to/OnionTravel

# Create version:major label
gh label create "version:major" \
  --description "Breaking changes - bumps major version (X.0.0)" \
  --color "d73a4a"

# Create version:minor label
gh label create "version:minor" \
  --description "New features - bumps minor version (0.X.0)" \
  --color "0e8a16"

# Create version:patch label
gh label create "version:patch" \
  --description "Bug fixes - bumps patch version (0.0.X)" \
  --color "0366d6"
```

Or create them manually via GitHub UI:
1. Go to: https://github.com/YOUR_USERNAME/OnionTravel/labels
2. Click "New label"
3. Fill in the name, description, and color from the table above

## Best Practices

1. **One label per PR**: Use only one version label per pull request
2. **Choose carefully**: The label should reflect the most significant change in the PR
3. **When in doubt**: Use `version:patch` for small changes, `version:minor` for new features
4. **Breaking changes**: Always use `version:major` for breaking changes, even if they're small
5. **Consistency**: Follow semantic versioning principles

## Semantic Versioning Quick Guide

Given a version number `MAJOR.MINOR.PATCH`, increment:

- **MAJOR** version when you make incompatible API changes
- **MINOR** version when you add functionality in a backward compatible manner
- **PATCH** version when you make backward compatible bug fixes

Learn more: [semver.org](https://semver.org/)

## Examples

### Example 1: Bug Fix PR
```
PR Title: Fix currency conversion rounding error
Label: version:patch
Result: 1.3.0 → 1.3.1
```

### Example 2: New Feature PR
```
PR Title: Add multi-day expense support
Label: version:minor
Result: 1.3.0 → 1.4.0
```

### Example 3: Breaking Change PR
```
PR Title: Refactor API endpoints and remove deprecated /v1/old-trips
Label: version:major
Result: 1.3.0 → 2.0.0
```

### Example 4: No Label (Default)
```
PR Title: Update README documentation
Label: (none)
Result: 1.3.0 → 1.3.1 (default patch bump)
```

## Troubleshooting

**Q: I forgot to add a label before merging**
- A: The deployment will use the default patch bump (+0.0.1)

**Q: I added the wrong label**
- A: The version has already been tagged and deployed. You can:
  1. Create a new PR with the correct version bump
  2. Or manually create a tag and re-run the deployment workflow

**Q: Can I use multiple version labels?**
- A: No, the PR check workflow will fail if multiple version labels are detected

**Q: When should I use major vs minor?**
- A: Ask yourself: "Will this change break existing users/clients?"
  - If yes → major
  - If no, and it's a new feature → minor
  - If no, and it's a fix → patch
