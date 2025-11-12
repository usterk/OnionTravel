#!/bin/bash

# OnionTravel Deployment Script
# Run this locally to deploy changes to production server
# New architecture: System nginx → Docker containers (no nginx container)

set -e

echo "🚀 OnionTravel Production Deployment"
echo "======================================"
echo ""

# Configuration
SERVER="root@jola209.mikrus.xyz"
PORT="10209"
REMOTE_DIR="/root/OnionTravel"

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found!"
    echo "Please run this script from the OnionTravel directory"
    exit 1
fi

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
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🏗️  New Architecture:"
echo "  Internet → System Nginx (ports 20209/30209)"
echo "           → Frontend Container (localhost:7010)"
echo "           → Backend Container (localhost:7011)"
echo ""
echo "🌐 Application URLs:"
echo "  Frontend:  https://jola209.mikrus.xyz:30209/OnionTravel/"
echo "  API Docs:  https://jola209.mikrus.xyz:30209/OnionTravel/docs"
echo "  HTTP:      http://jola209.mikrus.xyz:20209 (redirects to HTTPS)"
echo ""
echo "💡 Server commands:"
echo "  ssh -p 10209 root@jola209.mikrus.xyz"
echo "  cd /root/OnionTravel"
echo ""
echo "  # Docker containers"
echo "  docker compose ps                          # Container status"
echo "  docker compose logs -f                     # All logs"
echo "  docker compose logs -f backend             # Backend logs"
echo "  docker compose restart                     # Restart containers"
echo ""
echo "  # Nginx"
echo "  nginx -t                                   # Test config"
echo "  systemctl status nginx                     # Nginx status"
echo "  systemctl reload nginx                     # Reload config"
echo "  cat /etc/nginx/sites-available/oniontravel # View config"
echo ""
echo "  # Health check"
echo "  ./check-health.sh                          # Quick health check"
echo ""
