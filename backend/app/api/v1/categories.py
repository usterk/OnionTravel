from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryBudgetAllocation
)
from app.services import category as category_service
from app.api.deps import get_current_user
from app.services.trip import verify_trip_access

router = APIRouter()


@router.get(
    "/trips/{trip_id}/categories",
    response_model=List[CategoryResponse],
    summary="Get all categories for a trip"
)
def list_categories(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all categories for a specific trip.

    The user must have access to the trip to view its categories.
    """
    # Verify user has access to the trip
    verify_trip_access(trip_id, current_user.id, db)

    categories = category_service.get_trip_categories(trip_id, db)
    return categories


@router.post(
    "/trips/{trip_id}/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new category"
)
def create_category(
    trip_id: int,
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new category for a trip.

    The user must have admin or owner access to create categories.
    """
    # Verify user has admin access to the trip
    verify_trip_access(trip_id, current_user.id, db, required_role="admin")

    category = category_service.create_category(trip_id, category_data, db)
    return category


@router.post(
    "/trips/{trip_id}/categories/defaults",
    response_model=List[CategoryResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Initialize default categories"
)
def initialize_default_categories(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Initialize default categories for a trip.

    Creates 8 default categories with predefined budget allocations.
    This endpoint is typically called automatically when a trip is created,
    but can be called manually if needed.
    """
    # Verify user has admin access to the trip
    verify_trip_access(trip_id, current_user.id, db, required_role="admin")

    categories = category_service.create_default_categories(trip_id, db)
    return categories


@router.put(
    "/trips/{trip_id}/categories/{category_id}",
    response_model=CategoryResponse,
    summary="Update a category"
)
def update_category(
    trip_id: int,
    category_id: int,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a category.

    The user must have admin or owner access to update categories.
    """
    # Verify user has admin access to the trip
    verify_trip_access(trip_id, current_user.id, db, required_role="admin")

    category = category_service.update_category(category_id, trip_id, category_data, db)
    return category


@router.delete(
    "/trips/{trip_id}/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a category"
)
def delete_category(
    trip_id: int,
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a category.

    The user must have admin or owner access to delete categories.
    Categories with associated expenses cannot be deleted.
    """
    # Verify user has admin access to the trip
    verify_trip_access(trip_id, current_user.id, db, required_role="admin")

    category_service.delete_category(category_id, trip_id, db)
    return None


@router.put(
    "/trips/{trip_id}/categories/budget-allocations",
    response_model=List[CategoryResponse],
    summary="Update budget allocations"
)
def update_budget_allocations(
    trip_id: int,
    allocation_data: CategoryBudgetAllocation,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update budget allocations for multiple categories at once.

    The total of all budget percentages must sum to 100%.
    The user must have admin or owner access.
    """
    # Verify user has admin access to the trip
    verify_trip_access(trip_id, current_user.id, db, required_role="admin")

    categories = category_service.update_budget_allocations(
        trip_id,
        allocation_data.allocations,
        db
    )
    return categories
