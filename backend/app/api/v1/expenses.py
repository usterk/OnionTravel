from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.trip import Trip
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseStatistics,
    DailyBudgetStatistics
)
from app.services import expense_service
from app.api.deps import get_current_user


router = APIRouter()


def get_trip_or_404(db: Session, trip_id: int, user: User) -> Trip:
    """
    Get trip by ID or raise 404.
    Also verifies that the user has access to this trip.

    Args:
        db: Database session
        trip_id: Trip ID
        user: Current user

    Returns:
        Trip object

    Raises:
        HTTPException: If trip not found or user has no access
    """
    from app.services.trip import TripService

    trip_service = TripService(db)
    trip = trip_service.get_trip_by_id(trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )

    if not trip_service.user_has_access_to_trip(trip_id, user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this trip"
        )

    return trip


@router.get("/trips/{trip_id}/expenses", response_model=List[ExpenseResponse])
def list_expenses(
    trip_id: int,
    category_id: Optional[int] = Query(None, description="Filter by category"),
    user_id: Optional[int] = Query(None, description="Filter by user"),
    start_date: Optional[date] = Query(None, description="Filter expenses from this date"),
    end_date: Optional[date] = Query(None, description="Filter expenses until this date"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all expenses for a trip with optional filters.

    Supports filtering by:
    - Category
    - User who created the expense
    - Date range (start_date and end_date)
    - Payment method

    Results are paginated and ordered by date (most recent first).
    """
    # Verify trip access
    get_trip_or_404(db, trip_id, current_user)

    expenses = expense_service.get_expenses_by_trip(
        db=db,
        trip_id=trip_id,
        category_id=category_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        payment_method=payment_method,
        skip=skip,
        limit=limit
    )
    return expenses


@router.post("/trips/{trip_id}/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    trip_id: int,
    expense: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new expense for a trip.

    Automatically converts the expense amount to the trip currency using
    current exchange rates. Supports multi-day expenses by specifying an end_date.

    Required fields:
    - title: Expense title
    - amount: Amount in the specified currency
    - currency_code: ISO currency code (e.g., USD, EUR, THB)
    - category_id: Category ID (must belong to this trip)
    - start_date: Date of expense (or start date for multi-day)

    Optional fields:
    - description: Additional details
    - end_date: For multi-day expenses (e.g., hotel bookings)
    - payment_method: How it was paid (e.g., "cash", "card")
    - location: Where the expense occurred
    - notes: Additional notes
    """
    # Verify trip access
    get_trip_or_404(db, trip_id, current_user)

    new_expense = await expense_service.create_expense(
        db=db,
        trip_id=trip_id,
        user_id=current_user.id,
        expense_data=expense
    )
    return new_expense


@router.get("/trips/{trip_id}/expenses/stats", response_model=ExpenseStatistics)
def get_expense_stats(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive expense statistics for a trip.

    Returns:
    - Total number of expenses
    - Total amount spent (in trip currency)
    - Total budget and remaining budget
    - Percentage of budget used
    - Spending breakdown by category
    - Spending breakdown by payment method
    - Daily spending trends
    - Average daily spending
    """
    # Verify trip access
    get_trip_or_404(db, trip_id, current_user)

    stats = expense_service.get_expense_statistics(db, trip_id)
    return stats


@router.get("/trips/{trip_id}/expenses/daily-stats", response_model=DailyBudgetStatistics)
def get_daily_budget_stats(
    trip_id: int,
    target_date: Optional[date] = Query(None, description="Date to get stats for (defaults to today)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get daily budget statistics for a specific date.

    Returns detailed statistics for the specified date including:
    - Daily budget allocation
    - Total spent on that day (including proportional multi-day expenses)
    - Remaining budget for the day
    - Percentage of daily budget used
    - Category breakdown for the day
    - Over budget indicator

    Multi-day expenses are split proportionally across their date range.
    If no date is specified, returns statistics for today.
    """
    # Verify trip access
    get_trip_or_404(db, trip_id, current_user)

    stats = expense_service.get_daily_budget_statistics(db, trip_id, target_date)
    return stats


@router.get("/trips/{trip_id}/expenses/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    trip_id: int,
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific expense by ID."""
    # Verify trip access
    get_trip_or_404(db, trip_id, current_user)

    expense = expense_service.get_expense_by_id(db, expense_id, trip_id)
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    return expense


@router.put("/trips/{trip_id}/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    trip_id: int,
    expense_id: int,
    expense: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an expense.

    You can update any field. If you change the amount, currency, or date,
    the exchange rate and converted amount will be automatically recalculated.

    All fields are optional - only provide the fields you want to update.
    """
    # Verify trip access
    get_trip_or_404(db, trip_id, current_user)

    updated_expense = await expense_service.update_expense(
        db=db,
        expense_id=expense_id,
        trip_id=trip_id,
        expense_data=expense
    )
    if not updated_expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    return updated_expense


@router.delete("/trips/{trip_id}/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    trip_id: int,
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an expense.

    This action cannot be undone.
    """
    # Verify trip access
    get_trip_or_404(db, trip_id, current_user)

    success = expense_service.delete_expense(db, expense_id, trip_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
