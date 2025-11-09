from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func, or_
from fastapi import HTTPException, status

from app.models.expense import Expense
from app.models.trip import Trip
from app.models.category import Category
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseStats
from app.services.currency import CurrencyService


async def create_expense(
    trip_id: int,
    user_id: int,
    expense_data: ExpenseCreate,
    db: Session
) -> Expense:
    """
    Create a new expense for a trip.

    Args:
        trip_id: ID of the trip
        user_id: ID of the user creating the expense
        expense_data: Expense creation data
        db: Database session

    Returns:
        Created Expense object

    Raises:
        HTTPException: If validation fails
    """
    # Verify trip exists
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )

    # Verify category exists and belongs to trip
    category = db.query(Category).filter(
        and_(Category.id == expense_data.category_id, Category.trip_id == trip_id)
    ).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found in this trip"
        )

    # Validate dates
    if expense_data.end_date and expense_data.start_date > expense_data.end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before or equal to end date"
        )

    # Convert currency if needed
    exchange_rate = None
    amount_in_trip_currency = None

    if expense_data.currency_code.upper() != trip.currency_code.upper():
        # Need to convert
        currency_service = CurrencyService(db)
        rate = await currency_service.get_rate(
            expense_data.currency_code.upper(),
            trip.currency_code.upper(),
            expense_data.start_date
        )

        if rate:
            exchange_rate = rate
            amount_in_trip_currency = expense_data.amount * rate
        else:
            # Fallback: use 1:1 rate but log warning
            exchange_rate = Decimal("1.0")
            amount_in_trip_currency = expense_data.amount
    else:
        # Same currency
        exchange_rate = Decimal("1.0")
        amount_in_trip_currency = expense_data.amount

    # Create expense
    expense = Expense(
        trip_id=trip_id,
        user_id=user_id,
        category_id=expense_data.category_id,
        title=expense_data.title,
        description=expense_data.description,
        amount=expense_data.amount,
        currency_code=expense_data.currency_code.upper(),
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


def get_trip_expenses(
    trip_id: int,
    db: Session,
    category_id: Optional[int] = None,
    user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Expense]:
    """
    Get expenses for a trip with optional filters.

    Args:
        trip_id: ID of the trip
        db: Database session
        category_id: Filter by category
        user_id: Filter by user
        start_date: Filter expenses from this date
        end_date: Filter expenses until this date
        skip: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        List of Expense objects
    """
    query = db.query(Expense).filter(Expense.trip_id == trip_id)

    if category_id:
        query = query.filter(Expense.category_id == category_id)

    if user_id:
        query = query.filter(Expense.user_id == user_id)

    if start_date:
        query = query.filter(Expense.start_date >= start_date)

    if end_date:
        query = query.filter(
            or_(
                Expense.end_date <= end_date,
                and_(Expense.end_date.is_(None), Expense.start_date <= end_date)
            )
        )

    return query.order_by(Expense.start_date.desc()).offset(skip).limit(limit).all()


def get_expense_by_id(expense_id: int, trip_id: int, db: Session) -> Optional[Expense]:
    """
    Get an expense by ID for a specific trip.

    Args:
        expense_id: ID of the expense
        trip_id: ID of the trip
        db: Database session

    Returns:
        Expense object or None if not found
    """
    return db.query(Expense).filter(
        and_(Expense.id == expense_id, Expense.trip_id == trip_id)
    ).first()


async def update_expense(
    expense_id: int,
    trip_id: int,
    expense_data: ExpenseUpdate,
    db: Session
) -> Expense:
    """
    Update an expense.

    Args:
        expense_id: ID of the expense to update
        trip_id: ID of the trip
        expense_data: Expense update data
        db: Database session

    Returns:
        Updated Expense object

    Raises:
        HTTPException: If expense not found or validation fails
    """
    expense = get_expense_by_id(expense_id, trip_id, db)

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    # Get trip for currency conversion
    trip = db.query(Trip).filter(Trip.id == trip_id).first()

    update_data = expense_data.model_dump(exclude_unset=True)

    # If category is being updated, verify it belongs to the trip
    if "category_id" in update_data:
        category = db.query(Category).filter(
            and_(Category.id == update_data["category_id"], Category.trip_id == trip_id)
        ).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found in this trip"
            )

    # Validate dates if being updated
    start_date = update_data.get("start_date", expense.start_date)
    end_date = update_data.get("end_date", expense.end_date)
    if end_date and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before or equal to end date"
        )

    # Recalculate currency conversion if amount or currency changed
    if "amount" in update_data or "currency_code" in update_data:
        new_amount = update_data.get("amount", expense.amount)
        new_currency = update_data.get("currency_code", expense.currency_code).upper()
        new_start_date = start_date

        if new_currency != trip.currency_code.upper():
            currency_service = CurrencyService(db)
            rate = await currency_service.get_rate(
                new_currency,
                trip.currency_code.upper(),
                new_start_date
            )

            if rate:
                update_data["exchange_rate"] = rate
                update_data["amount_in_trip_currency"] = new_amount * rate
            else:
                update_data["exchange_rate"] = Decimal("1.0")
                update_data["amount_in_trip_currency"] = new_amount
        else:
            update_data["exchange_rate"] = Decimal("1.0")
            update_data["amount_in_trip_currency"] = new_amount

    # Update fields
    for field, value in update_data.items():
        if field == "currency_code" and value:
            value = value.upper()
        setattr(expense, field, value)

    db.commit()
    db.refresh(expense)

    return expense


