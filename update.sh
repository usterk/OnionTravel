#!/bin/bash

# OnionTravel Update Script
# Run this on the Mikrus server to update to latest version

set -e

echo "🚀 OnionTravel Update Script"
echo "=============================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found!"
    echo "Please run this script from the OnionTravel directory"
    exit 1
fi

# Pull latest code
echo "📥 Pulling latest code from GitHub..."
git fetch origin
git checkout main
git pull origin main

# Stop containers
echo "🛑 Stopping containers..."
docker compose down

# Rebuild and start
echo "🔨 Rebuilding containers (this may take 5-10 minutes)..."
docker compose up -d --build

# Wait and check health
echo "⏳ Waiting for containers to become healthy..."
echo ""

MAX_WAIT=120
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $MAX_WAIT ]; do
    # Check container health
    BACKEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' oniontravel-backend 2>/dev/null || echo "unknown")
    FRONTEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' oniontravel-frontend 2>/dev/null || echo "unknown")
    NGINX_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' oniontravel-nginx 2>/dev/null || echo "unknown")

    echo "  Backend: $BACKEND_HEALTH | Frontend: $FRONTEND_HEALTH | Nginx: $NGINX_HEALTH"

    # Check if all healthy
    if [ "$BACKEND_HEALTH" = "healthy" ] && [ "$FRONTEND_HEALTH" = "healthy" ] && [ "$NGINX_HEALTH" = "healthy" ]; then
        echo ""
        echo "✅ All containers are healthy!"
        break
    fi

    # Check for unhealthy containers
    if [ "$BACKEND_HEALTH" = "unhealthy" ] || [ "$FRONTEND_HEALTH" = "unhealthy" ] || [ "$NGINX_HEALTH" = "unhealthy" ]; then
        echo ""
        echo "❌ One or more containers are unhealthy!"
        echo ""
        echo "Container status:"
        docker compose ps
        echo ""
        echo "Logs:"
        [ "$BACKEND_HEALTH" = "unhealthy" ] && echo "--- Backend ---" && docker compose logs --tail=20 backend
        [ "$FRONTEND_HEALTH" = "unhealthy" ] && echo "--- Frontend ---" && docker compose logs --tail=20 frontend
        [ "$NGINX_HEALTH" = "unhealthy" ] && echo "--- Nginx ---" && docker compose logs --tail=20 nginx-proxy
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

# Test endpoints
echo ""
echo "🧪 Testing endpoints..."

# Test HTTPS frontend
if curl -k -s -f https://localhost:443/OnionTravel > /dev/null 2>&1; then
    echo "✅ Frontend (HTTPS) is responding"
else
    echo "❌ Frontend (HTTPS) is not responding"
fi

# Test backend API
if curl -k -s -f https://localhost:443/OnionTravel/api/v1/health > /dev/null 2>&1; then
    echo "✅ Backend API is responding"
else
    echo "❌ Backend API is not responding"
fi

# Test HTTP redirect
HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" http://localhost:80/OnionTravel 2>/dev/null)
if [ "$HTTP_CODE" = "301" ]; then
    echo "✅ HTTP → HTTPS redirect working"
else
    echo "⚠️  HTTP redirect returned: $HTTP_CODE (expected 301)"
fi

# Show status
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Update complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Container status:"
docker compose ps
echo ""
echo "🌐 Application is available at:"
echo "  https://jola209.mikrus.xyz:30209/OnionTravel"
echo "  http://jola209.mikrus.xyz:20209 (redirects to HTTPS)"
echo ""
echo "💡 Useful commands:"
echo "  docker compose logs -f                 # All logs"
echo "  docker compose logs -f nginx-proxy     # Nginx logs"
echo "  docker compose logs -f backend         # Backend logs"
echo "  docker compose logs -f frontend        # Frontend logs"
echo "  docker compose restart                 # Restart all"
echo ""
