from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.user import UserUpdate, UserResponse
from app.services.auth import AuthService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Get current user profile

    Returns the complete profile information for the authenticated user.
    """
    return current_user


@router.put("/me", response_model=UserResponse)
def update_current_user_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user profile

    Allows users to update their email, username, full name, and avatar URL.
    Email and username must remain unique across all users.
    """
    auth_service = AuthService(db)
    updated_user = auth_service.update_user(current_user.id, user_data)
    return updated_user


@router.get("/search", response_model=List[UserResponse])
def search_users(
    q: str = Query(..., min_length=2, description="Search query (min 2 characters)"),
    limit: int = Query(20, ge=1, le=50, description="Maximum number of results"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search users by username, email, or full name

    Used for finding users to add to trips. Searches across username,
    email, and full name fields. Returns up to 'limit' matching users.

    Requires authentication - users must be logged in to search for other users.
    """
    auth_service = AuthService(db)
    users = auth_service.search_users(q, limit)
    return users
