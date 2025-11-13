# Manual SSL Setup for OnionTravel on Mikrus.pl

## Problem

Let's Encrypt requires validation on standard port 80, but Mikrus.pl VPS only exposes custom ports:
- Port 20209 → HTTP
- Port 30209 → HTTPS

## Solution Options

### Option 1: Self-Signed Certificate (Quick Start)

```bash
# On production server
cd /root/OnionTravel

# Generate self-signed certificate
mkdir -p /etc/letsencrypt/live/jola209.mikrus.xyz
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/letsencrypt/live/jola209.mikrus.xyz/privkey.pem \
  -out /etc/letsencrypt/live/jola209.mikrus.xyz/fullchain.pem \
  -subj "/C=PL/ST=Poland/L=Warsaw/O=OnionTravel/CN=jola209.mikrus.xyz"

# Deploy application
docker compose up -d --build
```

**Note**: Browsers will show "Not Secure" warning. Users need to accept the self-signed certificate.

### Option 2: Certbot DNS Challenge (Recommended for Production)

If you have access to DNS records for `mikrus.xyz` domain:

```bash
# Install certbot with DNS plugin
apt-get install -y certbot python3-certbot-dns-[provider]

# Example for Cloudflare:
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d jola209.mikrus.xyz \
  --email your-email@example.com \
  --agree-tos
```

### Option 3: Manual HTTP Challenge

1. Request certificate with manual mode:
```bash
certbot certonly --manual \
  --preferred-challenges http \
  -d jola209.mikrus.xyz \
  --email your-email@example.com \
  --agree-tos
```

2. Certbot will provide a challenge token and ask you to create a file
3. Stop current application: `docker compose down`
4. Start temporary nginx on port 20209 to serve the challenge
5. Complete validation
6. Deploy application with real certificates

### Option 4: Use HTTP Only (No SSL)

For development/testing, use HTTP only:

1. Update `nginx/nginx.conf` - remove SSL server block
2. Use only port 20209 for HTTP
3. Update ALLOWED_ORIGINS in backend to use `http://jola209.mikrus.xyz:20209`

## Current Deployment (No SSL)

For now, deploy without SSL:

```bash
# On production server
cd /root/OnionTravel

# Deploy application
docker compose up -d --build

# Application available at:
# http://jola209.mikrus.xyz:20209/OnionTravel
```

Update nginx.conf to listen only on port 80 (mapped to 20209).
