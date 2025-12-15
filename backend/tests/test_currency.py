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

    @patch('app.services.currency.CurrencyService.fetch_rate_from_api')
    def test_get_exchange_rate_from_api(self, mock_fetch, client, auth_headers):
        """Test fetching rate from API when not in database"""
        mock_fetch.return_value = Decimal("0.92")

        response = client.get(
            "/api/v1/currency/rates",
            headers=auth_headers,
            params={"from_currency": "USD", "to_currency": "EUR"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["from_currency"] == "USD"
        assert data["to_currency"] == "EUR"
        assert abs(data["rate"] - 0.92) < 0.0001

    @patch('app.services.currency.CurrencyService.fetch_rate_from_api')
    def test_get_exchange_rate_api_failure(self, mock_fetch, client, auth_headers):
        """Test handling API failure"""
        mock_fetch.return_value = None

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

    @patch('app.services.currency.CurrencyService.fetch_rate_from_api')
    def test_convert_currency_from_api(self, mock_fetch, client, auth_headers):
        """Test converting using rate from API"""
        mock_fetch.return_value = Decimal("0.92")

        response = client.get(
            "/api/v1/currency/convert",
            headers=auth_headers,
            params={
                "amount": 50.0,
                "from_currency": "USD",
                "to_currency": "EUR"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 50.0
        assert abs(data["converted_amount"] - 46.0) < 0.1
        assert abs(data["exchange_rate"] - 0.92) < 0.0001

    @patch('app.services.currency.CurrencyService.fetch_rate_from_api')
    def test_convert_currency_api_failure(self, mock_fetch, client, auth_headers):
        """Test handling conversion failure"""
        mock_fetch.return_value = None

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

    @pytest.mark.asyncio
    async def test_convert_amount(self, db_session):
        """Test converting amount"""
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
        converted = await service.convert_amount(Decimal("100"), "USD", "EUR")

        assert converted == Decimal("85.0")


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
