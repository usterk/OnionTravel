from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException, status

from app.models.category import Category
from app.models.trip import Trip
from app.schemas.category import CategoryCreate, CategoryUpdate


# Default categories with their configurations
DEFAULT_CATEGORIES = [
    {"name": "Accommodation", "color": "#3B82F6", "icon": "home", "budget_percentage": 35.0},
    {"name": "Transportation", "color": "#10B981", "icon": "car", "budget_percentage": 20.0},
    {"name": "Food & Dining", "color": "#F59E0B", "icon": "utensils", "budget_percentage": 25.0},
    {"name": "Activities", "color": "#8B5CF6", "icon": "ticket", "budget_percentage": 15.0},
    {"name": "Shopping", "color": "#EC4899", "icon": "shopping-bag", "budget_percentage": 5.0},
    {"name": "Health & Medical", "color": "#EF4444", "icon": "heart-pulse", "budget_percentage": 0.0},
    {"name": "Entertainment", "color": "#06B6D4", "icon": "music", "budget_percentage": 0.0},
    {"name": "Other", "color": "#6B7280", "icon": "more-horizontal", "budget_percentage": 0.0},
]


def create_default_categories(trip_id: int, db: Session) -> List[Category]:
    """
    Create default categories for a trip.

    Args:
        trip_id: ID of the trip to create categories for
        db: Database session

    Returns:
        List of created Category objects
    """
    categories = []

    for cat_data in DEFAULT_CATEGORIES:
        category = Category(
            trip_id=trip_id,
            name=cat_data["name"],
            color=cat_data["color"],
            icon=cat_data["icon"],
            budget_percentage=cat_data["budget_percentage"],
            is_default=True
        )
        db.add(category)
        categories.append(category)

    db.commit()

    for category in categories:
        db.refresh(category)

    return categories


def get_trip_categories(trip_id: int, db: Session) -> List[Category]:
    """
    Get all categories for a trip.

    Args:
        trip_id: ID of the trip
        db: Database session

    Returns:
        List of Category objects
    """
    return db.query(Category).filter(Category.trip_id == trip_id).order_by(Category.created_at).all()


def get_category_by_id(category_id: int, trip_id: int, db: Session) -> Optional[Category]:
    """
    Get a category by ID for a specific trip.

    Args:
        category_id: ID of the category
        trip_id: ID of the trip
        db: Database session

    Returns:
        Category object or None if not found
    """
    return db.query(Category).filter(
        and_(Category.id == category_id, Category.trip_id == trip_id)
    ).first()


def create_category(trip_id: int, category_data: CategoryCreate, db: Session) -> Category:
    """
    Create a new category for a trip.

    Args:
        trip_id: ID of the trip
        category_data: Category creation data
        db: Database session

    Returns:
        Created Category object
    """
    # Verify trip exists
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )

    # Create category
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


def update_category(
    category_id: int,
    trip_id: int,
    category_data: CategoryUpdate,
    db: Session
) -> Category:
    """
    Update a category.

    Args:
        category_id: ID of the category to update
        trip_id: ID of the trip
        category_data: Category update data
        db: Database session

    Returns:
        Updated Category object

    Raises:
        HTTPException: If category not found
    """
    category = get_category_by_id(category_id, trip_id, db)

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Update fields
    update_data = category_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)

    return category


def delete_category(category_id: int, trip_id: int, db: Session) -> bool:
    """
    Delete a category.

    Args:
        category_id: ID of the category to delete
        trip_id: ID of the trip
        db: Database session

    Returns:
        True if deleted successfully

    Raises:
        HTTPException: If category not found or has associated expenses
    """
    category = get_category_by_id(category_id, trip_id, db)

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Check if category has expenses
    if category.expenses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with associated expenses"
        )

    db.delete(category)
    db.commit()

    return True


def update_budget_allocations(trip_id: int, allocations: dict[int, float], db: Session) -> List[Category]:
    """
    Update budget allocations for multiple categories.

    Args:
        trip_id: ID of the trip
        allocations: Dictionary mapping category_id to budget_percentage
        db: Database session

    Returns:
        List of updated Category objects

    Raises:
        HTTPException: If validation fails
    """
    # Get all categories for the trip
    categories = get_trip_categories(trip_id, db)
    category_ids = {cat.id for cat in categories}

    # Verify all category IDs belong to this trip
    for category_id in allocations.keys():
        if category_id not in category_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Category {category_id} not found in trip {trip_id}"
            )

    # Update allocations
    updated_categories = []
    for category in categories:
        if category.id in allocations:
            category.budget_percentage = allocations[category.id]
            updated_categories.append(category)

    db.commit()

    for category in updated_categories:
        db.refresh(category)

    return updated_categories
