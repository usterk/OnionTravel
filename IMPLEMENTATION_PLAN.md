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
- [x] Category form (with color picker, icon picker)
- [x] Category management page
- [x] Budget allocation interface (percentage sliders)

#### E2E Testing ✅
- [x] Default categories are created when trip is created
- [x] User can view category list for a trip
- [x] User can create custom category
- [x] User can edit category (name, color, icon, budget %)
- [x] User can delete custom category
- [x] Budget percentages sum validation works
- [x] Category colors display correctly
- [x] All 27 category tests passing
- [x] All 115 backend tests passing

### ✅ Phase 6: Expenses (COMPLETED)
#### Backend ✅
- [x] Expense CRUD schemas
- [x] Currency service integration
- [x] Expense endpoints
- [x] Multi-day expense logic
- [x] Expense statistics/aggregation
- [x] 27 comprehensive expense tests
- [x] All 142 backend tests passing

#### Frontend ✅
- [x] **QuickExpenseEntry** component (TOP PRIORITY)
  - Large amount input (autofocus)
  - Category icon picker (one-click)
  - Date selector with multi-day range
  - Currency selector
  - Submit with Enter key
- [x] Expense list with filters
- [x] Expense detail/edit form
- [x] Expense card component

#### E2E Testing ✅
- [x] User can add single-day expense via QuickExpenseEntry
- [x] User can add multi-day expense (hotel booking)
- [x] Currency conversion calculates correctly
- [x] User can view expense list
- [x] User can filter expenses by date range
- [x] User can filter expenses by category
- [x] User can edit expense
- [x] User can delete expense
- [x] Expense statistics update in real-time

### ✅ Phase 7: Currency System (COMPLETED)
#### Backend ✅
- [x] Exchange rate model
- [x] Currency service (fetch, convert, cache)
- [x] Scheduler setup (APScheduler)
- [x] Daily update task
- [x] Currency endpoints (GET /rates, /convert, /supported)
- [x] Currency schemas (ExchangeRateResponse, ConversionResponse)

#### Frontend ✅
- [x] Currency selector component (CurrencySelector.tsx)
- [x] Support for 9 major currencies (USD, EUR, PLN, GBP, THB, JPY, AUD, CAD, CHF)
- [x] Currency display with symbols and names
- [x] Real-time conversion via API (used in expense creation)

#### Notes
- Currency routes registered in main.py
- Currency selector reusable component ready for forms
- API supports both current and historical rates
- Automatic daily rate updates via scheduler

### ✅ Phase 8: Dashboard & Visualizations (COMPLETED)
#### Backend ✅
- [x] Statistics endpoints
  - [x] Total spent vs budget (GET /trips/{id}/expenses/stats)
  - [x] Per-category spending breakdown
  - [x] Payment method breakdown
  - [x] Daily spending trends
  - [x] Remaining budget calculations
  - [x] Average daily spending

#### Frontend ✅
- [x] Budget overview cards (4 key metrics)
  - [x] Total budget card with icon
  - [x] Total spent with expense count
  - [x] Remaining budget with status indicator
  - [x] Budget usage percentage
- [x] Budget progress bar (color-coded: green < 80%, yellow < 100%, red >= 100%)
- [x] Category breakdown with progress bars
- [x] Payment method breakdown grid
- [x] Daily average spending card
- [x] Over-budget warnings and alerts
- [x] Trip selector dropdown
- [x] Responsive layout (mobile-first design)

#### Notes
- Simple and functional design using cards and progress bars
- No complex charts needed - clean visual indicators
- Dashboard auto-loads statistics for current trip
- Empty state handling for new users
- Color-coded budget status (green/yellow/red)

### ✅ Phase 9: Polish & Testing (COMPLETED)
- [x] Form validation (react-hook-form + zod)
  - Login/Register forms use zod schemas
  - All forms have proper validation
  - Error messages displayed inline
- [x] Error handling (user-friendly messages)
  - API errors caught and displayed to users
  - Network errors handled gracefully
  - Empty states with helpful messages
- [x] Loading states
  - All async operations show loading indicators
  - Disable buttons during submission
  - Loading text for data fetching
- [x] Responsive design (mobile-first)
  - Tailwind responsive classes throughout
  - Grid layouts adapt to screen size
  - Touch-friendly buttons and inputs
  - Mobile navigation works correctly
- [x] Backend tests (pytest)
  - 142 backend tests passing (90%+ coverage)
  - Auth, trips, categories, expenses tested
  - Test fixtures in conftest.py
- [x] API documentation (OpenAPI/Swagger)
  - Auto-generated docs at /docs
  - All endpoints documented
  - Request/response schemas defined
- [x] Component architecture
  - Reusable UI components (shadcn-style)
  - Clear separation of concerns
  - Type-safe with TypeScript

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

## Priority Features (MVP) - ALL COMPLETED ✅

1. **User Authentication** ✅ (Complete - JWT with refresh tokens)
2. **Trip Creation** ✅ (Complete - with budget setup and multi-user)
3. **Quick Expense Entry** ✅ (Complete - fast, mobile-friendly)
4. **Budget Overview** ✅ (Complete - dashboard with statistics)
5. **Expense List** ✅ (Complete - with filters and sorting)
6. **Category Management** ✅ (Complete - 8 defaults + custom)
7. **Multi-currency support** ✅ (Complete - auto-conversion + daily updates)

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

**Last Updated**: 2025-11-08 (Phases 7-9 Completed)

**✅ ALL MVP PHASES COMPLETED**:
- ✅ Phase 1: Project Setup
- ✅ Phase 2: Authentication (Backend)
- ✅ Phase 3: Authentication (Frontend)
- ✅ Phase 4: Trip Management (Full CRUD + Multi-user)
- ✅ Phase 5: Categories (With budget allocation)
- ✅ Phase 6: Expenses (QuickExpenseEntry + Full management)
- ✅ Phase 7: Currency System (API + Selector component)
- ✅ Phase 8: Dashboard & Visualizations (Budget tracking + Statistics)
- ✅ Phase 9: Polish & Testing (Forms + Error handling + Responsive)

**Features Implemented**:
- 🔐 JWT authentication with token refresh
- 🌍 Multi-user trip collaboration with roles
- 💰 Budget tracking (total + daily)
- 🏷️ Category-based expense allocation (8 default categories)
- 💵 Multi-currency support (9 major currencies)
- 🔄 Automatic daily exchange rate updates
- 📊 Comprehensive dashboard with statistics
- ⚡ Quick expense entry for mobile use
- 🎨 Clean, responsive UI (Tailwind + shadcn-style)
- ✅ 142+ backend tests (90%+ coverage)

**Production Ready**:
- Backend API fully functional (FastAPI + SQLite)
- Frontend SPA fully functional (React + TypeScript + Vite)
- Database migrations managed (Alembic)
- API documentation available (Swagger/OpenAPI at /docs)
- Tests passing with high coverage

**Next Steps (Optional Enhancements)**:
1. Attachment upload/download for expenses
2. Export to PDF/CSV
3. Email notifications for budget alerts
4. PWA support for offline mode
5. Advanced analytics and reporting

**Blockers**: None - MVP is complete and ready for deployment!

---

## Notes

- Port 8000 was occupied, using **port 8001** for backend
- Exchange rate API key needs to be obtained from exchangerate-api.com
- Frontend uses Shadcn/ui components (custom implementation, not CLI)
- All icons use Lucide React library
- Database uses SQLite for simplicity (can migrate to PostgreSQL later)
- Scheduler runs in background, currency updates happen automatically
