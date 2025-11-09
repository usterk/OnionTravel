from pydantic import BaseModel, Field, field_validator
from datetime import datetime, date
from typing import Optional
from decimal import Decimal
from app.schemas.category import CategoryResponse


class ExpenseBase(BaseModel):
    """Base schema for expense"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    amount: float = Field(..., gt=0)
    currency_code: str = Field(..., min_length=3, max_length=3)
    category_id: int = Field(..., gt=0)
    start_date: date
    end_date: Optional[date] = None
    payment_method: Optional[str] = Field(None, max_length=50)
    location: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None

    @field_validator("currency_code")
    @classmethod
    def validate_currency_code(cls, v):
        """Validate currency code is uppercase"""
        if v:
            return v.upper()
        return v

    @field_validator("end_date")
    @classmethod
    def validate_date_range(cls, v, info):
        """Validate that end_date is not before start_date"""
        if v and "start_date" in info.data and v < info.data["start_date"]:
            raise ValueError("end_date must be on or after start_date")
        return v


class ExpenseCreate(ExpenseBase):
    """Schema for creating an expense"""
    pass


class ExpenseUpdate(BaseModel):
    """Schema for updating an expense"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    currency_code: Optional[str] = Field(None, min_length=3, max_length=3)
    category_id: Optional[int] = Field(None, gt=0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    payment_method: Optional[str] = Field(None, max_length=50)
    location: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None

    @field_validator("currency_code")
    @classmethod
    def validate_currency_code(cls, v):
        """Validate currency code is uppercase"""
        if v:
            return v.upper()
        return v


class ExpenseResponse(BaseModel):
    """Schema for expense response"""
    id: int
    trip_id: int
    category_id: int
    user_id: int
    title: str
    description: Optional[str]
    amount: float
    currency_code: str
    exchange_rate: Optional[float]
    amount_in_trip_currency: Optional[float]
    start_date: date
    end_date: Optional[date]
    payment_method: Optional[str]
    location: Optional[str]
    notes: Optional[str]
    created_at: datetime
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True


class ExpenseStatistics(BaseModel):
    """Schema for expense statistics"""
    total_expenses: int
    total_spent: float
    total_budget: float
    remaining_budget: float
    percentage_used: float
    by_category: list[dict]  # List of {category_id, category_name, total_spent}
    by_payment_method: list[dict]  # List of {payment_method, total_spent}
    daily_spending: list[dict]  # List of {date, total_spent}
    average_daily_spending: float
