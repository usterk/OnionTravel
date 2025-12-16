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


class RateDataPoint(BaseModel):
    """Single data point in time series"""
    date: date
    rate: float


class CurrencyPairHistory(BaseModel):
    """Historical data for one currency pair"""
    from_currency: str
    to_currency: str
    data: List[RateDataPoint]


class CurrencyHistoryResponse(BaseModel):
    """Response containing history for multiple currency pairs"""
    pairs: List[CurrencyPairHistory]
    from_date: date
    to_date: date


class CurrencyPairStats(BaseModel):
    """Statistics for a single currency pair"""
    from_currency: str
    to_currency: str
    record_count: int
    oldest_date: Optional[date]
    newest_date: Optional[date]


class CurrencyDbStatsResponse(BaseModel):
    """Response with database statistics for exchange rates"""
    total_records: int
    pairs: List[CurrencyPairStats]
    date_range_start: Optional[date]
    date_range_end: Optional[date]
