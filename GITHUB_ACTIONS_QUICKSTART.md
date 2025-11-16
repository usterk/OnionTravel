# GitHub Actions Deployment - Quick Start Guide

Automatyczny deployment OnionTravel został skonfigurowany! 🚀

## Co zostało zrobione?

✅ **Utworzono pliki workflow:**
- `.github/workflows/deploy-production.yml` - główny workflow deploymentu
- `.github/workflows/pr-version-label.yml` - helper do sprawdzania labelek

✅ **Dokumentacja:**
- `.github/DEPLOYMENT_SETUP.md` - kompletny przewodnik konfiguracji
- `.github/LABELS.md` - dokumentacja labelek wersji
- `.github/README.md` - przegląd konfiguracji GitHub
- `CLAUDE.md` - zaktualizowano o info o GitHub Actions

✅ **Skrypty pomocnicze:**
- `.github/create-labels.sh` - skrypt do tworzenia labelek

## Co musisz teraz zrobić?

### Krok 1: Utwórz labelki w GitHub

**Opcja A: Używając skryptu (zalecane)**

```bash
cd .github
./create-labels.sh
```

**Opcja B: Ręcznie w GitHub UI**

Przejdź do: `https://github.com/YOUR_USERNAME/OnionTravel/labels`

I utwórz 3 labelki:
- `version:major` (kolor: `#d73a4a`)
- `version:minor` (kolor: `#0e8a16`)
- `version:patch` (kolor: `#0366d6`)

Szczegóły w: `.github/LABELS.md`

### Krok 2: Skonfiguruj GitHub Secrets

Przejdź do: `Settings → Secrets and variables → Actions → New repository secret`

#### Wymagane sekrety:

**1. `PRODUCTION_SSH_KEY`**

Twój prywatny klucz SSH do serwera:

```bash
# Wyświetl klucz
cat ~/.ssh/id_rsa

# Lub wygeneruj nowy dedykowany dla GitHub Actions
ssh-keygen -t rsa -b 4096 -C "github-actions@oniontravel" -f ~/.ssh/github_actions_rsa -N ""
ssh-copy-id -i ~/.ssh/github_actions_rsa.pub -p 10209 root@jola209.mikrus.xyz
cat ~/.ssh/github_actions_rsa
```

Skopiuj **cały** output (włącznie z `-----BEGIN...` i `-----END...`) do secretu.

**2. `BACKEND_ENV_PRODUCTION`**

Zawartość pliku `.env.example`:

```bash
cat backend/.env.example
```

Skopiuj całą zawartość do secretu.

### Krok 3: Skonfiguruj Discord Webhook (opcjonalne)

Przejdź do: `Settings → Secrets and variables → Actions → Variables tab → New repository variable`

**Nazwa:** `DISCORD_WEBHOOK_URL`
**Wartość:** `https://discord.com/api/webhooks/1439302833194143744/ISrJsXGBdpBSM8wyCDXOZLu9mGryks6cXljN1Ll95VAgEYP1uARX-CQ7H3bY-1i3edgs`

### Krok 4: Przetestuj deployment

**Opcja A: Test manualny (bezpieczniejsze na start)**

1. Idź do: `Actions → Deploy to Production → Run workflow`
2. Zaznacz `Skip automatic version bump` (dla testu)
3. Kliknij `Run workflow`
4. Obserwuj logi

**Opcja B: Test z prawdziwym PR**

1. Utwórz testowy branch:
   ```bash
   git checkout -b test/github-actions-deployment
   echo "# Test deployment" >> .github/README.md
   git add .
   git commit -m "Test GitHub Actions deployment workflow"
   git push -u origin test/github-actions-deployment
   ```

2. Utwórz Pull Request w GitHub
3. Dodaj labelkę `version:patch`
4. Merge PR
5. Obserwuj automatyczny deployment! 🎉

## Jak to działa od teraz?

### Prosty proces:

