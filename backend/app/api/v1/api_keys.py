"""
API Keys Management Endpoints

Handles creating, listing, and deleting API keys for programmatic access.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.api_key import ApiKey
from app.schemas.api_key import ApiKeyCreate, ApiKeyResponse, ApiKeyWithSecret
from app.api.deps import get_current_user
from app.utils.security import generate_api_key, hash_api_key


router = APIRouter()


@router.post(
    "/api-keys",
    response_model=ApiKeyWithSecret,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new API key",
    responses={
        201: {"description": "API key created successfully"},
        401: {"description": "Not authenticated"},
    }
)
def create_api_key(
    api_key_data: ApiKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new API key for the current user.

    **Important:** The full API key is only shown once in the response.
    Save it securely - you won't be able to retrieve it again.

    **Usage:**
    - Include the API key in requests using the `X-API-Key` header
    - Example: `X-API-Key: ak_abc123...`

    **Returns:**
    - Full API key (save this!)
    - Prefix for identification
    - Creation timestamp
    """

    # Generate new API key
    full_key, prefix = generate_api_key()

    # Hash the key for secure storage
    key_hash = hash_api_key(full_key)

    # Create database record
    db_api_key = ApiKey(
        user_id=current_user.id,
        name=api_key_data.name,
        key_hash=key_hash,
        prefix=prefix,
        is_active=True
    )

    db.add(db_api_key)
    db.commit()
    db.refresh(db_api_key)

    # Return response with full key (only time it's shown)
    return ApiKeyWithSecret(
        id=db_api_key.id,
        name=db_api_key.name,
        prefix=db_api_key.prefix,
        is_active=db_api_key.is_active,
        created_at=db_api_key.created_at,
        last_used_at=db_api_key.last_used_at,
        key=full_key  # Only returned once!
    )


@router.get(
    "/api-keys",
    response_model=List[ApiKeyResponse],
    summary="List all API keys",
    responses={
        200: {"description": "List of API keys"},
        401: {"description": "Not authenticated"},
    }
)
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all API keys for the current user.

    **Note:** Full API keys are never returned in list operations.
    Only the prefix (first characters) is shown for identification.
    """

    api_keys = db.query(ApiKey).filter(
        ApiKey.user_id == current_user.id,
        ApiKey.is_active == True
    ).order_by(ApiKey.created_at.desc()).all()

    return api_keys


@router.delete(
    "/api-keys/{key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an API key",
    responses={
        204: {"description": "API key deleted successfully"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized to delete this API key"},
        404: {"description": "API key not found"},
    }
)
def delete_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete an API key.

    **Security:**
    - You can only delete your own API keys
    - The key is immediately revoked and cannot be used for authentication

    **Note:** This is a hard delete. The key cannot be recovered.
    """

    # Find the API key
    api_key = db.query(ApiKey).filter(
        ApiKey.id == key_id,
        ApiKey.user_id == current_user.id
    ).first()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    # Delete the key
    db.delete(api_key)
    db.commit()

    return None
