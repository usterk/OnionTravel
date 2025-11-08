from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, List


class ExchangeRateRequest(BaseModel):
    """Schema for requesting an exchange rate"""
    from_currency: str = Field(..., min_length=3, max_length=3)
    to_currency: str = Field(..., min_length=3, max_length=3)
    date: Optional[date] = None


class ExchangeRateResponse(BaseModel):
    """Schema for exchange rate response"""
    from_currency: str
    to_currency: str
    rate: float
    date: date


class ConversionRequest(BaseModel):
    """Schema for currency conversion request"""
    amount: float = Field(..., gt=0)
    from_currency: str = Field(..., min_length=3, max_length=3)
    to_currency: str = Field(..., min_length=3, max_length=3)


class ConversionResponse(BaseModel):
    """Schema for currency conversion response"""
    amount: float
    from_currency: str
    to_currency: str
    converted_amount: float
    exchange_rate: float


class SupportedCurrenciesResponse(BaseModel):
    """Schema for supported currencies response"""
    currencies: List[str]
