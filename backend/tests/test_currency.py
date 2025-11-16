"""Tests for currency endpoints and service"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.models.exchange_rate import ExchangeRate


class TestExchangeRateEndpoint:
    """Test GET /currency/rates endpoint"""

    @patch('app.services.currency.CurrencyService.get_rate')
    def test_get_exchange_rate_success(self, mock_get_rate, client):
        """Test successful exchange rate retrieval"""
        mock_get_rate.return_value = Decimal("1.2345")

        response = client.get("/api/v1/currency/rates?from_currency=USD&to_currency=EUR")

        assert response.status_code == 200
        data = response.json()
        assert data['from_currency'] == 'USD'
        assert data['to_currency'] == 'EUR'
        assert data['rate'] == 1.2345

    @patch('app.services.currency.CurrencyService.get_rate')
    def test_get_exchange_rate_lowercase_conversion(self, mock_get_rate, client):
        """Test that currency codes are converted to uppercase"""
        mock_get_rate.return_value = Decimal("1.2345")

        response = client.get("/api/v1/currency/rates?from_currency=usd&to_currency=eur")

        assert response.status_code == 200
        data = response.json()
        assert data['from_currency'] == 'USD'
        assert data['to_currency'] == 'EUR'

    @patch('app.services.currency.CurrencyService.get_rate')
    def test_get_exchange_rate_with_date(self, mock_get_rate, client):
        """Test exchange rate retrieval with specific date"""
        mock_get_rate.return_value = Decimal("1.2345")
        target_date = date.today() - timedelta(days=7)

        response = client.get(
            f"/api/v1/currency/rates?from_currency=USD&to_currency=EUR&date={target_date}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data['date'] == target_date.isoformat()

    @patch('app.services.currency.CurrencyService.get_rate')
    def test_get_exchange_rate_not_found(self, mock_get_rate, client):
        """Test 404 when exchange rate is not available"""
        mock_get_rate.return_value = None

        response = client.get("/api/v1/currency/rates?from_currency=USD&to_currency=XXX")

        assert response.status_code == 404
        assert "Exchange rate not found" in response.json()['detail']

    def test_get_exchange_rate_missing_params(self, client):
        """Test 422 when required parameters are missing"""
        response = client.get("/api/v1/currency/rates")
        assert response.status_code == 422


class TestCurrencyConversion:
    """Test GET /currency/convert endpoint"""

    @patch('app.services.currency.CurrencyService.get_rate')
    @patch('app.services.currency.CurrencyService.convert_amount')
    def test_convert_currency_success(self, mock_convert, mock_get_rate, client):
        """Test successful currency conversion"""
        mock_convert.return_value = Decimal("123.45")
        mock_get_rate.return_value = Decimal("1.2345")

        response = client.get(
            "/api/v1/currency/convert?amount=100&from_currency=USD&to_currency=EUR"
        )

        assert response.status_code == 200
        data = response.json()
        assert data['amount'] == 100
        assert data['from_currency'] == 'USD'
        assert data['to_currency'] == 'EUR'
        assert data['converted_amount'] == 123.45
        assert data['exchange_rate'] == 1.2345

    @patch('app.services.currency.CurrencyService.get_rate')
    @patch('app.services.currency.CurrencyService.convert_amount')
    def test_convert_currency_lowercase(self, mock_convert, mock_get_rate, client):
        """Test currency conversion with lowercase codes"""
        mock_convert.return_value = Decimal("123.45")
        mock_get_rate.return_value = Decimal("1.2345")

        response = client.get(
            "/api/v1/currency/convert?amount=100&from_currency=usd&to_currency=eur"
        )

        assert response.status_code == 200
        data = response.json()
        assert data['from_currency'] == 'USD'
        assert data['to_currency'] == 'EUR'

    @patch('app.services.currency.CurrencyService.convert_amount')
    def test_convert_currency_not_found(self, mock_convert, client):
        """Test 404 when conversion is not available"""
        mock_convert.return_value = None

        response = client.get(
            "/api/v1/currency/convert?amount=100&from_currency=USD&to_currency=XXX"
        )

        assert response.status_code == 404
        assert "Could not convert" in response.json()['detail']

    def test_convert_currency_invalid_amount(self, client):
        """Test 422 when amount is invalid (negative or zero)"""
        response = client.get(
            "/api/v1/currency/convert?amount=-100&from_currency=USD&to_currency=EUR"
        )
        assert response.status_code == 422

        response = client.get(
            "/api/v1/currency/convert?amount=0&from_currency=USD&to_currency=EUR"
        )
        assert response.status_code == 422

    def test_convert_currency_missing_params(self, client):
        """Test 422 when required parameters are missing"""
        response = client.get("/api/v1/currency/convert")
        assert response.status_code == 422


class TestSupportedCurrencies:
    """Test GET /currency/supported endpoint"""

    @patch('app.services.currency.CurrencyService.get_supported_currencies')
    def test_get_supported_currencies(self, mock_get_currencies, client):
        """Test retrieving list of supported currencies"""
        mock_get_currencies.return_value = [
            "USD", "EUR", "GBP", "JPY", "THB", "PLN"
        ]

        response = client.get("/api/v1/currency/supported")

        assert response.status_code == 200
        data = response.json()
        assert 'currencies' in data
        assert isinstance(data['currencies'], list)
        assert len(data['currencies']) == 6
        assert "USD" in data['currencies']
        assert "EUR" in data['currencies']


class TestCurrencyService:
    """Test CurrencyService methods"""

    def test_get_supported_currencies_returns_list(self, db_session):
        """Test that get_supported_currencies returns a list"""
        from app.services.currency import CurrencyService

        service = CurrencyService(db_session)
        currencies = service.get_supported_currencies()

        assert isinstance(currencies, list)
        assert len(currencies) > 0
        # Check common currencies are present
        assert "USD" in currencies
        assert "EUR" in currencies
        assert "GBP" in currencies
