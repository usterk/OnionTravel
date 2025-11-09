# OnionTravel - Implementation Plan

**Project**: Trip Budget Tracker
**Stack**: React + TypeScript + Tailwind (Frontend) | FastAPI + SQLite (Backend)
**Created**: 2025-11-08

---

## Project Overview

OnionTravel is a web-based application for managing trip budgets with multi-currency support, multi-user trips, and real-time budget tracking with category-based allocation.

### Key Features
- Multi-user trip management with shared budgets
- Multi-currency expense tracking with automatic daily exchange rate updates
- Category-based budget allocation with customizable percentages
- Multi-day expense support (e.g., hotel bookings spanning multiple days)
- Real-time budget tracking with visual indicators
- Dashboard with pie charts and timeline visualizations
- Quick expense entry for fast data input during trips

### Quality Requirements
- **Test Coverage**: Minimum 90% code coverage for backend
- **Testing Framework**: pytest with pytest-cov for coverage reporting
- **Test Types**: Unit tests, integration tests, API endpoint tests
- **CI/CD Ready**: Tests must pass before deployment

---

## Architecture

### Monorepo Structure
```
OnionTravel/
├── backend/              # FastAPI + SQLite
│   ├── app/
│   │   ├── models/      # SQLAlchemy models (7 tables)
│   │   ├── schemas/     # Pydantic validation schemas
│   │   ├── api/v1/      # API routes
│   │   ├── services/    # Business logic (auth, currency)
│   │   ├── tasks/       # Background tasks (scheduler)
│   │   └── utils/       # Utilities (security, defaults)
│   ├── venv/            # Python virtual environment
│   └── .env             # Configuration
│
└── frontend/            # React + TypeScript + Vite
    ├── src/
    │   ├── components/  # UI components (Shadcn-style)
    │   ├── pages/       # Route pages
    │   ├── hooks/       # Custom React hooks
    │   ├── store/       # State management (Zustand)
    │   ├── lib/         # API client, utilities
    │   └── types/       # TypeScript types
    └── .env             # Frontend config
```

---

## Database Schema

### Tables (7 total)

#### 1. **users**
- id, email (unique), username (unique), hashed_password
- full_name, avatar_url
- created_at, updated_at

#### 2. **trips**
- id, name, description, start_date, end_date
- currency_code (ISO 4217)
- total_budget, daily_budget
- owner_id (FK → users)
- created_at, updated_at

#### 3. **trip_users** (Many-to-Many)
- id, trip_id (FK → trips), user_id (FK → users)
- role (owner, admin, member, viewer)
- joined_at
- UNIQUE(trip_id, user_id)

#### 4. **categories**
- id, trip_id (FK → trips)
- name, color (hex), icon (lucide-react name)
- budget_percentage (0-100%)
- is_default
- created_at

#### 5. **expenses**
- id, trip_id (FK), category_id (FK), user_id (FK)
- title, description
- amount, currency_code
- exchange_rate, amount_in_trip_currency
- start_date, end_date (NULL for single-day)
- payment_method, location, notes
- created_at, updated_at

#### 6. **attachments** (Future)
- id, expense_id (FK → expenses)
- filename, filepath, mime_type, file_size
- uploaded_at

#### 7. **exchange_rates**
- id, from_currency, to_currency
- rate, date
- fetched_at
- UNIQUE(from_currency, to_currency, date)

---

## API Endpoints

### Authentication (`/api/v1/auth`)
- ✅ `POST /register` - Register new user
- ✅ `POST /login` - Login (returns JWT access + refresh tokens)
- ✅ `POST /refresh` - Refresh access token
- ✅ `GET /me` - Get current user info

### Users (`/api/v1/users`) 🔄 TODO
- `GET /me` - Get current user profile
- `PUT /me` - Update current user profile
- `GET /search?q={query}` - Search users (for adding to trips)

### Trips (`/api/v1/trips`) 🔄 TODO
- `GET /` - List user's trips
- `POST /` - Create new trip
- `GET /{trip_id}` - Get trip details
- `PUT /{trip_id}` - Update trip
- `DELETE /{trip_id}` - Delete trip
- `POST /{trip_id}/members` - Add user to trip
- `DELETE /{trip_id}/members/{user_id}` - Remove user
- `PUT /{trip_id}/members/{user_id}` - Update user role

### Categories (`/api/v1/trips/{trip_id}/categories`) 🔄 TODO
- `GET /` - List trip categories
- `POST /` - Create category
- `PUT /{id}` - Update category
- `DELETE /{id}` - Delete category
- `POST /defaults` - Initialize default categories

### Expenses (`/api/v1/trips/{trip_id}/expenses`) 🔄 TODO
- `GET /` - List expenses (with filters: date, category, user)
- `POST /` - Create expense
- `GET /{id}` - Get expense details
- `PUT /{id}` - Update expense
- `DELETE /{id}` - Delete expense
- `GET /stats` - Get expense statistics for dashboard

### Currency (`/api/v1/currency`) 🔄 TODO
- `GET /rates?from={code}&to={code}` - Get exchange rate
- `GET /convert?amount={amt}&from={code}&to={code}` - Convert amount
- `GET /supported` - List supported currencies

