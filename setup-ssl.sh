#!/bin/bash
# Setup SSL certificates for OnionTravel using Let's Encrypt
# Run this script on the production server (jola209.mikrus.xyz)

set -e

DOMAIN="jola209.mikrus.xyz"
EMAIL="admin@${DOMAIN}"  # Change this to your email
STAGING=0  # Set to 1 for testing with Let's Encrypt staging server

echo "=================================================="
echo "OnionTravel SSL Setup"
echo "Domain: ${DOMAIN}"
echo "Email: ${EMAIL}"
echo "=================================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root"
    exit 1
fi

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    apt-get update
    apt-get install -y certbot
else
    echo "✅ Certbot already installed"
fi

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    exit 1
fi

echo ""
echo "🚀 Step 1: Starting nginx temporarily for certificate validation..."

# Create temporary nginx config for certbot
mkdir -p /tmp/nginx-certbot
cat > /tmp/nginx-certbot/nginx.conf <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 "Certbot validation server";
    }
}
EOF

# Start temporary nginx container
docker run -d \
    --name nginx-certbot-temp \
    -p 20209:80 \
    -v /tmp/nginx-certbot/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
    -v "$(pwd)/certbot-www:/var/www/certbot" \
    nginx:alpine

echo "⏳ Waiting for nginx to start..."
sleep 3

echo ""
echo "🔐 Step 2: Obtaining SSL certificate from Let's Encrypt..."

# Create certbot directory
mkdir -p certbot-www

# Request certificate
CERTBOT_ARGS="certonly --webroot -w $(pwd)/certbot-www -d ${DOMAIN} --email ${EMAIL} --agree-tos --non-interactive"

if [ "$STAGING" = "1" ]; then
    echo "⚠️  Using Let's Encrypt STAGING server (for testing)"
    CERTBOT_ARGS="${CERTBOT_ARGS} --staging"
fi

if certbot ${CERTBOT_ARGS}; then
    echo "✅ Certificate obtained successfully!"
else
    echo "❌ Failed to obtain certificate"
    docker stop nginx-certbot-temp 2>/dev/null || true
    docker rm nginx-certbot-temp 2>/dev/null || true
    exit 1
fi

echo ""
echo "🧹 Step 3: Cleaning up temporary nginx..."
docker stop nginx-certbot-temp
docker rm nginx-certbot-temp
rm -rf /tmp/nginx-certbot

echo ""
echo "📋 Step 4: Certificate information:"
certbot certificates -d ${DOMAIN}

echo ""
echo "=================================================="
echo "✅ SSL Setup Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Deploy the application: docker compose up -d --build"
echo "2. Check status: docker compose ps"
echo "3. View logs: docker compose logs -f nginx-proxy"
echo ""
echo "Your application will be available at:"
echo "  - HTTP:  http://${DOMAIN}:20209/OnionTravel"
echo "  - HTTPS: https://${DOMAIN}:30209/OnionTravel"
echo ""
echo "Certificate renewal:"
echo "  - Certificates are valid for 90 days"
echo "  - Set up auto-renewal with cron:"
echo "    0 3 * * * certbot renew --quiet && docker compose restart nginx-proxy"
echo ""
