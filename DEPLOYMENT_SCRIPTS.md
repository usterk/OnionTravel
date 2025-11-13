# Deployment Scripts Documentation

Quick reference for OnionTravel deployment scripts.

## Scripts Overview

| Script | Run From | Purpose | Use Case |
|--------|----------|---------|----------|
| `deploy.sh` | Local machine | Full deployment with file copy | Config changes, code changes |
| `update.sh` | Production server | Git-based update | Quick updates from GitHub |
| `check-health.sh` | Production server | Health verification | Status checking, debugging |

## deploy.sh - Full Deployment

**Location**: Project root
**Run from**: Local machine
**Executable**: `chmod +x deploy.sh`

### Usage
```bash
./deploy.sh
```

### What it does
1. Copies files using `scp` (critical configs) and `rsync` (code directories)
2. Stops all containers
3. Rebuilds with `--no-cache` flag
4. Waits for containers to become healthy (max 120s)
5. Tests endpoints (internal and external)
6. Shows deployment summary

### When to use
- Deploying nginx.conf changes
- Deploying docker-compose.yml changes
- After significant code changes
- When you need to ensure clean rebuild

### Output example
```
🚀 OnionTravel Production Deployment
======================================

📤 Step 1: Copying files to production server...
  • Copying nginx configuration...
  • Copying docker-compose.yml...
  • Copying backend files...
  • Copying frontend files...
✅ Files copied successfully!

🔨 Step 2: Rebuilding containers on server...
  • Stopping containers...
  • Rebuilding all containers with no cache...
  • Starting containers...

⏳ Waiting for containers to become healthy...
  Backend: healthy | Frontend: healthy | Nginx: healthy
✅ All containers are healthy!

🧪 Testing external endpoints...
  ✅ Frontend (external HTTPS): https://jola209.mikrus.xyz:30209/OnionTravel/
  ✅ API Docs (external): https://jola209.mikrus.xyz:30209/OnionTravel/docs
  ✅ HTTP redirect (external): http://jola209.mikrus.xyz:20209

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Deployment complete!
```

## update.sh - Git-Based Update

**Location**: Production server `/root/OnionTravel/update.sh`
**Run from**: Production server
**Executable**: Already executable

### Usage
```bash
ssh root@jola209.mikrus.xyz -p 10209
cd /root/OnionTravel
./update.sh
```

### What it does
1. Pulls latest code from GitHub (main branch)
2. Stops containers with `docker compose down`
3. Rebuilds and starts with `docker compose up -d --build`
4. Waits for health checks
5. Tests endpoints

### When to use
- Code is committed and pushed to GitHub
- No config file changes needed
- Quick production updates

### Important notes
- Uses `git pull` - requires changes to be in GitHub first
- Won't work for uncommitted local changes
- Use `deploy.sh` for config changes instead

## check-health.sh - Health Check

**Location**: Production server `/root/OnionTravel/check-health.sh`
**Run from**: Production server
**Executable**: Already executable

### Usage
```bash
ssh root@jola209.mikrus.xyz -p 10209
cd /root/OnionTravel
./check-health.sh
```

### What it checks
1. Container health status (backend, frontend, nginx)
2. Frontend HTTPS endpoint (port 30209)
3. API documentation endpoint
4. HTTP→HTTPS redirect (port 20209)

### Output example (healthy)
```
🏥 OnionTravel Health Check
============================

📊 Container Health Status (Project: OnionTravel):
  ✅ Backend   : healthy
  ✅ Frontend  : healthy
  ✅ Nginx     : healthy

🧪 Testing Endpoints:
  ✅ Frontend (HTTPS)
  ✅ API Documentation
  ✅ HTTP → HTTPS redirect

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All systems operational!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 Application URLs:
  https://jola209.mikrus.xyz:30209/OnionTravel
  http://jola209.mikrus.xyz:20209 (redirects to HTTPS)
```

### Output example (unhealthy)
```
🏥 OnionTravel Health Check
============================

📊 Container Health Status (Project: OnionTravel):
  ✅ Backend   : healthy
  ❌ Frontend  : unhealthy
  ✅ Nginx     : healthy

⚠️  Some containers are not healthy

Container details:
[Docker compose ps output]

💡 View logs with: docker compose logs -f
```

## Troubleshooting

### deploy.sh fails to copy files

**Symptoms**: Permission denied or connection refused

