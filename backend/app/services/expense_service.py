from typing import List, Optional
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from fastapi import HTTPException, status

from app.models.expense import Expense
from app.models.trip import Trip
from app.models.category import Category
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseStatistics
from app.services.currency import CurrencyService


async def create_expense(
    db: Session,
    trip_id: int,
    user_id: int,
    expense_data: ExpenseCreate
) -> Expense:
    """
    Create a new expense with automatic currency conversion.

    Args:
        db: Database session
        trip_id: Trip ID
        user_id: User ID who created the expense
        expense_data: Expense creation data

    Returns:
        Created expense

    Raises:
        HTTPException: If currency conversion fails
    """
    # Get trip to know the trip currency
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )

    # Verify category belongs to this trip
    category = db.query(Category).filter(
        Category.id == expense_data.category_id,
        Category.trip_id == trip_id
    ).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category not found or does not belong to this trip"
        )

    # Convert amount to Decimal for precise calculation
    amount_decimal = Decimal(str(expense_data.amount))
    exchange_rate = None
    amount_in_trip_currency = None

    # Get exchange rate and convert if needed
    if expense_data.currency_code != trip.currency_code:
        currency_service = CurrencyService(db)
        rate = await currency_service.get_rate(
            expense_data.currency_code,
            trip.currency_code,
            expense_data.start_date
        )
        if not rate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not fetch exchange rate for {expense_data.currency_code} to {trip.currency_code}"
            )
        exchange_rate = rate
        amount_in_trip_currency = amount_decimal * rate
    else:
        # Same currency, no conversion needed
        exchange_rate = Decimal("1.0")
        amount_in_trip_currency = amount_decimal

    # Create expense
    expense = Expense(
        trip_id=trip_id,
        category_id=expense_data.category_id,
        user_id=user_id,
        title=expense_data.title,
        description=expense_data.description,
        amount=amount_decimal,
        currency_code=expense_data.currency_code,
        exchange_rate=exchange_rate,
        amount_in_trip_currency=amount_in_trip_currency,
        start_date=expense_data.start_date,
        end_date=expense_data.end_date,
        payment_method=expense_data.payment_method,
        location=expense_data.location,
        notes=expense_data.notes
    )

    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def get_expense_by_id(db: Session, expense_id: int, trip_id: int) -> Optional[Expense]:
    """
    Get an expense by ID and trip ID.

    Args:
        db: Database session
        expense_id: Expense ID
        trip_id: Trip ID

    Returns:
        Expense if found, None otherwise
    """
    return db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.trip_id == trip_id
    ).first()


def get_expenses_by_trip(
    db: Session,
    trip_id: int,
    category_id: Optional[int] = None,
    user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    payment_method: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Expense]:
    """
    Get all expenses for a trip with optional filters.

    Args:
        db: Database session
        trip_id: Trip ID
        category_id: Filter by category (optional)
        user_id: Filter by user (optional)
        start_date: Filter expenses from this date (optional)
        end_date: Filter expenses until this date (optional)
        payment_method: Filter by payment method (optional)
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return (pagination)

    Returns:
        List of expenses
    """
    query = db.query(Expense).filter(Expense.trip_id == trip_id)

    # Apply filters
    if category_id is not None:
        query = query.filter(Expense.category_id == category_id)

    if user_id is not None:
        query = query.filter(Expense.user_id == user_id)

    if start_date is not None:
        # Include expenses that end on or after start_date
        query = query.filter(
            or_(
                Expense.end_date >= start_date,
                and_(Expense.end_date.is_(None), Expense.start_date >= start_date)
            )
        )

    if end_date is not None:
        # Include expenses that start on or before end_date
        query = query.filter(Expense.start_date <= end_date)

    if payment_method is not None:
        query = query.filter(Expense.payment_method == payment_method)

    # Order by start_date descending (most recent first)
    query = query.order_by(Expense.start_date.desc(), Expense.created_at.desc())

    return query.offset(skip).limit(limit).all()


