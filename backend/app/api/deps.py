from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.api_key import ApiKey
from app.schemas.auth import TokenPayload
from app.utils.security import verify_api_key

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token.
    Use this as a dependency in protected routes.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenPayload(sub=int(user_id))
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == token_data.sub).first()
    if user is None:
        raise credentials_exception

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current active user (for future use with user.is_active field).
    Currently just returns current user.
    """
    return current_user


def get_user_from_api_key(
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get user from API key header.
    Returns None if no API key is provided or if the key is invalid.

    Args:
        x_api_key: API key from X-API-Key header
        db: Database session

    Returns:
        User if API key is valid, None otherwise
    """
    if not x_api_key:
        return None

    # Query all active API keys
    api_keys = db.query(ApiKey).filter(
        ApiKey.is_active == True
    ).all()

    # Try to find a matching key
    for api_key in api_keys:
        if verify_api_key(x_api_key, api_key.key_hash):
            # Update last_used_at
            api_key.last_used_at = datetime.utcnow()
            db.commit()

            # Return the user
            user = db.query(User).filter(User.id == api_key.user_id).first()
            return user

    return None


def get_current_user_flexible(
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    x_api_key: Optional[str] = Header(None)
) -> User:
    """
    Get current user from either JWT token OR API key.
    Supports both authentication methods for flexibility.

    Priority:
    1. Try API key first (X-API-Key header)
    2. Fall back to JWT token (Authorization header)

    Args:
        db: Database session
        credentials: JWT token from Authorization header
        x_api_key: API key from X-API-Key header

    Returns:
        User object

    Raises:
        HTTPException: If neither authentication method is valid
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Provide either a valid JWT token or API key.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Try API key first
    if x_api_key:
        user = get_user_from_api_key(x_api_key, db)
        if user:
            return user
        # API key provided but invalid
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    # Fall back to JWT token
    if credentials:
        try:
            token = credentials.credentials
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            user_id: str = payload.get("sub")
            if user_id is None:
                raise credentials_exception
            token_data = TokenPayload(sub=int(user_id))
        except (JWTError, ValueError):
            raise credentials_exception

        user = db.query(User).filter(User.id == token_data.sub).first()
        if user is None:
            raise credentials_exception

        return user

    # No authentication provided
    raise credentials_exception
