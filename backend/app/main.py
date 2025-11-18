from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.tasks.scheduler import start_scheduler

# Import all models to ensure they are registered with SQLAlchemy
from app.models import (
    User, Trip, TripUser, Category, Expense, Attachment, ExchangeRate, ApiKey
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="OnionTravel - Trip Budget Tracker API",
    root_path=f"{settings.BASE_PATH}/api" if settings.BASE_PATH else "/api",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize scheduler on startup"""
    start_scheduler()


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "OnionTravel API",
        "version": settings.VERSION,
        "status": "running"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


# Import and include routers
from app.api.v1 import auth, trips, categories, expenses, currency, users, ai_expenses, api_keys
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(trips.router, prefix="/api/v1/trips", tags=["trips"])
app.include_router(categories.router, prefix="/api/v1", tags=["categories"])
app.include_router(expenses.router, prefix="/api/v1", tags=["expenses"])
app.include_router(ai_expenses.router, prefix="/api/v1", tags=["ai-expenses"])
app.include_router(currency.router, prefix="/api/v1/currency", tags=["currency"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(api_keys.router, prefix="/api/v1", tags=["api-keys"])
