from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from decimal import Decimal

from app.database import get_db
from app.schemas.currency import (
    ExchangeRateResponse,
    ConversionResponse,
    SupportedCurrenciesResponse,
    CurrencyHistoryResponse,
    CurrencyPairHistory,
    RateDataPoint,
    CurrencyDbStatsResponse,
    CurrencyPairStats
)
from app.models.exchange_rate import ExchangeRate
from sqlalchemy import func
from app.services.currency import CurrencyService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/rates", response_model=ExchangeRateResponse)
async def get_exchange_rate(
    from_currency: str = Query(..., description="Source currency code (e.g., USD)"),
    to_currency: str = Query(..., description="Target currency code (e.g., EUR)"),
    date_param: Optional[date] = Query(None, alias="date", description="Date for historical rate (defaults to today)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get exchange rate between two currencies.

    Returns the exchange rate for a specific date (defaults to today).
    If the rate is not in the database, it will be fetched from the external API
    and cached for future use.

    Example: GET /currency/rates?from=USD&to=EUR
    """
    currency_service = CurrencyService(db)

    # Convert to uppercase
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()

    # Get rate
    rate = await currency_service.get_rate(from_currency, to_currency, date_param)

    if rate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exchange rate not found for {from_currency}/{to_currency}"
        )

    return ExchangeRateResponse(
        from_currency=from_currency,
        to_currency=to_currency,
        rate=float(rate),
        date=date_param or date.today()
    )


@router.get("/convert", response_model=ConversionResponse)
async def convert_currency(
    amount: float = Query(..., gt=0, description="Amount to convert"),
    from_currency: str = Query(..., description="Source currency code (e.g., USD)"),
    to_currency: str = Query(..., description="Target currency code (e.g., EUR)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Convert an amount from one currency to another.

    Uses the latest exchange rate from the database or fetches from API if not available.

    Example: GET /currency/convert?amount=100&from=USD&to=EUR
    """
    currency_service = CurrencyService(db)

    # Convert to uppercase
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()

    # Convert amount
    amount_decimal = Decimal(str(amount))
    converted = await currency_service.convert_amount(
        amount_decimal,
        from_currency,
        to_currency
    )

    if converted is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not convert {from_currency} to {to_currency}"
        )

    # Get the exchange rate for response
    rate = await currency_service.get_rate(from_currency, to_currency)

    return ConversionResponse(
        amount=amount,
        from_currency=from_currency,
        to_currency=to_currency,
        converted_amount=float(converted),
        exchange_rate=float(rate) if rate else 1.0
    )


@router.get("/supported", response_model=SupportedCurrenciesResponse)
def get_supported_currencies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of supported currency codes.

    Returns the base set of currencies that are automatically updated daily
    and can be used for conversions.
    """
    currency_service = CurrencyService(db)
    currencies = currency_service.get_supported_currencies()

    return SupportedCurrenciesResponse(currencies=currencies)


@router.get("/history", response_model=CurrencyHistoryResponse)
async def get_currency_history(
    from_currencies: str = Query(
        ...,
        description="Comma-separated source currency codes (e.g., PLN,EUR,USD)"
    ),
    to_currency: str = Query(
        ...,
        description="Target currency code (e.g., THB)"
    ),
    days: int = Query(
        90,
        ge=1,
        le=365,
        description="Number of days of history (default: 90, max: 365)"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get historical exchange rates for multiple currency pairs.

    Returns time-series data for the last N days for each currency pair.
    Data is cached in the database to minimize external API calls.

    Example: GET /currency/history?from_currencies=PLN,EUR,USD&to_currency=THB&days=90
    """
    currency_service = CurrencyService(db)

    # Parse and validate from_currencies
    from_currency_list = [c.strip().upper() for c in from_currencies.split(",") if c.strip()]

    if not from_currency_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one source currency is required"
        )

    if len(from_currency_list) > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 3 source currencies allowed"
        )

    to_currency = to_currency.upper()

    # Validate currencies
    supported = currency_service.get_supported_currencies()
    for curr in from_currency_list + [to_currency]:
        if curr not in supported:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Currency {curr} is not supported. Supported: {', '.join(supported)}"
            )

    # Get historical rates
    history_data = await currency_service.get_historical_rates(
        from_currency_list, to_currency, days
    )

    # Build response
    from datetime import timedelta
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)

    pairs = []
    for from_curr, data_points in history_data.items():
        pairs.append(CurrencyPairHistory(
            from_currency=from_curr,
            to_currency=to_currency,
            data=[RateDataPoint(date=dp["date"], rate=dp["rate"]) for dp in data_points]
        ))

    return CurrencyHistoryResponse(
        pairs=pairs,
        from_date=start_date,
        to_date=end_date
    )


@router.get("/db-stats", response_model=CurrencyDbStatsResponse)
def get_currency_db_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get database statistics for cached exchange rates.

    Returns information about how many records are stored in the database,
    grouped by currency pair, with date ranges.
    """
    # Total records
    total = db.query(func.count(ExchangeRate.id)).scalar() or 0

    # Overall date range
    date_range = db.query(
        func.min(ExchangeRate.date),
        func.max(ExchangeRate.date)
    ).first()

    # Stats per currency pair
    pair_stats = db.query(
        ExchangeRate.from_currency,
        ExchangeRate.to_currency,
        func.count(ExchangeRate.id).label('count'),
        func.min(ExchangeRate.date).label('min_date'),
        func.max(ExchangeRate.date).label('max_date')
    ).group_by(
        ExchangeRate.from_currency,
        ExchangeRate.to_currency
    ).order_by(
        ExchangeRate.from_currency,
        ExchangeRate.to_currency
    ).all()

    pairs = [
        CurrencyPairStats(
            from_currency=stat.from_currency,
            to_currency=stat.to_currency,
            record_count=stat.count,
            oldest_date=stat.min_date,
            newest_date=stat.max_date
        )
        for stat in pair_stats
    ]

    return CurrencyDbStatsResponse(
        total_records=total,
        pairs=pairs,
        date_range_start=date_range[0] if date_range else None,
        date_range_end=date_range[1] if date_range else None
    )