async def update_expense(
    db: Session,
    expense_id: int,
    trip_id: int,
    expense_data: ExpenseUpdate
) -> Optional[Expense]:
    """
    Update an expense. Re-calculates currency conversion if amount or currency changes.

    Args:
        db: Database session
        expense_id: Expense ID
        trip_id: Trip ID
        expense_data: Expense update data

    Returns:
        Updated expense if found, None otherwise

    Raises:
        HTTPException: If currency conversion fails or category is invalid
    """
    expense = get_expense_by_id(db, expense_id, trip_id)
    if not expense:
        return None

    # Get trip for currency info
    trip = db.query(Trip).filter(Trip.id == trip_id).first()

    # Update only provided fields
    update_data = expense_data.model_dump(exclude_unset=True)

    # Check if category is being updated and verify it belongs to the trip
    if "category_id" in update_data:
        category = db.query(Category).filter(
            Category.id == update_data["category_id"],
            Category.trip_id == trip_id
        ).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found or does not belong to this trip"
            )

    # Check if we need to recalculate currency conversion
    needs_conversion_update = False
    new_amount = None
    new_currency = None
    new_date = None

    if "amount" in update_data:
        new_amount = Decimal(str(update_data["amount"]))
        needs_conversion_update = True

    if "currency_code" in update_data:
        new_currency = update_data["currency_code"]
        needs_conversion_update = True

    if "start_date" in update_data:
        new_date = update_data["start_date"]
        needs_conversion_update = True

    # Recalculate conversion if needed
    if needs_conversion_update:
        amount = new_amount if new_amount is not None else expense.amount
        currency = new_currency if new_currency is not None else expense.currency_code
        rate_date = new_date if new_date is not None else expense.start_date

        if currency != trip.currency_code:
            currency_service = CurrencyService(db)
            rate = await currency_service.get_rate(currency, trip.currency_code, rate_date)
            if not rate:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Could not fetch exchange rate for {currency} to {trip.currency_code}"
                )
            update_data["exchange_rate"] = rate
            update_data["amount_in_trip_currency"] = amount * rate
        else:
            update_data["exchange_rate"] = Decimal("1.0")
            update_data["amount_in_trip_currency"] = amount

    # Apply updates
    for field, value in update_data.items():
        setattr(expense, field, value)

    db.commit()
    db.refresh(expense)
    return expense


def delete_expense(db: Session, expense_id: int, trip_id: int) -> bool:
    """
    Delete an expense.

    Args:
        db: Database session
        expense_id: Expense ID
        trip_id: Trip ID

    Returns:
        True if deleted, False if not found
    """
    expense = get_expense_by_id(db, expense_id, trip_id)
    if not expense:
        return False

    db.delete(expense)
    db.commit()
    return True


def get_expense_statistics(db: Session, trip_id: int) -> ExpenseStatistics:
    """
    Get comprehensive expense statistics for a trip.

    Args:
        db: Database session
        trip_id: Trip ID

    Returns:
        Expense statistics
    """
    # Get trip for budget info
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    total_budget = float(trip.total_budget or 0)

    # Total expenses count and sum
    total_result = db.query(
        func.count(Expense.id).label("count"),
        func.coalesce(func.sum(Expense.amount_in_trip_currency), 0).label("total")
    ).filter(Expense.trip_id == trip_id).first()

    total_expenses = total_result.count
    total_spent = float(total_result.total)

    # Calculate remaining budget and percentage
    remaining_budget = total_budget - total_spent
    percentage_used = (total_spent / total_budget * 100) if total_budget > 0 else 0

    # Spending by category
    category_stats = db.query(
        Category.id.label("category_id"),
        Category.name.label("category_name"),
        func.coalesce(func.sum(Expense.amount_in_trip_currency), 0).label("total_spent")
    ).outerjoin(
        Expense,
        and_(Expense.category_id == Category.id, Expense.trip_id == trip_id)
    ).filter(
        Category.trip_id == trip_id
    ).group_by(Category.id, Category.name).all()

    by_category = [
        {
            "category_id": stat.category_id,
            "category_name": stat.category_name,
            "total_spent": float(stat.total_spent)
        }
        for stat in category_stats
    ]

    # Spending by payment method
    payment_stats = db.query(
        Expense.payment_method,
        func.sum(Expense.amount_in_trip_currency).label("total_spent")
    ).filter(
        Expense.trip_id == trip_id,
        Expense.payment_method.isnot(None)
    ).group_by(Expense.payment_method).all()

    by_payment_method = [
        {
            "payment_method": stat.payment_method,
            "total_spent": float(stat.total_spent)
        }
        for stat in payment_stats
    ]

    # Daily spending (including multi-day expense allocation)
    # For simplicity, we'll calculate spending by start_date
    # A more complex implementation would spread multi-day expenses across dates
    daily_stats = db.query(
        Expense.start_date.label("date"),
        func.sum(Expense.amount_in_trip_currency).label("total_spent")
    ).filter(
        Expense.trip_id == trip_id
    ).group_by(Expense.start_date).order_by(Expense.start_date).all()

    by_date = [
        {
            "date": stat.date.isoformat(),
            "total_spent": float(stat.total_spent)
        }
        for stat in daily_stats
    ]

    # Calculate average daily spending
    if trip.start_date and trip.end_date:
        trip_days = (trip.end_date - trip.start_date).days + 1
        average_daily = total_spent / trip_days if trip_days > 0 else 0
    else:
        average_daily = 0

    return ExpenseStatistics(
        total_expenses=total_expenses,
        total_spent=total_spent,
        total_budget=total_budget,
        remaining_budget=remaining_budget,
        percentage_used=min(percentage_used, 100.0),
        by_category=by_category,
        by_payment_method=by_payment_method,
        daily_spending=by_date,
        average_daily_spending=average_daily
    )
