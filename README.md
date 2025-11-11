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
