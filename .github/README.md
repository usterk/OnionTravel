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

## Quick Start

### For Contributors

When creating a pull request:

1. **Add a version label** (choose one):
   - `version:major` - Breaking changes (X.0.0)
   - `version:minor` - New features (0.X.0)
   - `version:patch` - Bug fixes (0.0.X)

2. **If you forget**: Don't worry! The workflow will default to `patch` (+0.0.1) and a bot will remind you about the label.

3. **Merge to main**: GitHub Actions will automatically deploy to production.

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
PR reviewed and merged to main
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
- **Nginx configuration**: `../nginx/README.md`

## Support

For questions or issues with deployment:
1. Check workflow logs in GitHub Actions
2. Review `DEPLOYMENT_SETUP.md` troubleshooting section
3. Check production server logs via SSH
4. Review `LABELS.md` for labeling questions
