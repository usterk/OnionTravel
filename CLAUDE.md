# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Production Server Access

**Mikrus.pl VPS - jola209**

```bash
# SSH access
ssh root@jola209.mikrus.xyz -p 10209
```

**Application URLs:**

**Production:**
- Frontend: https://oniontravel.bieda.it/OnionTravel
- Backend API: https://oniontravel.bieda.it/OnionTravel/api/v1
- API Docs: https://oniontravel.bieda.it/OnionTravel/docs

**Server Architecture:**
```
Production (oniontravel.bieda.it):
Internet → Cloudflare CDN → System Nginx (port 443 HTTPS)
                          → Frontend Container (localhost:7010)
                          → Backend Container (localhost:7011)

Features:
- Cloudflare CDN provides DDoS protection and caching
- SSL/TLS certificates from Let's Encrypt
- Single standard HTTPS port (443)
- No direct IP access (Cloudflare proxied)
```

**Server paths:**
- Application: `/root/OnionTravel/`
- Nginx config: `/etc/nginx/sites-available/oniontravel`
- Backups: `/root/backups/oniontravel/`
- Docker volumes: `/var/lib/docker/volumes/oniontravel_*`

**Important files:**
- Nginx config: `/etc/nginx/sites-available/oniontravel`
- Docker Compose: `/root/OnionTravel/docker-compose.yml`
- Backup script: `/root/OnionTravel/backup.sh`
- Restore script: `/root/OnionTravel/restore.sh`
- Backup docs: `/root/OnionTravel/BACKUP_README.md`
- Cron: `crontab -l` (daily backups at 3:00 AM)

**Quick commands:**
```bash
# Docker containers
docker compose ps                    # Container status
docker compose logs -f               # View all logs
docker compose logs -f backend       # Backend logs only
docker compose restart               # Restart containers

# System nginx
systemctl status nginx               # Nginx status
systemctl reload nginx               # Reload nginx config

# Application
/root/OnionTravel/check-health.sh    # Quick health check
curl http://localhost:7010           # Test frontend (internal)
curl http://localhost:7011/health    # Test backend (internal)

# Backups
/root/OnionTravel/backup.sh          # Run backup manually
ls -lh /root/backups/oniontravel/    # List backups
```

## Configuration

### BASE_PATH Configuration

The application base path (URL prefix) is **fully configurable** via environment variables. This allows deploying multiple versions (production, dev, staging) on the same server with different paths.

**Configuration Files:**
- Backend: `backend/.env` → `BASE_PATH` variable
- Frontend: `frontend/.env` → `VITE_BASE_PATH` variable
- Production defaults: `backend/.env.example`, `frontend/.env.example`

**Examples:**
```bash
# Production (backend/.env.example)
BASE_PATH=/OnionTravel

# Local development (backend/.env, frontend/.env)
BASE_PATH=                    # Empty = runs at root (/)
VITE_BASE_PATH=              # Empty = runs at root (/)
```

**How it works:**
1. Backend: `BASE_PATH` sets FastAPI `root_path` → affects OpenAPI docs URLs
2. Frontend: `VITE_BASE_PATH` sets React Router `basename` and Vite `base` → affects all routes and asset paths
3. Nginx: Template `nginx/oniontravel.conf.template` uses `${BASE_PATH}` placeholders
4. Deploy: `deploy.sh` runs `envsubst` to generate final nginx config from template

**Changing BASE_PATH:**
1. Edit `backend/.env.example` and `frontend/.env.example` with new path
2. Run `./deploy.sh` (automatically regenerates nginx config and rebuilds containers)
3. Application will be available at new path (e.g., `/dev-oniontravel`)

**Local Development:**
- Keep `BASE_PATH=""` (empty) in `backend/.env` and `frontend/.env`
- Application runs at http://localhost:7010/ (no prefix)
- Backend at http://localhost:7011/api/v1

**Troubleshooting**: See `nginx/README.md` for detailed troubleshooting, testing guides, and examples.

## Deployment

### Production Deployment

Use the unified deployment script:

**Deploy script**
```bash
./deploy-prod.sh --help
```

**Deploy + Create Release** (with git tag):
```bash
# Create release notes file first
cat > /tmp/release_v1.2.0.md << 'EOF'
# Summary
Brief description of this release.

## Features
- New feature 1
- New feature 2

## Bug Fixes
- Fixed issue #123
EOF

# Deploy with release
./deploy-prod.sh --yes-deploy-current-state-to-production \
  --version 1.2.0 \
  --release-notes /tmp/release_v1.2.0.md
```

