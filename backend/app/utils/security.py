from datetime import datetime, timedelta
from typing import Optional
import secrets
from jose import jwt
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(user_id: int, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {"exp": expire, "sub": str(user_id)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(user_id: int) -> str:
    """Create JWT refresh token"""
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "sub": str(user_id), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decode JWT token"""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def generate_api_key() -> tuple[str, str]:
    """
    Generate a new API key.

    Returns:
        tuple: (full_key, prefix) - Full key to show user once, and prefix for display
    """
    # Generate a secure random key (32 bytes = 64 hex characters)
    random_part = secrets.token_urlsafe(32)

    # Create the full key with prefix
    full_key = f"ak_{random_part}"

    # Extract prefix (first 12 characters) for display
    prefix = full_key[:12]

    return full_key, prefix


def hash_api_key(api_key: str) -> str:
    """
    Hash an API key for secure storage.
    Uses bcrypt like passwords.

    Args:
        api_key: The plain API key to hash

    Returns:
        str: Hashed API key
    """
    return pwd_context.hash(api_key)


def verify_api_key(plain_key: str, hashed_key: str) -> bool:
    """
    Verify an API key against a hash.

    Args:
        plain_key: The plain API key to verify
        hashed_key: The stored hash to compare against

    Returns:
        bool: True if the key matches, False otherwise
    """
    return pwd_context.verify(plain_key, hashed_key)