**Fix**:
```bash
# Check SSH connection
ssh root@jola209.mikrus.xyz -p 10209 "echo Connection OK"

# Verify SSH key is loaded
ssh-add -l
```

### Containers stuck in "starting" state

**Symptoms**: Health check never completes

**Fix**:
```bash
# Check logs on server
ssh root@jola209.mikrus.xyz -p 10209 "cd /root/OnionTravel && docker compose logs --tail=50"

# Check specific container
ssh root@jola209.mikrus.xyz -p 10209 "cd /root/OnionTravel && docker compose logs backend"
```

### Nginx config not updated after deployment

**Symptoms**: Old config still in container

**Cause**: Docker build cache

**Fix**: `deploy.sh` already uses `--no-cache` flag. If issue persists:
```bash
# Manually rebuild nginx
ssh root@jola209.mikrus.xyz -p 10209 << 'ENDSSH'
cd /root/OnionTravel
docker compose down nginx-proxy
docker compose build --no-cache nginx-proxy
docker compose up -d nginx-proxy
ENDSSH
```

### rsync fails with "No space left on device"

**Fix**:
```bash
# Check disk space on server
ssh root@jola209.mikrus.xyz -p 10209 "df -h"

# Clean up Docker
ssh root@jola209.mikrus.xyz -p 10209 "docker system prune -af"
```

## File Exclusions

### Backend rsync excludes
- `venv/` - Python virtual environment
- `__pycache__/` - Python cache
- `*.pyc` - Compiled Python files
- `.pytest_cache/` - Test cache
- `htmlcov/` - Coverage reports
- `data/` - SQLite database (preserved on server)
- `uploads/` - User uploads (preserved on server)

### Frontend rsync excludes
- `node_modules/` - NPM dependencies
- `dist/` - Build output (rebuilt on server)
- `.vite/` - Vite cache

## Advanced Usage

### Dry-run deployment (test without changes)

Edit `deploy.sh` temporarily:
```bash
# Add --dry-run to rsync commands
rsync -avz --dry-run --delete -e "ssh -p $PORT" ...
```

### Deploy only backend
```bash
# Copy backend files only
scp -P 10209 -r ./backend/ root@jola209.mikrus.xyz:/root/OnionTravel/backend/

# Rebuild backend container
ssh root@jola209.mikrus.xyz -p 10209 << 'ENDSSH'
cd /root/OnionTravel
docker compose build --no-cache backend
docker compose up -d backend
ENDSSH
```

### Deploy only frontend
```bash
# Copy frontend files only
scp -P 10209 -r ./frontend/ root@jola209.mikrus.xyz:/root/OnionTravel/frontend/

# Rebuild frontend container
ssh root@jola209.mikrus.xyz -p 10209 << 'ENDSSH'
cd /root/OnionTravel
docker compose build --no-cache frontend
docker compose up -d frontend
ENDSSH
```

### View deployment logs in real-time
```bash
# In separate terminal while deploy.sh runs
ssh root@jola209.mikrus.xyz -p 10209 "cd /root/OnionTravel && docker compose logs -f"
```

## Security Considerations

### SSH Key Authentication
- Always use SSH keys, not passwords
- Keep private keys secure
- Use `ssh-agent` for key management

### Sensitive Files
Never deploy these files (not in repo):
- `backend/.env.production`
- `/etc/letsencrypt/` SSL certificates

These files remain on server only.

### File Permissions
Scripts should have execute permissions:
```bash
chmod +x deploy.sh
chmod +x update.sh
chmod +x check-health.sh
```

## Integration with Git Workflow

### Recommended workflow

1. **Development**:
   ```bash
   # Make changes locally
   git add .
   git commit -m "Description"
   ```

2. **Testing**:
   ```bash
   ./test.sh
   ```

3. **Deployment**:
   ```bash
   git push origin main  # Push to GitHub
   ./deploy.sh           # Deploy to production
   ```

4. **Verification**:
   ```bash
   ssh root@jola209.mikrus.xyz -p 10209 "cd /root/OnionTravel && ./check-health.sh"
   ```

### Alternative: Git-only workflow

1. Push to GitHub first:
   ```bash
   git add .
   git commit -m "Description"
   git push origin main
   ```

2. Pull on server:
   ```bash
   ssh root@jola209.mikrus.xyz -p 10209 "cd /root/OnionTravel && ./update.sh"
   ```

**Note**: This requires all changes to be committed. Use `deploy.sh` for uncommitted or config changes.
