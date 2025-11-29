from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.trip import Trip
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse, CategoryWithStats, CategoryReorder
from app.services import category_service
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


@router.get("/trips/{trip_id}/categories", response_model=List[CategoryResponse])
def list_categories(
    trip_id: int,
    sort_by_usage: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all categories for a trip.

    Args:
        trip_id: Trip ID
        sort_by_usage: If True, sort categories by expense frequency (most used first).
                      If False (default), sort by display_order.

    Returns categories ordered by default status (defaults first) and creation date,
    or by usage frequency if sort_by_usage=True.
    """
    # Verify trip access
    get_trip_or_404(db, trip_id, current_user)

    if sort_by_usage:
        categories = category_service.get_categories_sorted_by_usage(db, trip_id)
    else:
        categories = category_service.get_categories_by_trip(db, trip_id)
    return categories


@router.get("/trips/{trip_id}/categories/stats", response_model=List[CategoryWithStats])
def list_categories_with_stats(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all categories for a trip with spending statistics.

    Includes:
    - Total spent per category
    - Allocated budget based on percentage
    - Remaining budget
    - Percentage used
    """
    # Verify trip access
    trip = get_trip_or_404(db, trip_id, current_user)

    categories = category_service.get_categories_with_stats(
        db, trip_id, float(trip.total_budget or 0)
    )
    return categories


@router.post("/trips/{trip_id}/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    trip_id: int,
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new custom category for a trip.

    Note: Budget percentages across all categories should not exceed 100%.
    """
    # Verify trip access
    get_trip_or_404(db, trip_id, current_user)

    # Validate total budget percentage
    current_total = category_service.validate_budget_percentages(db, trip_id)
    new_percentage = category.budget_percentage or 0
    if current_total + new_percentage > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Total budget percentage would exceed 100% (current: {current_total}%, new: {new_percentage}%)"
        )

    new_category = category_service.create_category(db, trip_id, category)
    return new_category


@router.post("/trips/{trip_id}/categories/defaults", response_model=List[CategoryResponse], status_code=status.HTTP_201_CREATED)
def initialize_default_categories(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Initialize default categories for a trip.

    Creates 8 default categories:
    - Accommodation (35%)
    - Transportation (20%)
    - Food & Dining (25%)
    - Activities (15%)
    - Shopping (5%)
    - Health & Medical (0%)
    - Entertainment (0%)
    - Other (0%)

    Note: This will only work if the trip has no categories yet.
    """
    # Verify trip access
    get_trip_or_404(db, trip_id, current_user)

    # Check if categories already exist
    existing = category_service.get_categories_by_trip(db, trip_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trip already has categories. Cannot initialize defaults."
        )

    categories = category_service.initialize_default_categories(db, trip_id)
    return categories


@router.get("/trips/{trip_id}/categories/{category_id}", response_model=CategoryResponse)
def get_category(
    trip_id: int,
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific category by ID."""
    # Verify trip access
    get_trip_or_404(db, trip_id, current_user)

    category = category_service.get_category_by_id(db, category_id, trip_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    return category


@router.put("/trips/{trip_id}/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    trip_id: int,
    category_id: int,
    category: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a category.

    You can update name, color, icon, and budget percentage.
    Note: Budget percentages across all categories should not exceed 100%.
    """
    # Verify trip access
    get_trip_or_404(db, trip_id, current_user)

    # If updating budget percentage, validate total
    if category.budget_percentage is not None:
        current_total = category_service.validate_budget_percentages(
            db, trip_id, exclude_category_id=category_id
        )
        if current_total + category.budget_percentage > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total budget percentage would exceed 100% (current without this category: {current_total}%, new: {category.budget_percentage}%)"
            )

    updated_category = category_service.update_category(db, category_id, trip_id, category)
    if not updated_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    return updated_category


@router.delete("/trips/{trip_id}/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    trip_id: int,
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a category.

    Note: Cannot delete a category that has expenses.
    You must delete or reassign expenses first.
    """
    # Verify trip access
    get_trip_or_404(db, trip_id, current_user)

    success = category_service.delete_category(db, category_id, trip_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )


@router.post("/trips/{trip_id}/categories/reorder", response_model=List[CategoryResponse])
def reorder_categories(
    trip_id: int,
    reorder_data: CategoryReorder,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reorder categories for a trip.

    Provide a list of all category IDs in the desired order.
    The display_order will be updated accordingly.
    """
    # Verify trip access
    get_trip_or_404(db, trip_id, current_user)

    categories = category_service.reorder_categories(db, trip_id, reorder_data.category_ids)
    return categories
