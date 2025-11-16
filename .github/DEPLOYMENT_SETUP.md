# GitHub Actions Deployment Setup Guide

This guide will help you configure GitHub Actions for automated deployment of OnionTravel to production.

## Overview

The deployment workflow automatically:
1. ✅ Bumps version based on PR labels
2. ✅ Creates git tags
3. ✅ Generates release notes from commits
4. ✅ Deploys to production server
5. ✅ Creates GitHub Releases
6. ✅ Sends Discord notifications

## Prerequisites

Before you start, make sure you have:
- [ ] Admin access to the GitHub repository
- [ ] SSH access to the production server (`root@jola209.mikrus.xyz -p 10209`)
- [ ] SSH private key for the production server
- [ ] Discord webhook URL (optional, for notifications)

## Step 1: Create GitHub Labels

Version labels control the automated version bumping. Create these three labels:

### Option A: Using GitHub CLI (Recommended)

```bash
# Navigate to your repository
cd /path/to/OnionTravel

# Create the labels
gh label create "version:major" \
  --description "Breaking changes - bumps major version (X.0.0)" \
  --color "d73a4a"

gh label create "version:minor" \
  --description "New features - bumps minor version (0.X.0)" \
  --color "0e8a16"

gh label create "version:patch" \
  --description "Bug fixes - bumps patch version (0.0.X)" \
  --color "0366d6"
```

### Option B: Using GitHub Web UI

1. Go to: `https://github.com/YOUR_USERNAME/OnionTravel/labels`
2. Click **"New label"** for each of these:

| Name | Description | Color |
|------|-------------|-------|
| `version:major` | Breaking changes - bumps major version (X.0.0) | `#d73a4a` |
| `version:minor` | New features - bumps minor version (0.X.0) | `#0e8a16` |
| `version:patch` | Bug fixes - bumps patch version (0.0.X) | `#0366d6` |

## Step 2: Configure GitHub Secrets

Secrets store sensitive information like SSH keys and API tokens.

### Navigate to Secrets Settings

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**

### Required Secrets

#### 1. `PRODUCTION_SSH_KEY`

This is the private SSH key for accessing the production server.

**To get your SSH key:**

```bash
# On your local machine (where you can SSH to the server)
cat ~/.ssh/id_rsa
```

Or if you need to generate a new key pair:

```bash
# Generate a new SSH key pair
ssh-keygen -t rsa -b 4096 -C "github-actions@oniontravel" -f ~/.ssh/github_actions_rsa -N ""

# Copy the public key to the server
ssh-copy-id -i ~/.ssh/github_actions_rsa.pub -p 10209 root@jola209.mikrus.xyz

# Display the private key (copy this to GitHub)
cat ~/.ssh/github_actions_rsa
```

**Add to GitHub:**
- **Name**: `PRODUCTION_SSH_KEY`
- **Value**: The entire private key content (including `-----BEGIN ... KEY-----` and `-----END ... KEY-----`)

#### 2. `BACKEND_ENV_PRODUCTION`

This is the content of your `backend/.env.example` file (or production `.env`).

```bash
# On your local machine
cat backend/.env.example
```

**Add to GitHub:**
- **Name**: `BACKEND_ENV_PRODUCTION`
- **Value**: Copy the entire content of `backend/.env.example`

**Important**: Make sure this includes:
```bash
BASE_PATH=/OnionTravel
PRODUCTION_DOMAIN=oniontravel.bieda.it
SECRET_KEY=your-secret-key
EXCHANGE_RATE_API_KEY=your-api-key
# ... other env vars
```

## Step 3: Configure GitHub Variables (Optional)

Variables are like secrets but not encrypted. Use for non-sensitive configuration.

### Navigate to Variables Settings

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click the **Variables** tab
4. Click **"New repository variable"**

### Optional Variable: Discord Webhook

#### `DISCORD_WEBHOOK_URL`

**To get a Discord webhook:**

1. Open Discord
2. Go to Server Settings → Integrations → Webhooks
3. Click **"New Webhook"**
4. Configure:
   - Name: `OnionTravel Deployments`
   - Channel: Select your channel
