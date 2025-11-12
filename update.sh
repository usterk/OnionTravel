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

# Wait a bit for containers to start
echo "⏳ Waiting for containers to start..."
sleep 5

# Show status
echo ""
echo "✅ Update complete!"
echo ""
echo "📊 Container status:"
docker compose ps

echo ""
echo "💡 View logs with: docker compose logs -f"
echo "💡 Check backend: docker compose logs backend"
echo "💡 Check frontend: docker compose logs frontend"
echo ""
