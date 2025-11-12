<p align="center">
  <img src="logo.png" width="200" alt="OnionTravel Logo">
</p>

<h1 align="center">OnionTravel</h1>

<p align="center">
  🧅 Track your trip budget with ease
</p>

<p align="center">
  Trip budget tracking application with multi-currency support and real-time expense monitoring.
</p>

## Quick Start

```bash
./run.sh
```

- Frontend: http://localhost:7003
- Backend API: http://localhost:7001
- API Docs: http://localhost:7001/docs

## Reset Password

If you need to reset a user's password:

```bash
cd backend
source venv/bin/activate
python reset_password.py <email> <new_password>
```

Example:
```bash
python reset_password.py agata@guc.net.pl NewPassword123
```

## Testing

```bash
./test.sh              # All tests (5-10 min)
./test.sh backend      # Backend only
./test.sh frontend     # Frontend only
./test.sh e2e          # E2E only
```

Reports: `test-reports/`

## Creating a Release

### Semantic Versioning (SemVer)

We use semantic versioning: `MAJOR.MINOR.PATCH`

**When to bump:**

- **PATCH** (1.1.0 → 1.1.1) - Bug fixes, small corrections
  - Fix: Category not saving correctly
  - Fix: Date picker broken on Safari
  - Security patches

- **MINOR** (1.1.0 → 1.2.0) - New features, backwards compatible
  - Add: Trip member management
  - Add: Export to PDF
  - Add: Push notifications

- **MAJOR** (1.1.0 → 2.0.0) - Breaking changes
  - Change: API structure (REST → GraphQL)
  - Change: Database migration required
  - Remove: Deprecated functionality

**Quick rule:** *"Does the user need to do something after update?"*
- ❌ No → PATCH
- ✅ Yes, but optional (new feature) → MINOR
- ⚠️ Yes, required (breaking change) → MAJOR

### Release Process

1. **Create release** (automated):
```bash
./release.sh 1.2.0
```

The script will:
- Validate version format
- Update `frontend/package.json` and `frontend/src/version.ts`
- Show diff and ask for confirmation
- Create commit and git tag
- Push to GitHub

2. **Deploy to production**:
```bash
# SSH to server
ssh root@YOUR_IP -p 10XXX

# Update application
cd ~/OnionTravel
./update.sh
```

3. **Verify**:
- Check version in footer: "OnionTravel vX.Y.Z"
- Test new features
- Check logs: `docker compose logs -f`
