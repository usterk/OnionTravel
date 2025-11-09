from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.schemas.auth import Token
from app.utils.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
)
from typing import Optional, List


class AuthService:
    """Service for authentication operations"""

    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()

    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        return self.db.query(User).filter(User.username == username).first()

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        user = self.get_user_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def create_user(self, user_data: UserCreate) -> User:
        """Create a new user"""
        # Check if email already exists
        if self.get_user_by_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Check if username already exists
        if self.get_user_by_username(user_data.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

        # Create new user
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            username=user_data.username,
            full_name=user_data.full_name,
            hashed_password=hashed_password
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def create_tokens(self, user_id: int) -> Token:
        """Create access and refresh tokens for user"""
        access_token = create_access_token(user_id)
        refresh_token = create_refresh_token(user_id)
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )

    def update_user(self, user_id: int, user_data: UserUpdate) -> User:
        """Update user profile"""
        user = self.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Check if new email is already taken by another user
        if user_data.email and user_data.email != user.email:
            existing_user = self.get_user_by_email(user_data.email)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )

        # Check if new username is already taken by another user
        if user_data.username and user_data.username != user.username:
            existing_user = self.get_user_by_username(user_data.username)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )

        # Update fields
        update_data = user_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        self.db.commit()
        self.db.refresh(user)
        return user

    def search_users(self, query: str, limit: int = 20) -> List[User]:
        """Search users by username or email"""
        if not query or len(query) < 2:
            return []

        return (
            self.db.query(User)
            .filter(
                or_(
                    User.username.ilike(f"%{query}%"),
                    User.email.ilike(f"%{query}%"),
                    User.full_name.ilike(f"%{query}%")
                )
            )
            .limit(limit)
            .all()
        )
