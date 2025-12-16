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

    def get_rate(
        self,
        from_currency: str,
        to_currency: str,
        rate_date: Optional[date] = None
    ) -> Optional[Decimal]:
        """
        Get exchange rate from database ONLY.
        Rates are populated by the daily scheduler - no API calls here.
        Falls back to nearest available date if requested date not found.
        """
        if from_currency == to_currency:
            return Decimal("1.0")

        # Try to get from database for the requested date
        rate = self.get_rate_from_db(from_currency, to_currency, rate_date)
        if rate:
            return rate

        # Fall back to today's rate if available
        if rate_date and rate_date != date.today():
            today_rate = self.get_rate_from_db(from_currency, to_currency, date.today())
            if today_rate:
                logger.info(f"Using today's rate for {from_currency}/{to_currency} on {rate_date}: {today_rate}")
                return today_rate

        # Try to find the most recent rate in DB
        recent_rate = self.db.query(ExchangeRate).filter(
            ExchangeRate.from_currency == from_currency,
            ExchangeRate.to_currency == to_currency
        ).order_by(ExchangeRate.date.desc()).first()

        if recent_rate:
            logger.info(f"Using most recent rate from {recent_rate.date} for {from_currency}/{to_currency}")
            return recent_rate.rate

        # Try reverse rate
        reverse_recent = self.db.query(ExchangeRate).filter(
            ExchangeRate.from_currency == to_currency,
            ExchangeRate.to_currency == from_currency
        ).order_by(ExchangeRate.date.desc()).first()

        if reverse_recent:
            return Decimal("1.0") / reverse_recent.rate

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

    def convert_amount(
        self,
        amount: Decimal,
        from_currency: str,
        to_currency: str,
        rate_date: Optional[date] = None
    ) -> Optional[Decimal]:
        """Convert amount from one currency to another (sync, DB-only)"""
        rate = self.get_rate(from_currency, to_currency, rate_date)
        if rate:
            return amount * rate
        return None

    async def fetch_all_rates_for_currency(self, base_currency: str) -> Dict[str, Decimal]:
        """
        Fetch ALL exchange rates for a base currency using /latest/{base} endpoint.
        Returns dict of {currency_code: rate} for all supported currencies.
        This is ONE API call that returns ALL rates.
        """
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.api_url}/{self.api_key}/latest/{base_currency}"
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                data = response.json()

                if data.get("result") == "success":
                    conversion_rates = data.get("conversion_rates", {})
                    rates = {}
                    for currency, rate in conversion_rates.items():
                        rates[currency] = Decimal(str(rate))
                    logger.info(f"Fetched {len(rates)} rates for base currency {base_currency}")
                    return rates
                else:
                    logger.error(f"API error for {base_currency}: {data.get('error-type')}")
                    return {}
        except Exception as e:
            logger.error(f"Failed to fetch rates for {base_currency}: {str(e)}")
            return {}

    def save_rates_for_currency(self, base_currency: str, rates: Dict[str, Decimal], rate_date: Optional[date] = None):
        """
        Save all rates for a base currency to the database.
        Rates are stored as base_currency -> target_currency.
        """
        if rate_date is None:
            rate_date = date.today()

        saved_count = 0
        for to_currency, rate in rates.items():
            if to_currency == base_currency:
                continue  # Skip same currency

            # Check if rate already exists
            existing_rate = self.db.query(ExchangeRate).filter(
                ExchangeRate.from_currency == base_currency,
                ExchangeRate.to_currency == to_currency,
                ExchangeRate.date == rate_date
            ).first()

            if existing_rate:
                existing_rate.rate = rate
                existing_rate.fetched_at = datetime.now()
            else:
                new_rate = ExchangeRate(
                    from_currency=base_currency,
                    to_currency=to_currency,
                    rate=rate,
                    date=rate_date
                )
                self.db.add(new_rate)
            saved_count += 1

        self.db.commit()
        logger.info(f"Saved {saved_count} rates for base currency {base_currency} on {rate_date}")

    def get_unique_trip_currencies(self) -> List[str]:
        """
        Get unique currency codes from all trips in the database.
        """
        from app.models.trip import Trip

        currencies = self.db.query(Trip.currency_code).distinct().all()
        return [c[0] for c in currencies if c[0]]

    def update_all_rates(self):
        """
        Update exchange rates for all trip currencies.
        Called by the scheduler daily.

        Strategy:
        1. Query all trips, collect unique currency codes
        2. For each unique currency, call /latest/{currency} ONCE
        3. Save ALL rates from the response
        4. Log successes and errors

        This minimizes API calls: ~1-3 calls/day instead of 72.
        """
        import asyncio

        async def _update():
            today = date.today()

            # Get unique currencies from all trips
            trip_currencies = self.get_unique_trip_currencies()

            if not trip_currencies:
                logger.warning("No trips found, skipping currency update")
                return

            logger.info(f"Updating exchange rates for {today}. Trip currencies: {trip_currencies}")

            success_count = 0
            error_count = 0

            for base_currency in trip_currencies:
                try:
                    # Fetch ALL rates for this base currency (ONE API call)
                    rates = await self.fetch_all_rates_for_currency(base_currency)

                    if rates:
                        # Save all rates to database
                        self.save_rates_for_currency(base_currency, rates, today)
                        success_count += 1
                        logger.info(f"SUCCESS: Updated rates for {base_currency} ({len(rates)} currencies)")
                    else:
                        error_count += 1
                        logger.error(f"FAILED: No rates returned for {base_currency}")

                except Exception as e:
                    error_count += 1
                    logger.error(f"FAILED: Error updating rates for {base_currency}: {str(e)}")

                # Small delay between API calls to be nice to the API
                await asyncio.sleep(0.5)

            logger.info(f"Currency update completed. Success: {success_count}, Errors: {error_count}")

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

    def get_historical_rates(
        self,
        from_currencies: List[str],
        to_currency: str,
        days: int = 90
    ) -> Dict[str, List[Dict]]:
        """
        Get historical rates for multiple currency pairs from DB ONLY.
        No API calls - rates are populated by the daily scheduler.
        Missing dates are filled with nearest available rate.
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