---

## Default Categories

When a trip is created, these 8 default categories are added:

| Name              | Color   | Icon          | Budget % |
|-------------------|---------|---------------|----------|
| Accommodation     | #3B82F6 | home          | 35%      |
| Transportation    | #10B981 | car           | 20%      |
| Food & Dining     | #F59E0B | utensils      | 25%      |
| Activities        | #8B5CF6 | ticket        | 15%      |
| Shopping          | #EC4899 | shopping-bag  | 5%       |
| Health & Medical  | #EF4444 | heart-pulse   | 0%       |
| Entertainment     | #06B6D4 | music         | 0%       |
| Other             | #6B7280 | more-horizontal | 0%     |

---

## Currency Exchange System

### Strategy
- **Daily automatic updates** (APScheduler at 3 AM UTC)
- **Database caching** - rates stored in `exchange_rates` table
- **API source**: exchangerate-api.com (free tier: 1,500 requests/month)

### Supported Currencies (Base Set)
USD, EUR, PLN, GBP, THB, JPY, AUD, CAD, CHF

### Process
1. Scheduler runs daily at 3 AM UTC
2. Fetches all currency pair combinations (BASE_CURRENCIES × BASE_CURRENCIES)
3. Stores rates in database with date
4. When adding expense:
   - Get today's rate from database
   - If not found, fetch from API and cache
   - Store both original amount and converted amount

---

## Implementation Status

### ✅ Phase 1: Project Setup (COMPLETED)
- [x] Backend structure (FastAPI + SQLAlchemy + Alembic)
- [x] Frontend structure (Vite + React + TypeScript + Tailwind)
- [x] Database models (all 7 tables)
- [x] Virtual environment setup
- [x] Configuration files (.env, tailwind.config, tsconfig)

### ✅ Phase 2: Authentication (BACKEND COMPLETED)
- [x] JWT token generation (access + refresh)
- [x] Password hashing (bcrypt)
- [x] User registration endpoint
- [x] Login endpoint
- [x] Token refresh endpoint
- [x] Get current user endpoint
- [x] Auth middleware (get_current_user dependency)

### ✅ Phase 3: Frontend Authentication (COMPLETED)
- [x] Auth store (Zustand with persistence)
- [x] Login page + form
- [x] Register page + form
- [x] Protected route wrapper
- [x] Token management (localStorage, auto-refresh)
- [x] Logout functionality

### ✅ Phase 4: Trip Management (COMPLETED)
#### Backend ✅ (COMPLETED)
- [x] Trip CRUD schemas
- [x] Trip service (create, read, update, delete)
- [x] Trip endpoints
- [x] Multi-user management (add/remove members)
- [x] Budget calculation logic (daily ↔ total)

#### Frontend ✅ (COMPLETED)
- [x] Trip store (Zustand with persistence)
- [x] Trip list page
- [x] Trip creation form (with budget calculator)
- [x] Trip detail page (with Overview, Members, Settings tabs)
- [x] Member management UI
- [x] Trip selection/switching
- [x] Update trip functionality
- [x] Delete trip functionality

#### E2E Testing
- [x] User can view trips list
- [x] User can create a new trip
- [x] User can view trip details
- [x] User can update trip information
- [x] User can delete a trip
- [x] User can view trip members
- [x] Navigation works correctly
- [x] Budget calculator works correctly

### ✅ Phase 5: Categories (COMPLETED)
#### Backend ✅
- [x] Category CRUD schemas
- [x] Category service
- [x] Category endpoints
- [x] Default categories initialization

#### Frontend ✅
- [x] Category list component
- [x] Category API functions
- [x] Categories tab in TripDetail page
- [x] Budget display with percentages

#### Notes
- Default categories auto-created on trip creation
- All 88 backend tests passing
- Basic UI functional (advanced features like pickers deferred to Phase 9 polish)

### 🔄 Phase 6: Expenses (TODO - PRIORITY)
#### Backend
- [ ] Expense CRUD schemas
- [ ] Currency service integration
- [ ] Expense endpoints
- [ ] Multi-day expense logic
- [ ] Expense statistics/aggregation

#### Frontend
- [ ] **QuickExpenseEntry** component (TOP PRIORITY)
  - Large amount input (autofocus)
  - Category icon picker (one-click)
  - Date selector with multi-day range
  - Currency selector
  - Submit with Enter key
- [ ] Expense list with filters
- [ ] Expense detail/edit form
- [ ] Expense card component

#### E2E Testing
- [ ] User can add single-day expense via QuickExpenseEntry
- [ ] User can add multi-day expense (hotel booking)
- [ ] Currency conversion calculates correctly
- [ ] User can view expense list
- [ ] User can filter expenses by date range
- [ ] User can filter expenses by category
- [ ] User can edit expense
- [ ] User can delete expense
- [ ] Expense statistics update in real-time

### 🔄 Phase 7: Currency System (TODO)
#### Backend
- [x] Exchange rate model
- [x] Currency service (fetch, convert, cache)
- [x] Scheduler setup (APScheduler)
- [x] Daily update task
- [ ] Currency endpoints

