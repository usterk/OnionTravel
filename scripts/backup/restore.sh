#!/bin/bash
# OnionTravel Database Restore Script
# Przywraca bazę danych SQLite z backupu

set -e  # Exit on error

# Konfiguracja
BACKUP_DIR="/root/backups/oniontravel"
DOCKER_VOLUME="oniontravel_backend-data"
COMPOSE_FILE="/root/OnionTravel/docker-compose.yml"

# Funkcja wyświetlania użycia
usage() {
    echo "Usage: $0 <backup-file>"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/oniontravel-db-*.tar.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ", " $6 " " $7 ")"}' || echo "  No backups found"
    exit 1
}

# Funkcja logowania
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Sprawdź argumenty
if [ $# -ne 1 ]; then
    usage
fi

BACKUP_FILE="$1"

# Sprawdź czy plik backupu istnieje
if [ ! -f "$BACKUP_FILE" ]; then
    # Spróbuj znaleźć w katalogu backupów
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    else
        echo "ERROR: Backup file not found: $BACKUP_FILE"
        usage
    fi
fi

# Sprawdź rozmiar backupu
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | awk '{print $1}')
BACKUP_DATE=$(basename "$BACKUP_FILE" | grep -oP '\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}')

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         OnionTravel Database Restore - CONFIRMATION           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "📦 Backup file:    $(basename "$BACKUP_FILE")"
echo "📅 Backup date:    $BACKUP_DATE"
echo "💾 Backup size:    $BACKUP_SIZE"
echo ""
echo "⚠️  WARNING: This operation will REPLACE the current database!"
echo ""
echo "🔒 Safety measures:"
echo "   ✓ Current database will be backed up before restore"
echo "   ✓ Backup will be saved as: pre-restore-backup-TIMESTAMP.tar.gz"
echo "   ✓ Backend will be stopped during restore"
echo ""
echo "══════════════════════════════════════════════════════════════════"
echo ""

# Pierwsze potwierdzenie
read -p "Do you want to proceed with restore? (yes/no): " CONFIRM1

if [ "$CONFIRM1" != "yes" ]; then
    log "Restore cancelled by user (first confirmation)."
    exit 0
fi

echo ""
echo "⚠️  LAST CHANCE: Are you ABSOLUTELY SURE?"
echo "   All current data will be replaced with backup from $BACKUP_DATE"
echo ""

# Drugie potwierdzenie
read -p "Type 'RESTORE' to confirm: " CONFIRM2

if [ "$CONFIRM2" != "RESTORE" ]; then
    log "Restore cancelled by user (second confirmation)."
    exit 0
fi

echo ""
log "Starting restore process..."
echo ""

# Krok 1: Zatrzymaj backend
log "Step 1/5: Stopping backend container..."
docker compose -f "$COMPOSE_FILE" stop backend
log "✓ Backend stopped"

# Krok 2: Backup obecnej bazy
log "Step 2/5: Creating safety backup of current database..."
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
SAFETY_BACKUP="pre-restore-backup-${TIMESTAMP}.tar.gz"

docker run --rm \
    -v ${DOCKER_VOLUME}:/data:ro \
    -v ${BACKUP_DIR}:/backup \
    alpine tar czf /backup/${SAFETY_BACKUP} -C / data

SAFETY_SIZE=$(du -h "$BACKUP_DIR/$SAFETY_BACKUP" | awk '{print $1}')
log "✓ Safety backup created: $SAFETY_BACKUP ($SAFETY_SIZE)"
echo "   Location: $BACKUP_DIR/$SAFETY_BACKUP"

# Krok 3: Weryfikacja backupu przed restore
log "Step 3/5: Verifying backup file integrity..."
if tar -tzf "$BACKUP_FILE" 2>&1 | grep -q "data/oniontravel.db"; then
    log "✓ Backup verification PASSED"
else
    log "✗ ERROR: Backup verification FAILED - database not found in archive!"
    log "Aborting restore. Your current database is safe."
    docker compose -f "$COMPOSE_FILE" start backend
    exit 1
fi

# Krok 4: Usuń obecną bazę
log "Step 4/5: Removing current database..."
docker run --rm \
    -v ${DOCKER_VOLUME}:/data \
    alpine rm -rf /data/*
log "✓ Current database removed"

# Krok 5: Przywróć z backupu
log "Step 5/5: Restoring from backup..."
docker run --rm \
    -v ${DOCKER_VOLUME}:/restore \
    -v $(dirname "$BACKUP_FILE"):/backup:ro \
    alpine tar xzf /backup/$(basename "$BACKUP_FILE") -C /restore --strip-components=1
log "✓ Database restored from backup"

# Uruchom backend
log "Starting backend container..."
docker compose -f "$COMPOSE_FILE" start backend

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              Restore Completed Successfully                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
log "✅ Database restored from: $(basename "$BACKUP_FILE")"
log "🔒 Safety backup saved to: $SAFETY_BACKUP"
echo ""
log "Checking backend status..."
sleep 3
docker compose -f "$COMPOSE_FILE" ps backend

echo ""
log "ℹ️  If something went wrong, you can restore the safety backup:"
echo "   $0 $SAFETY_BACKUP"
