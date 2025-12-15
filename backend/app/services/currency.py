import httpx
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from app.config import settings
from app.models.exchange_rate import ExchangeRate
import logging

logger = logging.getLogger(__name__)


class CurrencyService:
    """Service for handling currency conversion and exchange rates"""

    # Common currencies to fetch rates for
    BASE_CURRENCIES = ["USD", "EUR", "PLN", "GBP", "THB", "JPY", "AUD", "CAD", "CHF"]

    def __init__(self, db: Session):
        self.db = db
        self.api_url = settings.EXCHANGE_RATE_API_URL
        self.api_key = settings.EXCHANGE_RATE_API_KEY

    async def fetch_rate_from_api(self, from_currency: str, to_currency: str) -> Optional[Decimal]:
        """Fetch exchange rate from external API"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.api_url}/{self.api_key}/pair/{from_currency}/{to_currency}"
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                data = response.json()

                if data.get("result") == "success":
                    rate = Decimal(str(data["conversion_rate"]))
                    logger.info(f"Fetched rate {from_currency}/{to_currency}: {rate}")
                    return rate
                else:
                    logger.error(f"API error: {data.get('error-type')}")
                    return None
        except Exception as e:
            logger.error(f"Failed to fetch rate {from_currency}/{to_currency}: {str(e)}")
            return None

    def get_rate_from_db(
        self,
        from_currency: str,
        to_currency: str,
        rate_date: Optional[date] = None
    ) -> Optional[Decimal]:
        """Get exchange rate from database"""
        if rate_date is None:
            rate_date = date.today()

        rate_record = self.db.query(ExchangeRate).filter(
            ExchangeRate.from_currency == from_currency,
            ExchangeRate.to_currency == to_currency,
            ExchangeRate.date == rate_date
        ).first()

        if rate_record:
            return rate_record.rate

        # Try reverse rate (e.g., if USD/EUR not found, try EUR/USD and invert)
        reverse_rate = self.db.query(ExchangeRate).filter(
            ExchangeRate.from_currency == to_currency,
            ExchangeRate.to_currency == from_currency,
            ExchangeRate.date == rate_date
        ).first()

        if reverse_rate:
            return Decimal("1.0") / reverse_rate.rate

        return None

    async def get_rate(
        self,
        from_currency: str,
        to_currency: str,
        rate_date: Optional[date] = None
    ) -> Optional[Decimal]:
        """
        Get exchange rate. First tries database, then API if not found.
        For future dates or past dates without data, falls back to today's rate.
        """
        if from_currency == to_currency:
            return Decimal("1.0")

        # Try to get from database first for the requested date
        rate = self.get_rate_from_db(from_currency, to_currency, rate_date)
        if rate:
            return rate

        # If not in database and it's today's rate, fetch from API
        if rate_date is None or rate_date == date.today():
            rate = await self.fetch_rate_from_api(from_currency, to_currency)
            if rate:
                # Save to database
                self.save_rate(from_currency, to_currency, rate)
                return rate

        # For past/future dates without data, fall back to today's rate
        # First check if we have today's rate in DB
        today_rate = self.get_rate_from_db(from_currency, to_currency, date.today())
        if today_rate:
            logger.info(f"Using today's rate for {from_currency}/{to_currency} on {rate_date}: {today_rate}")
            return today_rate

        # If not in DB, fetch from API and save
        rate = await self.fetch_rate_from_api(from_currency, to_currency)
        if rate:
            self.save_rate(from_currency, to_currency, rate)
            logger.info(f"Fetched and using current rate for {from_currency}/{to_currency} on {rate_date}: {rate}")
            return rate

        return None

    def save_rate(
        self,
        from_currency: str,
        to_currency: str,
        rate: Decimal,
        rate_date: Optional[date] = None
    ):
        """Save exchange rate to database"""
        if rate_date is None:
            rate_date = date.today()

        # Check if rate already exists
        existing_rate = self.db.query(ExchangeRate).filter(
            ExchangeRate.from_currency == from_currency,
            ExchangeRate.to_currency == to_currency,
            ExchangeRate.date == rate_date
        ).first()

        if existing_rate:
            existing_rate.rate = rate
            existing_rate.fetched_at = datetime.now()
        else:
            new_rate = ExchangeRate(
                from_currency=from_currency,
                to_currency=to_currency,
                rate=rate,
                date=rate_date
            )
            self.db.add(new_rate)

        self.db.commit()
        logger.info(f"Saved rate {from_currency}/{to_currency}: {rate} for {rate_date}")

    async def convert_amount(
        self,
        amount: Decimal,
        from_currency: str,
        to_currency: str,
        rate_date: Optional[date] = None
    ) -> Optional[Decimal]:
        """Convert amount from one currency to another"""
        rate = await self.get_rate(from_currency, to_currency, rate_date)
        if rate:
            return amount * rate
        return None

    def update_all_rates(self):
        """
        Update all common currency pairs.
        This is called by the scheduler daily.
        """
        import asyncio

        async def _update():
            today = date.today()
            logger.info(f"Updating exchange rates for {today}")

            # Fetch rates for all combinations of base currencies
            for from_curr in self.BASE_CURRENCIES:
                for to_curr in self.BASE_CURRENCIES:
                    if from_curr != to_curr:
                        rate = await self.fetch_rate_from_api(from_curr, to_curr)
                        if rate:
                            self.save_rate(from_curr, to_curr, rate, today)
                        # Small delay to avoid rate limiting
                        await asyncio.sleep(0.5)

        # Run async function
        asyncio.run(_update())

    async def fetch_historical_rate_from_api(
        self,
        from_currency: str,
        to_currency: str,
        rate_date: date
    ) -> Optional[Decimal]:
        """Fetch historical exchange rate from external API"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.api_url}/{self.api_key}/history/{from_currency}/{rate_date.year}/{rate_date.month}/{rate_date.day}"
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                data = response.json()

                if data.get("result") == "success":
                    conversion_rates = data.get("conversion_rates", {})
                    if to_currency in conversion_rates:
                        rate = Decimal(str(conversion_rates[to_currency]))
                        logger.info(f"Fetched historical rate {from_currency}/{to_currency} for {rate_date}: {rate}")
                        return rate
                    else:
                        logger.error(f"Currency {to_currency} not found in response")
                        return None
                else:
                    logger.error(f"API error: {data.get('error-type')}")
                    return None
        except Exception as e:
            logger.error(f"Failed to fetch historical rate {from_currency}/{to_currency} for {rate_date}: {str(e)}")
            return None

    async def get_historical_rates(
        self,
        from_currencies: List[str],
        to_currency: str,
        days: int = 90
    ) -> Dict[str, List[Dict]]:
        """
        Get historical rates for multiple currency pairs.

        Strategy:
        1. Query DB for existing rates in date range
        2. For missing dates, use current rate (fetched once)
        3. Fill all dates with nearest available rate
        4. Return immediately without blocking on API
        """
        result = {}
        end_date = date.today()
        start_date = end_date - timedelta(days=days - 1)

        # Generate all dates in range
        all_dates = [start_date + timedelta(days=i) for i in range(days)]

        for from_currency in from_currencies:
            if from_currency == to_currency:
                # Same currency - all rates are 1.0
                result[from_currency] = [
                    {"date": d, "rate": 1.0} for d in all_dates
                ]
                continue

            # Query existing rates from DB
            existing_rates = self.db.query(ExchangeRate).filter(
                ExchangeRate.from_currency == from_currency,
                ExchangeRate.to_currency == to_currency,
                ExchangeRate.date >= start_date,
                ExchangeRate.date <= end_date
            ).all()

            # Build map of existing dates
            rates_map = {r.date: float(r.rate) for r in existing_rates}

            # Also check reverse rates
            reverse_rates = self.db.query(ExchangeRate).filter(
                ExchangeRate.from_currency == to_currency,
                ExchangeRate.to_currency == from_currency,
                ExchangeRate.date >= start_date,
                ExchangeRate.date <= end_date
            ).all()

            for r in reverse_rates:
                if r.date not in rates_map:
                    rates_map[r.date] = float(Decimal("1.0") / r.rate)

            # If we don't have today's rate, fetch it from API (just once)
            if end_date not in rates_map:
                current_rate = await self.get_rate(from_currency, to_currency)
                if current_rate:
                    rates_map[end_date] = float(current_rate)

            # Fill missing dates with nearest available rate
            if rates_map:
                for d in all_dates:
                    if d not in rates_map:
                        # Find nearest date with data
                        nearest_date = min(rates_map.keys(), key=lambda x: abs((x - d).days))
                        rates_map[d] = rates_map[nearest_date]

            # Build result list sorted by date
            result[from_currency] = sorted(
                [{"date": d, "rate": rates_map.get(d, 0.0)} for d in all_dates if rates_map.get(d)],
                key=lambda x: x["date"]
            )

        return result

    def get_supported_currencies(self) -> List[str]:
        """Get list of supported currencies"""
        return self.BASE_CURRENCIES
