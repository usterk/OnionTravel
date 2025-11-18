# GitHub Configuration

This directory contains GitHub-specific configuration for the OnionTravel project.

## Contents

### Workflows (`.github/workflows/`)

#### `deploy-production.yml`
Main automated deployment workflow that runs on every push to `main` branch.

**Features:**
- Automatic version bumping based on PR labels
- Git tag creation
- Auto-generated release notes from commits
- Deployment to production server via SSH
- Docker container rebuild
- Health checks and endpoint testing
- Discord notifications
- GitHub Release creation

**Triggers:**
- Push to `main` branch (automatic)
- Manual workflow dispatch

**Jobs:**
1. `version-and-release` - Bumps version, creates tag and GitHub release
2. `deploy` - Deploys to production server and runs tests

#### `test.yml`
Comprehensive testing workflow that runs backend and frontend tests.

**Features:**
- **Merge commit testing for PRs** - Tests run on the actual code that will exist AFTER merging to target branch
- Backend tests with 90% coverage requirement (pytest)
- Frontend tests with coverage reporting (vitest)
- Coverage reports posted as PR comments
- Discord notifications on test failures (main branch only)

**Testing Strategy:**
- **For Pull Requests**: Tests run on the merge commit (PR branch + target branch merged)
  - This ensures tests pass with the latest code from target branch
  - Prevents situations where tests pass on PR but fail after merge
  - GitHub automatically creates this merge commit for testing
- **For pushes to main**: Tests run on the actual commit
- **Called by deploy workflow**: Ensures all tests pass before deployment

**Triggers:**
- Pull requests (on merge commit)
- Push to `main` branch
- Called by `deploy-production.yml`

**Jobs:**
1. `backend-tests` - Python/pytest with coverage
2. `frontend-tests` - Node/vitest with coverage
3. `notify-failure` - Discord notification if tests fail on main

#### `pr-version-label.yml`
PR helper workflow that checks for version labels on pull requests.

**Features:**
- Checks if PR has a version label
- Adds reminder comment if label is missing
- Validates only one version label is present
- Removes reminder comment when label is added

**Triggers:**
- PR opened, synchronized, labeled, or unlabeled

## Documentation

### `DEPLOYMENT_SETUP.md`
Complete step-by-step guide for configuring GitHub Actions deployment.

**Topics covered:**
- Creating GitHub labels
- Configuring GitHub Secrets
- Setting up Discord notifications
- Testing SSH connection
- First deployment
- Troubleshooting

**Start here if**: You're setting up deployment for the first time.

### `LABELS.md`
Comprehensive guide to version labels and semantic versioning.

**Topics covered:**
- Label descriptions and usage
- When to use major/minor/patch
- How version labels work in the workflow
- Best practices and examples
- Creating labels (CLI and UI methods)

**Start here if**: You're unsure which version label to use on your PR.

### `TESTING_STRATEGY.md`
Detailed explanation of merge commit testing strategy.

**Topics covered:**
- How merge commit testing works
- Benefits and real-world examples
- Testing flow and implementation details
- Best practices for developers and reviewers
- Troubleshooting common issues
- Technical details about GitHub refs

**Start here if**: You want to understand how CI/CD testing ensures safe merges.

## Quick Start

### For Contributors

When creating a pull request:

1. **Add a version label** (choose one):
   - `version:major` - Breaking changes (X.0.0)
   - `version:minor` - New features (0.X.0)
   - `version:patch` - Bug fixes (0.0.X)

2. **Tests run automatically**: GitHub Actions will test your PR merged with the target branch
   - This ensures your code will work AFTER merging
   - Wait for tests to pass before requesting review
   - Check coverage reports in PR comments

3. **If you forget**: Don't worry! The workflow will default to `patch` (+0.0.1) and a bot will remind you about the label.

4. **Merge to main**: GitHub Actions will automatically test again and deploy to production.

### For Administrators

First-time setup:

1. **Create labels**: See `LABELS.md` for commands
2. **Configure secrets**: See `DEPLOYMENT_SETUP.md` for step-by-step guide
3. **Test deployment**: Run workflow manually first
4. **Enable notifications**: Add Discord webhook (optional)

## Required GitHub Secrets

