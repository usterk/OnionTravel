from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.user import UserResponse
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/search", response_model=List[UserResponse])
def search_users(
    q: str = Query(..., min_length=2, description="Search query (email or username)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for users by email or username.

    Returns users whose email or username contains the search query.
    Case-insensitive search. Minimum 2 characters required.
    Returns max 10 results.
    """
    search_pattern = f"%{q.lower()}%"

    users = (
        db.query(User)
        .filter(
            (User.email.ilike(search_pattern)) |
            (User.username.ilike(search_pattern))
        )
        .limit(10)
        .all()
    )

    return users