5. Click **"Copy Webhook URL"**

**Add to GitHub:**
- **Name**: `DISCORD_WEBHOOK_URL`
- **Value**: `https://discord.com/api/webhooks/1439302833194143744/ISrJsXGBdpBSM8wyCDXOZLu9mGryks6cXljN1Ll95VAgEYP1uARX-CQ7H3bY-1i3edgs`

**Note**: If you don't add this variable, the workflow will simply skip Discord notifications.

## Step 4: Verify SSH Access

Before running the workflow, verify that GitHub Actions can connect to your server.

### Test SSH Connection

Create a test workflow to verify SSH access:

```bash
# Create a test file
cat > .github/workflows/test-ssh.yml << 'EOF'
name: Test SSH Connection
on: workflow_dispatch

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.PRODUCTION_SSH_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -p 10209 jola209.mikrus.xyz >> ~/.ssh/known_hosts

      - name: Test Connection
        run: |
          ssh -p 10209 root@jola209.mikrus.xyz "echo 'SSH connection successful!'"
EOF

# Commit and push
git add .github/workflows/test-ssh.yml
git commit -m "Add SSH connection test workflow"
git push
```

Then:
1. Go to GitHub → Actions tab
2. Select "Test SSH Connection" workflow
3. Click "Run workflow"
4. Check the logs - you should see "SSH connection successful!"

**If successful**, delete the test workflow:
```bash
git rm .github/workflows/test-ssh.yml
git commit -m "Remove SSH test workflow"
git push
```

## Step 5: Test the Deployment Workflow

Now test the actual deployment workflow.

### Option A: Manual Test (Recommended for First Run)

1. Go to GitHub → **Actions** tab
2. Select **"Deploy to Production"** workflow
3. Click **"Run workflow"**
4. Check **"Skip automatic version bump"** (for testing)
5. Click **"Run workflow"**
6. Monitor the logs

### Option B: Test with a Real PR

1. Create a test branch:
   ```bash
   git checkout -b test-deployment
   echo "# Test" >> README.md
   git add README.md
   git commit -m "Test deployment workflow"
   git push -u origin test-deployment
   ```

2. Create a Pull Request on GitHub
3. Add the `version:patch` label
4. Merge the PR
5. Watch the deployment happen automatically!

## Workflow Files Overview

The setup created these workflow files:

### `.github/workflows/deploy-production.yml`
Main deployment workflow. Runs on:
- Push to `main` branch (automatic)
- Manual trigger via workflow_dispatch

**Jobs:**
1. `version-and-release`: Bumps version, creates tag and release
2. `deploy`: Deploys to production server, runs health checks

### `.github/workflows/pr-version-label.yml`
PR helper workflow. Checks if PR has a version label and adds a reminder comment if missing.

## Deployment Process

Once configured, the deployment process is:

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-new-feature
   # ... make changes ...
   git commit -m "Add new feature"
   git push -u origin feature/my-new-feature
   ```

2. **Create a Pull Request** on GitHub

3. **Add a version label** to the PR:
   - `version:patch` for bug fixes (most common)
   - `version:minor` for new features
   - `version:major` for breaking changes

4. **Merge the PR** to `main`

5. **GitHub Actions automatically**:
   - Bumps the version (e.g., 1.3.0 → 1.3.1)
   - Creates a git tag (e.g., v1.3.1)
   - Generates release notes from commits
   - Deploys to production
   - Creates a GitHub Release
   - Sends Discord notification (if configured)

## Monitoring Deployments

### GitHub Actions Dashboard

View all deployments:
1. Go to GitHub → **Actions** tab
2. Click on **"Deploy to Production"** workflow
3. See all workflow runs with their status

### Discord Notifications

If configured, you'll receive Discord messages for:
- 🚀 Deployment started
- ✅ Deployment successful (with links)
- ❌ Deployment failed (with workflow link)

### Production Server

SSH into the server to check status:

```bash
# Connect to server
ssh -p 10209 root@jola209.mikrus.xyz

# Check containers
cd /root/OnionTravel
docker compose ps

# View logs
docker compose logs -f