1. **Tworzysz PR** z feature brancha do `main`
2. **Dodajesz labelkę wersji**:
   - `version:patch` → bugfixy (0.0.X) - **domyślne**
   - `version:minor` → nowe features (0.X.0)
   - `version:major` → breaking changes (X.0.0)
3. **Mergujesz PR** do main
4. **GitHub Actions automatycznie**:
   - Zwiększa wersję
   - Tworzy tag git
   - Generuje release notes
   - Deployuje na produkcję
   - Tworzy GitHub Release
   - Wysyła notyfikację Discord

### Bez labelki?

Nie ma problemu! Workflow użyje domyślnie `patch` (+0.0.1), a bot przypomni Ci o labelce.

## Monitoring deploymentów

### GitHub UI
- `Actions → Deploy to Production` - wszystkie deploymenty
- Każdy run pokazuje szczegółowe logi

### Discord (jeśli skonfigurowałeś)
- 🚀 Deployment started
- ✅ Deployment successful
- ❌ Deployment failed

### Serwer produkcyjny
```bash
ssh -p 10209 root@jola209.mikrus.xyz
cd /root/OnionTravel
docker compose ps
docker compose logs -f
./check-health.sh
```

## Labelki - szybka ściąga

| Labelka | Co robi | Kiedy używać | Przykład |
|---------|---------|--------------|----------|
| `version:major` | X.0.0 | Breaking changes, usunięcie funkcji | 1.3.0 → 2.0.0 |
| `version:minor` | 0.X.0 | Nowe features (backward compatible) | 1.3.0 → 1.4.0 |
| `version:patch` | 0.0.X | Bugfixy, drobne poprawki | 1.3.0 → 1.3.1 |
| (brak) | 0.0.X | Domyślnie patch | 1.3.0 → 1.3.1 |

## Troubleshooting

**Problem:** Workflow failuje na SSH
- **Rozwiązanie:** Sprawdź czy `PRODUCTION_SSH_KEY` jest poprawny

**Problem:** Wersja się nie zwiększyła
- **Rozwiązanie:** Sprawdź czy PR miał dokładnie JEDNĄ labelkę wersji

**Problem:** Docker build failuje
- **Rozwiązanie:** SSH na serwer, sprawdź logi: `docker compose logs`

**Problem:** Brak notyfikacji Discord
- **Rozwiązanie:** Sprawdź czy `DISCORD_WEBHOOK_URL` jest ustawiony w Variables (nie Secrets!)

Więcej w: `.github/DEPLOYMENT_SETUP.md`

## Ważne pliki

📄 **`.github/DEPLOYMENT_SETUP.md`** - Kompletny przewodnik konfiguracji
📄 **`.github/LABELS.md`** - Szczegółowy opis labelek i semantic versioning
📄 **`.github/README.md`** - Przegląd konfiguracji GitHub
📄 **`CLAUDE.md`** - Główna dokumentacja projektu (zaktualizowana)

## Manualny deployment nadal działa!

Jeśli potrzebujesz, nadal możesz deployować ręcznie:

```bash
./deploy-prod.sh --yes-deploy-current-state-to-production \
  --version 1.4.0 \
  --release-notes /tmp/release.md
```

## Następne kroki

1. ✅ Utwórz labelki (Krok 1)
2. ✅ Skonfiguruj sekrety (Krok 2)
3. ✅ Dodaj webhook Discord (Krok 3, opcjonalny)
4. ✅ Przetestuj deployment (Krok 4)
5. 🎉 Ciesz się automatycznymi deploymentami!

---

**Pytania?** Zobacz:
- `.github/DEPLOYMENT_SETUP.md` - szczegółowy setup
- `.github/LABELS.md` - pytania o labelki
- `.github/README.md` - przegląd konfiguracji

**Problemy?**
- Sprawdź workflow logs w GitHub Actions
- Zobacz troubleshooting w `DEPLOYMENT_SETUP.md`
