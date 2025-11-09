from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional, Any
from decimal import Decimal


class ExpenseBase(BaseModel):
    """Base schema for Expense"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    amount: Decimal = Field(..., gt=0)
    currency_code: str = Field(..., min_length=3, max_length=3)
    category_id: int
    start_date: date
    end_date: Optional[date] = None
    payment_method: Optional[str] = Field(None, max_length=50)
    location: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    """Schema for creating a new expense"""
    pass


class ExpenseUpdate(BaseModel):
    """Schema for updating an expense"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    currency_code: Optional[str] = Field(None, min_length=3, max_length=3)
    category_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    payment_method: Optional[str] = Field(None, max_length=50)
    location: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    """Schema for expense response"""
    id: int
    trip_id: int
    user_id: int
    exchange_rate: Optional[Decimal] = None
    amount_in_trip_currency: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExpenseWithDetails(ExpenseResponse):
    """Schema for expense with category and user details"""
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    user_name: Optional[str] = None


class ExpenseStats(BaseModel):
    """Schema for expense statistics"""
    model_config = ConfigDict(arbitrary_types_allowed=True)

    total_expenses: int
    total_amount: Decimal
    total_by_category: dict[int, dict[str, Any]]  # {category_id: {name, amount, percentage}}
    total_by_currency: dict[str, Decimal]  # {currency: amount}
    daily_average: Decimal
    expenses_by_date: dict[str, Decimal]  # {date: amount}
