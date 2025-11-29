from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.trip import (
    TripCreate,
    TripUpdate,
    TripResponse,
    TripDetailResponse,
    TripUserCreate,
    TripUserUpdate,
    TripUserResponse,
    TripMemberInfo,
)
from app.services.trip import TripService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/", response_model=List[TripResponse])
def list_trips(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all trips for the current user.

    Returns trips where user is either owner or member.
    """
    trip_service = TripService(db)
    trips = trip_service.get_user_trips(current_user.id)
    return trips


@router.post("/", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(
    trip_data: TripCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new trip.

    The current user will be set as the trip owner.
    Default categories will be initialized automatically.
    """
    trip_service = TripService(db)
    trip = trip_service.create_trip(trip_data, current_user.id)
    return trip


@router.get("/{trip_id}", response_model=TripDetailResponse)
def get_trip(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get trip details by ID.

    Returns trip information including all members.
    User must be a member of the trip to access.
    """
    trip_service = TripService(db)

    # First check if trip exists
    trip = trip_service.get_trip_with_members(trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )

    # Then check if user has access to this trip
    if not trip_service.user_has_access_to_trip(trip_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this trip"
        )

    # Build response with member information
    members_info = []
    for trip_user in trip.members:
        member_info = TripMemberInfo(
            id=trip_user.id,
            user_id=trip_user.user_id,
            username=trip_user.user.username,
            email=trip_user.user.email,
            full_name=trip_user.user.full_name,
            avatar_url=trip_user.user.avatar_url,
            role=trip_user.role,
            joined_at=trip_user.joined_at
        )
        members_info.append(member_info)

    # Create response
    response = TripDetailResponse(
        id=trip.id,
        name=trip.name,
        description=trip.description,
        start_date=trip.start_date,
        end_date=trip.end_date,
        currency_code=trip.currency_code,
        total_budget=trip.total_budget,
        daily_budget=trip.daily_budget,
        sort_categories_by_usage=trip.sort_categories_by_usage,
        owner_id=trip.owner_id,
        created_at=trip.created_at,
        updated_at=trip.updated_at,
        members=members_info
    )

    return response


@router.put("/{trip_id}", response_model=TripResponse)
def update_trip(
    trip_id: int,
    trip_data: TripUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a trip.

    Only trip owner or admin can update trip details.
    """
    trip_service = TripService(db)
    trip = trip_service.update_trip(trip_id, trip_data, current_user.id)
    return trip


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a trip.

    Only trip owner can delete the trip.
    This will cascade delete all related data (members, categories, expenses).
    """
    trip_service = TripService(db)
    trip_service.delete_trip(trip_id, current_user.id)
    return None


@router.post("/{trip_id}/members", response_model=TripUserResponse, status_code=status.HTTP_201_CREATED)
def add_member(
    trip_id: int,
    member_data: TripUserCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a member to a trip.

    Only trip owner or admin can add members.
    The new member will have 'member' role by default.
    """
    trip_service = TripService(db)
    trip_user = trip_service.add_member(trip_id, member_data, current_user.id)
    return trip_user


@router.delete("/{trip_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    trip_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a member from a trip.

    Only trip owner or admin can remove members.
    Cannot remove the trip owner.
    """
    trip_service = TripService(db)
    trip_service.remove_member(trip_id, user_id, current_user.id)
    return None


@router.put("/{trip_id}/members/{user_id}", response_model=TripUserResponse)
def update_member_role(
    trip_id: int,
    user_id: int,
    role_data: TripUserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a member's role in a trip.

    Only trip owner can change member roles.
    Cannot change the owner's role.
    Valid roles: owner, admin, member, viewer
    """
    trip_service = TripService(db)
    trip_user = trip_service.update_member_role(trip_id, user_id, role_data, current_user.id)
    return trip_user