These must be configured in GitHub Settings → Secrets and variables → Actions:

- `PRODUCTION_SSH_KEY` - Private SSH key for production server
- `BACKEND_ENV_PRODUCTION` - Content of `backend/.env.example`

## Optional GitHub Variables

- `DISCORD_WEBHOOK_URL` - Discord webhook for deployment notifications

## Deployment Flow

```
Developer creates PR
       ↓
Adds version label (major/minor/patch)
       ↓
[GitHub Actions - test workflow on PR]
  - Tests run on MERGE COMMIT (PR + target branch)
  - Ensures code will work after merging
  - Backend tests (pytest, 90% coverage)
  - Frontend tests (vitest)
  - Coverage reports posted as PR comments
       ↓
PR reviewed and approved
       ↓
Developer merges PR to main
       ↓
[GitHub Actions - test workflow on main]
  - Tests run again on actual main commit
  - Validates deployment candidate
       ↓
[GitHub Actions - version-and-release job]
  - Reads PR labels
  - Bumps version in package.json and version.ts
  - Creates git commit "Release vX.Y.Z"
  - Creates annotated git tag with release notes
  - Pushes commit and tag
  - Creates GitHub Release
       ↓
[GitHub Actions - deploy job]
  - Generates nginx config from template
  - Transfers files to production server via SSH
  - Rebuilds Docker containers (--no-cache)
  - Waits for health checks (120s timeout)
  - Tests internal endpoints
  - Tests external endpoints
  - Sends Discord notification
       ↓
Production deployment complete! 🚀
```

## Version Bumping Logic

The workflow determines version bump from PR labels:

| PR Label | Current Version | New Version | Use Case |
|----------|----------------|-------------|----------|
| `version:major` | 1.3.0 | 2.0.0 | Breaking changes |
| `version:minor` | 1.3.0 | 1.4.0 | New features |
| `version:patch` | 1.3.0 | 1.3.1 | Bug fixes |
| (no label) | 1.3.0 | 1.3.1 | Default to patch |

## Monitoring Deployments

### GitHub Actions Dashboard
- Go to repository → Actions tab
- View all workflow runs and their status
- Click on a run to see detailed logs

### Discord Notifications
Receive messages for:
- 🚀 Deployment started
- ✅ Deployment successful (with links)
- ❌ Deployment failed (with workflow link)

### Production Server
```bash
# SSH to server
ssh -p 10209 root@jola209.mikrus.xyz

# Check deployment
cd /root/OnionTravel
docker compose ps
docker compose logs -f
./check-health.sh
```

## Troubleshooting

**Problem**: Workflow fails at SSH connection
- **Solution**: Check `PRODUCTION_SSH_KEY` secret is correct and server allows connections

**Problem**: Version wasn't bumped
- **Solution**: Check PR had a version label (only ONE label)

**Problem**: Docker build fails
- **Solution**: SSH to server, check disk space and Docker logs

**Problem**: Health checks timeout
- **Solution**: SSH to server, check container logs and application health

For detailed troubleshooting, see `DEPLOYMENT_SETUP.md`.

## Security Notes

- ✅ SSH keys stored in encrypted GitHub Secrets
- ✅ Workflow only runs on `main` branch
- ✅ Health checks validate deployment before marking as success
- ✅ Manual script (`deploy-prod.sh`) still available as fallback
- ✅ Discord webhook doesn't expose sensitive information

## Manual Deployment

If needed, you can still deploy manually:

```bash
./deploy-prod.sh --yes-deploy-current-state-to-production \
  --version 1.4.0 \
  --release-notes /tmp/release_notes.md
```

See `CLAUDE.md` for manual deployment documentation.

## Related Documentation

- **Main project docs**: `../CLAUDE.md`
- **Deployment setup**: `DEPLOYMENT_SETUP.md`
- **Version labels**: `LABELS.md`
- **Testing strategy**: `TESTING_STRATEGY.md`
- **Nginx configuration**: `../nginx/README.md`

## Support

For questions or issues with deployment:
1. Check workflow logs in GitHub Actions
2. Review `DEPLOYMENT_SETUP.md` troubleshooting section
3. Check production server logs via SSH
4. Review `LABELS.md` for labeling questions
