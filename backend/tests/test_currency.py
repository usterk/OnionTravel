"""
Tests for currency API endpoints
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, patch, MagicMock
from app.models.exchange_rate import ExchangeRate


class TestCurrencyRatesEndpoint:
    """Tests for GET /api/v1/currency/rates"""

    def test_get_exchange_rate_same_currency(self, client, auth_headers):
        """Test getting rate for same currency (should be 1.0)"""
        response = client.get(
            "/api/v1/currency/rates",
            headers=auth_headers,
            params={"from_currency": "USD", "to_currency": "USD"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["from_currency"] == "USD"
        assert data["to_currency"] == "USD"
        assert data["rate"] == 1.0

    @pytest.mark.asyncio
    async def test_get_exchange_rate_from_db(self, client, auth_headers, db_session):
        """Test getting rate from database"""
        # Insert test rate
        test_rate = ExchangeRate(
            from_currency="USD",
            to_currency="EUR",
            rate=Decimal("0.85"),
            date=date.today()
        )
        db_session.add(test_rate)
        db_session.commit()

        response = client.get(
            "/api/v1/currency/rates",
            headers=auth_headers,
            params={"from_currency": "USD", "to_currency": "EUR"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["from_currency"] == "USD"
        assert data["to_currency"] == "EUR"
        assert abs(data["rate"] - 0.85) < 0.0001

    @pytest.mark.asyncio
    async def test_get_exchange_rate_reverse_from_db(self, client, auth_headers, db_session):
        """Test getting reverse rate from database (EUR/USD when USD/EUR exists)"""
        # Insert test rate USD -> EUR
        test_rate = ExchangeRate(
            from_currency="USD",
            to_currency="EUR",
            rate=Decimal("0.85"),
            date=date.today()
        )
        db_session.add(test_rate)
        db_session.commit()

        # Request reverse rate EUR -> USD
        response = client.get(
            "/api/v1/currency/rates",
            headers=auth_headers,
            params={"from_currency": "EUR", "to_currency": "USD"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["from_currency"] == "EUR"
        assert data["to_currency"] == "USD"
        # Should be 1/0.85 ≈ 1.176
        expected_rate = 1.0 / 0.85
        assert abs(data["rate"] - expected_rate) < 0.01

    def test_get_exchange_rate_not_in_db_returns_404(self, client, auth_headers):
        """Test that missing rate returns 404 (DB-only, no API fallback)"""
        response = client.get(
            "/api/v1/currency/rates",
            headers=auth_headers,
            params={"from_currency": "AUD", "to_currency": "CAD"}
        )
        # DB-only: if rate not in database, return 404
        assert response.status_code == 404
        assert "Exchange rate not found" in response.json()["detail"]

    def test_get_exchange_rate_unsupported_currency(self, client, auth_headers):
        """Test that unsupported currency returns 404"""
        response = client.get(
            "/api/v1/currency/rates",
            headers=auth_headers,
            params={"from_currency": "USD", "to_currency": "XXX"}
        )
        assert response.status_code == 404
        assert "Exchange rate not found" in response.json()["detail"]

    def test_get_exchange_rate_with_date(self, client, auth_headers, db_session):
        """Test getting historical rate with specific date"""
        test_date = date(2025, 1, 1)
        test_rate = ExchangeRate(
            from_currency="USD",
            to_currency="EUR",
            rate=Decimal("0.88"),
            date=test_date
        )
        db_session.add(test_rate)
        db_session.commit()

        response = client.get(
            "/api/v1/currency/rates",
            headers=auth_headers,
            params={
                "from_currency": "USD",
                "to_currency": "EUR",
                "date": str(test_date)
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert abs(data["rate"] - 0.88) < 0.0001
        assert data["date"] == str(test_date)

    def test_get_exchange_rate_unauthorized(self, client):
        """Test that endpoint requires authentication"""
        response = client.get(
            "/api/v1/currency/rates",
            params={"from_currency": "USD", "to_currency": "EUR"}
        )
        assert response.status_code in [401, 403]

    def test_get_exchange_rate_case_insensitive(self, client, auth_headers, db_session):
        """Test that currency codes are case-insensitive"""
        test_rate = ExchangeRate(
            from_currency="USD",
            to_currency="EUR",
            rate=Decimal("0.85"),
            date=date.today()
        )
        db_session.add(test_rate)
        db_session.commit()

        # Request with lowercase
        response = client.get(
            "/api/v1/currency/rates",
            headers=auth_headers,
            params={"from_currency": "usd", "to_currency": "eur"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["from_currency"] == "USD"
        assert data["to_currency"] == "EUR"


class TestCurrencyConvertEndpoint:
    """Tests for GET /api/v1/currency/convert"""

    def test_convert_currency_same_currency(self, client, auth_headers):
        """Test converting same currency (should return same amount)"""
        response = client.get(
            "/api/v1/currency/convert",
            headers=auth_headers,
            params={
                "amount": 100.0,
                "from_currency": "USD",
                "to_currency": "USD"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 100.0
        assert data["converted_amount"] == 100.0
        assert data["exchange_rate"] == 1.0

    def test_convert_currency_from_db(self, client, auth_headers, db_session):
        """Test converting using rate from database"""
        test_rate = ExchangeRate(
            from_currency="USD",
            to_currency="EUR",
            rate=Decimal("0.85"),
            date=date.today()
        )
        db_session.add(test_rate)
        db_session.commit()

        response = client.get(
            "/api/v1/currency/convert",
            headers=auth_headers,
            params={
                "amount": 100.0,
                "from_currency": "USD",
                "to_currency": "EUR"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 100.0
        assert data["from_currency"] == "USD"
        assert data["to_currency"] == "EUR"
        assert abs(data["converted_amount"] - 85.0) < 0.01
        assert abs(data["exchange_rate"] - 0.85) < 0.0001

    def test_convert_currency_not_in_db_returns_404(self, client, auth_headers):
        """Test that conversion fails when rate not in database (DB-only)"""
        response = client.get(
            "/api/v1/currency/convert",
            headers=auth_headers,
            params={
                "amount": 50.0,
                "from_currency": "AUD",
                "to_currency": "CAD"
            }
        )
        # DB-only: if rate not in database, return 404
        assert response.status_code == 404
        assert "Could not convert" in response.json()["detail"]

    def test_convert_currency_unsupported_currency(self, client, auth_headers):
        """Test handling conversion with unsupported currency"""
        response = client.get(
            "/api/v1/currency/convert",
            headers=auth_headers,
            params={
                "amount": 100.0,
                "from_currency": "USD",
                "to_currency": "XXX"
            }
        )
        assert response.status_code == 404
        assert "Could not convert" in response.json()["detail"]

    def test_convert_currency_invalid_amount(self, client, auth_headers):
        """Test validation for invalid amount (must be > 0)"""
        response = client.get(
            "/api/v1/currency/convert",
            headers=auth_headers,
            params={
                "amount": 0.0,
                "from_currency": "USD",
                "to_currency": "EUR"
            }
        )
        assert response.status_code == 422  # Validation error

    def test_convert_currency_negative_amount(self, client, auth_headers):
        """Test validation for negative amount"""
        response = client.get(
            "/api/v1/currency/convert",
            headers=auth_headers,
            params={
                "amount": -50.0,
                "from_currency": "USD",
                "to_currency": "EUR"
            }
        )
        assert response.status_code == 422  # Validation error

    def test_convert_currency_unauthorized(self, client):
        """Test that endpoint requires authentication"""
        response = client.get(
            "/api/v1/currency/convert",
            params={
                "amount": 100.0,
                "from_currency": "USD",
                "to_currency": "EUR"
            }
        )
        assert response.status_code in [401, 403]

    def test_convert_currency_decimal_precision(self, client, auth_headers, db_session):
        """Test that conversion handles decimal precision correctly"""
        test_rate = ExchangeRate(
            from_currency="USD",
            to_currency="JPY",
            rate=Decimal("149.5678"),
            date=date.today()
        )
        db_session.add(test_rate)
        db_session.commit()

        response = client.get(
            "/api/v1/currency/convert",
            headers=auth_headers,
            params={
                "amount": 123.45,
                "from_currency": "USD",
                "to_currency": "JPY"
            }
        )
        assert response.status_code == 200
        data = response.json()
        expected = 123.45 * 149.5678
        assert abs(data["converted_amount"] - expected) < 0.01


class TestSupportedCurrenciesEndpoint:
    """Tests for GET /api/v1/currency/supported"""

    def test_get_supported_currencies(self, client, auth_headers):
        """Test getting list of supported currencies"""
        response = client.get(
            "/api/v1/currency/supported",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "currencies" in data
        assert isinstance(data["currencies"], list)
        assert len(data["currencies"]) > 0

        # Check that common currencies are included
        currencies = data["currencies"]
        assert "USD" in currencies
        assert "EUR" in currencies
        assert "GBP" in currencies
        assert "PLN" in currencies

    def test_get_supported_currencies_unauthorized(self, client):
        """Test that endpoint requires authentication"""
        response = client.get("/api/v1/currency/supported")
        assert response.status_code in [401, 403]

    def test_supported_currencies_count(self, client, auth_headers):
        """Test that we have expected number of base currencies"""
        response = client.get(
            "/api/v1/currency/supported",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # CurrencyService.BASE_CURRENCIES has 9 currencies
        assert len(data["currencies"]) == 9


class TestCurrencyService:
    """Tests for CurrencyService methods"""

    @pytest.mark.asyncio
    async def test_save_rate(self, db_session):
        """Test saving exchange rate to database"""
        from app.services.currency import CurrencyService

        service = CurrencyService(db_session)
        service.save_rate("USD", "EUR", Decimal("0.85"))

        # Verify rate was saved
        rate = db_session.query(ExchangeRate).filter(
            ExchangeRate.from_currency == "USD",
            ExchangeRate.to_currency == "EUR"
        ).first()

        assert rate is not None
        assert rate.rate == Decimal("0.85")

    @pytest.mark.asyncio
    async def test_save_rate_update_existing(self, db_session):
        """Test updating existing rate"""
        from app.services.currency import CurrencyService

        # Insert initial rate
        initial_rate = ExchangeRate(
            from_currency="USD",
            to_currency="EUR",
            rate=Decimal("0.80"),
            date=date.today()
        )
        db_session.add(initial_rate)
        db_session.commit()

        # Update rate
        service = CurrencyService(db_session)
        service.save_rate("USD", "EUR", Decimal("0.85"))

        # Verify rate was updated
        rate = db_session.query(ExchangeRate).filter(
            ExchangeRate.from_currency == "USD",
            ExchangeRate.to_currency == "EUR"
        ).first()

        assert rate.rate == Decimal("0.85")

    @pytest.mark.asyncio
    async def test_get_rate_from_db(self, db_session):
        """Test getting rate from database"""
        from app.services.currency import CurrencyService

        # Insert test rate
        test_rate = ExchangeRate(
            from_currency="USD",
            to_currency="EUR",
            rate=Decimal("0.85"),
            date=date.today()
        )
        db_session.add(test_rate)
        db_session.commit()

        service = CurrencyService(db_session)
        rate = service.get_rate_from_db("USD", "EUR")

        assert rate == Decimal("0.85")

    def test_convert_amount(self, db_session):
        """Test converting amount (sync, DB-only)"""
        from app.services.currency import CurrencyService

        # Insert test rate
        test_rate = ExchangeRate(
            from_currency="USD",
            to_currency="EUR",
            rate=Decimal("0.85"),
            date=date.today()
        )
        db_session.add(test_rate)
        db_session.commit()

        service = CurrencyService(db_session)
        converted = service.convert_amount(Decimal("100"), "USD", "EUR")

        assert converted == Decimal("85.0")

    def test_get_rate_uses_cache(self, db_session):
        """Test that cached rate is returned from DB (DB-only, no API calls)"""
        from app.services.currency import CurrencyService

        # Insert cached rate for today
        cached_rate = ExchangeRate(
            from_currency="USD",
            to_currency="EUR",
            rate=Decimal("0.85"),
            date=date.today()
        )
        db_session.add(cached_rate)
        db_session.commit()

        service = CurrencyService(db_session)

        # get_rate is now sync and DB-only
        rate = service.get_rate("USD", "EUR")
        assert rate == Decimal("0.85")

    def test_get_rate_returns_none_when_not_in_db(self, db_session):
        """Test that None is returned when rate not in DB (DB-only, no API fallback)"""
        from app.services.currency import CurrencyService

        service = CurrencyService(db_session)

        # get_rate is now sync and DB-only - returns None if not found
        rate = service.get_rate("GBP", "JPY")
        assert rate is None

    def test_historical_rates_from_cache(self, db_session):
        """Test that historical rates are served from DB (DB-only, no API calls)"""
        from app.services.currency import CurrencyService

        # Insert cached rates for last 5 days
        today = date.today()
        for i in range(5):
            rate = ExchangeRate(
                from_currency="USD",
                to_currency="THB",
                rate=Decimal(f"35.{i}"),
                date=today - timedelta(days=i)
            )
            db_session.add(rate)
        db_session.commit()

        service = CurrencyService(db_session)

        # get_historical_rates is now sync and DB-only
        result = service.get_historical_rates(["USD"], "THB", days=5)

        assert "USD" in result
        assert len(result["USD"]) == 5

    def test_get_rate_returns_none_for_missing_currency(self, db_session):
        """Test that get_rate returns None for missing currency pair (DB-only)"""
        from app.services.currency import CurrencyService

        service = CurrencyService(db_session)

        # DB-only: should return None for missing pairs
        rate = service.get_rate("XYZ", "ABC")
        assert rate is None

    @pytest.mark.asyncio
    async def test_api_exception_handled_in_fetch(self, db_session):
        """Test that exceptions in fetch_rate_from_api are handled gracefully"""
        from app.services.currency import CurrencyService
        import httpx

        service = CurrencyService(db_session)

        # Mock httpx to raise exception - this tests the try/catch in fetch_rate_from_api
        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.side_effect = httpx.TimeoutException("Timeout")
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance

            # fetch_rate_from_api should catch the exception and return None
            rate = await service.fetch_rate_from_api("USD", "EUR")

            assert rate is None  # Should return None, not raise

    @pytest.mark.asyncio
    async def test_fetch_all_rates_for_currency(self, db_session):
        """Test that fetch_all_rates_for_currency fetches and returns rates"""
        from app.services.currency import CurrencyService
        import httpx

        service = CurrencyService(db_session)

        # Mock httpx client to return a successful response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "result": "success",
            "conversion_rates": {
                "USD": 1.0,
                "EUR": 0.85,
                "PLN": 4.0,
                "THB": 35.0
            }
        }
        mock_response.raise_for_status = MagicMock()

        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.return_value = mock_response
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance

            rates = await service.fetch_all_rates_for_currency("USD")

            assert len(rates) == 4
            assert rates["EUR"] == Decimal("0.85")
            assert rates["THB"] == Decimal("35.0")

    def test_reverse_rate_used_when_direct_missing(self, db_session):
        """Test that reverse rate (1/rate) is used when direct rate is missing"""
        from app.services.currency import CurrencyService

        # Insert EUR/USD rate but NOT USD/EUR
        eur_usd_rate = ExchangeRate(
            from_currency="EUR",
            to_currency="USD",
            rate=Decimal("1.10"),
            date=date.today()
        )
        db_session.add(eur_usd_rate)
        db_session.commit()

        service = CurrencyService(db_session)

        # Request USD/EUR - should use 1/EUR_USD
        rate = service.get_rate_from_db("USD", "EUR")

        # 1 / 1.10 ≈ 0.909...
        assert rate is not None
        assert abs(float(rate) - 0.909) < 0.01

    def test_historical_fills_gaps_with_nearest(self, db_session):
        """Test that missing dates are filled with nearest available rate"""
        from app.services.currency import CurrencyService

        today = date.today()

        # Insert rates only for day 0 and day 4 (gap in middle)
        rate_day0 = ExchangeRate(
            from_currency="GBP",
            to_currency="THB",
            rate=Decimal("44.00"),
            date=today
        )
        rate_day4 = ExchangeRate(
            from_currency="GBP",
            to_currency="THB",
            rate=Decimal("44.50"),
            date=today - timedelta(days=4)
        )
        db_session.add_all([rate_day0, rate_day4])
        db_session.commit()

        service = CurrencyService(db_session)

        # Request 5 days of history (sync, DB-only)
        result = service.get_historical_rates(["GBP"], "THB", days=5)

        assert "GBP" in result
        assert len(result["GBP"]) == 5  # All 5 days should have data

        # Middle days should be filled with nearest rate
        rates = {r["date"]: r["rate"] for r in result["GBP"]}
        assert rates[today] == 44.00
        assert rates[today - timedelta(days=4)] == 44.50
        # Days 1-3 should be filled with nearest (either 44.00 or 44.50)
        for i in [1, 2, 3]:
            assert rates[today - timedelta(days=i)] in [44.00, 44.50]

    @pytest.mark.asyncio
    async def test_api_invalid_response_handled(self, db_session):
        """Test that invalid API response doesn't crash the service"""
        from app.services.currency import CurrencyService
        import httpx

        service = CurrencyService(db_session)

        # Mock httpx client to return invalid JSON structure
        mock_response = MagicMock()
        mock_response.json.return_value = {"result": "error", "error-type": "invalid-key"}
        mock_response.raise_for_status = MagicMock()

        with patch('httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_instance.get.return_value = mock_response
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance

            rate = await service.fetch_rate_from_api("USD", "EUR")

            assert rate is None  # Should return None, not crash

    def test_historical_rates_returns_empty_for_missing_data(self, db_session):
        """Test that historical rates returns empty list when no data in DB"""
        from app.services.currency import CurrencyService

        service = CurrencyService(db_session)

        # No data in DB - should return empty list (DB-only, no API calls)
        result = service.get_historical_rates(["USD", "EUR", "PLN"], "THB", days=90)

        # Should return empty lists for each currency
        assert "USD" in result
        assert "EUR" in result
        assert "PLN" in result
        assert len(result["USD"]) == 0
        assert len(result["EUR"]) == 0
        assert len(result["PLN"]) == 0

    def test_multiple_get_rate_calls_return_same_cached_value(self, db_session):
        """Test that multiple calls to get_rate return same cached value"""
        from app.services.currency import CurrencyService

        # Insert rate to DB
        cached_rate = ExchangeRate(
            from_currency="USD",
            to_currency="EUR",
            rate=Decimal("0.85"),
            date=date.today()
        )
        db_session.add(cached_rate)
        db_session.commit()

        service = CurrencyService(db_session)

        # Multiple calls should return same value (DB-only)
        rate1 = service.get_rate("USD", "EUR")
        rate2 = service.get_rate("USD", "EUR")
        rate3 = service.get_rate("USD", "EUR")

        assert rate1 == Decimal("0.85")
        assert rate2 == Decimal("0.85")
        assert rate3 == Decimal("0.85")


class TestCurrencyHistoryEndpoint:
    """Tests for GET /api/v1/currency/history"""

    def test_get_currency_history_unauthorized(self, client):
        """Test that endpoint requires authentication"""
        response = client.get(
            "/api/v1/currency/history",
            params={
                "from_currencies": "USD,EUR",
                "to_currency": "THB"
            }
        )
        assert response.status_code in [401, 403]

    def test_get_currency_history_missing_params(self, client, auth_headers):
        """Test validation for missing required parameters"""
        response = client.get(
            "/api/v1/currency/history",
            headers=auth_headers,
            params={"to_currency": "THB"}  # missing from_currencies
        )
        assert response.status_code == 422

    def test_get_currency_history_invalid_currency(self, client, auth_headers):
        """Test validation for unsupported currency"""
        response = client.get(
            "/api/v1/currency/history",
            headers=auth_headers,
            params={
                "from_currencies": "XXX",
                "to_currency": "THB"
            }
        )
        assert response.status_code == 400
        assert "not supported" in response.json()["detail"]

    def test_get_currency_history_too_many_currencies(self, client, auth_headers):
        """Test validation for too many from_currencies (max 3)"""
        response = client.get(
            "/api/v1/currency/history",
            headers=auth_headers,
            params={
                "from_currencies": "USD,EUR,PLN,GBP",
                "to_currency": "THB"
            }
        )
        assert response.status_code == 400
        assert "Maximum 3" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_get_currency_history_from_db(self, client, auth_headers, db_session):
        """Test getting history from database"""
        # Insert test rates for the last 7 days
        base_date = date.today()
        for i in range(7):
            rate_date = base_date - timedelta(days=i)
            test_rate = ExchangeRate(
                from_currency="USD",
                to_currency="THB",
                rate=Decimal("35.0") + Decimal(str(i * 0.1)),
                date=rate_date
            )
            db_session.add(test_rate)
        db_session.commit()

        response = client.get(
            "/api/v1/currency/history",
            headers=auth_headers,
            params={
                "from_currencies": "USD",
                "to_currency": "THB",
                "days": 7
            }
        )
        assert response.status_code == 200
        data = response.json()

        assert "pairs" in data
        assert len(data["pairs"]) == 1
        assert data["pairs"][0]["from_currency"] == "USD"
        assert data["pairs"][0]["to_currency"] == "THB"
        assert len(data["pairs"][0]["data"]) >= 1

    def test_get_currency_history_days_validation(self, client, auth_headers):
        """Test validation for days parameter (1-365)"""
        # Too many days
        response = client.get(
            "/api/v1/currency/history",
            headers=auth_headers,
            params={
                "from_currencies": "USD",
                "to_currency": "THB",
                "days": 400
            }
        )
        assert response.status_code == 422

        # Zero days
        response = client.get(
            "/api/v1/currency/history",
            headers=auth_headers,
            params={
                "from_currencies": "USD",
                "to_currency": "THB",
                "days": 0
            }
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_currency_history_multiple_pairs(self, client, auth_headers, db_session):
        """Test getting history for multiple currency pairs"""
        base_date = date.today()

        # Insert rates for USD and EUR to THB
        for curr in ["USD", "EUR"]:
            for i in range(3):
                rate_date = base_date - timedelta(days=i)
                test_rate = ExchangeRate(
                    from_currency=curr,
                    to_currency="THB",
                    rate=Decimal("35.0") if curr == "USD" else Decimal("38.0"),
                    date=rate_date
                )
                db_session.add(test_rate)
        db_session.commit()

        response = client.get(
            "/api/v1/currency/history",
            headers=auth_headers,
            params={
                "from_currencies": "USD,EUR",
                "to_currency": "THB",
                "days": 3
            }
        )
        assert response.status_code == 200
        data = response.json()

        assert len(data["pairs"]) == 2
        currencies = [p["from_currency"] for p in data["pairs"]]
        assert "USD" in currencies
        assert "EUR" in currencies

    def test_get_currency_history_case_insensitive(self, client, auth_headers, db_session):
        """Test that currency codes are case insensitive"""
        test_rate = ExchangeRate(
            from_currency="USD",
            to_currency="THB",
            rate=Decimal("35.0"),
            date=date.today()
        )
        db_session.add(test_rate)
        db_session.commit()

        response = client.get(
            "/api/v1/currency/history",
            headers=auth_headers,
            params={
                "from_currencies": "usd",
                "to_currency": "thb",
                "days": 1
            }
        )
        assert response.status_code == 200