def delete_expense(expense_id: int, trip_id: int, db: Session) -> bool:
    """
    Delete an expense.

    Args:
        expense_id: ID of the expense to delete
        trip_id: ID of the trip
        db: Database session

    Returns:
        True if deleted successfully

    Raises:
        HTTPException: If expense not found
    """
    expense = get_expense_by_id(expense_id, trip_id, db)

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    db.delete(expense)
    db.commit()

    return True


def get_expense_statistics(trip_id: int, db: Session) -> ExpenseStats:
    """
    Get expense statistics for a trip.

    Args:
        trip_id: ID of the trip
        db: Database session

    Returns:
        ExpenseStats object
    """
    # Get all expenses for the trip
    expenses = db.query(Expense).options(
        joinedload(Expense.category)
    ).filter(Expense.trip_id == trip_id).all()

    if not expenses:
        return ExpenseStats(
            total_expenses=0,
            total_amount=Decimal("0"),
            total_by_category={},
            total_by_currency={},
            daily_average=Decimal("0"),
            expenses_by_date={}
        )

    # Calculate totals
    total_amount = sum(e.amount_in_trip_currency or Decimal("0") for e in expenses)

    # Group by category
    by_category = {}
    for expense in expenses:
        cat_id = expense.category_id
        if cat_id not in by_category:
            by_category[cat_id] = {
                "name": expense.category.name if expense.category else "Unknown",
                "color": expense.category.color if expense.category else "#000000",
                "amount": Decimal("0"),
                "count": 0
            }
        by_category[cat_id]["amount"] += expense.amount_in_trip_currency or Decimal("0")
        by_category[cat_id]["count"] += 1

    # Add percentages
    for cat_id in by_category:
        if total_amount > 0:
            by_category[cat_id]["percentage"] = float(
                (by_category[cat_id]["amount"] / total_amount) * 100
            )
        else:
            by_category[cat_id]["percentage"] = 0

    # Group by currency
    by_currency = {}
    for expense in expenses:
        curr = expense.currency_code
        if curr not in by_currency:
            by_currency[curr] = Decimal("0")
        by_currency[curr] += expense.amount

    # Group by date
    by_date = {}
    for expense in expenses:
        date_str = str(expense.start_date)
        if date_str not in by_date:
            by_date[date_str] = Decimal("0")
        by_date[date_str] += expense.amount_in_trip_currency or Decimal("0")

    # Calculate daily average
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    daily_average = Decimal("0")
    if trip:
        trip_days = (trip.end_date - trip.start_date).days + 1
        if trip_days > 0:
            daily_average = total_amount / trip_days

    return ExpenseStats(
        total_expenses=len(expenses),
        total_amount=total_amount,
        total_by_category=by_category,
        total_by_currency=by_currency,
        daily_average=daily_average,
        expenses_by_date=by_date
    )
