from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal


class TripBase(BaseModel):
    """Base trip schema"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    start_date: date
    end_date: date
    currency_code: str = Field(..., min_length=3, max_length=3, description="ISO 4217 currency code (e.g., USD, EUR, PLN)")
    total_budget: Optional[Decimal] = Field(None, ge=0)
    daily_budget: Optional[Decimal] = Field(None, ge=0)
    sort_categories_by_usage: bool = True


class TripCreate(TripBase):
    """Schema for trip creation"""
    pass


class TripUpdate(BaseModel):
    """Schema for trip update"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    currency_code: Optional[str] = Field(None, min_length=3, max_length=3)
    total_budget: Optional[Decimal] = Field(None, ge=0)
    daily_budget: Optional[Decimal] = Field(None, ge=0)
    sort_categories_by_usage: Optional[bool] = None


class TripUserBase(BaseModel):
    """Base trip user schema"""
    user_id: int
    role: str = Field(default="member", pattern="^(owner|admin|member|viewer)$")


class TripUserCreate(BaseModel):
    """Schema for adding user to trip"""
    user_id: int


class TripUserUpdate(BaseModel):
    """Schema for updating trip user role"""
    role: str = Field(..., pattern="^(owner|admin|member|viewer)$")


class TripUserResponse(TripUserBase):
    """Schema for trip user response"""
    id: int
    trip_id: int
    joined_at: datetime

    class Config:
        from_attributes = True


class TripMemberInfo(BaseModel):
    """Schema for trip member information (includes user details)"""
    id: int
    user_id: int
    username: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


class TripResponse(TripBase):
    """Schema for trip response"""
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TripDetailResponse(TripResponse):
    """Schema for detailed trip response with members"""
    members: List[TripMemberInfo] = []

    class Config:
        from_attributes = True


class TripListResponse(BaseModel):
    """Schema for trip list response"""
    trips: List[TripResponse]
    total: int
