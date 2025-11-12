# OnionTravel Backup & Restore Guide

## Automatyczne backupy

Backup bazy danych jest wykonywany **automatycznie codziennie o 3:00 rano** przez cron.

### Lokalizacja backupów

- Katalog: `/root/backups/oniontravel/`
- Format nazwy: `oniontravel-db-YYYY-MM-DD_HH-MM-SS.tar.gz`
- Log: `/root/backups/oniontravel/backup.log`
- Retencja: **Zaawansowana strategia rotacji** (patrz niżej)

### Sprawdzanie backupów

```bash
# Lista wszystkich backupów
ls -lh /root/backups/oniontravel/

# Sprawdź ostatni backup
ls -lt /root/backups/oniontravel/oniontravel-db-*.tar.gz | head -1

# Sprawdź log backupów
tail -20 /root/backups/oniontravel/backup.log
```

## Ręczne backupy

### Utworzenie backupu ręcznie

```bash
cd /root/OnionTravel
./backup.sh
```

Backup zostanie utworzony w `/root/backups/oniontravel/` z aktualną datą i czasem.

## Strategia rotacji backupów

Backupy są automatycznie zarządzane według zaawansowanej strategii rotacji:

| Przedział czasowy | Zachowane backupy | Przykład |
|------------------|-------------------|----------|
| **0-7 dni** | Wszystkie backupy codziennie | Pn, Wt, Śr, Czw, Pt, Sob, Nd |
| **8-35 dni** (tygodnie 2-5) | Środa + Niedziela | Co 3-4 dni |
| **36-63 dni** (tygodnie 6-9) | Tylko Niedziela | Co tydzień |
| **64+ dni** | 1. dzień miesiąca | Co miesiąc (NIGDY nie kasowane) |

### Przykład po 3 miesiącach:

```
Ostatnie 7 dni:     7 backupów (codziennie)
Tygodnie 2-5:       8 backupów (śr+nd × 4 tygodnie)
Tygodnie 6-9:       4 backupy (nd × 4 tygodnie)
Miesięczne:         2-3 backupy (1. dzień każdego miesiąca)
───────────────────────────────────────────────
RAZEM:             ~21-22 backupów
```

### Cechy strategii:

- ✅ **Granularność krótkoterminowa**: Pełna historia z ostatniego tygodnia
- ✅ **Optymalizacja miejsca**: Tylko najważniejsze backupy z przeszłości
- ✅ **Długoterminowe archiwum**: Miesięczne backupy nigdy nie są kasowane
- ✅ **Automatyczna weryfikacja**: Każdy backup jest sprawdzany po utworzeniu

## Przywracanie z backupu (Restore)

### UWAGA: Przywracanie ZASTĘPUJE obecną bazę danych!

### Krok 1: Zobacz dostępne backupy

```bash
cd /root/OnionTravel
./restore.sh
```

To wyświetli listę dostępnych backupów bez wykonywania restore.

### Krok 2: Przywróć wybrany backup

```bash
# Opcja 1: Podaj pełną ścieżkę
./restore.sh /root/backups/oniontravel/oniontravel-db-2025-11-12_20-52-08.tar.gz

# Opcja 2: Podaj tylko nazwę pliku
./restore.sh oniontravel-db-2025-11-12_20-52-08.tar.gz
```

### Zabezpieczenia restore:

**🔒 Podwójne potwierdzenie:**
1. Pierwsze pytanie: "Do you want to proceed? (yes/no)"
2. Drugie pytanie: "Type 'RESTORE' to confirm"

**💾 Automatyczny safety backup:**
- ZAWSZE tworzony przed każdym restore
- Format: `pre-restore-backup-YYYY-MM-DD_HH-MM-SS.tar.gz`
- Można użyć do cofnięcia zmian

