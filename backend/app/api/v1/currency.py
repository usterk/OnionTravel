from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from decimal import Decimal

from app.database import get_db
from app.schemas.currency import (
    ExchangeRateResponse,
    ConversionResponse,
    SupportedCurrenciesResponse
)
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