# Run health check
./check-health.sh
```

## Troubleshooting

### Deployment Failed: SSH Connection Refused

**Problem**: GitHub Actions can't connect to the server.

**Solution**:
1. Verify `PRODUCTION_SSH_KEY` secret is correct
2. Ensure the public key is in server's `~/.ssh/authorized_keys`
3. Check server firewall allows connections on port 10209

### Deployment Failed: Permission Denied

**Problem**: SSH key permissions are wrong.

**Solution**: The workflow automatically sets permissions with `chmod 600`, but verify the key format is correct (PEM format).

### Version Bump Didn't Work

**Problem**: Version wasn't bumped or wrong version was bumped.

**Solution**:
1. Check the PR had a version label
2. Check only ONE version label was present
3. View the workflow logs to see what version was detected

### Docker Build Failed

**Problem**: Container build fails on the server.

**Solution**:
1. SSH to server and check Docker logs: `docker compose logs`
2. Check if there's enough disk space: `df -h`
3. Try building manually: `docker compose build --no-cache`

### Health Checks Timeout

**Problem**: Containers don't become healthy within 120 seconds.

**Solution**:
1. SSH to server and check container status: `docker compose ps`
2. Check logs: `docker compose logs backend` and `docker compose logs frontend`
3. Verify the application is working: `curl http://localhost:7011/health`

### No Discord Notifications

**Problem**: Not receiving Discord notifications.

**Solution**:
1. Verify `DISCORD_WEBHOOK_URL` variable is set in GitHub
2. Test the webhook: `curl -H "Content-Type: application/json" -d '{"content": "Test"}' YOUR_WEBHOOK_URL`
3. Check Discord server settings allow webhook integrations

### Release Notes Are Empty

**Problem**: GitHub Release has no or minimal release notes.

**Solution**: This happens if there are no new commits since the last tag. Make sure you have commits between releases.

## Rolling Back a Deployment

If a deployment causes issues, you can rollback:

### Option 1: Re-run Previous Workflow

1. Go to GitHub → Actions → "Deploy to Production"
2. Find the last successful deployment
3. Click **"Re-run all jobs"**

### Option 2: Manual Rollback on Server

```bash
# SSH to server
ssh -p 10209 root@jola209.mikrus.xyz
cd /root/OnionTravel

# Checkout previous version
git fetch --all --tags
git checkout tags/v1.3.0  # Replace with previous version

# Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Security Best Practices

- ✅ **Never commit secrets** to the repository
- ✅ **Use GitHub Secrets** for SSH keys and API tokens
- ✅ **Rotate SSH keys** periodically
- ✅ **Limit SSH key permissions** - use a dedicated key for GitHub Actions
- ✅ **Review workflow runs** regularly for suspicious activity
- ✅ **Enable branch protection** on `main` branch (require PR reviews)

## Advanced Configuration

### Using GitHub Environments

For additional security, use GitHub Environments:

1. Go to Settings → Environments → New environment
2. Create environment: `production`
3. Configure protection rules:
   - Required reviewers (1-6 people who must approve)
   - Wait timer (delay before deployment)
4. Move secrets to environment: Settings → Environments → production → Add secret

Then update `.github/workflows/deploy-production.yml`:

```yaml
jobs:
  deploy:
    name: Deploy to Production Server
    runs-on: ubuntu-latest
    needs: [version-and-release]
    environment: production  # Add this line
```

Now deployments will require manual approval!

## Getting Help

- **Workflow issues**: Check GitHub Actions logs
- **Server issues**: SSH to server and check Docker logs
- **Questions**: See `.github/LABELS.md` for labeling guide

## Summary Checklist

Before your first deployment, ensure:

- [ ] GitHub labels created (`version:major`, `version:minor`, `version:patch`)
- [ ] `PRODUCTION_SSH_KEY` secret configured
- [ ] `BACKEND_ENV_PRODUCTION` secret configured
- [ ] `DISCORD_WEBHOOK_URL` variable configured (optional)
- [ ] SSH connection tested successfully
- [ ] First deployment tested with manual trigger
- [ ] Team knows how to use version labels

Once configured, deployments are fully automatic on every merge to `main`! 🚀