**Proces restore:**
1. Wyświetla informacje o backupie (data, rozmiar)
2. Pyta o potwierdzenie (2 razy!)
3. Zatrzymuje backend
4. Tworzy safety backup obecnej bazy
5. Weryfikuje integralność backupu do przywrócenia
6. Usuwa obecną bazę
7. Przywraca bazę z backupu
8. Uruchamia backend
9. Wyświetla instrukcję cofnięcia (gdyby coś poszło nie tak)

### Jak cofnąć restore (undo):

Jeśli po restore coś poszło nie tak, użyj safety backup:

```bash
./restore.sh pre-restore-backup-2025-11-12_21-10-00.tar.gz
```

## Pobieranie backupów lokalnie (zalecane)

### Z macOS/Linux:

```bash
# Pobierz wszystkie backupy
scp -P 10209 -r root@jola209.mikrus.xyz:/root/backups/oniontravel ~/Desktop/oniontravel-backups/

# Pobierz najnowszy backup
ssh -p 10209 root@jola209.mikrus.xyz "ls -t /root/backups/oniontravel/oniontravel-db-*.tar.gz | head -1" > /tmp/latest.txt
LATEST=$(cat /tmp/latest.txt)
scp -P 10209 root@jola209.mikrus.xyz:$LATEST ~/Desktop/
```

### Przywracanie lokalnego backupu na serwer:

```bash
# 1. Prześlij backup na serwer
scp -P 10209 ~/Desktop/oniontravel-db-2025-11-12.tar.gz root@jola209.mikrus.xyz:/root/backups/oniontravel/

# 2. Zaloguj się i przywróć
ssh root@jola209.mikrus.xyz -p 10209
cd /root/OnionTravel
./restore.sh oniontravel-db-2025-11-12.tar.gz
```

## Monitoring backupów

### Sprawdź czy cron działa:

```bash
# Zobacz konfigurację crona
crontab -l

# Sprawdź log crona (Debian/Ubuntu)
grep CRON /var/log/syslog | tail -20

# Sprawdź ostatni backup
tail /root/backups/oniontravel/backup.log
```

### Testowanie backupu:

```bash
# Utwórz testowy backup
./backup.sh

# Sprawdź czy można rozpakować
tar -tzf /root/backups/oniontravel/oniontravel-db-*.tar.gz | head
```

## Rozwiązywanie problemów

### Backup się nie tworzy

```bash
# Sprawdź czy Docker volume istnieje
docker volume ls | grep oniontravel

# Sprawdź uprawnienia
ls -la /root/backups/oniontravel/

# Sprawdź logi
tail -50 /root/backups/oniontravel/backup.log
```

### Restore się nie udaje

```bash
# Sprawdź czy backend jest zatrzymany
docker compose ps

# Ręcznie zatrzymaj backend
docker compose stop backend

# Spróbuj ponownie
./restore.sh <backup-file>
```

## Zalecenia produkcyjne

1. **Pobieraj backupy lokalnie** - co tydzień kopiuj backupy na swoją maszynę lokalną
2. **Testuj restore** - raz na miesiąc przetestuj proces przywracania
3. **Monitoruj miejsce** - regularnie sprawdzaj czy nie brakuje miejsca:
   ```bash
   df -h /root/backups/
   ```
4. **Strategia rotacji** - działa automatycznie zgodnie z opisem powyżej, nie wymaga konfiguracji

## Struktura backupu

Backup zawiera:
- `data/oniontravel.db` - główna baza SQLite
- Wszystkie pliki z Docker volume `oniontravel_backend-data`

Backup **NIE** zawiera:
- Uploadowanych plików użytkowników (volume `oniontravel_backend-uploads`)
- Konfiguracji `.env`
- Kodu aplikacji

### Pełny backup systemu

Jeśli chcesz backup WSZYSTKIEGO:

```bash
# Na serwerze
tar czf /root/full-backup-$(date +%Y%m%d).tar.gz \
    /root/OnionTravel \
    /root/backups/oniontravel \
    /var/lib/docker/volumes/oniontravel_backend-uploads

# Pobierz lokalnie
scp -P 10209 root@jola209.mikrus.xyz:/root/full-backup-*.tar.gz ~/Desktop/
```
