# OnionTravel Deployment Guide

Pełna instrukcja wdrożenia aplikacji OnionTravel na serwer (mikrus.pl lub inny VPS) z dostępem przez iPhone jako aplikacja webowa (PWA).

## Spis treści

- [Wymagania](#wymagania)
- [Quick Start](#quick-start)
- [Konfiguracja krok po kroku](#konfiguracja-krok-po-kroku)
- [Setup HTTPS (Let's Encrypt)](#setup-https-lets-encrypt)
- [Dodawanie aplikacji do ekranu głównego iPhone](#dodawanie-aplikacji-do-ekranu-głównego-iphone)
- [Utrzymanie i backupy](#utrzymanie-i-backupy)
- [Troubleshooting](#troubleshooting)

---

## Wymagania

### Na serwerze (mikrus.pl)

- System: Linux (Debian/Ubuntu preferred)
- Docker: 20.10+
- Docker Compose: 2.0+
- Dostęp SSH
- Wolne porty: 80, 7001 (lub inne do wyboru)
- Minimum 1GB RAM, 10GB storage

### Lokalne (do przygotowania)

- Git
- SSH client
- Editor tekstu do edycji plików .env

### Opcjonalnie

- Własna domena (lub subdomena) - dla ładnego URL i HTTPS
- Bez domeny - aplikacja będzie dostępna pod http://IP_SERWERA

---

## Quick Start

### 1. Przygotowanie na serwerze

```bash
# SSH na serwer
ssh user@your-server-ip

# Sprawdź Docker
docker --version
docker-compose --version

# Jeśli Docker nie jest zainstalowany:
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Wyloguj się i zaloguj ponownie

# Utwórz katalog dla projektu
mkdir -p ~/oniontravel
cd ~/oniontravel
```

### 2. Transfer kodu

**Opcja A: Przez Git (zalecane)**

```bash
# Na serwerze
git clone https://github.com/usterk/OnionTravel.git .
```

**Opcja B: Przez SCP (transfer lokalnie)**

```bash
# Z Maca
cd /Users/agataguc/Projects/onion-travel
tar -czf oniontravel.tar.gz .
scp oniontravel.tar.gz user@your-server-ip:~/

# Na serwerze
cd ~/oniontravel
tar -xzf ~/oniontravel.tar.gz
rm ~/oniontravel.tar.gz
```

### 3. Konfiguracja środowiska

```bash
# Sprawdź IP serwera
curl -4 ifconfig.me
# Zapisz ten IP - będzie potrzebny

# Skopiuj pliki example
cp .env.example .env
cp backend/.env.production.example backend/.env.production
cp frontend/.env.production.example frontend/.env.production
```

**Edytuj backend/.env.production:**

```bash
nano backend/.env.production
```

Ustaw:
```env
# Wygeneruj SECRET_KEY
# Uruchom na serwerze: openssl rand -hex 32
SECRET_KEY=WKLEJ_WYGENEROWANY_KLUCZ_TUTAJ

# CORS - zamień YOUR_SERVER_IP na rzeczywisty IP
# Jeśli masz domenę, użyj https://twoja-domena.pl
ALLOWED_ORIGINS=http://YOUR_SERVER_IP

# Currency API key (opcjonalnie)
# Pobierz za darmo z: https://www.exchangerate-api.com/
EXCHANGE_RATE_API_KEY=twoj-klucz-api
```

**Edytuj frontend/.env.production:**

```bash
nano frontend/.env.production
```

Ustaw:
```env
# Zamień YOUR_SERVER_IP na rzeczywisty IP serwera
VITE_API_BASE_URL=http://YOUR_SERVER_IP:7001/api/v1
```

**Edytuj .env (root):**

```bash
nano .env
```

Ustaw:
```env
# Zamień YOUR_SERVER_IP na rzeczywisty IP serwera
VITE_API_BASE_URL=http://YOUR_SERVER_IP:7001/api/v1
```

### 4. Uruchomienie

```bash
# Build i start wszystkich kontenerów
docker-compose up -d --build

# Sprawdź logi
docker-compose logs -f

# Sprawdź status
docker-compose ps
```

Oczekiwany output:
```
NAME                     STATUS          PORTS
oniontravel-backend      Up (healthy)    0.0.0.0:7001->7001/tcp
oniontravel-frontend     Up (healthy)    0.0.0.0:80->80/tcp
```

### 5. Test

```bash
# Z serwera
curl http://localhost/
curl http://localhost:7001/health

# Z Maca lub iPhone (Safari)
# Otwórz: http://YOUR_SERVER_IP
```

Jeśli widzisz aplikację - **sukces!** 🎉

---

## Konfiguracja krok po kroku

### Sprawdzenie konfiguracji serwera

```bash
# Sprawdź dostępne zasoby
free -h              # Pamięć RAM
df -h                # Dysk
docker info          # Docker info

# Sprawdź wolne porty
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :7001
```

Jeśli port 80 jest zajęty, zmień w `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "7003:80"  # Zamiast "80:80"
```

### Generowanie SECRET_KEY

```bash
# Na serwerze
openssl rand -hex 32
```

Skopiuj output i wklej do `backend/.env.production` jako `SECRET_KEY`.

### Struktura katalogów po deployment

```
~/oniontravel/
├── backend/
│   ├── Dockerfile
│   ├── .env.production      # Twoje ustawienia
│   └── ...
├── frontend/
│   ├── Dockerfile
│   ├── .env.production      # Twoje ustawienia
│   └── ...
├── nginx/                   # Opcjonalne (reverse proxy)
├── docker-compose.yml
├── .env                     # Build-time vars
└── DEPLOYMENT.md            # Ta instrukcja
```

### Docker volumes (persistent data)

```bash
# Sprawdź volumes
docker volume ls

# Backup database
docker run --rm -v oniontravel_backend-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/database-backup.tar.gz /data

# Restore database
docker run --rm -v oniontravel_backend-data:/data -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/database-backup.tar.gz --strip 1"
```

---

## Setup HTTPS (Let's Encrypt)

### Wymagania

- Własna domena wskazująca na IP serwera
- Port 80 i 443 otwarte

### Instalacja Certbot

```bash
# Na serwerze
sudo apt update
sudo apt install certbot
```

### Opcja 1: Certbot standalone (prostsze)

```bash
# Zatrzymaj kontener frontend (tymczasowo, żeby zwolnić port 80)
docker-compose stop frontend

# Wygeneruj certyfikat
sudo certbot certonly --standalone -d your-domain.pl -d www.your-domain.pl

# Certyfikaty będą w: /etc/letsencrypt/live/your-domain.pl/

# Uruchom ponownie
docker-compose start frontend
```

### Opcja 2: Z Nginx reverse proxy (zalecane dla HTTPS)

**1. Odkomentuj nginx-proxy w docker-compose.yml:**

```yaml
nginx-proxy:
  build:
    context: ./nginx
    dockerfile: Dockerfile
  container_name: oniontravel-nginx
  restart: unless-stopped
  ports:
    - "80:80"
    - "443:443"
  depends_on:
    frontend:
      condition: service_healthy
    backend:
      condition: service_healthy
  networks:
    - oniontravel-network
  volumes:
    - ./nginx/ssl:/etc/nginx/ssl:ro
  healthcheck:
    test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 10s
```

**2. Aktualizuj nginx/nginx.conf:**

```nginx
# HTTP - redirect to HTTPS
server {
    listen 80;
    server_name your-domain.pl www.your-domain.pl;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name your-domain.pl www.your-domain.pl;

    # SSL certificates
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Backend API
    location /api/ {
        proxy_pass http://backend:7001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

**3. Wygeneruj certyfikat i skopiuj:**

```bash
# Wygeneruj certyfikat (bez nginx)
sudo certbot certonly --standalone -d your-domain.pl -d www.your-domain.pl

# Skopiuj certyfikaty do katalogu nginx
sudo mkdir -p ~/oniontravel/nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.pl/fullchain.pem ~/oniontravel/nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.pl/privkey.pem ~/oniontravel/nginx/ssl/
sudo chown -R $USER:$USER ~/oniontravel/nginx/ssl
```

**4. Zaktualizuj environment files:**

```bash
# backend/.env.production
ALLOWED_ORIGINS=https://your-domain.pl,https://www.your-domain.pl

# frontend/.env.production
VITE_API_BASE_URL=/api/v1

# .env (root)
VITE_API_BASE_URL=/api/v1
```

**5. Rebuild i restart:**

```bash
docker-compose down
docker-compose up -d --build

# Sprawdź
docker-compose ps
docker-compose logs nginx-proxy
```

**6. Automatyczne odnawianie certyfikatu:**

```bash
# Dodaj cron job
sudo crontab -e

# Dodaj linię (sprawdza i odnawia co tydzień):
0 0 * * 0 certbot renew --quiet --deploy-hook "cp /etc/letsencrypt/live/your-domain.pl/*.pem ~/oniontravel/nginx/ssl/ && docker-compose -f ~/oniontravel/docker-compose.yml restart nginx-proxy"
```

---

## Dodawanie aplikacji do ekranu głównego iPhone

### Krok po kroku

1. **Połącz iPhone z WiFi lub LTE** (potrzebujesz internetu)

2. **Otwórz Safari** (WAŻNE: musi być Safari, nie Chrome)

3. **Wejdź na adres aplikacji:**
   - Z domeną: `https://your-domain.pl`
   - Bez domeny: `http://YOUR_SERVER_IP`

4. **Zaloguj się** (jeśli masz już konto) lub **Zarejestruj się**

5. **Kliknij przycisk "Udostępnij"** (kwadrat ze strzałką w górę) na pasku narzędzi Safari

6. **Przewiń w dół i wybierz "Dodaj do ekranu głównego"**

7. **Ustaw nazwę:** "OnionTravel" (lub dowolną)

8. **Kliknij "Dodaj"** w prawym górnym rogu

9. **Gotowe!** Ikona pojawi się na ekranie głównym

### Jak to wygląda i działa

- **Ikona:** Pojawi się na ekranie głównym obok innych aplikacji
- **Uruchomienie:** Kliknij ikonę → aplikacja otworzy się na pełnym ekranie (bez paska Safari)
- **Wygląd:** Jak natywna aplikacja iOS
- **Dostęp offline:** Ograniczony (wymaga połączenia z internetem do API)
- **Powiadomienia:** Brak (to ograniczenie PWA na iOS)
- **Aktualizacje:** Automatyczne (po odświeżeniu strony)

### Testowanie PWA

```bash
# Sprawdź manifest (opcjonalnie, dodaj do frontend/public/)
# frontend/public/manifest.json
{
  "name": "OnionTravel",
  "short_name": "OnionTravel",
  "description": "Trip Budget Tracker",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## Utrzymanie i backupy

### Aktualizacja aplikacji

```bash
# Na serwerze
cd ~/oniontravel

# Pull nowej wersji
git pull origin main

# Rebuild i restart
docker-compose up -d --build

# Sprawdź logi
docker-compose logs -f
```

### Backup bazy danych

```bash
# Automatyczny backup codziennie o 3:00
sudo crontab -e

# Dodaj:
0 3 * * * docker run --rm -v oniontravel_backend-data:/data -v /home/user/backups:/backup alpine tar czf /backup/oniontravel-db-$(date +\%Y\%m\%d).tar.gz /data
```

### Monitoring

```bash
# Sprawdź status kontenerów
docker-compose ps

# Logi wszystkich serwisów
docker-compose logs -f

# Logi konkretnego serwisu
docker-compose logs -f backend
docker-compose logs -f frontend

# Zużycie zasobów
docker stats
```

### Restart serwisów

```bash
# Restart wszystkich
docker-compose restart

# Restart backend
docker-compose restart backend

# Restart frontend
docker-compose restart frontend

# Pełny rebuild (po zmianie kodu)
docker-compose down
docker-compose up -d --build
```

### Czyszczenie

```bash
# Usuń nieużywane obrazy
docker image prune -a

# Usuń nieużywane volumes (OSTROŻNIE - nie usuwa named volumes)
docker volume prune

# Sprawdź miejsce
df -h
docker system df
```

---

## Troubleshooting

### Problem: Kontenery nie startują

**Sprawdź logi:**
```bash
docker-compose logs backend
docker-compose logs frontend
```

**Typowe problemy:**
- Błędna konfiguracja .env
- Brak SECRET_KEY w backend/.env.production
- Port 80 zajęty

**Rozwiązanie:**
```bash
# Sprawdź porty
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :7001

# Zmień porty w docker-compose.yml jeśli zajęte
```

### Problem: "Cannot connect to API"

**Sprawdź:**
1. Backend działa: `curl http://localhost:7001/health`
2. CORS w backend/.env.production zawiera prawidłowy origin
3. VITE_API_BASE_URL w frontend/.env.production wskazuje na poprawny URL

**Debugowanie:**
```bash
# Sprawdź backend health
docker-compose exec backend curl http://localhost:7001/health

# Sprawdź network
docker network inspect oniontravel_oniontravel-network

# Restart
docker-compose restart backend
```

### Problem: Database lock errors

**Rozwiązanie:**
```bash
# Restart backend
docker-compose restart backend

# Jeśli nie pomaga, usuń lock
docker-compose exec backend rm -f /app/data/oniontravel.db-shm /app/data/oniontravel.db-wal
docker-compose restart backend
```

### Problem: Port 80 zajęty (np. przez Apache)

**Sprawdź:**
```bash
sudo netstat -tulpn | grep :80
```

**Rozwiązania:**

**Opcja A:** Zatrzymaj Apache/nginx
```bash
sudo systemctl stop apache2
# lub
sudo systemctl stop nginx
```

**Opcja B:** Użyj innego portu
```yaml
# W docker-compose.yml
frontend:
  ports:
    - "8080:80"  # Zmień na 8080 lub inny wolny port
```

### Problem: Certbot renewal fails

**Sprawdź:**
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

**Rozwiązanie:**
```bash
# Zatrzymaj nginx proxy tymczasowo
docker-compose stop nginx-proxy

# Odnów certyfikat
sudo certbot renew

# Skopiuj nowe certyfikaty
sudo cp /etc/letsencrypt/live/your-domain.pl/*.pem ~/oniontravel/nginx/ssl/

# Restart
docker-compose start nginx-proxy
```

### Problem: Aplikacja nie działa na iPhone

**Sprawdź:**
1. Używasz Safari (nie Chrome/Firefox)
2. URL jest poprawny
3. Firewall serwera zezwala na port 80/443
4. CORS w backend/.env.production zawiera origin z IP lub domeny

**Debugowanie:**
```bash
# Na serwerze - sprawdź firewall
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 7001
```

### Problem: "Add to Home Screen" nie działa

**Wymagania iOS:**
- Safari (nie inne przeglądarki)
- HTTPS (dla pełnej funkcjonalności PWA) lub HTTP z localhost
- Manifest.json (opcjonalnie)

**Workaround bez HTTPS:**
iOS pozwala dodać każdą stronę do ekranu głównego, nawet bez PWA features.

### Użyteczne komendy

```bash
# Sprawdź wszystkie kontenery
docker ps -a

# Zatrzymaj wszystko
docker-compose down

# Zatrzymaj i usuń volumes (OSTROŻNIE - kasuje dane)
docker-compose down -v

# Rebuild konkretnego serwisu
docker-compose up -d --build backend

# Wykonaj komendę w kontenerze
docker-compose exec backend bash
docker-compose exec frontend sh

# Zobacz zużycie zasobów
docker stats

# Wyczyść wszystko (OSTROŻNIE)
docker system prune -a --volumes
```

---

## Wsparcie

### Dokumentacja

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Let's Encrypt](https://letsencrypt.org/getting-started/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Vite Documentation](https://vitejs.dev/)

### Logi

Zawsze sprawdź logi przed zgłaszaniem problemu:
```bash
docker-compose logs --tail=100 backend > backend.log
docker-compose logs --tail=100 frontend > frontend.log
```

---

## Podsumowanie

Po poprawnym wdrożeniu powinieneś mieć:

✅ Backend działający na `http://YOUR_SERVER_IP:7001`
✅ Frontend działający na `http://YOUR_SERVER_IP` (port 80)
✅ Aplikację dostępną na iPhone przez Safari
✅ Możliwość dodania ikony do ekranu głównego
✅ Automatyczne restarty kontenerów
✅ Persistent storage dla bazy danych
✅ (Opcjonalnie) HTTPS z Let's Encrypt
✅ (Opcjonalnie) Nginx reverse proxy na jednym porcie

**Gotowe do użycia w podróży! 🎉**
