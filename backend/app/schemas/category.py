from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional


class CategoryBase(BaseModel):
    """Base schema for Category"""
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")  # Hex color validation
    icon: Optional[str] = Field(None, max_length=50)
    budget_percentage: Optional[float] = Field(None, ge=0, le=100)

    @field_validator('budget_percentage')
    @classmethod
    def validate_budget_percentage(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Budget percentage must be between 0 and 100')
        return v


class CategoryCreate(CategoryBase):
    """Schema for creating a new category"""
    pass


class CategoryUpdate(BaseModel):
    """Schema for updating a category"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)
    budget_percentage: Optional[float] = Field(None, ge=0, le=100)

    @field_validator('budget_percentage')
    @classmethod
    def validate_budget_percentage(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError('Budget percentage must be between 0 and 100')
        return v


class CategoryResponse(CategoryBase):
    """Schema for category response"""
    id: int
    trip_id: int
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CategoryBudgetAllocation(BaseModel):
    """Schema for updating budget allocations for multiple categories"""
    allocations: dict[int, float] = Field(..., description="Map of category_id to budget_percentage")

    @field_validator('allocations')
    @classmethod
    def validate_allocations(cls, v):
        # Check that all percentages are valid
        for category_id, percentage in v.items():
            if percentage < 0 or percentage > 100:
                raise ValueError(f'Budget percentage for category {category_id} must be between 0 and 100')

        # Check that the sum is approximately 100 (allowing for floating point errors)
        total = sum(v.values())
        if abs(total - 100) > 0.01 and total > 0:
            raise ValueError(f'Budget percentages must sum to 100%, got {total}%')

        return v
