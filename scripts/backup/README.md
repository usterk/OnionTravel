# Backup & Restore Scripts - OnionTravel

## Status: DEPLOYED ON PRODUCTION

Te skrypty są **aktywnie używane na serwerze produkcyjnym** (jola209.mikrus.xyz).

## Co zawiera ten katalog

- **backup.sh** - Skrypt do tworzenia backupów bazy danych
- **restore.sh** - Skrypt do przywracania backupów
- **BACKUP_README.md** - Szczegółowa dokumentacja systemu backupów

## Środowisko produkcyjne

### Serwer: Mikrus.pl VPS - jola209

```bash
ssh root@jola209.mikrus.xyz -p 10209
# lub
ssh root@65.21.32.55 -p 10209
```

### Lokalizacja na serwerze

```
/root/OnionTravel/backup.sh
/root/OnionTravel/restore.sh
/root/OnionTravel/BACKUP_README.md
/root/backups/oniontravel/          # Katalog z backupami
```

## Automatyzacja

**Backupy są wykonywane automatycznie**:
- Cron job uruchamia się **codziennie o 3:00 AM UTC**
- Konfiguracja: `crontab -l` na serwerze
- Logi: `/root/backups/oniontravel/backup.log`

## Szybkie komendy (na serwerze produkcyjnym)

```bash
# Utwórz backup ręcznie
cd /root/OnionTravel
./backup.sh

# Zobacz dostępne backupy
./restore.sh

# Przywróć backup
./restore.sh oniontravel-db-2025-11-12_20-52-08.tar.gz

# Sprawdź logi backupów
tail -20 /root/backups/oniontravel/backup.log

# Lista wszystkich backupów
ls -lh /root/backups/oniontravel/
```

## Strategia rotacji backupów

Backupy są automatycznie zarządzane:

| Przedział czasowy | Zachowane backupy |
|------------------|-------------------|
| 0-7 dni | Wszystkie (codziennie) |
| 8-35 dni | Środa + Niedziela |
| 36-63 dni | Tylko Niedziela |
| 64+ dni | 1. dzień miesiąca (NIGDY nie kasowane) |

## Pobieranie backupów lokalnie

### Najnowszy backup

```bash
# Pobierz najnowszy backup na lokalne środowisko
ssh -p 10209 root@jola209.mikrus.xyz \
  "ls -t /root/backups/oniontravel/oniontravel-db-*.tar.gz | head -1" \
  > /tmp/latest.txt

LATEST=$(cat /tmp/latest.txt)
scp -P 10209 root@jola209.mikrus.xyz:$LATEST ~/Desktop/
```

### Wszystkie backupy

```bash
# Pobierz wszystkie backupy
scp -P 10209 -r root@jola209.mikrus.xyz:/root/backups/oniontravel ~/Desktop/oniontravel-backups/
```

## Użycie w rozwoju lokalnym

Te skrypty są zaprojektowane dla środowiska produkcyjnego z Docker Compose.

**Dla lokalnego rozwoju**:
- SQLite DB znajduje się w `backend/oniontravel.db`
- Możesz kopiować plik bazy bezpośrednio: `cp backend/oniontravel.db backend/oniontravel.db.backup`
- Lub użyć git do wersjonowania stanu bazy podczas testów

## Przywracanie z produkcji na lokalne

```bash
# 1. Pobierz backup z produkcji
scp -P 10209 root@jola209.mikrus.xyz:/root/backups/oniontravel/oniontravel-db-2025-11-12_20-52-08.tar.gz ~/Desktop/

# 2. Rozpakuj
cd ~/Desktop
tar -xzf oniontravel-db-2025-11-12_20-52-08.tar.gz

# 3. Skopiuj bazę do projektu lokalnego
cp data/oniontravel.db /Users/usterk/src/OnionTravel/backend/oniontravel.db
```

## Dokumentacja

Pełna dokumentacja systemu backupów znajduje się w **BACKUP_README.md**.

## Ostatnia synchronizacja ze skryptami produkcyjnymi

**Data**: 2025-11-12
**Źródło**: jola209.mikrus.xyz:/root/OnionTravel/

---

**WAŻNE**: Te skrypty są działającym systemem produkcyjnym. Wszelkie zmiany powinny być:
1. Przetestowane lokalnie
2. Zdeployowane na produkcję
3. Zweryfikowane na serwerze
