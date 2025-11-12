#!/bin/bash
# OnionTravel Database Backup Script with Advanced Rotation
# Strategia rotacji (wykonywana przez Python):
# - Ostatnie 7 dni: wszystkie backupy
# - 4 tygodnie wstecz (8-35 dni): środa i niedziela
# - Kolejne 4 tygodnie (36-63 dni): tylko niedziela
# - Starsze (64+ dni): 1. dzień miesiąca (nigdy nie kasujemy)

set -e  # Exit on error

# Konfiguracja
BACKUP_DIR="/root/backups/oniontravel"
DOCKER_VOLUME="oniontravel_backend-data"
DATE_FORMAT=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="oniontravel-db-${DATE_FORMAT}.tar.gz"
LOG_FILE="/root/backups/oniontravel/backup.log"

# Funkcja logowania
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting backup ==="

# Sprawdź czy katalog backupów istnieje
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    log "Created backup directory: $BACKUP_DIR"
fi

# Sprawdź czy Docker volume istnieje
if ! docker volume inspect "$DOCKER_VOLUME" > /dev/null 2>&1; then
    log "ERROR: Docker volume $DOCKER_VOLUME not found!"
    exit 1
fi

# Utwórz backup używając Alpine container
log "Creating backup: $BACKUP_FILE"
docker run --rm \
    -v ${DOCKER_VOLUME}:/data:ro \
    -v ${BACKUP_DIR}:/backup \
    alpine tar czf /backup/${BACKUP_FILE} -C / data 2>&1 | tee -a "$LOG_FILE"

# Sprawdź czy backup się udał
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | awk '{print $1}')
    log "Backup created successfully: $BACKUP_FILE (size: $BACKUP_SIZE)"
else
    log "ERROR: Backup file not created!"
    exit 1
fi

# Weryfikacja backupu - sprawdź czy można go rozpakować i czy zawiera bazę
log "Verifying backup integrity..."
if tar -tzf "$BACKUP_DIR/$BACKUP_FILE" 2>&1 | grep -q "data/oniontravel.db"; then
    log "Backup verification PASSED - database file found in archive"

    # Dodatkowa weryfikacja - sprawdź rozmiar rozpakowany
    UNCOMPRESSED_SIZE=$(tar -tzf "$BACKUP_DIR/$BACKUP_FILE" --totals 2>&1 | grep -o '[0-9]* bytes' | head -1 || echo "unknown")
    log "Uncompressed size: $UNCOMPRESSED_SIZE"
else
    log "ERROR: Backup verification FAILED - database file not found in archive!"
    rm -f "$BACKUP_DIR/$BACKUP_FILE"
    exit 1
fi

# Wykonaj rotację backupów używając Python
log "Starting backup rotation..."

python3 << 'PYTHON_SCRIPT'
import os
import glob
import re
from datetime import datetime, timedelta

BACKUP_DIR = "/root/backups/oniontravel"
LOG_FILE = "/root/backups/oniontravel/backup.log"

def log(message):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    log_message = f"[{timestamp}] {message}\n"
    print(log_message.strip())
    with open(LOG_FILE, 'a') as f:
        f.write(log_message)

def get_backup_date(filename):
    """Wyciągnij datę z nazwy pliku"""
    match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
    if match:
        try:
            return datetime.strptime(match.group(1), '%Y-%m-%d')
        except:
            return None
    return None

def should_keep_backup(backup_date, now):
    """Określ czy backup powinien zostać zachowany"""
    age_days = (now - backup_date).days
    day_of_week = backup_date.weekday()  # 0=Monday, 6=Sunday
    day_of_month = backup_date.day

    # Reguła 1: Ostatnie 7 dni - wszystko
    if age_days <= 7:
        return True, f"last 7 days (age: {age_days}d)"

    # Reguła 2: 8-35 dni - środa (2) i niedziela (6)
    elif age_days <= 35:
        if day_of_week == 2 or day_of_week == 6:
            return True, f"week 2-5, Wed/Sun (age: {age_days}d)"
        return False, f"week 2-5, not Wed/Sun (age: {age_days}d)"

    # Reguła 3: 36-63 dni - tylko niedziela (6)
    elif age_days <= 63:
        if day_of_week == 6:
            return True, f"week 6-9, Sunday (age: {age_days}d)"
        return False, f"week 6-9, not Sunday (age: {age_days}d)"

    # Reguła 4: Starsze - tylko 1. dzień miesiąca
    else:
        if day_of_month == 1:
            return True, f"monthly (1st of month, age: {age_days}d)"
        return False, f"old, not 1st of month (age: {age_days}d)"

# Znajdź wszystkie backupy
backup_files = sorted(glob.glob(os.path.join(BACKUP_DIR, "oniontravel-db-*.tar.gz")), reverse=True)
now = datetime.now()

kept = 0
deleted = 0

for backup_file in backup_files:
    backup_date = get_backup_date(backup_file)

    if backup_date is None:
        log(f"WARNING: Cannot parse date from {os.path.basename(backup_file)}, skipping")
        continue

    keep, reason = should_keep_backup(backup_date, now)
    day_name = backup_date.strftime('%A')
    date_str = backup_date.strftime('%Y-%m-%d')

    if keep:
        log(f"KEEP: {date_str} ({day_name}) - {reason}")
        kept += 1
    else:
        log(f"DELETE: {date_str} ({day_name}) - {reason}")
        try:
            os.remove(backup_file)
            deleted += 1
        except Exception as e:
            log(f"ERROR: Failed to delete {backup_file}: {e}")

log(f"Rotation complete: kept={kept}, deleted={deleted}")
PYTHON_SCRIPT

# Pokaż statystyki
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/oniontravel-db-*.tar.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | awk '{print $1}')
log "Backup statistics: total_backups=$BACKUP_COUNT, total_size=$TOTAL_SIZE"

log "=== Backup completed successfully ==="