**Force deploy from non-main branch** (not recommended):
```bash
./deploy-prod.sh --yes-deploy-current-state-to-production --force
```

**What it does:**
1. Validates git state (main branch, no uncommitted changes)
2. If `--release-notes` provided:
   - Updates `frontend/package.json` and `frontend/src/version.ts`
   - Creates git commit: "Release vX.Y.Z"
   - Creates annotated git tag with release notes content
   - Pushes commit and tag to origin
3. Generates nginx config from template
4. Copies files to production server
5. Rebuilds Docker containers with `--no-cache`
6. Waits for health checks
7. Tests all endpoints (internal + external)
8. Shows deployment summary

**Important**:
- Always create releases from `main` branch
- Release notes should be in Markdown format (renders nicely on GitHub)
- Nginx config is generated from template during deployment (don't edit `nginx/oniontravel.conf` directly)
- Edit `nginx/oniontravel.conf.template` for nginx changes

## Project Overview

OnionTravel is a trip budget tracking application with multi-currency support, multi-user trips, and real-time budget tracking. The codebase is organized as a monorepo with a FastAPI backend and React TypeScript frontend.

**Stack**: React + TypeScript + Tailwind (Frontend) | FastAPI + SQLite (Backend)

## Project Structure

```
OnionTravel/
├── backend/              # FastAPI + SQLite + SQLAlchemy
│   ├── app/
│   │   ├── models/      # SQLAlchemy ORM models (7 tables)
│   │   ├── schemas/     # Pydantic validation schemas
│   │   ├── api/v1/      # API route handlers
│   │   ├── services/    # Business logic (auth, currency)
│   │   ├── tasks/       # Background tasks (APScheduler)
│   │   └── utils/       # Helper functions (security, defaults)
│   ├── tests/           # pytest tests (90% coverage required)
│   ├── alembic/         # Database migrations
│   ├── venv/            # Python virtual environment
│   └── .env             # Backend configuration
│
└── frontend/            # React + TypeScript + Vite
    ├── src/
    │   ├── components/  # UI components (Shadcn-style)
    │   ├── pages/       # Route pages
    │   ├── hooks/       # Custom React hooks
    │   ├── store/       # Zustand state management
    │   ├── lib/         # API client (axios with interceptors)
    │   ├── types/       # TypeScript type definitions
    │   └── test/        # Vitest + Playwright test setup
    └── .env             # Frontend configuration (VITE_* vars)
```

## Running the Application

### Backend Development Server

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 7011
```

**Important**: Backend runs on port 7011 (changed from 7001 to match production localhost ports).

- API: http://localhost:7011
- Swagger Docs: http://localhost:7011/docs
- ReDoc: http://localhost:7011/redoc

### Frontend Development Server

```bash
cd frontend
npm install
npm run dev -- --port 7010
```

**Important**: Frontend runs on port 7010 (changed from 7000 to match production localhost ports).

- App: http://localhost:7010

### After Code Changes

**CRITICAL**: After making code changes, restart the application:
- Backend: Restart uvicorn server
- Frontend: Vite should auto-reload, but restart if needed

## Database Migrations - CRITICAL

**⚠️ ALWAYS use Alembic for database schema changes. NEVER modify the database directly.**

### When to Create a Migration

Create a migration whenever you modify:
- Tables (add/remove/rename)
- Columns (add/remove/modify/rename)
- Column types, constraints, indexes, or defaults

### Migration Workflow

```bash
cd backend
source venv/bin/activate

# 1. Make changes to SQLAlchemy models in app/models/
# 2. Generate migration (auto-detect changes)
alembic revision --autogenerate -m "Add avatar_url to users table"

# 3. Review generated file in alembic/versions/
# 4. Apply migration
alembic upgrade head

# 5. Verify migration was applied
alembic current
```

### Migration Best Practices

1. **Always review** auto-generated migrations before applying
2. **One logical change** per migration for easier rollback
3. **Descriptive names** - use clear migration messages
4. **Test first** - run in development before production
5. **Check for data loss** - ensure migrations don't drop data
6. **Commit to git** - always version control migration files

### Example Migration Messages

**Good**:
- `alembic revision --autogenerate -m "Add avatar_url column to users table"`
- `alembic revision --autogenerate -m "Create trip_categories relationship table"`

**Bad**:
- `alembic revision --autogenerate -m "Update database"`
- `alembic revision --autogenerate -m "Fix"`

## Testing

### Quick Start - Run All Tests

```bash
./test.sh              # Run all tests (backend + frontend + E2E)
./test.sh backend      # Backend only (pytest)
./test.sh frontend     # Frontend only (vitest)
./test.sh e2e          # E2E only (playwright)
```

**Note**: Complete test suite takes 5-10 minutes. Reports saved to `test-reports/` with timestamps.

### Test Reports

- Backend: `test-reports/backend/YYYY-MM-DD_HH-MM-SS_pytest.html`
- Frontend: `test-reports/frontend/YYYY-MM-DD_HH-MM-SS_vitest.log`
- E2E: `test-reports/e2e/YYYY-MM-DD_HH-MM-SS_playwright/` (view with `npm run test:e2e:report`)

### Manual Testing

```bash
# Backend (90% coverage required)
cd backend && source venv/bin/activate
pytest tests/ --cov=app --cov-fail-under=90

# Frontend unit tests
cd frontend && npm run test

# E2E tests
cd frontend && npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

## Development Commands

### Backend

```bash
# Activate virtual environment
cd backend
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8001

# Run tests
pytest tests/ -v

# Check coverage
pytest tests/ --cov=app --cov-report=html

# Database migrations
alembic revision --autogenerate -m "message"
alembic upgrade head
alembic current
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Run tests
npm run test
npm run test:e2e
```

## Code Architecture

### Backend Architecture

#### File Organization

```
app/
├── models/          # SQLAlchemy models ONLY (database tables)
├── schemas/         # Pydantic validation schemas (request/response)
├── api/v1/          # API route handlers (keep thin, delegate to services)
├── services/        # Business logic (auth, currency, trip management)
├── utils/           # Helper functions (security, defaults)
└── tasks/           # Background tasks (scheduler for currency updates)
```

#### Import Order

```python
# 1. Standard library
from datetime import datetime
from typing import Optional

# 2. Third-party
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# 3. Local application
from app.models.user import User
from app.schemas.user import UserCreate
```

#### Type Hints (Required)

```python
def get_user_by_id(user_id: int, db: Session) -> Optional[User]:
    """Get user by ID from database"""
    return db.query(User).filter(User.id == user_id).first()
```

#### Error Handling

```python
from fastapi import HTTPException, status

if not user:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found"
    )
```

### Frontend Architecture

#### State Management

- **Zustand** for global state (auth, trips)
- Store in `src/store/` with persistent middleware for auth
- Example: `useAuthStore` persists to localStorage as 'auth-storage'

#### API Client

- Axios instance in `src/lib/api.ts`
- Request interceptor: Automatically adds JWT from localStorage
- Response interceptor: Handles 401 errors, refreshes tokens automatically
- Base URL from `VITE_API_BASE_URL` env variable (defaults to http://localhost:7001/api/v1)

#### Component Structure

- UI components in `src/components/ui/` (Shadcn-style, custom implementation)
- Feature components in `src/components/` organized by domain
- Pages in `src/pages/` using React Router
- Use `@/` alias for imports (configured in vite.config.ts)

#### Forms

- **react-hook-form** for form state management
- **zod** for validation schemas
- **@hookform/resolvers** for zod integration

## Security Guidelines

### Password Handling

- **Never** store passwords in plain text
- Always use `get_password_hash()` from `app.utils.security`
- Keep passwords max 72 bytes (bcrypt limit)
- Never return `hashed_password` in API responses

### JWT Tokens

- Use `create_access_token()` and `create_refresh_token()` from utils
- Access tokens: 30 minutes (short-lived)
- Refresh tokens: 7 days (longer-lived)
- Always validate tokens in protected routes with `get_current_user` dependency

### Input Validation

- Use Pydantic schemas for all API input validation
- Never trust user input
- Use parameterized queries (SQLAlchemy handles this)
- Avoid string concatenation in queries

## API Development

### Route Organization

- Group related routes in same router file (e.g., `app/api/v1/auth.py`)
- Use REST conventions: `/api/v1/resource`
- Always specify `response_model` on routes

```python
@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int):
    """Get user by ID"""
    ...
```

### Documentation

- Add docstrings to all route handlers
- Document expected errors with `responses` parameter

```python
@router.post(
    "/login",
    response_model=Token,
    responses={
        401: {"description": "Invalid credentials"},
    }
)
def login(credentials: LoginRequest):
    """
    Login user and return JWT tokens.

    Validates email and password, returns access and refresh tokens.
    """
    ...
```

## Database Best Practices

### Model Definitions

- Add indexes for frequently queried columns
- Define foreign keys with `ondelete` behavior
- Add `created_at`/`updated_at` timestamps to all tables
- Use descriptive table and column names

### Session Management

- Always use `Depends(get_db)` for database sessions in routes
- Never commit inside service functions - let router handle it
- Handle exceptions and rollback on errors

## Environment Variables

### Backend (.env)

```bash
DATABASE_URL=sqlite:///./oniontravel.db
SECRET_KEY=<generate-with-openssl-rand-hex-32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ALLOWED_ORIGINS=http://localhost:7000,http://localhost:3000
EXCHANGE_RATE_API_KEY=<from-exchangerate-api.com>
EXCHANGE_RATE_API_URL=https://v6.exchangerate-api.com/v6
CURRENCY_UPDATE_HOUR=3
CURRENCY_UPDATE_TIMEZONE=UTC
```

### Frontend (.env)

```bash
VITE_API_BASE_URL=http://localhost:7001/api/v1
VITE_APP_NAME=OnionTravel
```

**Note**: Backend runs on port 7001, Frontend on port 7000

## Key Features

### Multi-Currency System

- Daily automatic exchange rate updates (APScheduler at 3 AM UTC)
- Rates cached in `exchange_rates` table
- API source: exchangerate-api.com (free tier: 1,500 requests/month)
- When adding expense: fetch today's rate from DB, fallback to API
- Store both original amount and converted amount in trip currency

### Default Categories

When a trip is created, 8 default categories are auto-initialized:
- Accommodation (35%), Transportation (20%), Food & Dining (25%)
- Activities (15%), Shopping (5%), Health & Medical (0%)
- Entertainment (0%), Other (0%)

### Multi-Day Expenses

Expenses can span multiple days (e.g., hotel bookings):
- `start_date` and `end_date` fields in expenses table
- For single-day expenses, `end_date` is NULL
- Budget allocation spreads across date range

## Pre-Commit Checklist

Before committing code:

- [ ] All tests pass (`pytest tests/` for backend)
- [ ] Coverage ≥90% for backend (`pytest --cov-fail-under=90`)
- [ ] Type hints added to new Python functions
- [ ] Docstrings added to public functions/classes
- [ ] Migration created if models changed (and committed to git)
- [ ] No sensitive data (API keys, passwords) in code
- [ ] `.env.example` updated if new variables added
- [ ] Code follows project structure conventions
- [ ] Frontend lint passes (`npm run lint`)
- [ ] Application restarted after code changes

## Troubleshooting

### Database Locked Error
- Close all connections to SQLite database
- Restart the application

### Migration Conflicts
- Never edit applied migrations
- Create new migration to fix issues
- Use `alembic downgrade` to rollback if needed

### Import Errors
- Ensure virtual environment is activated (backend)
- Verify `PYTHONPATH` includes project root
- Check all dependencies installed

### Port Already in Use
- Backend uses port 8001 (not 8000)
- Frontend uses port 5173 (Vite default)
- Use `lsof -i :PORT` to find process using port

## Implementation Status

**Completed**:
- ✅ Complete project structure (backend + frontend)
- ✅ All database models and relationships (7 tables)
- ✅ JWT authentication system (backend complete)
- ✅ Currency exchange rate system with daily updates
- ✅ Frontend authentication pages (login/register)
- ✅ Zustand auth store with persistence

**In Progress/TODO**:
- Trip management endpoints and UI
- Category management
- Expense tracking (priority: QuickExpenseEntry component)
- Dashboard with charts (Recharts)
- Budget visualization

## Additional Notes

- Frontend uses Vite path alias `@/` for src imports
- Icons use Lucide React library
- UI components follow Shadcn/ui style (custom implementation)
- Backend test fixtures in `tests/conftest.py`
- Frontend uses happy-dom for Vitest environment
- E2E tests use Playwright
