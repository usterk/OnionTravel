# Backend Development Guidelines for Claude

This file contains important guidelines and rules for working with the OnionTravel backend codebase.

## Database Migrations - CRITICAL

**⚠️ ALWAYS use Alembic for database schema changes. NEVER modify the database directly.**

### When to Create a Migration

Create a migration whenever you:
- Add, remove, or modify a table
- Add, remove, or modify a column
- Change column types
- Add or remove indexes
- Change constraints (foreign keys, unique, etc.)
- Change default values

### Migration Workflow

```bash
# 1. Make changes to SQLAlchemy models in app/models/
# 2. Generate migration
alembic revision --autogenerate -m "Descriptive message"
# 3. Review generated file in alembic/versions/
# 4. Apply migration
alembic upgrade head
```

### Migration Rules

1. **Always review** auto-generated migrations before applying
2. **Test first** - run migrations in development/test environment first
3. **One logical change** per migration for easier debugging and rollback
4. **Descriptive names** - use clear, specific migration messages
5. **Check for data loss** - ensure migrations don't accidentally drop data
6. **Commit to git** - always version control migration files

### Example Migration Messages

Good:
- `alembic revision --autogenerate -m "Add avatar_url column to users table"`
- `alembic revision --autogenerate -m "Create trip_categories relationship table"`
- `alembic revision --autogenerate -m "Add index on expenses.created_at"`

Bad:
- `alembic revision --autogenerate -m "Update database"`
- `alembic revision --autogenerate -m "Changes"`
- `alembic revision --autogenerate -m "Fix"`

## Testing Requirements

**Minimum 90% test coverage required** for all new code.

### Quick Start

```bash
# From project root - run all backend tests
../test.sh backend

# From backend directory - manual testing
pytest tests/ --cov=app --cov-fail-under=90
```

**Reports**: `../test-reports/backend/YYYY-MM-DD_HH-MM-SS_pytest.html`

### Test Structure

- Place tests in `tests/` directory
- Name test files `test_*.py`
- Use descriptive test class and function names
- Include docstrings explaining what each test does
- Test both success and failure cases
- Test edge cases and boundary conditions

### Test Coverage

Files excluded from coverage (not part of authentication):
- `app/services/currency.py` (future phases)
- `app/tasks/scheduler.py` (future phases)

## Code Quality Standards

### File Organization

```
app/
├── models/          # SQLAlchemy models only
├── schemas/         # Pydantic validation schemas
├── api/v1/          # API route handlers
├── services/        # Business logic
├── utils/           # Helper functions
└── tasks/           # Background tasks
```

### Import Order

1. Standard library imports
2. Third-party imports
3. Local application imports

```python
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate
```

### Type Hints

Always use type hints:

```python
def get_user_by_id(user_id: int, db: Session) -> Optional[User]:
    """Get user by ID from database"""
    return db.query(User).filter(User.id == user_id).first()
```

### Error Handling

Use FastAPI HTTPException for API errors:

```python
from fastapi import HTTPException, status

if not user:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found"
    )
```

## Security Guidelines

### Password Handling

- **Never** store passwords in plain text
- Always use `get_password_hash()` from `app.utils.security`
- Keep passwords max 72 bytes for bcrypt compatibility
- Never return password/hashed_password in API responses

### JWT Tokens

- Use `create_access_token()` and `create_refresh_token()` from utils
- Access tokens: short-lived (30 minutes default)
- Refresh tokens: longer-lived (7 days default)
- Always validate tokens in protected routes

### Input Validation

- Use Pydantic schemas for all input validation
- Never trust user input
- Sanitize data before database operations
- Use query parameters for filtering, not string concatenation

## API Development

### Route Organization

- Group related routes in same router file
- Use consistent naming: `/api/v1/resource`
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- Return appropriate status codes

### Response Models

Always specify response_model:

```python
@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int):
    ...
```

### Documentation

- Add docstrings to all route handlers
- Use clear, descriptive endpoint names
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

- Use descriptive table and column names
- Add indexes for frequently queried columns
- Define foreign keys with `on_delete` behavior
- Use appropriate column types
- Add `created_at`/`updated_at` timestamps

### Query Optimization

- Use `.filter()` instead of `.filter_by()` for complex queries
- Load only needed columns with `.with_entities()`
- Use `.first()` instead of `.all()[0]`
- Avoid N+1 queries - use `.joinedload()` or `.selectinload()`

### Session Management

- Always use `Depends(get_db)` for database sessions
- Never commit inside service functions - let router handle it
- Handle exceptions and rollback on errors

## Environment Variables

Required variables in `.env`:
- `DATABASE_URL` - SQLite connection string
- `SECRET_KEY` - JWT signing key (generate with `openssl rand -hex 32`)
- `EXCHANGE_RATE_API_KEY` - API key for currency rates
- `ALLOWED_ORIGINS` - CORS allowed origins

## Common Commands

```bash
# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 7001

# Run tests
pytest tests/ -v

# Check coverage
pytest tests/ --cov=app --cov-report=html

# Create migration
alembic revision --autogenerate -m "message"

# Apply migrations
alembic upgrade head

# Check migration status
alembic current
```

## Troubleshooting

### Database locked error
- Close all connections to SQLite database
- Restart the application

### Migration conflicts
- Never edit applied migrations
- Create new migration to fix issues
- Use `alembic downgrade` to rollback if needed

### Import errors
- Ensure virtual environment is activated
- Check `PYTHONPATH` includes project root
- Verify all dependencies are installed

### Test failures
- Check test database is clean (using in-memory SQLite)
- Verify fixtures are properly scoped
- Review test isolation

## Pre-Commit Checklist

Before committing code:

- [ ] All tests pass (`pytest tests/`)
- [ ] Coverage ≥90% (`pytest --cov-fail-under=90`)
- [ ] Type hints added to new functions
- [ ] Docstrings added to public functions/classes
- [ ] Migration created if models changed
- [ ] No sensitive data (API keys, passwords) in code
- [ ] `.env.example` updated if new variables added
- [ ] Code follows project structure conventions
