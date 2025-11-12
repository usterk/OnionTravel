from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models.category import Category
from app.models.expense import Expense
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryWithStats
from app.utils.defaults import DEFAULT_CATEGORIES


def create_category(db: Session, trip_id: int, category_data: CategoryCreate) -> Category:
    """
    Create a new category for a trip.

    Args:
        db: Database session
        trip_id: Trip ID
        category_data: Category creation data

    Returns:
        Created category
    """
    category = Category(
        trip_id=trip_id,
        name=category_data.name,
        color=category_data.color,
        icon=category_data.icon,
        budget_percentage=category_data.budget_percentage,
        is_default=False
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def get_category_by_id(db: Session, category_id: int, trip_id: int) -> Optional[Category]:
    """
    Get a category by ID and trip ID.

    Args:
        db: Database session
        category_id: Category ID
        trip_id: Trip ID

    Returns:
        Category if found, None otherwise
    """
    return db.query(Category).filter(
        Category.id == category_id,
        Category.trip_id == trip_id
    ).first()


def get_categories_by_trip(db: Session, trip_id: int) -> List[Category]:
    """
    Get all categories for a trip.

    Args:
        db: Database session
        trip_id: Trip ID

    Returns:
        List of categories
    """
    return db.query(Category).filter(
        Category.trip_id == trip_id
    ).order_by(Category.is_default.desc(), Category.created_at).all()


def get_categories_with_stats(db: Session, trip_id: int, trip_budget: float) -> List[CategoryWithStats]:
    """
    Get all categories for a trip with spending statistics.

    Args:
        db: Database session
        trip_id: Trip ID
        trip_budget: Total trip budget

    Returns:
        List of categories with statistics
    """
    # Get all categories
    categories = get_categories_by_trip(db, trip_id)

    # Get expense totals per category
    expense_totals = db.query(
        Expense.category_id,
        func.sum(Expense.amount_in_trip_currency).label("total_spent")
    ).filter(
        Expense.trip_id == trip_id
    ).group_by(Expense.category_id).all()

    # Create a dict for quick lookup
    spending_dict = {cat_id: float(total) for cat_id, total in expense_totals}

    # Build response with stats
    result = []
    for category in categories:
        total_spent = spending_dict.get(category.id, 0.0)
        budget_percentage = float(category.budget_percentage or 0)
        allocated_budget = (trip_budget * budget_percentage / 100) if trip_budget else 0.0
        remaining_budget = allocated_budget - total_spent
        percentage_used = (total_spent / allocated_budget * 100) if allocated_budget > 0 else 0.0

        category_stats = CategoryWithStats(
            id=category.id,
            trip_id=category.trip_id,
            name=category.name,
            color=category.color,
            icon=category.icon,
            budget_percentage=budget_percentage,
            is_default=category.is_default,
            created_at=category.created_at,
            total_spent=total_spent,
            allocated_budget=allocated_budget,
            remaining_budget=remaining_budget,
            percentage_used=percentage_used  # Show exact percentage, even if > 100%
        )
        result.append(category_stats)

    return result


def update_category(db: Session, category_id: int, trip_id: int, category_data: CategoryUpdate) -> Optional[Category]:
    """
    Update a category.

    Args:
        db: Database session
        category_id: Category ID
        trip_id: Trip ID
        category_data: Category update data

    Returns:
        Updated category if found, None otherwise
    """
    category = get_category_by_id(db, category_id, trip_id)
    if not category:
        return None

    # Update only provided fields
    update_data = category_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int, trip_id: int) -> bool:
    """
    Delete a category.

    Args:
        db: Database session
        category_id: Category ID
        trip_id: Trip ID

    Returns:
        True if deleted, False if not found
    """
    category = get_category_by_id(db, category_id, trip_id)
    if not category:
        return False

    # Check if category has expenses
    expense_count = db.query(func.count(Expense.id)).filter(
        Expense.category_id == category_id
    ).scalar()

    if expense_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete category with {expense_count} expenses. Please delete or reassign expenses first."
        )

    db.delete(category)
    db.commit()
    return True


def initialize_default_categories(db: Session, trip_id: int) -> List[Category]:
    """
    Initialize default categories for a new trip.

    Args:
        db: Database session
        trip_id: Trip ID

    Returns:
        List of created default categories
    """
    categories = []
    for default_cat in DEFAULT_CATEGORIES:
        category = Category(
            trip_id=trip_id,
            name=default_cat["name"],
            color=default_cat["color"],
            icon=default_cat["icon"],
            budget_percentage=default_cat["budget_percentage"],
            is_default=default_cat["is_default"]
        )
        db.add(category)
        categories.append(category)

    db.commit()

    # Refresh all categories to get their IDs
    for category in categories:
        db.refresh(category)

    return categories


def validate_budget_percentages(db: Session, trip_id: int, exclude_category_id: Optional[int] = None) -> float:
    """
    Calculate total budget percentage for a trip, optionally excluding one category.

    Args:
        db: Database session
        trip_id: Trip ID
        exclude_category_id: Category ID to exclude from calculation

    Returns:
        Total budget percentage
    """
    query = db.query(func.sum(Category.budget_percentage)).filter(
        Category.trip_id == trip_id
    )

    if exclude_category_id:
        query = query.filter(Category.id != exclude_category_id)

    total = query.scalar() or 0.0
    return float(total)
