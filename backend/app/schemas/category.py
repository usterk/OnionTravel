from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional


class CategoryBase(BaseModel):
    """Base schema for category"""
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)
    budget_percentage: Optional[float] = Field(None, ge=0, le=100)

    @field_validator("budget_percentage")
    @classmethod
    def validate_budget_percentage(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError("Budget percentage must be between 0 and 100")
        return v


class CategoryCreate(CategoryBase):
    """Schema for creating a category"""
    pass


class CategoryUpdate(BaseModel):
    """Schema for updating a category"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)
    budget_percentage: Optional[float] = Field(None, ge=0, le=100)

    @field_validator("budget_percentage")
    @classmethod
    def validate_budget_percentage(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError("Budget percentage must be between 0 and 100")
        return v


class CategoryResponse(CategoryBase):
    """Schema for category response"""
    id: int
    trip_id: int
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CategoryWithStats(CategoryResponse):
    """Schema for category with spending statistics"""
    total_spent: float = 0.0
    allocated_budget: float = 0.0
    remaining_budget: float = 0.0
    percentage_used: float = 0.0

    class Config:
        from_attributes = True
