from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ApiKeyBase(BaseModel):
    """Base API key schema"""
    name: str = Field(..., min_length=1, max_length=255, description="User-friendly name/description for the API key")


class ApiKeyCreate(ApiKeyBase):
    """Schema for creating new API key"""
    pass


class ApiKeyResponse(ApiKeyBase):
    """Schema for API key response (without the secret key)"""
    id: int
    prefix: str = Field(..., description="First characters of the key for identification")
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApiKeyWithSecret(ApiKeyResponse):
    """
    Schema for API key response with the full secret key.
    Only returned once during creation.
    """
    key: str = Field(..., description="Full API key - save this securely, it won't be shown again")


class ApiKeyInDB(ApiKeyBase):
    """Schema for API key in database"""
    id: int
    user_id: int
    key_hash: str
    prefix: str
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime] = None

    class Config:
        from_attributes = True
