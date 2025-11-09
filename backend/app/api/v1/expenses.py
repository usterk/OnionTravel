from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseStats
)
from app.services import expense as expense_service
from app.api.deps import get_current_user
from app.services.trip import verify_trip_access

router = APIRouter()


@router.get(
    "/trips/{trip_id}/expenses",
    response_model=List[ExpenseResponse],
    summary="Get all expenses for a trip"
)
def list_expenses(
    trip_id: int,
    category_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all expenses for a trip with optional filters.

    Filters:
    - category_id: Filter by category
    - user_id: Filter by user
    - start_date: Filter expenses from this date
    - end_date: Filter expenses until this date
    """
    # Verify user has access to the trip
    verify_trip_access(trip_id, current_user.id, db)

    expenses = expense_service.get_trip_expenses(
        trip_id=trip_id,
        db=db,
        category_id=category_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit
    )
    return expenses


@router.post(
    "/trips/{trip_id}/expenses",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new expense"
)
async def create_expense(
    trip_id: int,
    expense_data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new expense for a trip.

    The expense amount will be automatically converted to the trip's currency
    using the latest exchange rate.
    """
    # Verify user has access to the trip (any member can add expenses)
    verify_trip_access(trip_id, current_user.id, db)

    expense = await expense_service.create_expense(
        trip_id=trip_id,
        user_id=current_user.id,
        expense_data=expense_data,
        db=db
    )
    return expense


@router.get(
    "/trips/{trip_id}/expenses/stats",
    response_model=ExpenseStats,
    summary="Get expense statistics"
)
def get_expense_stats(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get expense statistics for a trip.

    Returns:
    - Total expenses count
    - Total amount spent (in trip currency)
    - Spending by category
    - Spending by currency
    - Daily average
    - Expenses by date
    """
    # Verify user has access to the trip
    verify_trip_access(trip_id, current_user.id, db)

    stats = expense_service.get_expense_statistics(trip_id, db)
    return stats


@router.get(
    "/trips/{trip_id}/expenses/{expense_id}",
    response_model=ExpenseResponse,
    summary="Get expense details"
)
def get_expense(
    trip_id: int,
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get details of a specific expense.
    """
    # Verify user has access to the trip
    verify_trip_access(trip_id, current_user.id, db)

    expense = expense_service.get_expense_by_id(expense_id, trip_id, db)
    if not expense:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    return expense


@router.put(
    "/trips/{trip_id}/expenses/{expense_id}",
    response_model=ExpenseResponse,
    summary="Update an expense"
)
async def update_expense(
    trip_id: int,
    expense_id: int,
    expense_data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an expense.

    Users can only update their own expenses unless they are admin/owner.
    """
    # Verify user has access to the trip
    verify_trip_access(trip_id, current_user.id, db)

    # Get the expense to check ownership
    expense = expense_service.get_expense_by_id(expense_id, trip_id, db)
    if not expense:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    # Check if user owns the expense or has admin rights
    from app.services.trip import TripService
    trip_service = TripService(db)
    user_role = trip_service.get_user_role_in_trip(trip_id, current_user.id)

    if expense.user_id != current_user.id and user_role not in ["owner", "admin"]:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own expenses"
        )

    updated_expense = await expense_service.update_expense(
        expense_id=expense_id,
        trip_id=trip_id,
        expense_data=expense_data,
        db=db
    )
    return updated_expense


@router.delete(
    "/trips/{trip_id}/expenses/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an expense"
)
def delete_expense(
    trip_id: int,
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an expense.

    Users can only delete their own expenses unless they are admin/owner.
    """
    # Verify user has access to the trip
    verify_trip_access(trip_id, current_user.id, db)

    # Get the expense to check ownership
    expense = expense_service.get_expense_by_id(expense_id, trip_id, db)
    if not expense:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    # Check if user owns the expense or has admin rights
    from app.services.trip import TripService
    trip_service = TripService(db)
    user_role = trip_service.get_user_role_in_trip(trip_id, current_user.id)

    if expense.user_id != current_user.id and user_role not in ["owner", "admin"]:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own expenses"
        )

    expense_service.delete_expense(expense_id, trip_id, db)
    return None
