#!/bin/bash

# OnionTravel Health Check Script
# Quickly check if all services are running properly

set -e

echo "🏥 OnionTravel Health Check"
echo "============================"
echo ""

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found!"
    echo "Please run this script from the OnionTravel directory"
    exit 1
fi

# Determine project name from directory or COMPOSE_PROJECT_NAME
PROJECT_NAME=$(basename $(pwd))
if [ ! -z "$COMPOSE_PROJECT_NAME" ]; then
    PROJECT_NAME="$COMPOSE_PROJECT_NAME"
fi

# Docker Compose normalizes project names to lowercase
PROJECT_NAME_LOWER=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]')

# Check container health
echo "📊 Container Health Status (Project: $PROJECT_NAME):"
echo ""

BACKEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "${PROJECT_NAME_LOWER}-backend" 2>/dev/null || echo "not running")
FRONTEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "${PROJECT_NAME_LOWER}-frontend" 2>/dev/null || echo "not running")
NGINX_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "${PROJECT_NAME_LOWER}-nginx" 2>/dev/null || echo "not running")

# Function to print status with emoji
print_status() {
    local name=$1
    local status=$2

    case $status in
        "healthy")
            echo "  ✅ $name: $status"
            return 0
            ;;
        "starting")
            echo "  🔄 $name: $status"
            return 1
            ;;
        "unhealthy")
            echo "  ❌ $name: $status"
            return 1
            ;;
        *)
            echo "  ⚠️  $name: $status"
            return 1
            ;;
    esac
}

ALL_HEALTHY=true
print_status "Backend   " "$BACKEND_HEALTH" || ALL_HEALTHY=false
print_status "Frontend  " "$FRONTEND_HEALTH" || ALL_HEALTHY=false
print_status "Nginx     " "$NGINX_HEALTH" || ALL_HEALTHY=false

echo ""

if [ "$ALL_HEALTHY" = false ]; then
    echo "⚠️  Some containers are not healthy"
    echo ""
    echo "Container details:"
    docker compose ps
    echo ""
    echo "💡 View logs with: docker compose logs -f"
    exit 1
fi

# Test endpoints
echo "🧪 Testing Endpoints:"
echo ""

ALL_OK=true

# Test HTTPS frontend (use port 30209 for external access)
if curl -k -s -f --max-time 5 https://localhost:30209/OnionTravel/ > /dev/null 2>&1; then
    echo "  ✅ Frontend (HTTPS)"
else
    echo "  ❌ Frontend (HTTPS) - not responding"
    ALL_OK=false
fi

# Test backend docs (health endpoint might not exist at /api/v1/health)
if curl -k -s -f --max-time 5 https://localhost:30209/OnionTravel/docs > /dev/null 2>&1; then
    echo "  ✅ API Documentation"
else
    echo "  ❌ API Documentation - not responding"
    ALL_OK=false
fi

# Test HTTP redirect (use port 20209 for HTTP)
HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:20209/OnionTravel 2>/dev/null)
if [ "$HTTP_CODE" = "301" ]; then
    echo "  ✅ HTTP → HTTPS redirect"
else
    echo "  ⚠️  HTTP redirect (got $HTTP_CODE, expected 301)"
fi

echo ""

if [ "$ALL_OK" = true ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ All systems operational!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 Application URLs:"
    echo "  https://jola209.mikrus.xyz:30209/OnionTravel"
    echo "  http://jola209.mikrus.xyz:20209 (redirects to HTTPS)"
    echo ""
    exit 0
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ Some checks failed"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "💡 Troubleshooting:"
    echo "  docker compose logs -f            # View all logs"
    echo "  docker compose restart            # Restart services"
    echo "  ./update.sh                       # Full rebuild"
    echo ""
    exit 1
fi