#### Frontend
- [ ] Currency selector component
- [ ] Real-time conversion display
- [ ] Manual rate override option

#### E2E Testing
- [ ] Currency selector displays all supported currencies
- [ ] Real-time conversion updates when amount changes
- [ ] Real-time conversion updates when currency changes
- [ ] Exchange rates are fetched and cached correctly
- [ ] Manual rate override works
- [ ] Trip currency is used as base for conversions

### 🔄 Phase 8: Dashboard & Visualizations (TODO)
#### Backend
- [ ] Statistics endpoints
  - Total spent vs budget
  - Per-category spending
  - Daily/weekly spending trends
  - Remaining budget calculations

#### Frontend
- [ ] Budget overview cards
  - Total budget progress bar
  - Daily budget indicator
  - Remaining budget (with color coding)
- [ ] Pie chart (expense by category) - Recharts
- [ ] Timeline chart (daily expenses) - Recharts
- [ ] Category breakdown table
- [ ] Budget alerts (over-budget warnings)

#### E2E Testing
- [ ] Budget overview cards display correct totals
- [ ] Progress bars reflect actual spending
- [ ] Pie chart shows all categories with expenses
- [ ] Pie chart colors match category colors
- [ ] Timeline chart displays daily spending trends
- [ ] Budget alerts appear when over budget
- [ ] Dashboard updates after adding expense
- [ ] Category breakdown shows correct percentages

### 🔄 Phase 9: Polish & Testing (TODO)
- [ ] Form validation (react-hook-form + zod)
- [ ] Error handling (user-friendly messages)
- [ ] Loading states
- [ ] Responsive design (mobile-first)
- [ ] Backend tests (pytest)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] README updates

---

## Technical Details

### Backend
**Language**: Python 3.11+
**Framework**: FastAPI 0.104+
**Database**: SQLite (with SQLAlchemy 2.0 ORM)
**Authentication**: JWT (python-jose)
**Scheduler**: APScheduler 3.10
**HTTP Client**: httpx (async)
**Validation**: Pydantic v2

### Frontend
**Language**: TypeScript 5+
**Framework**: React 18
**Build Tool**: Vite 7
**Styling**: Tailwind CSS 3
**Components**: Shadcn/ui (custom implementation)
**Routing**: React Router v6
**State**: Zustand (planned)
**Data Fetching**: TanStack Query / React Query
**HTTP Client**: Axios
**Charts**: Recharts
**Forms**: react-hook-form + zod
**Icons**: Lucide React
**Date**: date-fns

---

## Running the Application

### Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```
- API: http://localhost:8001
- Swagger Docs: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

### Frontend
```bash
cd frontend
npm install
npm run dev
```
- App: http://localhost:5173

---

## Environment Variables

### Backend (.env)
```bash
DATABASE_URL=sqlite:///./oniontravel.db
SECRET_KEY=<generated-with-openssl-rand-hex-32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
EXCHANGE_RATE_API_KEY=<from-exchangerate-api-com>
EXCHANGE_RATE_API_URL=https://v6.exchangerate-api.com/v6
CURRENCY_UPDATE_HOUR=3
CURRENCY_UPDATE_TIMEZONE=UTC
```

### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:8001/api/v1
VITE_APP_NAME=OnionTravel
```

---

## Priority Features (MVP)

1. **User Authentication** ✅ (Backend complete)
2. **Trip Creation** with budget setup
3. **Quick Expense Entry** (simple, fast, mobile-friendly)
4. **Budget Overview** (remaining budget per day, per category)
5. **Expense List** with basic filters
6. **Category Management** with defaults
7. **Multi-currency support** with auto-conversion

---

## Future Enhancements (Post-MVP)

- [ ] Attachment upload/download for expenses
- [ ] Expense splitting between users
- [ ] Export to PDF/CSV
- [ ] Notifications (budget alerts)
- [ ] Offline support (PWA)
- [ ] Mobile app (React Native port)
- [ ] Trip templates
- [ ] Recurring expenses
- [ ] Receipt OCR scanning

---

## Current Status Summary

**Last Updated**: 2025-11-08 21:13 UTC

**Completed**:
- ✅ Complete project structure (backend + frontend)
- ✅ All database models and relationships
- ✅ JWT authentication system (backend)
- ✅ Currency exchange rate system with daily updates
- ✅ Backend server running and tested

**In Progress**: None

**Next Steps**:
1. Implement remaining backend endpoints (trips, categories, expenses)
2. Build frontend authentication (login/register pages)
3. Implement trip management UI
4. Build QuickExpenseEntry component (priority)
5. Create dashboard with charts

**Blockers**: None

---

## Notes

- Port 8000 was occupied, using **port 8001** for backend
- Exchange rate API key needs to be obtained from exchangerate-api.com
- Frontend uses Shadcn/ui components (custom implementation, not CLI)
- All icons use Lucide React library
- Database uses SQLite for simplicity (can migrate to PostgreSQL later)
- Scheduler runs in background, currency updates happen automatically
