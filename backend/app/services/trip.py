from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.trip import Trip
from app.models.trip_user import TripUser
from app.models.user import User
from app.schemas.trip import TripCreate, TripUpdate, TripUserCreate, TripUserUpdate


def verify_trip_access(trip_id: int, user_id: int, db: Session, required_role: Optional[str] = None):
    """
    Verify that a user has access to a trip with optional role requirement.

    Args:
        trip_id: ID of the trip
        user_id: ID of the user
        db: Database session
        required_role: Optional role requirement ('admin', 'owner'). If None, just checks access.

    Raises:
        HTTPException: If user doesn't have access or required role
    """
    trip_user = (
        db.query(TripUser)
        .filter(TripUser.trip_id == trip_id, TripUser.user_id == user_id)
        .first()
    )

    if not trip_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found or you don't have access to it"
        )

    if required_role:
        if required_role == "admin" and trip_user.role not in ["owner", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to perform this action"
            )
        elif required_role == "owner" and trip_user.role != "owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only trip owner can perform this action"
            )


class TripService:
    """Service for trip management operations"""

    def __init__(self, db: Session):
        self.db = db

    def get_trip_by_id(self, trip_id: int) -> Optional[Trip]:
        """Get trip by ID"""
        return self.db.query(Trip).filter(Trip.id == trip_id).first()

    def get_trip_with_members(self, trip_id: int) -> Optional[Trip]:
        """Get trip by ID with members loaded"""
        return (
            self.db.query(Trip)
            .options(joinedload(Trip.members).joinedload(TripUser.user))
            .filter(Trip.id == trip_id)
            .first()
        )

    def get_user_trips(self, user_id: int) -> List[Trip]:
        """Get all trips for a user (owned or member of)"""
        # Get trips where user is owner
        owned_trips = self.db.query(Trip).filter(Trip.owner_id == user_id).all()

        # Get trips where user is a member
        member_trip_ids = (
            self.db.query(TripUser.trip_id)
            .filter(TripUser.user_id == user_id)
            .all()
        )
        member_trip_ids = [t[0] for t in member_trip_ids]

        if member_trip_ids:
            member_trips = (
                self.db.query(Trip)
                .filter(Trip.id.in_(member_trip_ids))
                .all()
            )
        else:
            member_trips = []

        # Combine and deduplicate (owner might also be in trip_users)
        all_trips = {trip.id: trip for trip in owned_trips + member_trips}
        return list(all_trips.values())

    def create_trip(self, trip_data: TripCreate, owner_id: int) -> Trip:
        """Create a new trip"""
        # Validate dates
        if trip_data.start_date > trip_data.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before or equal to end date"
            )

        # Calculate daily/total budget
        trip_days = (trip_data.end_date - trip_data.start_date).days + 1

        if trip_data.total_budget and not trip_data.daily_budget:
            # Total budget provided, calculate daily
            total_budget = trip_data.total_budget
            daily_budget = trip_data.total_budget / trip_days
        elif trip_data.daily_budget and not trip_data.total_budget:
            # Daily budget provided, calculate total
            daily_budget = trip_data.daily_budget
            total_budget = trip_data.daily_budget * trip_days
        else:
            # Both or neither provided
            total_budget = trip_data.total_budget
            daily_budget = trip_data.daily_budget

        # Create new trip
        db_trip = Trip(
            name=trip_data.name,
            description=trip_data.description,
            start_date=trip_data.start_date,
            end_date=trip_data.end_date,
            currency_code=trip_data.currency_code.upper(),
            total_budget=total_budget,
            daily_budget=daily_budget,
            owner_id=owner_id
        )
        self.db.add(db_trip)
        self.db.commit()
        self.db.refresh(db_trip)

        # Add owner as a trip member with 'owner' role
        trip_user = TripUser(
            trip_id=db_trip.id,
            user_id=owner_id,
            role="owner"
        )
        self.db.add(trip_user)
        self.db.commit()

        # Create default categories for the trip
        from app.services.category import create_default_categories
        create_default_categories(db_trip.id, self.db)

        return db_trip

    def update_trip(self, trip_id: int, trip_data: TripUpdate, user_id: int) -> Trip:
        """Update a trip"""
        # Get trip
        trip = self.get_trip_by_id(trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found"
            )

        # Check if user has permission (owner or admin)
        if not self._user_can_modify_trip(trip_id, user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to modify this trip"
            )

        # Update fields
        update_data = trip_data.model_dump(exclude_unset=True)

        # Validate dates if both are being updated or one is being updated
        if "start_date" in update_data or "end_date" in update_data:
            start_date = update_data.get("start_date", trip.start_date)
            end_date = update_data.get("end_date", trip.end_date)
            if start_date > end_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Start date must be before or equal to end date"
                )

        # Recalculate budget if dates or budget values change
        if any(k in update_data for k in ["start_date", "end_date", "total_budget", "daily_budget"]):
            start_date = update_data.get("start_date", trip.start_date)
            end_date = update_data.get("end_date", trip.end_date)
            trip_days = (end_date - start_date).days + 1

            if "total_budget" in update_data and "daily_budget" not in update_data:
                update_data["daily_budget"] = update_data["total_budget"] / trip_days
            elif "daily_budget" in update_data and "total_budget" not in update_data:
                update_data["total_budget"] = update_data["daily_budget"] * trip_days

        for field, value in update_data.items():
            if field == "currency_code" and value:
                value = value.upper()
            setattr(trip, field, value)

        self.db.commit()
        self.db.refresh(trip)
        return trip

    def delete_trip(self, trip_id: int, user_id: int) -> bool:
        """Delete a trip (only owner can delete)"""
        trip = self.get_trip_by_id(trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found"
            )

        # Only owner can delete
        if trip.owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only trip owner can delete the trip"
            )

        self.db.delete(trip)
        self.db.commit()
        return True

    def add_member(self, trip_id: int, member_data: TripUserCreate, current_user_id: int) -> TripUser:
        """Add a member to a trip"""
        # Get trip
        trip = self.get_trip_by_id(trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found"
            )

        # Check if current user has permission (owner or admin)
        if not self._user_can_modify_trip(trip_id, current_user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to add members to this trip"
            )

        # Check if user exists
        user = self.db.query(User).filter(User.id == member_data.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Check if user is already a member
        existing_member = (
            self.db.query(TripUser)
            .filter(TripUser.trip_id == trip_id, TripUser.user_id == member_data.user_id)
            .first()
        )
        if existing_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this trip"
            )

        # Add member
        trip_user = TripUser(
            trip_id=trip_id,
            user_id=member_data.user_id,
            role="member"
        )
        self.db.add(trip_user)
        self.db.commit()
        self.db.refresh(trip_user)
        return trip_user

    def remove_member(self, trip_id: int, user_id: int, current_user_id: int) -> bool:
        """Remove a member from a trip"""
        # Get trip
        trip = self.get_trip_by_id(trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found"
            )

        # Check if current user has permission (owner or admin)
        if not self._user_can_modify_trip(trip_id, current_user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to remove members from this trip"
            )

        # Cannot remove the owner
        if trip.owner_id == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove trip owner. Transfer ownership or delete the trip."
            )

        # Get member
        trip_user = (
            self.db.query(TripUser)
            .filter(TripUser.trip_id == trip_id, TripUser.user_id == user_id)
            .first()
        )
        if not trip_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User is not a member of this trip"
            )

        self.db.delete(trip_user)
        self.db.commit()
        return True

    def update_member_role(self, trip_id: int, user_id: int, role_data: TripUserUpdate, current_user_id: int) -> TripUser:
        """Update a member's role"""
        # Get trip
        trip = self.get_trip_by_id(trip_id)
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trip not found"
            )

        # Only owner can change roles
        if trip.owner_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only trip owner can change member roles"
            )

        # Cannot change owner's role
        if trip.owner_id == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change trip owner's role"
            )

        # Get member
        trip_user = (
            self.db.query(TripUser)
            .filter(TripUser.trip_id == trip_id, TripUser.user_id == user_id)
            .first()
        )
        if not trip_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User is not a member of this trip"
            )

        # Update role
        trip_user.role = role_data.role
        self.db.commit()
        self.db.refresh(trip_user)
        return trip_user

    def get_user_role_in_trip(self, trip_id: int, user_id: int) -> Optional[str]:
        """Get user's role in a trip"""
        trip_user = (
            self.db.query(TripUser)
            .filter(TripUser.trip_id == trip_id, TripUser.user_id == user_id)
            .first()
        )
        return trip_user.role if trip_user else None

    def user_has_access_to_trip(self, trip_id: int, user_id: int) -> bool:
        """Check if user has access to a trip"""
        trip_user = (
            self.db.query(TripUser)
            .filter(TripUser.trip_id == trip_id, TripUser.user_id == user_id)
            .first()
        )
        return trip_user is not None

    def _user_can_modify_trip(self, trip_id: int, user_id: int) -> bool:
        """Check if user can modify a trip (owner or admin)"""
        role = self.get_user_role_in_trip(trip_id, user_id)
        return role in ["owner", "admin"]
