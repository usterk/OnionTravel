# OnionTravel Backend

FastAPI backend for OnionTravel - Trip Budget Tracker application.

## Features

- FastAPI framework with automatic OpenAPI documentation
- SQLAlchemy ORM with SQLite database
- JWT authentication
- Multi-user trip management
- Multi-currency expense tracking with daily exchange rate updates
- Category-based budget allocation
- Background scheduler for automatic currency updates

## Prerequisites

- Python 3.11 or higher
- pip package manager

## Installation

1. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Edit `.env` and set your configuration:
   - Generate SECRET_KEY: `openssl rand -hex 32`
   - Get API key from https://www.exchangerate-api.com/

## Running the Application

### Development Mode

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Database Migrations

**IMPORTANT**: Always use Alembic for database schema changes. Never modify the database directly.

#### Initial Setup (First Time)

```bash
# Initialize Alembic (only if not already initialized)
alembic init alembic

# Create initial migration from current models
alembic revision --autogenerate -m "Initial migration"

# Apply migration to create tables
alembic upgrade head
```

#### Creating New Migrations

When you modify SQLAlchemy models (add/remove columns, tables, etc.):

```bash
# 1. Make changes to your models in app/models/

# 2. Generate migration automatically
alembic revision --autogenerate -m "Add new column to users table"

# 3. Review the generated migration file in alembic/versions/

# 4. Apply the migration
alembic upgrade head
```

#### Common Migration Commands

```bash
# Show current migration version
alembic current

# Show migration history
alembic history

# Upgrade to latest version
alembic upgrade head

# Upgrade by one version
alembic upgrade +1

# Downgrade by one version
alembic downgrade -1

# Downgrade to specific version
alembic downgrade <revision>

# Downgrade to base (remove all migrations)
alembic downgrade base
```

#### Migration Best Practices

1. **Always review** auto-generated migrations before applying
2. **Test migrations** in development before production
3. **Backup database** before running migrations in production
4. **One change per migration** for easier rollbacks
5. **Descriptive messages**: Use clear migration names
6. **Version control**: Commit migration files to git

#### Troubleshooting

If migrations are out of sync:

```bash
# Stamp current database state
alembic stamp head

# Or start fresh (CAUTION: drops all data)
alembic downgrade base
alembic upgrade head
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login (returns JWT)
- `GET /api/v1/auth/me` - Get current user

### Trips
- `GET /api/v1/trips` - List user's trips
- `POST /api/v1/trips` - Create new trip
- `GET /api/v1/trips/{id}` - Get trip details
- `PUT /api/v1/trips/{id}` - Update trip
- `DELETE /api/v1/trips/{id}` - Delete trip

### Expenses
- `GET /api/v1/trips/{trip_id}/expenses` - List expenses
- `POST /api/v1/trips/{trip_id}/expenses` - Create expense
- `PUT /api/v1/trips/{trip_id}/expenses/{id}` - Update expense
- `DELETE /api/v1/trips/{trip_id}/expenses/{id}` - Delete expense

### Categories
- `GET /api/v1/trips/{trip_id}/categories` - List categories
- `POST /api/v1/trips/{trip_id}/categories` - Create category
- `POST /api/v1/trips/{trip_id}/categories/defaults` - Initialize defaults

### Currency
- `GET /api/v1/currency/rates` - Get current rates
- `GET /api/v1/currency/convert` - Convert amount

## Background Tasks

The application runs a daily scheduler that updates exchange rates at 3 AM UTC (configurable in .env).

## Project Structure

```
backend/
├── app/
│   ├── models/          # SQLAlchemy models
│   ├── schemas/         # Pydantic schemas
│   ├── api/v1/          # API routes
│   ├── services/        # Business logic
│   ├── tasks/           # Background tasks
│   ├── utils/           # Utilities
│   ├── config.py        # Configuration
│   ├── database.py      # Database setup
│   └── main.py          # FastAPI app
├── tests/               # Tests
├── alembic/             # Database migrations
├── requirements.txt     # Dependencies
└── .env.example         # Example environment variables
```

## Testing

### Quality Requirements
- **Minimum 90% test coverage required**
- All tests must pass before deployment
- Tests run automatically in CI/CD pipeline

### Running Tests

```bash
# Run all tests
pytest tests/ -v

# Run with coverage report
pytest tests/ --cov=app --cov-report=html --cov-report=term

# Run specific test file
pytest tests/test_auth.py -v

# Run tests matching a pattern
pytest tests/ -k "test_login" -v

# Check coverage percentage
pytest tests/ --cov=app --cov-fail-under=90
```

### Coverage Report

After running tests with coverage, open `htmlcov/index.html` in your browser to see detailed coverage report.

### Test Structure

```
tests/
├── conftest.py              # Pytest fixtures and configuration
├── test_auth.py             # Authentication endpoint tests
├── test_security.py         # Security utilities tests
├── test_trips.py            # Trip management tests (TODO)
├── test_categories.py       # Category tests (TODO)
└── test_expenses.py         # Expense tests (TODO)
```

## License

MIT
