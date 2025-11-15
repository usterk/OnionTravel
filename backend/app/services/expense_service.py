from typing import List, Optional
from datetime import date, timedelta, datetime
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
from fastapi import HTTPException, status

from app.models.expense import Expense
from app.models.trip import Trip
from app.models.category import Category
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseStatistics, DailyBudgetStatistics
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
    return db.query(Expense).options(joinedload(Expense.category)).filter(
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
    query = db.query(Expense).options(joinedload(Expense.category)).filter(Expense.trip_id == trip_id)

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
        Category.color.label("category_color"),
        Category.icon.label("category_icon"),
        func.coalesce(func.sum(Expense.amount_in_trip_currency), 0).label("total_spent")
    ).outerjoin(
        Expense,
        and_(Expense.category_id == Category.id, Expense.trip_id == trip_id)
    ).filter(
        Category.trip_id == trip_id
    ).group_by(Category.id, Category.name, Category.color, Category.icon).all()

    by_category = [
        {
            "category_id": stat.category_id,
            "category_name": stat.category_name,
            "category_color": stat.category_color,
            "category_icon": stat.category_icon or "more-horizontal",
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
        percentage_used=percentage_used,  # Show exact percentage, even if > 100%
        by_category=by_category,
        by_payment_method=by_payment_method,
        daily_spending=by_date,
        average_daily_spending=average_daily
    )


def get_daily_budget_statistics(
    db: Session,
    trip_id: int,
    target_date: Optional[date] = None
) -> DailyBudgetStatistics:
    """
    Get budget statistics for a specific day.

    Args:
        db: Database session
        trip_id: Trip ID
        target_date: Date to get stats for (defaults to today)

    Returns:
        Daily budget statistics including spending, remaining, and category breakdown
    """
    # Use today if no date specified
    if target_date is None:
        target_date = datetime.now().date()

    # Get trip and daily budget
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )

    daily_budget = float(trip.daily_budget or 0)

    # Calculate days into trip
    days_into_trip = (target_date - trip.start_date).days + 1
    total_days = (trip.end_date - trip.start_date).days + 1

    # Query expenses for target_date
    # Include expenses where:
    # - Single-day expense: start_date = target_date AND end_date IS NULL
    # - Multi-day expense: start_date <= target_date <= end_date
    expenses_today = db.query(Expense).options(joinedload(Expense.category)).filter(
        Expense.trip_id == trip_id,
        or_(
            # Single-day expense on target_date
            and_(Expense.end_date.is_(None), Expense.start_date == target_date),
            # Multi-day expense that includes target_date
            and_(
                Expense.end_date.isnot(None),
                Expense.start_date <= target_date,
                Expense.end_date >= target_date
            )
        )
    ).all()

    # Get all categories for this trip with their budget percentages, sorted by display_order
    all_categories = db.query(Category).filter(
        Category.trip_id == trip_id
    ).order_by(Category.display_order, Category.created_at).all()

    # Initialize category spending with budgets
    # Use a dict for easy lookups during expense processing, but maintain insertion order (Python 3.7+)
    category_spending = {}
    for cat in all_categories:
        category_daily_budget = 0.0
        if daily_budget > 0 and cat.budget_percentage:
            category_daily_budget = daily_budget * (float(cat.budget_percentage) / 100.0)

        category_spending[cat.id] = {
            "category_id": cat.id,
            "category_name": cat.name,
            "category_color": cat.color,
            "category_icon": cat.icon or "more-horizontal",
            "total_spent": 0.0,
            "category_daily_budget": category_daily_budget,
            "remaining_budget": category_daily_budget
        }

    # For multi-day expenses, split the cost across days
    total_spent_today = 0.0
    expense_count = 0

    for expense in expenses_today:
        if expense.end_date is None or expense.start_date == expense.end_date:
            # Single-day expense
            daily_amount = float(expense.amount_in_trip_currency)
            # Only count as expense if it started today
            if expense.start_date == target_date:
                expense_count += 1
        else:
            # Multi-day expense - split evenly across days
            days_span = (expense.end_date - expense.start_date).days + 1
            daily_amount = float(expense.amount_in_trip_currency) / days_span
            # Only count as expense if it started today
            if expense.start_date == target_date:
                expense_count += 1

        total_spent_today += daily_amount

        # Track category spending
        category_id = expense.category_id
        if category_id in category_spending:
            category_spending[category_id]["total_spent"] += daily_amount
            category_spending[category_id]["remaining_budget"] = (
                category_spending[category_id]["category_daily_budget"] -
                category_spending[category_id]["total_spent"]
            )

    # Calculate remaining and percentage
    remaining_today = daily_budget - total_spent_today
    percentage_used = (total_spent_today / daily_budget * 100) if daily_budget > 0 else 0

    # Calculate cumulative statistics for PAST completed days only (before target_date)
    cumulative_budget_past = None
    cumulative_spent_past = None
    cumulative_savings_past = None

    if target_date > trip.start_date and daily_budget > 0:
        # Days completed before target_date (not including today)
        days_completed = (target_date - trip.start_date).days
        cumulative_budget_past = daily_budget * days_completed

        # Query all expenses that occurred before target_date
        # We need to fetch all expenses and calculate their allocation
        all_expenses = db.query(Expense).filter(
            Expense.trip_id == trip_id,
            # Include expenses that started before today OR multi-day expenses that span into the past
            or_(
                Expense.start_date < target_date,
                and_(
                    Expense.end_date.isnot(None),
                    Expense.start_date < target_date,
                    Expense.end_date >= trip.start_date
                )
            )
        ).all()

        # Calculate total spent in past days (before target_date)
        cumulative_spent_past = 0.0
        for expense in all_expenses:
            if expense.end_date is None or expense.start_date == expense.end_date:
                # Single-day expense - count only if it was before today
                if expense.start_date < target_date:
                    cumulative_spent_past += float(expense.amount_in_trip_currency)
            else:
                # Multi-day expense - allocate proportionally for days before target_date
                days_span = (expense.end_date - expense.start_date).days + 1
                daily_amount = float(expense.amount_in_trip_currency) / days_span

                # Calculate how many days of this expense fall before target_date
                expense_start = max(expense.start_date, trip.start_date)
                expense_end = expense.end_date

                # Only count days that are strictly before target_date
                if expense_start < target_date:
                    # Last day to count is either end of expense or day before target_date
                    last_day_to_count = min(expense_end, target_date - timedelta(days=1))

                    if last_day_to_count >= expense_start:
                        days_in_past = (last_day_to_count - expense_start).days + 1
                        cumulative_spent_past += daily_amount * days_in_past

        cumulative_savings_past = cumulative_budget_past - cumulative_spent_past

    return DailyBudgetStatistics(
        date=target_date,
        daily_budget=daily_budget if daily_budget > 0 else None,
        total_spent_today=total_spent_today,
        remaining_today=remaining_today,
        percentage_used_today=min(percentage_used, 999.9),
        expense_count_today=expense_count,
        by_category_today=list(category_spending.values()),
        is_over_budget=total_spent_today > daily_budget if daily_budget > 0 else False,
        days_into_trip=days_into_trip,
        total_days=total_days,
        cumulative_budget_past=cumulative_budget_past,
        cumulative_spent_past=cumulative_spent_past,
        cumulative_savings_past=cumulative_savings_past
    )
